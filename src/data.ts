import type { OldRecord, OrganState, Pipe } from "./types";

export const VENUE = "St.Mary 教堂";
export const STORAGE_KEY = "organ-tuning-migration-v1";

/**
 * 新调音档：加装 Mixture V 音栓后音管编号整体重排。
 * 注意老编号会被新管复用——P-005 复用了老编号 5，但它是 E4 管；
 * 物理上的老 5 号 C4 管在重排后没有拿到编号对照（见 P-008）。
 */
export const seedPipes: Pipe[] = [
  // Principal 8' 主音栓
  { id: "P-001", stop: "Principal 8'", kind: "主音栓", pitch: "C4", oldNoRef: 1, cents: 5 },
  { id: "P-002", stop: "Principal 8'", kind: "主音栓", pitch: "D4", oldNoRef: 2, cents: -3 },
  { id: "P-003", stop: "Principal 8'", kind: "主音栓", pitch: "E4", oldNoRef: 3, cents: -2 },
  { id: "P-004", stop: "Principal 8'", kind: "主音栓", pitch: "F4", oldNoRef: 4, cents: 1 },
  // Trumpet 8' 簧片音栓 —— 老编号 5 被 P-005 复用（编号对照槽位）
  { id: "P-005", stop: "Trumpet 8'", kind: "簧片音栓", pitch: "E4", oldNoRef: 5, cents: 0 },
  { id: "P-006", stop: "Trumpet 8'", kind: "簧片音栓", pitch: "G4", oldNoRef: 6, cents: 4 },
  { id: "P-007", stop: "Trumpet 8'", kind: "簧片音栓", pitch: "A4", oldNoRef: 7, cents: -6 },
  { id: "P-008", stop: "Trumpet 8'", kind: "簧片音栓", pitch: "C4", oldNoRef: null, cents: 9 },
  // Bourdon 16' 低音管
  { id: "P-009", stop: "Bourdon 16'", kind: "低音管", pitch: "C2", oldNoRef: 8, cents: -10 },
  { id: "P-010", stop: "Bourdon 16'", kind: "低音管", pitch: "D2", oldNoRef: 9, cents: -8 },
  { id: "P-011", stop: "Bourdon 16'", kind: "低音管", pitch: "F2", oldNoRef: 10, cents: -12 },
  // Mixture V 混合音栓（新增音栓，无老编号对照）
  { id: "P-012", stop: "Mixture V", kind: "混合音栓", pitch: "C5", oldNoRef: null, cents: 2 },
  { id: "P-013", stop: "Mixture V", kind: "混合音栓", pitch: "G5", oldNoRef: null, cents: -1 },
  { id: "P-014", stop: "Mixture V", kind: "混合音栓", pitch: "C6", oldNoRef: null, cents: 3 },
  { id: "P-015", stop: "Mixture V", kind: "混合音栓", pitch: "E6", oldNoRef: null, cents: -2 },
];

function mkRecord(
  id: string,
  oldNo: number,
  stop: string,
  pitch: string,
  cents: number,
  temperature: number,
  humidity: number,
  reedState: string,
  notes: string,
  date: string
): OldRecord {
  return {
    id,
    venue: VENUE,
    stop,
    oldNo,
    pitch,
    cents,
    temperature,
    humidity,
    reedState,
    notes,
    date,
    migrateStatus: "pending",
    newPipeId: null,
    candidates: [],
    reason: "",
  };
}

/**
 * 老维护记录（重排前建档）。
 * - 大多数记录：编号对照 + 音高位置一致，可自动归位；
 * - R-05：老号 5 被新管复用，编号对照指向 P-005(E4)，音高位置指向 P-008(C4) → 待确认；
 * - R-11：同一根老管的二次上门记录，与 R-01 同归 P-001（一对多）；
 * - R-12：新调音档中无 B4 音高位置、编号 11 无对照 → 留待处理区；
 * - R-13：票根音栓栏污损，音高 C4 跨 Principal/Trumpet 两个音栓 → 待确认。
 */
export const seedRecords: OldRecord[] = [
  mkRecord("R-01", 1, "Principal 8'", "C4", 5, 22, 45, "正常", "季度调音", "2026-03-12"),
  mkRecord("R-02", 2, "Principal 8'", "D4", -3, 22, 45, "正常", "季度调音", "2026-03-12"),
  mkRecord("R-03", 3, "Principal 8'", "E4", -2, 21, 48, "正常", "季度调音", "2026-03-12"),
  mkRecord("R-04", 4, "Principal 8'", "F4", 1, 21, 48, "正常", "季度调音", "2026-03-12"),
  mkRecord("R-05", 5, "Trumpet 8'", "C4", 9, 23, 52, "簧片需微调", "簧片振动偏大，标记复检", "2026-04-02"),
  mkRecord("R-06", 6, "Trumpet 8'", "G4", 4, 23, 52, "正常", "季度调音", "2026-04-02"),
  mkRecord("R-07", 7, "Trumpet 8'", "A4", -6, 23, 50, "正常", "季度调音", "2026-04-02"),
  mkRecord("R-08", 8, "Bourdon 16'", "C2", -10, 20, 55, "正常", "低音管偏差偏大", "2026-02-18"),
  mkRecord("R-09", 9, "Bourdon 16'", "D2", -8, 20, 55, "标记复检", "复检音分偏差", "2026-02-18"),
  mkRecord("R-10", 10, "Bourdon 16'", "F2", -12, 19, 58, "正常", "偏差超限，待调音", "2026-02-18"),
  mkRecord("R-11", 1, "Principal 8'", "C4", -2, 24, 40, "正常", "二次上门微调", "2026-05-21"),
  mkRecord("R-12", 11, "Trumpet 8'", "B4", 2, 22, 46, "正常", "编号 11 无对照，音高位置缺失", "2026-01-09"),
  mkRecord("R-13", 12, "", "C4", 0, 22, 45, "正常", "旧票根音栓栏污损", "2026-01-09"),
];

export function buildInitialState(): OrganState {
  return {
    version: 1,
    pipes: seedPipes.map((p) => ({ ...p })),
    records: seedRecords.map((r) => ({ ...r })),
    reports: [],
    phase: "idle",
    failure: null,
    failureInjection: { enabled: false, after: 3 },
    processed: 0,
  };
}
