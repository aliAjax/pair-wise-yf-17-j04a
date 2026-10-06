import { useMemo, useState } from "react";
import { migrationStats } from "../migration";
import type { OrganState, Pipe } from "../types";

interface Props {
  state: OrganState;
  onRun: () => void;
  onConfirm: (recordId: string, pipeId: string) => void;
  onReject: (recordId: string) => void;
  onAssign: (recordId: string, pipeId: string) => void;
  onReset: () => void;
  onInjection: (patch: Partial<OrganState["failureInjection"]>) => void;
}

const phaseLabel: Record<OrganState["phase"], { text: string; cls: string }> = {
  idle: { text: "未完成", cls: "badge-idle" },
  running: { text: "迁移运行中", cls: "badge-running" },
  failed: { text: "迁移中断 · 断点已保存", cls: "badge-failed" },
  done: { text: "迁移完成", cls: "badge-done" },
};

function pipeLabel(p: Pipe) {
  return `${p.id} · ${p.stop} · ${p.pitch}${p.oldNoRef !== null ? `（对照老号 ${p.oldNoRef}）` : "（新增音栓）"}`;
}

export default function MigrationWorkbench({
  state,
  onRun,
  onConfirm,
  onReject,
  onAssign,
  onReset,
  onInjection,
}: Props) {
  const stats = migrationStats(state.records);
  const [assignDrafts, setAssignDrafts] = useState<Record<string, string>>({});
  const phase = phaseLabel[state.phase];

  const pending = state.records.filter((r) => r.migrateStatus === "pending");
  const review = state.records.filter((r) => r.migrateStatus === "review");
  const migrated = state.records.filter((r) => r.migrateStatus === "migrated");

  const recordsPerPipe = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of migrated) {
      if (r.newPipeId) m.set(r.newPipeId, (m.get(r.newPipeId) ?? 0) + 1);
    }
    return m;
  }, [migrated]);

  const pipeById = (id: string | null) => state.pipes.find((p) => p.id === id);
  const running = state.phase === "running";

  return (
    <div className="migrate">
      <section className="panel migrate-head">
        <div className="heading">
          <div>
            <p>编号重排迁移</p>
            <h2>调音档迁移工作台</h2>
          </div>
          <span className={`badge ${phase.cls}`}>{phase.text}</span>
        </div>

        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${stats.total ? (stats.migrated / stats.total) * 100 : 0}%` }}
          />
        </div>
        <div className="migrate-counts">
          <span className="chip chip-done">已归位 {stats.migrated}</span>
          <span className="chip chip-review">待确认 {stats.review}</span>
          <span className="chip chip-pending">待处理 {stats.pending}</span>
          <span className="chip">总数 {stats.total}</span>
          {stats.multiPipeCount > 0 && (
            <span className="chip chip-multi">一对多新管 {stats.multiPipeCount}</span>
          )}
        </div>

        <div className="migrate-actions">
          <button className="primary" disabled={running || stats.done} onClick={onRun}>
            {state.phase === "failed" || state.processed > 0 ? "从断点恢复" : "开始迁移"}
          </button>
          <button disabled={running} onClick={onReset}>
            重置迁移
          </button>
          <label className="inject">
            <input
              type="checkbox"
              checked={state.failureInjection.enabled}
              onChange={(e) => onInjection({ enabled: e.target.checked })}
            />
            模拟中途故障，处理
            <input
              type="number"
              min={1}
              max={stats.total}
              value={state.failureInjection.after}
              disabled={!state.failureInjection.enabled}
              onChange={(e) => onInjection({ after: Math.max(1, Number(e.target.value) || 1) })}
            />
            条后中断
          </label>
        </div>

        {state.failure && (
          <div className="banner banner-failed">
            <strong>迁移失败，已从断点保存：</strong> {state.failure}
            <div>
              <button className="primary" onClick={onRun}>
                从断点恢复
              </button>
            </div>
          </div>
        )}
        {stats.done && (
          <div className="banner banner-done">
            全部老管记录已归位到新编号，无待确认、无待处理，可以签发维护报告。
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>未归位记录</p>
            <h2>待处理区（{pending.length}）</h2>
          </div>
        </div>
        {pending.length === 0 ? (
          <p className="empty">待处理区为空——所有老管记录都已找到归属。</p>
        ) : (
          <div className="record-list">
            {pending.map((r) => (
              <article key={r.id} className="record-card pending">
                <div className="record-no">
                  <b>老 {r.oldNo}</b>
                  <span className="record-tag">{r.id}</span>
                </div>
                <div className="record-body">
                  <h3>
                    {r.stop || "音栓栏污损"} · {r.pitch} · 偏差 {r.cents > 0 ? "+" : ""}
                    {r.cents}cent
                  </h3>
                  <p>{r.reason}</p>
                  <p className="record-meta">
                    {r.date} · {r.venue} · {r.reedState} · {r.notes}
                  </p>
                  <label className="assign">
                    <span>手动指定新编号：</span>
                    <select
                      value={assignDrafts[r.id] ?? ""}
                      onChange={(e) => setAssignDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    >
                      <option value="">选择新管…</option>
                      {state.pipes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {pipeLabel(p)}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!assignDrafts[r.id]}
                      onClick={() => {
                        if (assignDrafts[r.id]) {
                          onAssign(r.id, assignDrafts[r.id]);
                          setAssignDrafts((d) => ({ ...d, [r.id]: "" }));
                        }
                      }}
                    >
                      归位
                    </button>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>拿不准的先列这里</p>
            <h2>待确认（{review.length}）</h2>
          </div>
        </div>
        {review.length === 0 ? (
          <p className="empty">没有待确认记录。</p>
        ) : (
          <div className="record-list">
            {review.map((r) => (
              <article key={r.id} className="record-card review">
                <div className="record-no">
                  <b>老 {r.oldNo}</b>
                  <span className="record-tag">{r.id}</span>
                </div>
                <div className="record-body">
                  <h3>
                    {r.stop || "音栓栏污损"} · {r.pitch} · 偏差 {r.cents > 0 ? "+" : ""}
                    {r.cents}cent
                  </h3>
                  <p className="review-reason">{r.reason}</p>
                  <p className="record-meta">
                    {r.date} · {r.reedState} · {r.notes}
                  </p>
                  <div className="candidates">
                    {r.candidates.map((cid) => {
                      const p = pipeById(cid);
                      if (!p) return null;
                      return (
                        <button key={cid} className="candidate" onClick={() => onConfirm(r.id, cid)}>
                          确认归位 {cid}
                          <small>
                            {p.stop} · {p.pitch}
                            {p.oldNoRef !== null ? ` · 对照老号 ${p.oldNoRef}` : " · 新增音栓"}
                          </small>
                        </button>
                      );
                    })}
                    <button className="candidate reject" onClick={() => onReject(r.id)}>
                      退回待处理区
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>按编号对照 + 音高位置归位</p>
            <h2>已归位（{migrated.length}）</h2>
          </div>
        </div>
        {migrated.length === 0 ? (
          <p className="empty">尚未归位任何记录。</p>
        ) : (
          <div className="record-list">
            {migrated.map((r) => {
              const p = pipeById(r.newPipeId);
              const count = r.newPipeId ? recordsPerPipe.get(r.newPipeId) ?? 0 : 0;
              return (
                <article key={r.id} className="record-card migrated">
                  <div className="record-no">
                    <b>老 {r.oldNo}</b>
                    <span className="record-tag">{r.id}</span>
                  </div>
                  <div className="record-body">
                    <h3>
                      {r.stop || p?.stop} · {r.pitch} → <span className="new-no">{r.newPipeId}</span>
                      {count > 1 && <span className="badge badge-multi">一对多 · 该新管对应 {count} 根老管</span>}
                    </h3>
                    <p>{r.reason}</p>
                    <p className="record-meta">
                      {r.date} · 偏差 {r.cents > 0 ? "+" : ""}
                      {r.cents}cent · {r.reedState} · {r.notes}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
