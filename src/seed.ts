import {
  EnvReading,
  MaintenanceReport,
  NewPipe,
  StopInfo,
  TuningRecord,
  pitchToMidi,
} from "./types";

export const VENUE = "St.Mary 教堂";

export const STOPS: StopInfo[] = [
  { id: "S1", name: "Bourdon", feet: "16'", family: "低音管" },
  { id: "S2", name: "Principal", feet: "8'", family: "主音栓" },
  { id: "S3", name: "Trumpet", feet: "8'", family: "簧片音栓" },
  { id: "S4", name: "Mixture", feet: "III", family: "混合音栓", isNew: true },
];

// 重排前老音栓名称（旧维护记录用）
export const OLD_STOP_NAMES: Record<string, string> = {
  S1: "Bourdon 16'",
  S2: "Principal 8'",
  S3: "Trumpet 8'",
  S4: "Mixture III（新音栓，无旧档）",
};

// 新音管清册（重排后）。一个新号可由多根老管合并：N4-04 <- P-11 + P-12
export const NEW_PIPES: NewPipe[] = [
  { id: "N1-01", stopId: "S1", pitch: "C2", midi: pitchToMidi("C2"), sources: ["P-1"] },
  { id: "N1-02", stopId: "S1", pitch: "D2", midi: pitchToMidi("D2"), sources: ["P-2"] },
  { id: "N1-03", stopId: "S1", pitch: "F#2", midi: pitchToMidi("F#2"), sources: ["P-3"] },
  { id: "N1-04", stopId: "S1", pitch: "A2", midi: pitchToMidi("A2"), sources: ["P-4"] },
  { id: "N1-05", stopId: "S1", pitch: "C3", midi: pitchToMidi("C3"), sources: ["P-5"] },

  { id: "N2-01", stopId: "S2", pitch: "C4", midi: pitchToMidi("C4"), sources: ["P-6"] },
  { id: "N2-02", stopId: "S2", pitch: "E4", midi: pitchToMidi("E4"), sources: ["P-7"] },
  { id: "N2-03", stopId: "S2", pitch: "G#4", midi: pitchToMidi("G#4"), sources: ["P-8"] },

  { id: "N3-01", stopId: "S3", pitch: "C4", midi: pitchToMidi("C4"), sources: ["P-10"] },
  // 对照表声明 P-9 归此号，但其实测音高 D4 与音位 C#4 不符 -> 自动进待确认
  { id: "N3-02", stopId: "S3", pitch: "C#4", midi: pitchToMidi("C#4"), sources: ["P-9"] },

  {
    id: "N4-01", stopId: "S4", pitch: "C5", midi: pitchToMidi("C5"),
    sources: ["P-11", "P-12"],
  },
  { id: "N4-02", stopId: "S4", pitch: "E5", midi: pitchToMidi("E5"), sources: ["P-13"] },
  { id: "N4-03", stopId: "S4", pitch: "G5", midi: pitchToMidi("G5"), sources: ["P-14"] },
  { id: "N4-04", stopId: "S4", pitch: "C6", midi: pitchToMidi("C6"), sources: ["P-15"], isNew: true },
  { id: "N4-05", stopId: "S4", pitch: "G6", midi: pitchToMidi("G6"), sources: ["P-16"], isNew: true },
];

