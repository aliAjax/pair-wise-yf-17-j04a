import { useState } from "react";
import { CROSSWALK, NEW_PIPES, OLD_ORDER, STOPS } from "../seed";
import {
  actions,
  getNewPipe,
  getOldRecord,
  migrationProgress,
  useStore,
} from "../store";
import { MigrationEntry } from "../types";
import { Badge, Panel, ProgressBar, STATUS_META } from "./ui";

type Tab = "review" | "pending" | "migrated" | "crosswalk" | "log";

const TABS: Array<{ id: Tab; label: (p: ReturnType<typeof migrationProgress>) => string }> = [
  { id: "review", label: (p) => `待确认 (${p.review})` },
  { id: "pending", label: (p) => `待处理区 (${p.pending})` },
  { id: "migrated", label: (p) => `已归位 (${p.migrated})` },
  { id: "crosswalk", label: () => "编号对照表" },
  { id: "log", label: () => "运行日志" },
];

export function MigrationWorkbench() {
  const [tab, setTab] = useState<Tab>("review");
  const migration = useStore((s) => s.migration);
  const failNext = useStore((s) => s.failNext);
  const p = migrationProgress();
  const running = migration.phase === "running";
  const allScanned = migration.cursor >= OLD_ORDER.length;

  return (
    <>
      <Panel
        sub="迁移引擎"
        title="旧档迁移工作台"
        right={
          <div className="btn-row">
            <button
              className={running ? "" : "primary"}
              disabled={running || allScanned}
              onClick={() => void actions.startOrResume()}
              title="按编号对照表 + 音高位置逐根迁移，自动暂停在断点后可继续"
            >
              {running ? "迁移中…" : migration.cursor === 0 ? "开始迁移" : "从断点继续"}
            </button>
            <label className="inline-check" title="让下一根处理失败，演示断点恢复">
              <input
                type="checkbox"
                checked={failNext}
                onChange={(e) => actions.setFailNext(e.target.checked)}
              />
              下一根注入故障
            </label>
            <button onClick={actions.resetMigration}>重置演练</button>
          </div>
        }
      >
        <ProgressBar value={p.processed} total={p.total} />
        <div className="stat-row">
          <Badge tone="muted">未处理 {p.queued}</Badge>
          <Badge tone="ok">已归位 {p.migrated}</Badge>
          <Badge tone="warn">待确认 {p.review}</Badge>
          <Badge tone="danger">待处理 {p.pending}</Badge>
          <Badge tone="neutral">作废归档 {p.archived}</Badge>
          {migration.phase === "interrupted" && <Badge tone="danger">已中断 · 断点 {migration.cursor}</Badge>}
        </div>
        <p className="hint">
          迁移每处理 {3} 根提交一次断点；故障/刷新后已处理结果不回滚，点击「从断点继续」即可恢复。
          自动迁移只做高置信归位，拿不准的一律进待确认。
        </p>
      </Panel>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "tab active" : "tab"} onClick={() => setTab(t.id)}>
            {t.label(p)}
          </button>
        ))}
      </div>

      {tab === "review" && <ReviewList />}
      {tab === "pending" && <PendingList />}
      {tab === "migrated" && <MigratedList />}
      {tab === "crosswalk" && <CrosswalkTable />}
      {tab === "log" && <LogView />}
    </>
  );
}

function EntryHead({ entry }: { entry: MigrationEntry }) {
  const rec = getOldRecord(entry.oldNo)!;
  const target = entry.newNo ? getNewPipe(entry.newNo) : undefined;
  return (
    <div className="entry-head">
      <span className="dual-no">
        <b className="old-no">{entry.oldNo}</b>
        {target && (
          <>
            <span className="arrow">→</span>
            <b className="new-no">{entry.newNo}</b>
          </>
        )}
      </span>
      <div className="entry-meta">
        <Badge>{STOPS.find((s) => s.id === rec.stopId)?.name} {target ? `· 目标音位 ${target.pitch}` : ""}</Badge>
        <Badge tone={STATUS_META[entry.status].tone}>{STATUS_META[entry.status].label}</Badge>
        {entry.confidence === "manual" && <Badge tone="info">人工确认</Badge>}
      </div>
      <p className="entry-reason">{entry.reason}</p>
    </div>
  );
}

