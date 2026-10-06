import { useSyncExternalStore } from "react";
import {
  CROSSWALK,
  ENV_READINGS,
  NEW_PIPES,
  OLD_ORDER,
  OLD_RECORDS,
  SIGNED_REPORTS,
  VENUE,
} from "./seed";
import {
  EntryStatus,
  LogLine,
  MaintenanceReport,
  MigrationEntry,
  MigrationState,
  NewPipe,
  ReportItem,
  TuningRecord,
} from "./types";

// ---------- 静态数据查询 ----------

const oldRecordMap = new Map<string, TuningRecord>(OLD_RECORDS.map((r) => [r.oldNo, r]));
const newPipeMap = new Map<string, NewPipe>(NEW_PIPES.map((p) => [p.id, p]));

/** 老号 -> 对照表中指向的新号列表 */
const crosswalkByOld = new Map<string, string[]>();
for (const row of CROSSWALK) {
  for (const oldNo of row.oldNos) {
    const list = crosswalkByOld.get(oldNo) ?? [];
    list.push(row.newNo);
    crosswalkByOld.set(oldNo, list);
  }
}

export function getOldRecord(oldNo: string): TuningRecord | undefined {
  return oldRecordMap.get(oldNo);
}

export function getNewPipe(newNo: string): NewPipe | undefined {
  return newPipeMap.get(newNo);
}

/** 新号 -> 已迁入该号的老号（迁移结果，可能为多根） */
export function sourcesOfNew(newNo: string): string[] {
  const st = state.migration;
  return NEW_PIPES.find((p) => p.id === newNo)?.sources.filter(
    (oldNo) => st.entries[oldNo]?.newNo === newNo && st.entries[oldNo]?.status === "migrated",
  ) ?? [];
}

// ---------- 迁移规划 ----------
// 规则：
// 1) 对照表无指向 + 清册未声明来源 -> 待处理（没归位）
// 2) 对照表有指向，但老管实测音高与新号音位全部不符（旧号被新管复用）-> 待确认
// 3) 音高位置与某个指向新号一致 -> 自动迁移；一个新号允许多根老管并入
function planEntry(oldNo: string): MigrationEntry {
  const rec = oldRecordMap.get(oldNo)!;
  const targets = crosswalkByOld.get(oldNo) ?? [];

  if (targets.length === 0) {
    return {
      oldNo,
      status: "pending",
      reason: "不在编号对照表中，未归位",
      at: Date.now(),
    };
  }

  const matched = targets.filter((no) => newPipeMap.get(no)?.midi === rec.midi);
  const mismatched = targets.filter((no) => newPipeMap.get(no)?.midi !== rec.midi);

  if (matched.length > 0) {
    return {
      oldNo,
      status: "migrated",
      newNo: matched[0],
      confidence: "auto",
      reason:
        (targets.length > 1 ? "多指向中按音高位置择一；" : "对照表 + 音高位置一致；") +
        `音位 ${rec.pitch} 吻合`,
      at: Date.now(),
    };
  }

  return {
    oldNo,
    status: "review",
    newNo: mismatched[0],
    confidence: "auto",
    reason: `对照表指向 ${mismatched[0]}（音位 ${
      newPipeMap.get(mismatched[0])?.pitch
    }），但老管实测音高 ${rec.pitch} 不符，疑似旧号已被新管复用，请现场核对`,
  };
}

// ---------- 状态 ----------

interface AppState {
  migration: MigrationState;
  reports: MaintenanceReport[];
  draft: {
    technician: string;
    summary: string;
    items: ReportItem[];
  };
  failNext: boolean;
}

const STORAGE_KEY = "organ-migration-v1";
const BATCH_SIZE = 3; // 每次续跑处理 3 根，便于演示断点

