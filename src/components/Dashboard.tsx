import { OLD_RECORDS, STOPS, VENUE, ENV_READINGS } from "../seed";
import { envById, migrationGate, migrationProgress, useStore } from "../store";
import { isAbnormal } from "../types";
import { Badge, Panel, ProgressBar } from "./ui";

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const migration = useStore((s) => s.migration);
  const p = migrationProgress();
  const gate = migrationGate();
  const abnormal = OLD_RECORDS.filter((r) => isAbnormal(r.cents));

  return (
    <>
      <section className="hero">
        <p>hxyfront-62005 · 可迁移调音档 · {VENUE}</p>
        <h1>音管编号重排 · 旧档迁移工作台</h1>
        <span>
          加装 Mixture III 新音栓后全琴编号整体重排，老编号被新管复用。本档按
          <b>「编号对照表 + 音高位置」</b>把旧调音记录迁入新编号：一个新号可并入多根老管；音位对不上的先进待确认，
          对照表查无的留在待处理区。已签发报告永久保留旧号，迁移走完后补全新号；迁移未完成不能签发新报告。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>老管记录</small>
          <strong>{OLD_RECORDS.length}</strong>
        </article>
        <article>
          <small>新编号音管</small>
          <strong>{16}</strong>
        </article>
        <article>
          <small>偏差超限（&gt;5 音分）</small>
          <strong className="text-danger">{abnormal.length}</strong>
        </article>
        <article>
          <small>最新温度 / 湿度</small>
          <strong>{ENV_READINGS[ENV_READINGS.length - 1].tempC}° · {ENV_READINGS[ENV_READINGS.length - 1].humidity}%</strong>
        </article>
      </section>

      <Panel
        sub="迁移状态"
        title="旧档 → 新号 迁移进度"
        right={
          <button className="primary" onClick={() => go("migration")}>
            进入迁移工作台
          </button>
        }
      >
        <ProgressBar value={p.processed} total={p.total} />
        <div className="stat-row">
          <Badge tone="muted">未处理 {p.queued}</Badge>
          <Badge tone="ok">已归位 {p.migrated}</Badge>
          <Badge tone="warn">待确认 {p.review}</Badge>
          <Badge tone="danger">待处理 {p.pending}</Badge>
          <Badge tone="neutral">作废归档 {p.archived}</Badge>
        </div>
        <div className={`callout ${gate.ready ? "callout-ok" : "callout-warn"}`}>
          {gate.ready
            ? "迁移已走完，待确认与待处理均已清空，可以签发新的维护报告（旧号 + 新号双号留档）。"
            : `签发门控：${gate.reason}`}
        </div>
        <p className="hint">断点：{migration.cursor}/{p.total} · 阶段：{phaseLabel(migration.phase)} · 最近更新 {new Date(migration.updatedAt).toLocaleString("zh-CN")}</p>
      </Panel>

      <Panel sub="音栓列表" title="本琴音栓（★ 为本次加装）">
        <div className="stop-grid">
          {STOPS.map((s) => (
            <article key={s.id} className="stop-card">
              <div className="stop-name">
                {s.name} <span className="feet">{s.feet}</span>
                {s.isNew && <Badge tone="info">★ 新音栓</Badge>}
              </div>
              <Badge>{s.family}</Badge>
            </article>
          ))}
        </div>
      </Panel>

      <Panel sub="温湿度记录" title="检测环境">
        <table className="table">
          <thead>
            <tr><th>日期</th><th>场馆</th><th>温度</th><th>湿度</th><th>备注</th></tr>
          </thead>
          <tbody>
            {ENV_READINGS.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td><td>{e.venue}</td>
                <td>{e.tempC} °C</td><td>{e.humidity} %</td><td>{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel sub="异常音管标记" title={`偏差超限音管（${abnormal.length}）`}>
        <div className="abnormal-list">
          {abnormal.map((r) => {
            const m = migration.entries[r.oldNo];
            return (
              <article key={r.oldNo} className="abnormal-card">
                <div>
                  <span className="dual-no">
                    <b className="old-no">{r.oldNo}</b>
                    <span className="arrow">{m?.status === "migrated" ? "→" : "·"}</span>
                    <b className={m?.newNo ? "new-no" : "new-no no-map"}>{m?.newNo ?? "尚未归位"}</b>
                  </span>
                  <small>{r.pitch} · {STOPS.find((s) => s.id === r.stopId)?.name}</small>
                </div>
                <div className="abnormal-right">
                  <Badge tone="danger">{r.cents > 0 ? `+${r.cents}` : r.cents} cent</Badge>
                  <span className="hint">{r.note}</span>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function phaseLabel(phase: string): string {
  return { idle: "空闲", running: "迁移中", interrupted: "已中断（可断点续跑）", done: "完成" }[phase] ?? phase;
}
