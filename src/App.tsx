import { useState } from "react";
import "./styles.css";
import { Dashboard } from "./components/Dashboard";
import { MigrationWorkbench } from "./components/MigrationWorkbench";
import { Reports } from "./components/Reports";
import { TuningTable } from "./components/TuningTable";
import { useStore } from "./store";

const TABS = [
  { id: "dashboard", label: "总览" },
  { id: "migration", label: "旧档迁移" },
  { id: "tuning", label: "调音偏差表" },
  { id: "reports", label: "维护报告" },
];

function App() {
  const [tab, setTab] = useState("dashboard");
  const attention = useStore((s) => {
    const list = Object.values(s.migration.entries);
    return list.filter((e) => e.status === "review" || e.status === "pending").length;
  });

  return (
    <main className="app">
      <nav className="nav">
        <div className="nav-brand">
          <span className="nav-logo">♪</span>
          <b>管风琴可迁移调音档</b>
        </div>
        <div className="nav-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "nav-tab active" : "nav-tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "migration" && attention > 0 && <span className="nav-dot">{attention}</span>}
            </button>
          ))}
        </div>
      </nav>

      {tab === "dashboard" && <Dashboard go={setTab} />}
      {tab === "migration" && <MigrationWorkbench />}
      {tab === "tuning" && <TuningTable />}
      {tab === "reports" && <Reports />}

      <footer className="footer">
        迁移规则：编号对照表 + 音高位置双重校验 · 一管多老档自动并入 · 已签发报告双号锁定 · 迁移未完成禁止签发
      </footer>
    </main>
  );
}

export default App;
