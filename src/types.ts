// 管风琴调音档：编号重排迁移相关类型定义

export type StopFamily = "主音栓" | "簧片音栓" | "混合音栓" | "低音管";

export type ReedStatus = "无簧片" | "正常" | "需微调" | "待更换";

export interface StopInfo {
  id: string;
  name: string;
  feet: string;
  family: StopFamily;
  /** 本次加装的新音栓 */
  isNew?: boolean;
}

export interface EnvReading {
  id: string;
  date: string;
  venue: string;
  tempC: number;
  humidity: number;
  note: string;
}

/** 旧编号体系下的单次调音记录（老管档案） */
export interface TuningRecord {
  oldNo: string;
  stopId: string;
  pitch: string;
  midi: number;
  cents: number;
  reedStatus: ReedStatus;
  note: string;
  date: string;
  envId: string;
}

/** 新编号体系下的音管清册 */
export interface NewPipe {
  id: string;
  stopId: string;
  pitch: string;
  midi: number;
  /** 随新音栓加装、没有任何旧档案的管 */
  isNew?: boolean;
  /** 声明合并到本新号的老管（一个新号可对应多根老管） */
  sources: string[];
}

// ------- 迁移 -------

export type EntryStatus =
  | "queued" // 尚未处理
  | "migrated" // 已归位到新号
  | "review" // 拿不准，待确认
  | "pending" // 没归位，留在待处理区
  | "archived"; // 确认作废/停用，归档不迁移

export type Confidence = "auto" | "manual";

export interface MigrationEntry {
  oldNo: string;
  status: EntryStatus;
  newNo?: string;
  confidence?: Confidence;
  reason?: string;
  at?: number;
}

export interface LogLine {
  id: string;
  t: string;
  level: "info" | "ok" | "warn" | "error";
  text: string;
}

export interface MigrationState {
  phase: "idle" | "running" | "interrupted" | "done";
  /** 已处理到老管序号的断点（断点续跑用） */
  cursor: number;
  entries: Record<string, MigrationEntry>;
  log: LogLine[];
  updatedAt: number;
}

// ------- 维护报告 -------

export interface ReportItem {
  /** 签发时快照的旧号（历史报告至少保留旧号） */
  oldNos: string[];
  /** 签发时快照的新号；重排前签发的老报告可能为空，迁移后补全显示 */
  newNo?: string;
  stopId: string;
  pitch?: string;
  cents?: number;
  reedStatus?: ReedStatus;
  note: string;
}

export interface MaintenanceReport {
  id: string;
  venue: string;
  date: string;
  technician: string;
  summary: string;
  items: ReportItem[];
  createdAt: number;
  /** 重排前签发的历史报告，内容锁定、双号并存 */
  historical?: boolean;
}

const SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** "F#4" -> 66，用于按音高位置比对 */
export function pitchToMidi(pitch: string): number {
  const m = /^([A-G])(#?)(-?\d+)$/.exec(pitch.trim());
  if (!m) throw new Error("无法解析音高: " + pitch);
  return (parseInt(m[3], 10) + 1) * 12 + SEMITONE[m[1]] + (m[2] ? 1 : 0);
}

/** 偏差判定阈值：|音分| > 5 记为异常 */
export const ABNORMAL_LIMIT = 5;

export function isAbnormal(cents: number): boolean {
  return Math.abs(cents) > ABNORMAL_LIMIT;
}
