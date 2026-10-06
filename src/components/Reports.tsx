import { useState } from "react";
import { NEW_PIPES, STOPS } from "../seed";
import { actions, migrationGate, migrationProgress, useStore } from "../store";
import { Badge, Panel } from "./ui";

export function Reports() {
  const reports = useStore((s) => s.reports);
  const gate = migrationGate();
  const p = migrationProgress();

  return (
    <>
      <Panel
        sub="单次维护报告"
        title="新维护报告（草稿）"
        right={
          gate.ready ? (
            <Badge tone="ok">迁移已走完 · 允许签发</Badge>
          ) : (
            <Badge tone="danger">迁移未走完 · 禁止签发</Badge>
          )
        }
      >
        {!gate.ready && (
          <div className="callout callout-danger">
            <b>签发门控未通过：</b>{gate.reason}
            <div className="gate-bar">
              <span>已归位 {p.migrated}</span>
              <span>待确认 {p.review}</span>
              <span>待处理 {p.pending}</span>
              <span>未处理 {p.queued}</span>
            </div>
          </div>
        )}
        {gate.ready && (
          <div className="callout callout-ok">
            全部老管已归位或作废归档，签发条目会同时快照<b>旧号与新号</b>；报告一经签发不可修改。
          </div>
        )}
        <DraftForm disabled={!gate.ready} />
      </Panel>

      <Panel sub="历史报告内容锁定" title="已签发维护报告（旧号 + 新号双号留档）">
        <div className="report-list">
          {reports.map((r) => (
            <article key={r.id} className="report-card">
              <header>
                <div>
                  <h3>{r.id} · {r.date}</h3>
                  <p className="hint">{r.venue} · {r.technician}{r.historical && <Badge tone="muted">重排前签发</Badge>}</p>
                </div>
                <Badge tone="ok">已签发（锁定）</Badge>
              </header>
              <p className="report-summary">{r.summary}</p>
              <table className="table compact">
                <thead>
                  <tr><th>旧编号（签发时快照）</th><th>新编号</th><th>音栓 / 音高</th><th>备注</th></tr>
                </thead>
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.oldNos.map((no) => (
                          <b key={no} className="old-no">{no} </b>
                        ))}
                      </td>
                      <td>
                        {it.newNo ? <b className="new-no">{it.newNo}</b> : <span className="hint">签发时新号未排，见迁移补全 →</span>}
                      </td>
                      <td>{STOPS.find((s) => s.id === it.stopId)?.name}{it.pitch ? ` · ${it.pitch}` : ""}</td>
                      <td>{it.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}

function DraftForm({ disabled }: { disabled: boolean }) {
  const draft = useStore((s) => s.draft);
  const [newNo, setNewNo] = useState(NEW_PIPES[0].id);
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState("");

  const sign = () => {
    const res = actions.signReport();
    setFlash(res.ok ? `已签发：${res.message}` : `无法签发：${res.message}`);
    setTimeout(() => setFlash(""), 3000);
  };

  return (
    <fieldset className="draft" disabled={disabled}>
      <div className="field-grid">
        <label>
          <span>调音师</span>
          <input value={draft.technician} onChange={(e) => actions.updateDraft("technician", e.target.value)} placeholder="填写调音师姓名" />
        </label>
        <label className="span-2">
          <span>本次概述</span>
          <input value={draft.summary} onChange={(e) => actions.updateDraft("summary", e.target.value)} placeholder="本次维护概述" />
        </label>
      </div>

      <div className="action-row wrap add-row">
        <select value={newNo} onChange={(e) => setNewNo(e.target.value)}>
          {NEW_PIPES.map((pipe) => (
            <option key={pipe.id} value={pipe.id}>
              {pipe.id}（{STOPS.find((s) => s.id === pipe.stopId)?.name} · {pipe.pitch}）
            </option>
          ))}
        </select>
        <input className="note-input" placeholder="条目备注（偏差、簧片、处理措施）" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={() => { actions.addDraftItem(newNo, note); setNote(""); }}>
          加入条目（自动带出并入的旧号）
        </button>
      </div>

      {draft.items.length > 0 && (
        <table className="table compact">
          <thead>
            <tr><th>旧号</th><th>新号</th><th>音栓 / 音高</th><th>备注</th><th></th></tr>
          </thead>
          <tbody>
            {draft.items.map((it, i) => (
              <tr key={i}>
                <td>{it.oldNos.map((no) => <b key={no} className="old-no">{no} </b>)}</td>
                <td><b className="new-no">{it.newNo}</b></td>
                <td>{STOPS.find((s) => s.id === it.stopId)?.name} · {it.pitch}</td>
                <td>{it.note}</td>
                <td><button className="link-btn" onClick={() => actions.removeDraftItem(i)}>移除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="action-row">
        <button className="primary" onClick={sign}>签发报告</button>
        {flash && <span className="hint">{flash}</span>}
      </div>
    </fieldset>
  );
}