function initialMigration(): MigrationState {
  return {
    phase: "idle",
    cursor: 0,
    entries: {},
    log: [
      {
        id: cryptoId(),
        t: now(),
        level: "info",
        text: "迁移档已就绪。规则：先查编号对照表，再核对音高位置；拿不准的进待确认，对照表没有的进待处理区。",
      },
    ],
    updatedAt: Date.now(),
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // 刷新时若上次运行中断（页面关闭/崩溃），标记为 interrupted，等待从断点恢复
      if (parsed.migration.phase === "running") {
        parsed.migration.phase = "interrupted";
        parsed.migration.log = [
          ...parsed.migration.log,
          {
            id: cryptoId(),
            t: now(),
            level: "warn",
            text: "检测到上次迁移在运行中中断，已保留断点，可从断点继续。",
          },
        ];
      }
      parsed.failNext = false;
      return parsed;
    }
  } catch {
    /* 存储不可用时退回内存态 */
  }
  return {
    migration: initialMigration(),
    reports: SIGNED_REPORTS,
    draft: { technician: "", summary: "", items: [] },
    failNext: false,
  };
}

let state: AppState = loadState();
const listeners = new Set<() => void>();
let runner: Promise<void> | null = null;

function cryptoId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function now(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function persist() {
  state.migration.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略写入失败 */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function addLog(level: LogLine["level"], text: string) {
  state.migration.log = [
    ...state.migration.log.slice(-80),
    { id: cryptoId(), t: now(), level, text },
  ];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  return state;
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

/** 非 React 环境（测试/外部读取）获取状态快照 */
export function getState(): AppState {
  return state;
}

// ---------- 迁移执行（支持失败注入 / 断点续跑） ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBatch(): Promise<"failed" | "done" | "more"> {
  const m = state.migration;
  let processed = 0;

  while (m.cursor < OLD_ORDER.length && processed < BATCH_SIZE) {
    const oldNo = OLD_ORDER[m.cursor];

    // 模拟失败：保留断点，已处理结果不回滚
    if (state.failNext) {
      state.failNext = false;
      m.phase = "interrupted";
      addLog("error", `处理 ${oldNo} 时写入失败，已在断点 ${m.cursor} 暂停，稍后可从断点继续。`);
      emit();
      return "failed";
    }

    const entry = planEntry(oldNo);
    m.entries[oldNo] = entry;
    m.cursor += 1;
    processed += 1;

    const rec = oldRecordMap.get(oldNo)!;
    if (entry.status === "migrated") {
      addLog("ok", `${oldNo}（${rec.pitch}）→ ${entry.newNo}：自动迁移`);
    } else if (entry.status === "review") {
      addLog("warn", `${oldNo}（${rec.pitch}）：音位与对照表不符，列入待确认`);
    } else {
      addLog("warn", `${oldNo}：对照表无记录，放入待处理区`);
    }
    emit();
    await sleep(180);
  }

  if (m.cursor >= OLD_ORDER.length) {
    const pending = countByStatus(m, "pending");
    const review = countByStatus(m, "review");
    m.phase = "idle";
    addLog(
      "info",
      `自动迁移走完：已归位 ${countByStatus(m, "migrated")} 根，待确认 ${review} 根，待处理 ${pending} 根。处理完待确认/待处理后才能签发新报告。`,
    );
    emit();
    return "done";
  }
  return "more";
}

/** 连续跑完所有批次，中途失败则停在断点（之后可再次调用从断点继续） */
async function runAll(): Promise<void> {
  for (;;) {
    const r = await runBatch();
    if (r === "failed" || r === "done") return;
  }
}

function countByStatus(m: MigrationState, status: EntryStatus): number {
  return Object.values(m.entries).filter((e) => e.status === status).length;
}

// ---------- 对外动作 ----------

export const actions = {
  async startOrResume(): Promise<void> {
    const m = state.migration;
    if (m.phase === "running" || runner) return;
    if (m.cursor >= OLD_ORDER.length) return;

    m.phase = "running";
    addLog("info", m.cursor === 0 ? "开始迁移……" : `从断点 ${m.cursor} 继续迁移……`);
    emit();

    runner = runAll().finally(() => {
      runner = null;
    });
    await runner;
  },

  setFailNext(v: boolean) {
    state.failNext = v;
    emit();
  },

  /** 待确认：现场核对后确认归位到某新号（可改选） */
  confirmEntry(oldNo: string, newNo: string) {
    const target = newPipeMap.get(newNo);
    const rec = oldRecordMap.get(oldNo)!;
    if (!target) return;
    state.migration.entries[oldNo] = {
      oldNo,
      status: "migrated",
      newNo,
      confidence: "manual",
      reason: `人工确认归位：${rec.pitch} → ${newNo}（${target.pitch}）`,
      at: Date.now(),
    };
    addLog("ok", `${oldNo} 经人工确认 → ${newNo}`);
    emit();
  },

  /** 待确认/待处理：退回待处理区（暂不归位） */
  sendToPending(oldNo: string, text?: string) {
    state.migration.entries[oldNo] = {
      oldNo,
      status: "pending",
      reason: text ?? state.migration.entries[oldNo]?.reason ?? "暂不归位",
      at: Date.now(),
    };
    addLog("warn", `${oldNo} 放入待处理区`);
    emit();
  },

  /** 待处理：手动指派新号归位 */
  assignPending(oldNo: string, newNo: string) {
    actions.confirmEntry(oldNo, newNo);
    addLog("ok", `${oldNo} 从待处理区归位 → ${newNo}`);
  },

  /** 待处理：确认该老管已停用/作废，归档（计入已处理，但不迁数据） */
  archiveEntry(oldNo: string, text: string) {
    state.migration.entries[oldNo] = {
      oldNo,
      status: "archived",
      reason: text || "确认作废，归档不迁移",
      at: Date.now(),
    };
    addLog("info", `${oldNo} 确认作废并归档（旧档保留可查，不迁入新号）`);
    emit();
  },

  resetMigration() {
    state.migration = initialMigration();
    addLog("info", "迁移档已重置。");
    emit();
  },

  // ---- 报告 ----
  addDraftItem(newNo: string, note: string) {
    const pipe = newPipeMap.get(newNo);
    if (!pipe) return;
    const oldNos = NEW_PIPES.find((p) => p.id === newNo)?.sources ?? [];
    const item: ReportItem = {
      oldNos,
      newNo,
      stopId: pipe.stopId,
      pitch: pipe.pitch,
      note: note || "—",
    };
    state.draft = { ...state.draft, items: [...state.draft.items, item] };
    emit();
  },

  removeDraftItem(index: number) {
    state.draft = {
      ...state.draft,
      items: state.draft.items.filter((_, i) => i !== index),
    };
    emit();
  },

  updateDraft(field: "technician" | "summary", value: string) {
    state.draft = { ...state.draft, [field]: value };
    emit();
  },

  /** 迁移未走完时禁止签发 */
  signReport(): { ok: boolean; message: string } {
    const gate = migrationGate();
    if (!gate.ready) return { ok: false, message: gate.reason };
    if (state.draft.items.length === 0) {
      return { ok: false, message: "报告还没有任何条目。" };
    }
    const report: MaintenanceReport = {
      id: "R" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + cryptoId().slice(0, 3),
      venue: VENUE,
      date: new Date().toISOString().slice(0, 10),
      technician: state.draft.technician || "未署名",
      summary: state.draft.summary || "（无概述）",
      items: state.draft.items,
      createdAt: Date.now(),
    };
    state.reports = [report, ...state.reports];
    state.draft = { technician: "", summary: "", items: [] };
    addLog("ok", `维护报告 ${report.id} 已签发：旧号与新号双号留档。`);
    emit();
    return { ok: true, message: report.id };
  },
};

// ---------- 派生：迁移进度 / 签发门控 ----------

export function migrationProgress() {
  const m = state.migration;
  const total = OLD_ORDER.length;
  const counts = {
    queued: total - Object.keys(m.entries).length,
    migrated: countByStatus(m, "migrated"),
    review: countByStatus(m, "review"),
    pending: countByStatus(m, "pending"),
    archived: countByStatus(m, "archived"),
  };
  const processed = counts.migrated + counts.review + counts.pending + counts.archived;
  return { total, processed, cursor: m.cursor, ...counts };
}

export function migrationGate(): { ready: boolean; reason: string } {
  const p = migrationProgress();
  if (p.queued > 0) {
    return { ready: false, reason: `自动迁移尚未走完（剩余 ${p.queued} 根未处理），不能签发新报告。` };
  }
  if (p.review > 0) {
    return { ready: false, reason: `还有 ${p.review} 根老管待确认，请先在待确认区逐条核对。` };
  }
  if (p.pending > 0) {
    return { ready: false, reason: `待处理区还有 ${p.pending} 根未归位老管，请指派新号或确认作废。` };
  }
  return { ready: true, reason: "" };
}

export function envById(id: string) {
  return ENV_READINGS.find((e) => e.id === id);
}
