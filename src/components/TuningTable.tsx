import { useMemo, useState } from "react";
import { OLD_RECORDS, STOPS } from "../seed";
import { envById, useStore } from "../store";
import { isAbnormal, StopFamily } from "../types";
import { Badge, Panel } from "./ui";

const FAMILIES: Array<StopFamily | "全部"> = ["全部", "主音栓", "簧片音栓", "混合音栓", "低音管"];

export function TuningTable() {
  const entries = useStore((s) => s.migration.entries);
  const [family, setFamily] = useState<StopFamily | "全部">("全部");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const rows = useMemo(() => {
    return OLD_RECORDS.filter((r) => {
      const stop = STOPS.find((s) => s.id === r.stopId)!;
      if (family !== "全部" && stop.family !== family) return false;
      if (onlyAbnormal && !isAbnormal(r.cents)) return false;
      return true;
    }).map((r) => ({ rec: r, entry: entries[r.oldNo] }));
  }, [entries, family, onlyAbnormal]);

  return (
    <Panel
      sub="调音偏差表"
      title="音管调音档案（旧号 → 新号双号并存）"
      right={
        <label className="inline-check">
          <input type="checkbox" checked={onlyAbnormal} onChange={(e) => setOnlyAbnormal(e.target.checked)} />
          只看偏差超限（&gt;5¢）
        </label>
      }
    >
      <div className="chips">
        {FAMILIES.map((f) => (
          <button key={f} className={family === f ? "chip active" : "chip"} onClick={() => setFamily(f)}>
            {f}
          </button>
        ))}
      </div>

      <table className="table tuning-table">
        <thead>
          <tr>
            <th>旧编号</th><th>新编号</th><th>音栓</th><th>音高</th>
            <th>音分偏差</th><th>簧片状态</th><th>环境</th><th>维修备注</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rec, entry }) => {
            const env = envById(rec.envId);
            return (
              <tr key={rec.oldNo} className={isAbnormal(rec.cents) ? "row-danger" : ""}>
                <td><b className="old-no">{rec.oldNo}</b></td>
                <td>
                  {entry?.status === "migrated" && entry.newNo ? (
                    <span className="dual-no"><span className="arrow">→</span><b className="new-no">{entry.newNo}</b>
                      {entry.confidence === "manual" && <Badge tone="info">人工</Badge>}
                    </span>
                  ) : entry?.status === "archived" ? (
                    <Badge tone="muted">已作废</Badge>
                  ) : (
                    <Badge tone={entry?.status === "review" ? "warn" : entry?.status === "pending" ? "danger" : "muted"}>
                      {entry?.status === "review" ? "待确认" : entry?.status === "pending" ? "待处理" : "未迁移"}
                    </Badge>
                  )}
                </td>
                <td>{STOPS.find((s) => s.id === rec.stopId)?.name}</td>
                <td>{rec.pitch}</td>
                <td>
                  <span className={isAbnormal(rec.cents) ? "cents-bad" : "cents-ok"}>
                    {rec.cents > 0 ? `+${rec.cents}` : rec.cents} ¢
                  </span>
                </td>
                <td>{rec.reedStatus}</td>
                <td className="hint">{env?.tempC}°C / {env?.humidity}%</td>
                <td>{rec.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
