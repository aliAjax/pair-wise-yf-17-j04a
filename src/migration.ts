import type { OldRecord, Pipe } from "./types";

export interface MatchResult {
  status: "migrated" | "review" | "pending";
  newPipeId: string | null;
  candidates: string[];
  reason: string;
}

/**
 * 按编号对照和音高位置把老维护记录迁移到新编号。
 * - 编号对照：新管上标注的可对照老编号（老编号被复用，所以编号信号可能指到别的管）；
 * - 音高位置：音高（音栓为空时仅按音高），物理音管的身份标识。
 * 两个信号指向同一根管 → 自动归位；指向不一致或跨音栓 → 待确认；
 * 两个信号都落空（新档里没有该音高位置、编号也无对照）→ 留在待处理区。
 */
export function matchRecord(rec: OldRecord, pipes: Pipe[]): MatchResult {
  const numberMatches = pipes.filter((p) => p.oldNoRef === rec.oldNo);
  const pitchMatches = rec.stop
    ? pipes.filter((p) => p.pitch === rec.pitch && p.stop === rec.stop)
    : pipes.filter((p) => p.pitch === rec.pitch);

  // 双信号一致：编号对照与音高位置指向同一根新管
  if (
    numberMatches.length === 1 &&
    pitchMatches.some((p) => p.id === numberMatches[0].id)
  ) {
    return {
      status: "migrated",
      newPipeId: numberMatches[0].id,
      candidates: [],
      reason: "编号对照与音高位置一致",
    };
  }

  const candidates: Pipe[] = [];
  const seen = new Set<string>();
  for (const p of [...numberMatches, ...pitchMatches]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      candidates.push(p);
    }
  }

  if (candidates.length === 0) {
    return {
      status: "pending",
      newPipeId: null,
      candidates: [],
      reason: `新调音档中无音高位置 ${rec.pitch}，编号 ${rec.oldNo} 也无对照，暂留待处理区`,
    };
  }

  if (candidates.length === 1) {
    const target = candidates[0];
    const viaNumber = numberMatches.some((p) => p.id === target.id);
    return {
      status: "review",
      newPipeId: null,
      candidates: [target.id],
      reason: viaNumber
        ? `仅编号对照指向 ${target.id}（${target.stop} ${target.pitch}），音高位置 ${rec.pitch} 未在新档中找到，请确认`
        : `仅音高位置指向 ${target.id}（${target.stop} ${target.pitch}），编号 ${rec.oldNo} 已被复用或无对照，请确认`,
    };
  }

  // 多候选：编号对照与音高位置冲突，或音高跨音栓
  const desc = candidates
    .map((c) => {
      const tags: string[] = [];
      if (numberMatches.some((p) => p.id === c.id)) tags.push("编号对照");
      if (pitchMatches.some((p) => p.id === c.id)) tags.push("音高位置");
      return `${c.id}（${c.stop} ${c.pitch}）← ${tags.join(" + ")}`;
    })
    .join("；");
  return {
    status: "review",
    newPipeId: null,
    candidates: candidates.map((c) => c.id),
    reason:
      rec.stop === ""
        ? `票根音栓栏污损，音高 ${rec.pitch} 跨多个音栓：${desc}，请确认归属`
        : `编号对照与音高位置不一致（老编号 ${rec.oldNo} 已被新管复用）：${desc}，请确认`,
  };
}

export interface MigrationStats {
  total: number;
  migrated: number;
  review: number;
  pending: number;
  /** 对应多根老管的新管数（一对多） */
  multiPipeCount: number;
  done: boolean;
}

export function migrationStats(records: OldRecord[]): MigrationStats {
  const migrated = records.filter((r) => r.migrateStatus === "migrated").length;
  const review = records.filter((r) => r.migrateStatus === "review").length;
  const pending = records.filter((r) => r.migrateStatus === "pending").length;
  const pipeCounts = new Map<string, number>();
  for (const r of records) {
    if (r.newPipeId) pipeCounts.set(r.newPipeId, (pipeCounts.get(r.newPipeId) ?? 0) + 1);
  }
  const multiPipeCount = [...pipeCounts.values()].filter((n) => n > 1).length;
  return {
    total: records.length,
    migrated,
    review,
    pending,
    multiPipeCount,
    done: review === 0 && pending === 0,
  };
}
