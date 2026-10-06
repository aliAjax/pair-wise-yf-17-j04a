import { ReactNode } from "react";
import { EntryStatus } from "../types";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "muted"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export const STATUS_META: Record<EntryStatus, { label: string; tone: "neutral" | "ok" | "warn" | "danger" | "muted" }> = {
  queued: { label: "未处理", tone: "muted" },
  migrated: { label: "已归位", tone: "ok" },
  review: { label: "待确认", tone: "warn" },
  pending: { label: "待处理", tone: "danger" },
  archived: { label: "已作废归档", tone: "muted" },
};

export function Panel({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          {sub && <p>{sub}</p>}
          <h2>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%（{value}/{total}）</span>
    </div>
  );
}
