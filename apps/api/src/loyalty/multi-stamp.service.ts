import { Injectable } from '@nestjs/common';
import { ProgramType } from '@prisma/client';
import type {
  MultiStampConfig,
  MultiStampLane,
  MultiStampProductGroup,
} from './loyalty.types';

@Injectable()
export class MultiStampService {
  parseConfig(raw: unknown): MultiStampConfig | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as MultiStampConfig;
    if (c.mode !== 'LANES' && c.mode !== 'MULTIPLIER') return null;
    return c;
  }

  resolveStampDelta(
    programType: ProgramType,
    configRaw: unknown,
    productGroupId?: string | null,
  ): { delta: number; productGroupId?: string; laneId?: string } {
    if (programType !== ProgramType.MULTI_STAMP) {
      return { delta: 1 };
    }
    const config = this.parseConfig(configRaw);
    if (!config) return { delta: 1 };

    if (config.mode === 'MULTIPLIER') {
      const group = this.findProductGroup(config.productGroups, productGroupId);
      return {
        delta: group?.multiplier ?? 1,
        productGroupId: group?.id,
      };
    }

    // LANES: damga tek lane'e yazılır (kasiyer laneId ile gönderir)
    const laneId = productGroupId ?? config.lanes?.[0]?.id;
    return { delta: 1, laneId };
  }

  findProductGroup(
    groups: MultiStampProductGroup[] | undefined,
    id?: string | null,
  ): MultiStampProductGroup | undefined {
    if (!groups?.length) return undefined;
    if (id) {
      return groups.find((g) => g.id === id) ?? groups[0];
    }
    return groups.find((g) => g.multiplier === 1) ?? groups[0];
  }

  findLane(
    lanes: MultiStampLane[] | undefined,
    laneId?: string | null,
  ): MultiStampLane | undefined {
    if (!lanes?.length) return undefined;
    if (laneId) return lanes.find((l) => l.id === laneId);
    return lanes[0];
  }

  isLanesMode(programType: ProgramType, configRaw: unknown): boolean {
    if (programType !== ProgramType.MULTI_STAMP) return false;
    return this.parseConfig(configRaw)?.mode === 'LANES';
  }

  sumBalances(balances: Record<string, number>): number {
    return Object.values(balances).reduce((s, n) => s + n, 0);
  }

  /** Lane bazlı tier uygunluğu */
  eligibleTierIds(
    tiers: { id: string; threshold: number; laneId: string | null }[],
    balances: Record<string, number>,
    aggregateBalance: number,
    lanesMode: boolean,
  ): string[] {
    if (!lanesMode) {
      return tiers
        .filter((t) => aggregateBalance >= t.threshold)
        .map((t) => t.id);
    }
    return tiers
      .filter((t) => {
        const lane = t.laneId;
        const bal = lane ? (balances[lane] ?? 0) : aggregateBalance;
        return bal >= t.threshold;
      })
      .map((t) => t.id);
  }

  laneAtRewardThreshold(
    balances: Record<string, number>,
    tiers: { threshold: number; laneId: string | null }[],
    laneId: string,
  ): boolean {
    const bal = balances[laneId] ?? 0;
    return tiers.some((t) => t.laneId === laneId && bal >= t.threshold);
  }
}
