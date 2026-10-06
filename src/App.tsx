import { useState } from "react";
import MigrationWorkbench from "./components/MigrationWorkbench";
import PipesTab from "./components/PipesTab";
import ReportsTab from "./components/ReportsTab";
import { migrationStats } from "./migration";
import { useOrganStore } from "./store";
import "./styles.css";

const project = {
  id: "hxyfront-62005",
  sourceNo: 7,
  port: 62005,
  title: "管风琴音管调音记录",
  domain: "管风琴维护",
};

type Tab = "migrate" | "pipes" | "reports";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "migrate", label: "迁移工作台" },
  { key: "pipes", label: "音栓与偏差" },
  { key: "reports", label: "维护报告" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("migrate");
  const store = useOrganStore();
  const { state } = store;
  const stats = migrationStats(state.records);

  const overCount = state.pipes.filter((p) => Math.abs(p.cents) >= 8).length;
  const avgTemp = Math.round(state.records.reduce((sum, r) => sum + r.temperature, 0) / state.records.length);
  const avgHum = Math.round(state.records.reduce((sum, r) => sum + r.humidity, 0) / state.records.length);

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>
          加装新音栓后音管编号整体重排，老编号会被新管复用。本调音档按编号对照与音高位置把旧维护记录迁移到新编号：
          拿不准的先列待确认，迁移失败从断点恢复、未归位记录留在待处理区；已签发报告同时保留老号与新号，迁移未走完不能签发新报告。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>{state.pipes.length}</strong>
        </article>
        <article>
          <small>已归位 / 待确认 / 待处理</small>
          <strong>
            {stats.migrated}
            <span className="metric-sub">
              {" / "}
              {stats.review}
              {" / "}
              {stats.pending}
            </span>
          </strong>
        </article>
        <article>
          <small>偏差超限</small>
          <strong>{overCount}</strong>
        </article>
        <article>
          <small>温度 / 湿度</small>
          <strong>
            {avgTemp}°<span className="metric-sub"> / </span>
            {avgHum}%
          </strong>
        </article>
      </section>

      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === "migrate" && !stats.done && <span className="tab-dot" />}
            {t.key === "reports" && state.reports.length > 0 && (
              <span className="tab-count">{state.reports.length}</span>
            )}
          </button>
        ))}
        <button className="reset-all" onClick={store.resetAll}>
          重置演示数据
        </button>
      </nav>

      {tab === "migrate" && (
        <MigrationWorkbench
          state={state}
          onRun={store.runMigration}
          onConfirm={store.confirmReview}
          onReject={store.rejectReview}
          onAssign={store.manualAssign}
          onReset={store.resetMigration}
          onInjection={store.setFailureInjection}
        />
      )}
      {tab === "pipes" && <PipesTab state={state} />}
      {tab === "reports" && <ReportsTab state={state} onIssue={store.issueReport} />}

      <footer className="app-footer">
        {project.id} · {project.domain} · 调音档本地保存在浏览器 localStorage（键：organ-tuning-migration-v1）
      </footer>
    </main>
  );
}
