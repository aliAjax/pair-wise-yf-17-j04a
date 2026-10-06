import { useCallback, useEffect, useRef, useState } from "react";
import { buildInitialState, STORAGE_KEY, VENUE } from "./data";
import { matchRecord, migrationStats } from "./migration";
import type { OldRecord, OrganState, Report } from "./types";

function loadState(): OrganState {
  const initial = buildInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<OrganState>;
    if (!Array.isArray(parsed.pipes) || !Array.isArray(parsed.records)) return initial;
    return {
      ...initial,
      ...parsed,
      failureInjection: { ...initial.failureInjection, ...(parsed.failureInjection ?? {}) },
    };
  } catch {
    return initial;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useOrganStore() {
  const [state, setState] = useState<OrganState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时仅保留内存态
    }
  }, [state]);

  /** 迁移执行器：逐条处理 pending 老管记录，每条落一次断点；支持故障注入与从断点恢复 */
  const runMigration = useCallback(async () => {
    setState((s) => ({ ...s, phase: "running", failure: null }));
    const snap = stateRef.current;
    const todo = snap.records.filter((r) => r.migrateStatus === "pending");
    let processed = 0;

    for (const rec of todo) {
      const inj = stateRef.current.failureInjection;
      if (inj.enabled && processed >= inj.after) {
        setState((s) => ({
          ...s,
          phase: "failed",
          failure: `迁移在处理第 ${processed + 1} 条老管记录（${rec.id} 老编号 ${rec.oldNo}）时中断，断点已保存，可从断点恢复；未归位的老管记录仍留在待处理区。`,
          processed,
        }));
        return;
      }

      const result = matchRecord(rec, stateRef.current.pipes);
      setState((s) => ({
        ...s,
        processed: s.processed + 1,
        records: s.records.map((r) =>
          r.id === rec.id
            ? {
                ...r,
                migrateStatus:
                  result.status === "migrated"
                    ? "migrated"
                    : result.status === "review"
                      ? "review"
                      : "pending",
                newPipeId: result.newPipeId,
                candidates: result.candidates,
                reason: result.reason,
              }
            : r
        ),
      }));
      processed += 1;
      await delay(160);
    }

    setState((s) => {
      const stats = migrationStats(s.records);
      return {
        ...s,
        phase: stats.done ? "done" : "idle",
        processed: 0,
        failure: null,
      };
    });
  }, []);

  /** 待确认记录：人工确认归位到某根新管 */
  const confirmReview = useCallback((recordId: string, pipeId: string) => {
    setState((s) => ({
      ...s,
      phase: "idle",
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              migrateStatus: "migrated",
              newPipeId: pipeId,
              candidates: [],
              reason: `人工确认归位到 ${pipeId}`,
            }
          : r
      ),
    }));
  }, []);

  /** 待确认记录：退回待处理区（不强行归位） */
  const rejectReview = useCallback((recordId: string) => {
    setState((s) => ({
      ...s,
      phase: "idle",
      records: s.records.map((r) =>
        r.id === recordId
          ? { ...r, migrateStatus: "pending", newPipeId: null, candidates: [], reason: "待确认退回，留待处理区" }
          : r
      ),
    }));
  }, []);

  /** 待处理记录：手动指定新编号归位 */
  const manualAssign = useCallback((recordId: string, pipeId: string) => {
    setState((s) => ({
      ...s,
      phase: "idle",
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              migrateStatus: "migrated",
              newPipeId: pipeId,
              candidates: [],
              reason: `手动指定新编号 ${pipeId}`,
            }
          : r
      ),
    }));
  }, []);

  /** 重置迁移：全部老管记录回到待处理，断点清零 */
  const resetMigration = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "idle",
      failure: null,
      processed: 0,
      records: s.records.map((r) => ({
        ...r,
        migrateStatus: "pending",
        newPipeId: null,
        candidates: [],
        reason: "",
      })),
    }));
  }, []);

  const setFailureInjection = useCallback((patch: Partial<OrganState["failureInjection"]>) => {
    setState((s) => ({ ...s, failureInjection: { ...s.failureInjection, ...patch } }));
  }, []);

  /** 签发维护报告：迁移未走完（有待处理/待确认）时禁止签发 */
  const issueReport = useCallback(() => {
    const snap = stateRef.current;
    const stats = migrationStats(snap.records);
    if (!stats.done) return false;

    const lines = snap.records
      .filter((r) => r.migrateStatus === "migrated" && r.newPipeId)
      .map((r: OldRecord) => {
        const pipe = snap.pipes.find((p) => p.id === r.newPipeId)!;
        return {
          recordId: r.id,
          oldNo: r.oldNo,
          newNo: pipe.id,
          stop: r.stop || pipe.stop,
          pitch: r.pitch,
          cents: r.cents,
          reedState: r.reedState,
          notes: r.notes,
        };
      });

    const report: Report = {
      id: `RPT-${new Date().getFullYear()}-${String(snap.reports.length + 1).padStart(3, "0")}`,
      venue: VENUE,
      issuedAt: new Date().toISOString(),
      lines,
    };
    setState((s) => ({ ...s, reports: [report, ...s.reports] }));
    return true;
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(buildInitialState());
  }, []);

  return {
    state,
    runMigration,
    confirmReview,
    rejectReview,
    manualAssign,
    resetMigration,
    setFailureInjection,
    issueReport,
    resetAll,
  };
}
