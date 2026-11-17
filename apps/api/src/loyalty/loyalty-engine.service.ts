import { BadRequestException, Injectable } from '@nestjs/common';
import { ProgramType, StampSource } from '@prisma/client';
import { LoyaltyProgramService } from './loyalty-program.service';
import { MultiStampService } from './multi-stamp.service';

/** Damga motoru — StampCard iş kuralları burada toplanır */
@Injectable()
export class LoyaltyEngineService {
  constructor(
    private readonly programs: LoyaltyProgramService,
    private readonly multiStamp: MultiStampService,
  ) {}

  async afterCustomerMutation(
    tenantId: string,
    customerId: string,
    snapshot: {
      stampCount: number;
      rewardReady: boolean;
      balances?: Record<string, number> | null;
    },
  ) {
    await this.programs.ensureCustomerProgram(tenantId, customerId, snapshot);
  }

  async afterRewardRuleMutation(tenantId: string) {
    await this.programs.syncFromRewardRule(tenantId);
  }

  async afterTenantCreated(tenantId: string) {
    await this.programs.syncFromRewardRule(tenantId);
  }

  /** Birincil program + damga delta — StampsService tarafından kullanılır */
  async resolveStampDelta(
    tenantId: string,
    productGroupId?: string | null,
  ) {
    const program = await this.programs.ensurePrimaryProgram(tenantId);
    return {
      program,
      lanesMode: this.multiStamp.isLanesMode(program.type, program.config),
      ...this.multiStamp.resolveStampDelta(
        program.type,
        program.config,
        productGroupId,
      ),
    };
  }

  async ensurePrimaryProgram(tenantId: string) {
    return this.programs.ensurePrimaryProgram(tenantId);
  }

  assertCashierSource(source: StampSource) {
    if (source !== StampSource.cashier && source !== StampSource.nfc) {
      throw new BadRequestException(
        'Desteklenmeyen damga kaynağı; source=cashier veya nfc kullanın',
      );
    }
  }

  maxThreshold(
    program: { tiers: { threshold: number }[] },
    fallback: number,
  ): number {
    return program.tiers.length > 0
      ? Math.max(...program.tiers.map((t) => t.threshold))
      : fallback;
  }

  isMultiStamp(program: { type: ProgramType }) {
    return program.type === ProgramType.MULTI_STAMP;
  }
}
