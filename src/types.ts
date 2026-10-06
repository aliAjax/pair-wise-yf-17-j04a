export type StopKind = "主音栓" | "簧片音栓" | "混合音栓" | "低音管";

/** 新调音档中的一根音管（加装音栓、整体重排后的编号体系） */
export interface Pipe {
  /** 新编号，如 P-005 */
  id: string;
  /** 音栓名称 */
  stop: string;
  kind: StopKind;
  /** 音高位置，如 C4 */
  pitch: string;
  /** 编号对照：该管沿用/对应的老编号；新增音栓为 null */
  oldNoRef: number | null;
  /** 当前音分偏差 */
  cents: number;
}

export type MigrateStatus = "pending" | "review" | "migrated";

/** 老维护记录（编号重排前建档） */
export interface OldRecord {
  id: string;
  venue: string;
  /** 音栓（旧票根音栓栏可能污损为空） */
  stop: string;
  oldNo: number;
  pitch: string;
  cents: number;
 temperature: number;
  humidity: number;
  reedState: string;
  notes: string;
  date: string;
  /** 迁移状态：待处理 / 待确认 / 已归位 */
  migrateStatus: MigrateStatus;
  /** 归位的新管编号 */
  newPipeId: string | null;
  /** 待确认候选新管 */
  candidates: string[];
  /** 判定说明（编号对照 / 音高位置） */
  reason: string;
}

/** 已签发维护报告中的一行：新号老号同时保留 */
export interface ReportLine {
  recordId: string;
  oldNo: number;
  newNo: string;
  stop: string;
  pitch: string;
  cents: number;
  reedState: string;
  notes: string;
}

export interface Report {
  id: string;
  venue: string;
  issuedAt: string;
  lines: ReportLine[];
}

export type MigrationPhase = "idle" | "running" | "failed" | "done";

/** 故障注入：模拟迁移中途失败，验证断点续跑 */
export interface FailureInjection {
  enabled: boolean;
  /** 处理几条老管记录后中断 */
  after: number;
}

export interface OrganState {
  version: number;
  pipes: Pipe[];
  records: OldRecord[];
  reports: Report[];
  phase: MigrationPhase;
  failure: string | null;
  failureInjection: FailureInjection;
  /** 断点：已处理到的记录数 */
  processed: number;
}