// 旧调音档案（17 根老管）
// P-9：对照表指向 N3-02，但实际音高 D4 与该音位 C#4 不符 → 旧号疑似被新管复用 → 待确认
// P-17：不在对照表中 → 未归位 → 待处理区
export const OLD_RECORDS: TuningRecord[] = [
  { oldNo: "P-1", stopId: "S1", pitch: "C2", midi: pitchToMidi("C2"), cents: -2, reedStatus: "无簧片", note: "正常", date: "2026-08-10", envId: "E3" },
  { oldNo: "P-2", stopId: "S1", pitch: "D2", midi: pitchToMidi("D2"), cents: -12, reedStatus: "无簧片", note: "偏低，已标记复检", date: "2026-08-10", envId: "E3" },
  { oldNo: "P-3", stopId: "S1", pitch: "F#2", midi: pitchToMidi("F#2"), cents: 3, reedStatus: "无簧片", note: "正常", date: "2026-08-10", envId: "E3" },
  { oldNo: "P-4", stopId: "S1", pitch: "A2", midi: pitchToMidi("A2"), cents: -7, reedStatus: "无簧片", note: "低 7 音分，建议冬季前复查", date: "2026-08-10", envId: "E3" },
  { oldNo: "P-5", stopId: "S1", pitch: "C3", midi: pitchToMidi("C3"), cents: 1, reedStatus: "无簧片", note: "正常", date: "2026-08-10", envId: "E3" },

  { oldNo: "P-6", stopId: "S2", pitch: "C4", midi: pitchToMidi("C4"), cents: 4, reedStatus: "无簧片", note: "正常", date: "2026-08-11", envId: "E4" },
  { oldNo: "P-7", stopId: "S2", pitch: "E4", midi: pitchToMidi("E4"), cents: -3, reedStatus: "无簧片", note: "正常", date: "2026-08-11", envId: "E4" },
  { oldNo: "P-8", stopId: "S2", pitch: "G#4", midi: pitchToMidi("G#4"), cents: 8, reedStatus: "无簧片", note: "偏高，待复测", date: "2026-08-11", envId: "E4" },

  { oldNo: "P-9", stopId: "S3", pitch: "D4", midi: pitchToMidi("D4"), cents: 6, reedStatus: "正常", note: "旧号在新清册中被另一支 Trumpet 管复用，音位需现场核对", date: "2026-08-11", envId: "E4" },
  { oldNo: "P-10", stopId: "S3", pitch: "C4", midi: pitchToMidi("C4"), cents: 9, reedStatus: "需微调", note: "簧片需微调", date: "2026-08-11", envId: "E4" },

  { oldNo: "P-11", stopId: "S4", pitch: "C5", midi: pitchToMidi("C5"), cents: 2, reedStatus: "无簧片", note: "旧混合管第一列", date: "2026-03-12", envId: "E1" },
  { oldNo: "P-12", stopId: "S4", pitch: "C5", midi: pitchToMidi("C5"), cents: -2, reedStatus: "无簧片", note: "旧混合管第二列，与 P-11 并入同一新号", date: "2026-03-12", envId: "E1" },
  { oldNo: "P-13", stopId: "S4", pitch: "E5", midi: pitchToMidi("E5"), cents: 6, reedStatus: "无簧片", note: "偏高", date: "2026-03-12", envId: "E1" },
  { oldNo: "P-14", stopId: "S4", pitch: "G5", midi: pitchToMidi("G5"), cents: -1, reedStatus: "无簧片", note: "正常", date: "2026-03-12", envId: "E1" },
  { oldNo: "P-15", stopId: "S4", pitch: "C6", midi: pitchToMidi("C6"), cents: 0, reedStatus: "无簧片", note: "正常", date: "2026-03-12", envId: "E1" },
  { oldNo: "P-16", stopId: "S4", pitch: "G6", midi: pitchToMidi("G6"), cents: 11, reedStatus: "无簧片", note: "偏高较多，需复测", date: "2026-03-12", envId: "E1" },

  { oldNo: "P-17", stopId: "S3", pitch: "A4", midi: pitchToMidi("A4"), cents: -4, reedStatus: "待更换", note: "簧片老化待更换；未列入新编号对照表", date: "2026-08-11", envId: "E4" },
];