function OldSnapshot({ oldNo }: { oldNo: string }) {
  const rec = getOldRecord(oldNo)!;
  return (
    <div className="snapshot">
      <div><small>实测音高</small><b>{rec.pitch}</b></div>
      <div><small>音分偏差</small><b className={Math.abs(rec.cents) > 5 ? "text-danger" : ""}>{rec.cents > 0 ? `+${rec.cents}` : rec.cents}</b></div>
      <div><small>簧片</small><b>{rec.reedStatus}</b></div>
      <div className="snapshot-note"><small>旧档备注</small><span>{rec.note}</span></div>
    </div>
  );
}

function NewPipeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {NEW_PIPES.map((pipe) => (
        <option key={pipe.id} value={pipe.id}>
          {pipe.id}（{STOPS.find((s) => s.id === pipe.stopId)?.name} · {pipe.pitch}）
        </option>
      ))}
    </select>
  );
}

function ReviewList() {
  const entries = useStore((s) =>
    OLD_ORDER.map((no) => s.migration.entries[no]).filter((e): e is MigrationEntry => e?.status === "review"),
  );
  if (entries.length === 0) {
    return <Empty title="没有待确认项" text="自动迁移对音高位置没有把握时会把老管放到这里；迁移开始后这里可能出现音位与对照表不符的老管。" />;
  }
  return (
    <Panel sub="拿不准，先列待确认" title={`待确认老管（${entries.length}）`}>
      <div className="card-list">
        {entries.map((e) => (
          <ReviewCard key={e.oldNo} entry={e} />
        ))}
      </div>
    </Panel>
  );
}

function ReviewCard({ entry }: { entry: MigrationEntry }) {
  const [choice, setChoice] = useState(entry.newNo ?? NEW_PIPES[0].id);
  const target = getNewPipe(entry.newNo ?? "");
  const rec = getOldRecord(entry.oldNo)!;
  const samePitch = target?.midi === rec.midi;
  return (
    <article className={`entry-card ${samePitch ? "" : "conflict"}`}>
      <EntryHead entry={entry} />
      <OldSnapshot oldNo={entry.oldNo} />
      <div className="action-row">
        <span className="hint">现场核对后：</span>
        <NewPipeSelect value={choice} onChange={setChoice} />
        <button className="primary" onClick={() => actions.confirmEntry(entry.oldNo, choice)}>
          确认归位
        </button>
        <button onClick={() => actions.sendToPending(entry.oldNo)}>先放待处理区</button>
      </div>
    </article>
  );
}

function PendingList() {
  const entries = useStore((s) =>
    OLD_ORDER.map((no) => s.migration.entries[no]).filter((e): e is MigrationEntry => e?.status === "pending"),
  );
  if (entries.length === 0) {
    return <Empty title="待处理区为空" text="没归位的老管记录会留在待处理区：既不在对照表中、也无法按音高定位的老管会出现在这里。" />;
  }
  return (
    <Panel sub="没归位的老管留在这" title={`待处理区（${entries.length}）`}>
      <div className="card-list">
        {entries.map((e) => (
          <PendingCard key={e.oldNo} entry={e} />
        ))}
      </div>
    </Panel>
  );
}

function PendingCard({ entry }: { entry: MigrationEntry }) {
  const [choice, setChoice] = useState(NEW_PIPES[0].id);
  const [note, setNote] = useState("");
  return (
    <article className="entry-card pending">
      <EntryHead entry={entry} />
      <OldSnapshot oldNo={entry.oldNo} />
      <div className="action-row wrap">
        <NewPipeSelect value={choice} onChange={setChoice} />
        <button className="primary" onClick={() => actions.assignPending(entry.oldNo, choice)}>
          指派新号并归位
        </button>
        <input
          className="note-input"
          placeholder="作废原因（如：已拆除停用）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button onClick={() => actions.archiveEntry(entry.oldNo, note)}>确认作废并归档</button>
      </div>
    </article>
  );
}

