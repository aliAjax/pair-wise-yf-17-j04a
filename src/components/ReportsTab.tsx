import { useState } from "react";
import { migrationStats } from "../migration";
import type { OrganState } from "../types";

interface Props {
  state: OrganState;
  onIssue: () => boolean;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ReportsTab({ state, onIssue }: Props) {
  const stats = migrationStats(state.records);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(state.reports[0]?.id ?? null);

  const handleIssue = () => {
    const ok = onIssue();
    if (!ok) {
      setError(
        `迁移未走完，不能签发新报告：还有 ${stats.pending} 条待处理、${stats.review} 条待确认。请先在迁移工作台完成归位。`
      );
      return;
    }
    setError(null);
  };

  return (
    <div className="reports">
      <section className="panel">
        <div className="heading">
          <div>
            <p>单次维护报告</p>
            <h2>签发维护报告</h2>
          </div>
          <button className="primary" disabled={!stats.done} onClick={handleIssue}>
            签发本次维护报告
          </button>
        </div>
        {!stats.done && (
          <div className="banner banner-block">
            迁移没走完时不能签发新报告：待处理 <b>{stats.pending}</b> 条、待确认 <b>{stats.review}</b> 条。
            已签发的维护报告继续有效，签发时同时保留老编号与新编号。
          </div>
        )}
        {error && (
          <div className="banner banner-failed">
            <strong>签发被拒绝：</strong> {error}
          </div>
        )}
        {stats.done && !error && (
          <p className="empty">迁移已完成（{stats.migrated} 条老管记录全部归位），可以签发。</p>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>已签发报告</p>
            <h2>历史报告（{state.reports.length}）</h2>
          </div>
        </div>
        {state.reports.length === 0 ? (
          <p className="empty">暂无已签发报告。签发后的报告会同时记录老编号与新编号。</p>
        ) : (
          <div className="report-list">
            {state.reports.map((rep) => (
              <article key={rep.id} className="report-card">
                <button className="report-head" onClick={() => setOpenId(openId === rep.id ? null : rep.id)}>
                  <div>
                    <h3>{rep.id}</h3>
                    <p>
                      {rep.venue} · 签发于 {fmtDate(rep.issuedAt)} · 共 {rep.lines.length} 条音管记录
                    </p>
                  </div>
                  <span className="badge badge-done">{openId === rep.id ? "收起" : "展开"}</span>
                </button>
                {openId === rep.id && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>老编号</th>
                          <th>新编号</th>
                          <th>音栓</th>
                          <th>音高位置</th>
                          <th>音分偏差</th>
                          <th>簧片状态</th>
                          <th>维修备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.lines.map((l) => (
                          <tr key={l.recordId}>
                            <td>
                              <span className="old-no">老 {l.oldNo}</span>
                            </td>
                            <td>
                              <span className="new-no">{l.newNo}</span>
                            </td>
                            <td>{l.stop}</td>
                            <td>{l.pitch}</td>
                            <td className={Math.abs(l.cents) >= 8 ? "dev-over" : ""}>
                              {l.cents > 0 ? "+" : ""}
                              {l.cents}cent
                            </td>
                            <td>{l.reedState}</td>
                            <td>{l.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
