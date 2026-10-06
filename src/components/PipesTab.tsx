import { useMemo, useState } from "react";
import type { OrganState, StopKind } from "../types";

const FILTERS: Array<StopKind | "全部"> = ["全部", "主音栓", "簧片音栓", "混合音栓", "低音管"];

interface Props {
  state: OrganState;
}

export default function PipesTab({ state }: Props) {
  const [filter, setFilter] = useState<StopKind | "全部">("全部");

  const pipes = useMemo(
    () => (filter === "全部" ? state.pipes : state.pipes.filter((p) => p.kind === filter)),
    [state.pipes, filter]
  );

  const stopStats = useMemo(() => {
    const m = new Map<string, { kind: StopKind; total: number; over: number }>();
    for (const p of state.pipes) {
      const cur = m.get(p.stop) ?? { kind: p.kind, total: 0, over: 0 };
      cur.total += 1;
      if (Math.abs(p.cents) >= 8) cur.over += 1;
      m.set(p.stop, cur);
    }
    return [...m.entries()].map(([stop, v]) => ({ stop, ...v }));
  }, [state.pipes]);

  const abnormal = state.records.filter(
    (r) => Math.abs(r.cents) >= 8 || r.reedState.includes("需微调") || r.reedState.includes("复检")
  );

  return (
    <div className="pipes">
      <section className="panel">
        <div className="heading">
          <div>
            <p>音栓列表</p>
            <h2>音栓与音管</h2>
          </div>
        </div>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>新编号</th>
                <th>音栓</th>
                <th>类型</th>
                <th>音高位置</th>
                <th>对应老编号</th>
                <th>音分偏差</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {pipes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="new-no">{p.id}</span>
                  </td>
                  <td>{p.stop}</td>
                  <td>{p.kind}</td>
                  <td>{p.pitch}</td>
                  <td>{p.oldNoRef !== null ? `老 ${p.oldNoRef}` : "新增音栓"}</td>
                  <td className={Math.abs(p.cents) >= 8 ? "dev-over" : ""}>
                    {p.cents > 0 ? "+" : ""}
                    {p.cents}cent
                  </td>
                  <td>
                    {Math.abs(p.cents) >= 8 ? (
                      <span className="badge badge-failed">偏差超限</span>
                    ) : (
                      <span className="badge badge-done">正常</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>按音栓汇总</p>
            <h2>音栓偏差表</h2>
          </div>
        </div>
        <div className="stop-bars">
          {stopStats.map((s) => (
            <div key={s.stop} className="stop-bar-row">
              <span className="stop-name">{s.stop}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${s.over > 0 ? "over" : ""}`}
                  style={{ width: `${Math.min(100, (s.over / s.total) * 100)}%` }}
                />
              </div>
              <span className="stop-meta">
                {s.total} 管 · 超限 {s.over}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>环境记录</p>
            <h2>温湿度记录</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>场馆</th>
                <th>音栓</th>
                <th>音高</th>
                <th>温度</th>
                <th>湿度</th>
              </tr>
            </thead>
            <tbody>
              {state.records.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.venue}</td>
                  <td>{r.stop || "—"}</td>
                  <td>{r.pitch}</td>
                  <td>{r.temperature}°C</td>
                  <td>{r.humidity}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>需要维修人员关注</p>
            <h2>异常音管标记（{abnormal.length}）</h2>
          </div>
        </div>
        {abnormal.length === 0 ? (
          <p className="empty">无异常音管。</p>
        ) : (
          <div className="record-list">
            {abnormal.map((r) => (
              <article key={r.id} className="record-card pending">
                <div className="record-no">
                  <b>老 {r.oldNo}</b>
                </div>
                <div className="record-body">
                  <h3>
                    {r.stop || "音栓栏污损"} · {r.pitch} · 偏差 {r.cents > 0 ? "+" : ""}
                    {r.cents}cent
                  </h3>
                  <p>
                    {r.reedState} · {r.notes}
                  </p>
                  <p className="record-meta">
                    {r.date} · {r.temperature}°C / {r.humidity}%
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