function MigratedList() {
  const groups = useStore((s) => {
    const byNew = new Map<string, MigrationEntry[]>();
    for (const no of OLD_ORDER) {
      const e = s.migration.entries[no];
      if (e?.status === "migrated" && e.newNo) {
        const list = byNew.get(e.newNo) ?? [];
        list.push(e);
        byNew.set(e.newNo, list);
      }
    }
    return NEW_PIPES.map((pipe) => ({ pipe, list: byNew.get(pipe.id) ?? [] }));
  });

  return (
    <Panel sub="一个新号可并入多根老管" title="已归位：按新编号查看迁入的老档">
      <div className="new-grid">
        {groups.map(({ pipe, list }) => (
          <article key={pipe.id} className={`new-card ${list.length === 0 ? "empty" : ""}`}>
            <header>
              <b className="new-no">{pipe.id}</b>
              <Badge>{STOPS.find((s) => s.id === pipe.stopId)?.name} · {pipe.pitch}</Badge>
              {pipe.isNew && <Badge tone="info">新装管</Badge>}
            </header>
            {list.length === 0 ? (
              <p className="hint">暂无旧档迁入{pipe.isNew ? "（新管无历史）" : ""}</p>
            ) : (
              <ul className="source-list">
                {list.map((e) => {
                  const rec = getOldRecord(e.oldNo)!;
                  return (
                    <li key={e.oldNo}>
                      <span className="dual-no">
                        <b className="old-no">{e.oldNo}</b>
                        <span className="hint">{rec.pitch} · {rec.cents > 0 ? `+${rec.cents}` : rec.cents}¢ · {rec.reedStatus}</span>
                      </span>
                      <Badge tone={e.confidence === "manual" ? "info" : "ok"}>
                        {e.confidence === "manual" ? "人工" : "自动"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function CrosswalkTable() {
  const entries = useStore((s) => s.migration.entries);
  return (
    <Panel sub="管风琴厂编号对照" title="编号对照表（随迁移结果标注状态）">
      <table className="table">
        <thead>
          <tr><th>新编号</th><th>音高位置</th><th>对照老号</th><th>迁移状态</th></tr>
        </thead>
        <tbody>
          {CROSSWALK.map((row) => {
            const pipe = getNewPipe(row.newNo)!;
            return (
              <tr key={row.newNo}>
                <td><b className="new-no">{row.newNo}</b></td>
                <td>{row.declaredPitch}</td>
                <td>
                  {row.oldNos.map((no) => {
                    const e = entries[no];
                    const rec = getOldRecord(no);
                    const mismatch = rec && rec.midi !== pipe.midi;
                    return (
                      <span key={no} className="chip-inline">
                        <b className="old-no">{no}</b>
                        {mismatch && <Badge tone="warn">实测 {rec.pitch} 不符</Badge>}
                        {e && <Badge tone={STATUS_META[e.status].tone}>{STATUS_META[e.status].label}</Badge>}
                      </span>
                    );
                  })}
                </td>
                <td>{row.oldNos.every((no) => entries[no]?.status === "migrated") ? <Badge tone="ok">已归位</Badge> : <Badge tone="muted">处理中</Badge>}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={4} className="hint">注：P-17 不在对照表中，会留在待处理区；P-9 虽在表中但实测音位不符，会进待确认。</td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

function LogView() {
  const log = useStore((s) => s.migration.log);
  return (
    <Panel sub="断点与故障可追溯" title="迁移日志">
      <div className="log">
        {[...log].reverse().map((l) => (
          <div key={l.id} className={`log-line log-${l.level}`}>
            <span className="log-t">{l.t}</span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