// 管风琴厂提供的编号对照表（新号 -> 老号列表）
// 注意：P-9 的对照指向 N3-02，但其实际音高与 N3-02 音位不符
export const CROSSWALK: Array<{ newNo: string; oldNos: string[]; declaredPitch: string }> = [
  { newNo: "N1-01", oldNos: ["P-1"], declaredPitch: "C2" },
  { newNo: "N1-02", oldNos: ["P-2"], declaredPitch: "D2" },
  { newNo: "N1-03", oldNos: ["P-3"], declaredPitch: "F#2" },
  { newNo: "N1-04", oldNos: ["P-4"], declaredPitch: "A2" },
  { newNo: "N1-05", oldNos: ["P-5"], declaredPitch: "C3" },
  { newNo: "N2-01", oldNos: ["P-6"], declaredPitch: "C4" },
  { newNo: "N2-02", oldNos: ["P-7"], declaredPitch: "E4" },
  { newNo: "N2-03", oldNos: ["P-8"], declaredPitch: "G#4" },
  { newNo: "N3-01", oldNos: ["P-10"], declaredPitch: "C4" },
  { newNo: "N3-02", oldNos: ["P-9"], declaredPitch: "C#4" },
  { newNo: "N4-01", oldNos: ["P-11", "P-12"], declaredPitch: "C5" },
  { newNo: "N4-02", oldNos: ["P-13"], declaredPitch: "E5" },
  { newNo: "N4-03", oldNos: ["P-14"], declaredPitch: "G5" },
  { newNo: "N4-04", oldNos: ["P-15"], declaredPitch: "C6" },
  { newNo: "N4-05", oldNos: ["P-16"], declaredPitch: "G6" },
];

/** 老管序号（迁移顺序，断点续跑的基准） */
export const OLD_ORDER: string[] = OLD_RECORDS.map((r) => r.oldNo);

export const ENV_READINGS: EnvReading[] = [
  { id: "E1", date: "2026-03-12", venue: VENUE, tempC: 15.2, humidity: 62, note: "春季例行检测" },
  { id: "E2", date: "2026-05-08", venue: VENUE, tempC: 18.6, humidity: 55, note: "新音栓加装施工中" },
  { id: "E3", date: "2026-08-10", venue: VENUE, tempC: 23.4, humidity: 48, note: "编号重排前普查（低音区）" },
  { id: "E4", date: "2026-08-11", venue: VENUE, tempC: 24.1, humidity: 47, note: "编号重排前普查（中高音区）" },
];

// 重排前已签发的维护报告：内容锁定，迁移完成后新号补全、双号并存
export const SIGNED_REPORTS: MaintenanceReport[] = [
  {
    id: "R2026-08",
    venue: VENUE,
    date: "2026-08-12",
    technician: "调音师 / 李鸣远",
    summary: "编号重排前最终普查：低音 Bourdon D2 偏低需复检，Trumpet C4 簧片微调，另有一支 Trumpet 旧号去向待核。",
    createdAt: new Date("2026-08-12T10:00:00").getTime(),
    historical: true,
    items: [
      { oldNos: ["P-2"], stopId: "S1", pitch: "D2", cents: -12, reedStatus: "无簧片", note: "偏低 12 音分，标记复检" },
      { oldNos: ["P-4"], stopId: "S1", pitch: "A2", cents: -7, reedStatus: "无簧片", note: "低 7 音分，冬季前复查" },
      { oldNos: ["P-10"], stopId: "S3", pitch: "C4", cents: 9, reedStatus: "需微调", note: "簧片需微调" },
      { oldNos: ["P-9"], stopId: "S3", pitch: "D4", cents: 6, reedStatus: "正常", note: "旧号去向待核（重排后疑似被新管复用）" },
    ],
  },
  {
    id: "R2026-03",
    venue: VENUE,
    date: "2026-03-12",
    technician: "调音师 / 李鸣远",
    summary: "春季例行：混合音管列整体检测，G6 偏高较多。",
    createdAt: new Date("2026-03-12T15:30:00").getTime(),
    historical: true,
    items: [
      { oldNos: ["P-13"], stopId: "S4", pitch: "E5", cents: 6, reedStatus: "无簧片", note: "偏高" },
      { oldNos: ["P-16"], stopId: "S4", pitch: "G6", cents: 11, reedStatus: "无簧片", note: "偏高较多，需复测" },
    ],
  },
];
