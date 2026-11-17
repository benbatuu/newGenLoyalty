import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StampLedgerType, StampSource, PassNotifyKind, ProgramType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyEngineService } from '../loyalty/loyalty-engine.service';
import { LoyaltyProgramService } from '../loyalty/loyalty-program.service';
import { MultiStampService } from '../loyalty/multi-stamp.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { DiscountCardService } from '../loyalty/discount-card.service';
import { CashbackCardService } from '../loyalty/cashback-card.service';
import { VipService } from '../vip/vip.service';
import { WalletService } from '../wallet/wallet.service';
import {
  customerCreatePhoneData,
  customerPhonePlain,
  toPublicCustomer,
} from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import { resolveStampRewardMeta } from './stamp-reward-meta';
import {
  STAMP_IDEMPOTENCY_WINDOW_MS,
  STAMP_MAX_PER_CUSTOMER_PER_DAY,
  STAMP_TIMEZONE,
  startOfCalendarDay,
} from './stamp-limits';

@Injectable()
export class StampsService {
  private readonly logger = new Logger(StampsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly loyaltyEngine: LoyaltyEngineService,
    private readonly loyaltyPrograms: LoyaltyProgramService,
    private readonly multiStamp: MultiStampService,
    private readonly campaigns: CampaignsService,
    private readonly discountCard: DiscountCardService,
    private readonly cashbackCard: CashbackCardService,
    private readonly vip: VipService,
    private readonly pii: PiiService,
  ) {}

  private publicCustomer<T extends Record<string, unknown>>(row: T) {
    return toPublicCustomer(this.pii, row);
  }

  private phonePlain(row: { phone?: string | null; phoneEnc?: string | null }) {
    return customerPhonePlain(this.pii, row);
  }

  /** Birincil LoyaltyProgram tier → yoksa RewardRule (V1 uyumu) */
  private resolveStampRewardMeta(tenantId: string) {
    return resolveStampRewardMeta(this.prisma, tenantId);
  }

  /** Müşteri damga/bakiye değişimini sadakat programlarına (CustomerProgram) yansıtır */
  private syncCustomerProgram(
    tenantId: string,
    customer: {
      id: string;
      stampCount: number;
      rewardReady: boolean;
    },
    balances?: Record<string, number> | null,
  ) {
    void this.loyaltyEngine
      .afterCustomerMutation(tenantId, customer.id, {
        stampCount: customer.stampCount,
        rewardReady: customer.rewardReady,
        balances,
      })
      .catch((err: Error) =>
        this.logger.warn(`Program sync: ${err.message}`),
      );
  }

  normalizePhone(phone: string): string {
    return this.pii.normalizePhone(phone);
  }

  async findByPhone(tenantId: string, phoneQuery: string) {
    const customers = await this.prisma.customer.findMany({
      where: this.pii.phoneLookupFilter(tenantId, phoneQuery),
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return customers.map((c) => this.publicCustomer(c));
  }

  async register(
    tenantId: string,
    phoneRaw: string,
    actorUserId: string,
    programIds?: string[],
  ) {
    const phoneData = customerCreatePhoneData(this.pii, phoneRaw);
    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_phoneHash: {
          tenantId,
          phoneHash: phoneData.phoneHash,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Bu telefon zaten kayıtlı');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        phone: null,
        ...phoneData,
        consentAt: new Date(),
      },
    });

    // Pass sync burada atlanır — hemen ardından ensurePassesAndInvite tek seferde sync+SMS yapar
    // (çift sync Unique constraint yarışına yol açıyordu; SMS log’u kaçıyordu)
    const stampResult = await this.addStamp(
      tenantId,
      customer.id,
      actorUserId,
      StampSource.cashier,
      { skipPassSync: true },
    );

    let walletInviteUrl: string | null = null;
    try {
      const invite = await this.wallet.ensurePassesAndInvite(
        customer.id,
        tenantId,
        programIds,
      );
      walletInviteUrl = invite.inviteUrl;
    } catch (err) {
      this.logger.warn(
        `Wallet/SMS invite başarısız: ${(err as Error).message}`,
      );
      // Son çare: yine de invite URL üret (SMS log’u için)
      try {
        const fallback = await this.wallet.sendWalletInviteSms(
          customer.id,
          tenantId,
        );
        walletInviteUrl = fallback.link;
      } catch (smsErr) {
        this.logger.warn(
          `SMS invite de başarısız: ${(smsErr as Error).message}`,
        );
      }
    }

    this.syncCustomerProgram(tenantId, stampResult.customer);

    return { ...stampResult, walletInviteUrl };
  }

  /** Invite link only (for counter QR popup). Does not send SMS. */
  async walletInviteLink(
    tenantId: string,
    customerId: string,
    programIds?: string[],
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }
    const invite = await this.wallet.createWalletInvite(
      customerId,
      tenantId,
      programIds,
    );
    return {
      walletInviteUrl: invite.link,
      programIds: invite.programIds,
      customer: this.publicCustomer(customer),
    };
  }

  async listWalletInvitePrograms(tenantId: string) {
    return this.wallet.listInvitePrograms(tenantId);
  }

  /**
   * Wallet pass barcode — legacy `customerId` or `customerId:programId`.
   */
  private isValidPassId(id: string): boolean {
    return /^[a-z][a-z0-9]{20,36}$/i.test(id);
  }

  parsePassBarcode(raw: string): { customerId: string; programId?: string } {
    const code = raw.trim();
    if (!code) {
      throw new BadRequestException('QR kod boş');
    }
    if (/^https?:\/\//i.test(code) || /wallet\/invite/i.test(code)) {
      throw new BadRequestException(
        'Bu bir davet linki. Müşterinin Wallet kartındaki QR kodunu okutun.',
      );
    }

    const colonIdx = code.indexOf(':');
    if (colonIdx > 0) {
      const customerId = code.slice(0, colonIdx);
      const programId = code.slice(colonIdx + 1);
      if (!this.isValidPassId(customerId) || !this.isValidPassId(programId)) {
        throw new BadRequestException('Geçersiz pass QR kodu');
      }
      return { customerId, programId };
    }

    if (!this.isValidPassId(code)) {
      throw new BadRequestException('Geçersiz pass QR kodu');
    }
    return { customerId: code };
  }

  /**
   * Wallet pass barcode message is the customer id (legacy) or customerId:programId.
   * Rejects invite URLs accidentally scanned at the counter.
   */
  parsePassCode(raw: string): string {
    return this.parsePassBarcode(raw).customerId;
  }

  async stampByPassCode(
    tenantId: string,
    rawCode: string,
    actorUserId: string,
  ) {
    const customerId = this.parsePassCode(rawCode);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException(
        'Bu pass bu kafeye ait değil veya müşteri bulunamadı',
      );
    }
    return this.addStamp(
      tenantId,
      customerId,
      actorUserId,
      StampSource.cashier,
    );
  }

  /** Pass QR → indirim doğrula (DiscountCard) */
  async verifyDiscountByPassCode(
    tenantId: string,
    rawCode: string,
    programId: string,
    categoryId?: string,
  ) {
    const customerId = this.parsePassCode(rawCode);
    return this.discountCard.verifyDiscount(
      tenantId,
      programId,
      customerId,
      categoryId,
    );
  }

  /** Pass QR → cashback kazanım (CASHBACK_CARD) */
  async scanCashbackByPassCode(
    tenantId: string,
    rawCode: string,
    actorUserId: string,
    dto: {
      amountKurus: number;
      categoryId?: string;
      confirmed?: boolean;
      posReceiptId?: string;
    },
  ) {
    const { customerId, programId } = this.parsePassBarcode(rawCode);
    if (!programId) {
      throw new BadRequestException(
        'Cashback kartı okutun. Damga veya puan kartı QR kodu geçersiz.',
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        phone: true,
        displayName: true,
        stampCount: true,
        rewardReady: true,
      },
    });
    if (!customer) {
      throw new NotFoundException(
        'Bu pass bu kafeye ait değil veya müşteri bulunamadı',
      );
    }

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
      select: { id: true, name: true, type: true },
    });
    if (!program || program.type !== ProgramType.CASHBACK_CARD) {
      throw new BadRequestException('Geçersiz cashback kartı QR kodu');
    }

    const result = await this.cashbackCard.earnCashback(
      tenantId,
      programId,
      customerId,
      actorUserId,
      {
        amountKurus: dto.amountKurus,
        categoryId: dto.categoryId,
        confirmed: dto.confirmed,
        posReceiptId: dto.posReceiptId,
        source: StampSource.cashier,
      },
    );

    try {
      await this.wallet.syncPasses(customerId, tenantId, {
        notifyKind: PassNotifyKind.STAMP,
      });
    } catch {
      /* pass sync best-effort */
    }

    return {
      customer: this.publicCustomer(customer),
      program: result.program,
      earnedKurus: result.earnedKurus,
      earnedTry: result.earnedTry,
      newBalanceKurus: result.balanceKurus,
      newBalanceTry: result.balanceTry,
      preview: result.preview,
    };
  }

  async addStamp(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    source: StampSource = StampSource.cashier,
    options?: {
      skipPassSync?: boolean;
      productGroupId?: string;
      bypassVisitLimits?: boolean;
    },
  ) {
    // MVP: only cashier source accepted on public endpoints
    this.loyaltyEngine.assertCashierSource(source);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    const rule = await this.prisma.rewardRule.findUnique({
      where: { tenantId },
    });
    if (!rule) {
      throw new BadRequestException('Ödül kuralı tanımlı değil');
    }

    const resolved = await this.loyaltyEngine.resolveStampDelta(
      tenantId,
      options?.productGroupId,
    );
    const program = resolved.program;

    if (resolved.lanesMode) {
      return this.addStampLanes(
        tenantId,
        customerId,
        actorUserId,
        source,
        customer,
        rule,
        program,
        options,
      );
    }

    const { delta, productGroupId, laneId } = resolved;

    const camp = await this.campaigns.resolveStampMultiplier(tenantId, customerId);
    const finalDelta = this.campaigns.applyCampaignToDelta(
      delta,
      camp.multiplier,
    );

    const maxThreshold = this.loyaltyEngine.maxThreshold(
      program,
      rule.stampsRequired,
    );

    if (
      !options?.bypassVisitLimits &&
      (customer.rewardReady || customer.stampCount >= maxThreshold)
    ) {
      throw new BadRequestException(
        'Ödül hazır. Yeni damga için önce ödülü kullanın.',
      );
    }

    if (!options?.bypassVisitLimits) {
      const dayStart = startOfCalendarDay(STAMP_TIMEZONE);
      const stampsToday = await this.prisma.stampLedger.count({
        where: {
          tenantId,
          customerId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: dayStart },
        },
      });
      if (stampsToday >= STAMP_MAX_PER_CUSTOMER_PER_DAY) {
        throw new ConflictException(
          'Bu müşteriye bugün zaten damga verildi. Günde en fazla 1 damga (1 ziyaret = 1 damga).',
        );
      }

      const recent = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          customerId,
          type: StampLedgerType.STAMP,
          createdAt: {
            gte: new Date(Date.now() - STAMP_IDEMPOTENCY_WINDOW_MS),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recent) {
        throw new ConflictException(
          'Çift tıklama koruması: birkaç saniye sonra tekrar deneyin.',
        );
      }
    }

    const nextCount = customer.stampCount + finalDelta;
    const rewardReady =
      nextCount >= maxThreshold ||
      program.tiers.some((t) => nextCount >= t.threshold);

    const ledgerMetadata: Prisma.InputJsonValue | typeof Prisma.DbNull =
      program.type === ProgramType.MULTI_STAMP &&
      (productGroupId || laneId)
        ? ({
            ...(productGroupId ? { productGroupId } : {}),
            ...(laneId ? { laneId } : {}),
            ...(camp.campaignId ? { campaignId: camp.campaignId } : {}),
            baseDelta: delta,
            finalDelta,
          } as Prisma.InputJsonValue)
        : camp.campaignId
          ? ({
              campaignId: camp.campaignId,
              baseDelta: delta,
              finalDelta,
            } as Prisma.InputJsonValue)
          : Prisma.DbNull;

    const [updated] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          stampCount: nextCount,
          rewardReady,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          type: StampLedgerType.STAMP,
          source,
          createdByUserId: actorUserId,
          programId: program.id,
          amount: finalDelta,
          metadata: ledgerMetadata,
        },
      }),
    ]);

    // Await sync so cashier gets accurate appleWalletLinked + invite if needed
    let appleWalletLinked = false;
    let walletInviteUrl: string | null = null;
    if (!options?.skipPassSync) {
      try {
        const sync = await this.wallet.syncPasses(customerId, tenantId, {
          notifyKind: PassNotifyKind.STAMP,
        });
        appleWalletLinked = (sync.apple?.deviceCount ?? 0) > 0;
        if (!appleWalletLinked) {
          walletInviteUrl = await this.wallet.inviteUrl(customerId, tenantId);
        }
      } catch (err) {
        this.logger.warn(`Pass sync (stamp) başarısız: ${(err as Error).message}`);
        walletInviteUrl = await this.wallet.inviteUrl(customerId, tenantId);
      }
    }

    this.syncCustomerProgram(tenantId, updated);
    void this.vip
      .maybeUpgradeTier(tenantId, customerId)
      .catch((err: Error) =>
        this.logger.warn(`VIP tier check: ${err.message}`),
      );

    return {
      customer: this.publicCustomer(updated),
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      stampsRemaining: Math.max(rule.stampsRequired - updated.stampCount, 0),
      appleWalletLinked,
      walletInviteUrl,
      ...(camp.campaignId
        ? { campaign: { id: camp.campaignId, label: camp.label } }
        : {}),
      ...(finalDelta > delta ? { stampsAdded: finalDelta } : {}),
    };
  }

  /** MultiStamp Mod A — lane bazlı sayaçlar (CustomerProgram.balances) */
  private async addStampLanes(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    source: StampSource,
    customer: { id: string; stampCount: number; rewardReady: boolean },
    rule: { stampsRequired: number; rewardLabel: string },
    program: Awaited<
      ReturnType<LoyaltyProgramService['ensurePrimaryProgram']>
    >,
    options?: { skipPassSync?: boolean; productGroupId?: string },
  ) {
    const config = this.multiStamp.parseConfig(program.config);
    const { laneId } = this.multiStamp.resolveStampDelta(
      program.type,
      program.config,
      options?.productGroupId,
    );
    if (!laneId) {
      throw new BadRequestException('Lane seçimi gerekli');
    }

    const cp = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId: program.id },
      },
    });
    const balances: Record<string, number> = {
      ...((cp?.balances as Record<string, number> | null) ?? {}),
    };

    if (
      this.multiStamp.laneAtRewardThreshold(
        balances,
        program.tiers,
        laneId,
      )
    ) {
      throw new BadRequestException(
        'Bu izde ödül hazır. Önce ödülü kullanın.',
      );
    }

    const dayStart = startOfCalendarDay(STAMP_TIMEZONE);
    const laneStampsToday = await this.prisma.stampLedger.count({
      where: {
        tenantId,
        customerId,
        type: StampLedgerType.STAMP,
        createdAt: { gte: dayStart },
        metadata: { path: ['laneId'], equals: laneId },
      },
    });
    const maxPerLane = config?.maxStampsPerDayPerLane ?? 1;
    if (laneStampsToday >= maxPerLane) {
      throw new ConflictException(
        'Bu iz için bugün damga limiti doldu.',
      );
    }

    const recent = await this.prisma.stampLedger.findFirst({
      where: {
        tenantId,
        customerId,
        type: StampLedgerType.STAMP,
        createdAt: {
          gte: new Date(Date.now() - STAMP_IDEMPOTENCY_WINDOW_MS),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new ConflictException(
        'Çift tıklama koruması: birkaç saniye sonra tekrar deneyin.',
      );
    }

    const camp = await this.campaigns.resolveStampMultiplier(tenantId, customerId);
    const laneDelta = this.campaigns.applyCampaignToDelta(1, camp.multiplier);

    balances[laneId] = (balances[laneId] ?? 0) + laneDelta;
    const nextCount = this.multiStamp.sumBalances(balances);
    const eligible = this.multiStamp.eligibleTierIds(
      program.tiers,
      balances,
      nextCount,
      true,
    );
    const rewardReady = eligible.length > 0;

    const [updated] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { stampCount: nextCount, rewardReady },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          type: StampLedgerType.STAMP,
          source,
          createdByUserId: actorUserId,
          programId: program.id,
          amount: laneDelta,
          metadata: {
            laneId,
            ...(camp.campaignId ? { campaignId: camp.campaignId } : {}),
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    let appleWalletLinked = false;
    let walletInviteUrl: string | null = null;
    if (!options?.skipPassSync) {
      try {
        const sync = await this.wallet.syncPasses(customerId, tenantId, {
          notifyKind: PassNotifyKind.STAMP,
        });
        appleWalletLinked = (sync.apple?.deviceCount ?? 0) > 0;
        if (!appleWalletLinked) {
          walletInviteUrl = await this.wallet.inviteUrl(customerId, tenantId);
        }
      } catch (err) {
        this.logger.warn(`Pass sync (stamp) başarısız: ${(err as Error).message}`);
        walletInviteUrl = await this.wallet.inviteUrl(customerId, tenantId);
      }
    }

    this.syncCustomerProgram(tenantId, updated, balances);
    void this.vip
      .maybeUpgradeTier(tenantId, customerId)
      .catch((err: Error) =>
        this.logger.warn(`VIP tier check: ${err.message}`),
      );

    return {
      customer: this.publicCustomer(updated),
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      stampsRemaining: Math.max(rule.stampsRequired - updated.stampCount, 0),
      appleWalletLinked,
      walletInviteUrl,
      laneId,
      balances,
      ...(camp.campaignId
        ? { campaign: { id: camp.campaignId, label: camp.label } }
        : {}),
    };
  }

  async redeemReward(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    tierId?: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    const rule = await this.prisma.rewardRule.findUnique({
      where: { tenantId },
    });
    if (!rule) {
      throw new BadRequestException('Ödül kuralı tanımlı değil');
    }

    const program = await this.loyaltyPrograms.ensurePrimaryProgram(tenantId);
    const tiers = [...program.tiers].sort((a, b) => a.sortOrder - b.sortOrder);
    const tier = tierId
      ? tiers.find((t) => t.id === tierId)
      : tiers.find((t) => customer.stampCount >= t.threshold) ?? tiers[0];

    if (!tier) {
      throw new BadRequestException('Ödül tier bulunamadı');
    }

    const redeemCost = tier.redeemCost ?? tier.threshold;
    const isLanes = this.multiStamp.isLanesMode(program.type, program.config);

    let nextCount: number;
    let rewardReady: boolean;
    let balances: Record<string, number> | null = null;

    if (isLanes && tier.laneId) {
      const cp = await this.prisma.customerProgram.findUnique({
        where: {
          customerId_programId: { customerId, programId: program.id },
        },
      });
      balances = {
        ...((cp?.balances as Record<string, number> | null) ?? {}),
      };
      const laneBal = balances[tier.laneId] ?? 0;
      if (laneBal < redeemCost) {
        throw new BadRequestException('Ödül henüz hazır değil');
      }
      balances[tier.laneId] = laneBal - redeemCost;
      nextCount = this.multiStamp.sumBalances(balances);
      const eligible = this.multiStamp.eligibleTierIds(
        tiers,
        balances,
        nextCount,
        true,
      );
      rewardReady = eligible.length > 0;
    } else {
      if (customer.stampCount < redeemCost) {
        throw new BadRequestException('Ödül henüz hazır değil');
      }
      nextCount =
        tierId && program.type === ProgramType.MULTI_STAMP
          ? customer.stampCount - redeemCost
          : 0;
      rewardReady =
        nextCount > 0 && tiers.some((t) => nextCount >= t.threshold);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          stampCount: nextCount,
          rewardReady,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          type: StampLedgerType.REDEEM,
          createdByUserId: actorUserId,
          note: tier.rewardLabel,
          programId: program.id,
          amount: redeemCost,
          metadata: tierId
            ? ({ tierId } as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      }),
    ]);

    void this.wallet
      .syncPasses(customerId, tenantId, { notifyKind: PassNotifyKind.REDEEM })
      .catch((err: Error) => {
        this.logger.warn(`Pass sync (redeem) başarısız: ${err.message}`);
      });

    this.syncCustomerProgram(tenantId, updated, balances);

    return {
      customer: this.publicCustomer(updated),
      redeemed: tier.rewardLabel,
      tierId: tier.id,
    };
  }

  /**
   * Son ledger satırları — müşteri adı maskeli (ad veya son 4 hane),
   * telefon/e-posta dönmez.
   */
  async recentActivity(tenantId: string, take = 8) {
    const rows = await this.prisma.stampLedger.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        customer: { select: { displayName: true, phoneLast4: true } },
        program: { select: { name: true, type: true } },
        branch: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customer?.displayName?.trim() || null,
      customerLast4: r.customer?.phoneLast4 ?? null,
      programName: r.program?.name ?? null,
      programType: r.program?.type ?? null,
      branchName: r.branch?.name ?? null,
    }));
  }

  async dailySummary(tenantId: string) {
    // İstanbul takvim günü (sunucu UTC'de çalışabilir)
    const start = startOfCalendarDay(STAMP_TIMEZONE);

    const [stamps, redeems, customers, rewardReady] = await Promise.all([
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: start },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: start },
        },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: { tenantId, rewardReady: true },
      }),
    ]);

    return {
      stampsToday: stamps,
      redeemsToday: redeems,
      totalCustomers: customers,
      rewardReadyCount: rewardReady,
    };
  }

  async listCustomers(
    tenantId: string,
    opts: {
      q?: string;
      filter?: 'all' | 'ready' | 'wallet';
      take?: number;
      page?: number;
      /** Kasa listesi: hareket sayısı ve ödül kuralı atlanır */
      lean?: boolean;
    },
  ) {
    const pageSize = opts.take ?? 20;
    const page = opts.page ?? 1;
    const skip = (page - 1) * pageSize;
    const rawQ = opts.q?.trim() ?? '';
    const digits = rawQ ? this.normalizePhone(rawQ) : '';

    const where = {
      tenantId,
      ...(opts.filter === 'ready' ? { rewardReady: true } : {}),
      ...(opts.filter === 'wallet' ? { passes: { some: {} } } : {}),
      ...(rawQ
        ? {
            OR: [
              ...(digits.length >= 2
                  ? [
                      ...(digits.length === 10
                          ? [{ phoneHash: this.pii.hashPhone(digits) }]
                          : [
                              { phoneLast4: { endsWith: digits.slice(-4) } },
                              { phone: { contains: digits } },
                            ]),
                    ]
                  : []),
              {
                displayName: {
                  contains: rawQ,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [customers, total, rewardMeta, summary] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ rewardReady: 'desc' }, { updatedAt: 'desc' }],
        take: pageSize,
        skip,
        include: {
          _count: {
            select: opts.lean
              ? { passes: true }
              : { stampLedger: true, passes: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
      opts.lean ? Promise.resolve(null) : this.resolveStampRewardMeta(tenantId),
      // Tüm müşteriler için sayılar (arama/filtreden bağımsız) — ayrı istek yok
      opts.lean
        ? Promise.resolve(null)
        : Promise.all([
            this.prisma.customer.count({ where: { tenantId } }),
            this.prisma.customer.count({ where: { tenantId, rewardReady: true } }),
            this.prisma.customer.count({
              where: { tenantId, passes: { some: {} } },
            }),
          ]).then(([all, ready, wallet]) => ({ all, ready, wallet })),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      ...(rewardMeta
        ? {
            stampsRequired: rewardMeta.stampsRequired,
            rewardLabel: rewardMeta.rewardLabel,
          }
        : {}),
      total,
      page,
      pageSize,
      totalPages,
      ...(summary ? { summary } : {}),
      customers: customers.map((c) => ({
        ...this.publicCustomer(c),
        birthMonth: c.birthMonth,
        birthDay: c.birthDay,
        stampCount: c.stampCount,
        rewardReady: c.rewardReady,
        hasWallet: c._count.passes > 0,
        consentAt: c.consentAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        ...(opts.lean
          ? {}
          : { ledgerCount: (c._count as { stampLedger?: number }).stampLedger ?? 0 }),
      })),
    };
  }

  async exportNearRewardCsv(tenantId: string): Promise<string> {
    const [customers, rewardMeta] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId, rewardReady: false, stampCount: { gt: 0 } },
        orderBy: { stampCount: 'desc' },
      }),
      this.resolveStampRewardMeta(tenantId),
    ]);
    const req = rewardMeta.stampsRequired;
    const header = ['phone', 'stampCount', 'stampsRequired', 'remaining'];
    const lines = [header.join(',')];
    for (const c of customers) {
      lines.push(
        [
          this.pii.phoneMasked(c),
          c.stampCount,
          req,
          Math.max(req - c.stampCount, 0),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  async exportCustomersCsv(tenantId: string): Promise<string> {
    const [customers, rewardMeta] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { passes: true, stampLedger: true } } },
      }),
      this.resolveStampRewardMeta(tenantId),
    ]);
    const req = rewardMeta.stampsRequired;
    const header = [
      'id',
      'phone',
      'displayName',
      'stampCount',
      'stampsRequired',
      'rewardReady',
      'birthMonth',
      'birthDay',
      'hasWallet',
      'ledgerCount',
      'createdAt',
      'updatedAt',
    ];
    const lines = [header.join(',')];
    for (const c of customers) {
      lines.push(
        [
          c.id,
          this.pii.phoneMasked(c),
          csvEscape(c.displayName ?? ''),
          c.stampCount,
          req,
          c.rewardReady ? '1' : '0',
          c.birthMonth ?? '',
          c.birthDay ?? '',
          c._count.passes > 0 ? '1' : '0',
          c._count.stampLedger,
          c.createdAt.toISOString(),
          c.updatedAt.toISOString(),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  async exportLedgerCsv(tenantId: string): Promise<string> {
    const rows = await this.prisma.stampLedger.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: {
          select: {
            phone: true,
            phoneEnc: true,
            phoneLast4: true,
            displayName: true,
          },
        },
        createdBy: { select: { name: true, email: true } },
      },
      take: 50_000,
    });
    const header = [
      'id',
      'type',
      'source',
      'phone',
      'displayName',
      'byName',
      'byEmail',
      'note',
      'createdAt',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.type,
          r.source ?? '',
          csvEscape(this.pii.phoneMasked(r.customer)),
          csvEscape(r.customer.displayName ?? ''),
          csvEscape(r.createdBy?.name ?? ''),
          csvEscape(r.createdBy?.email ?? ''),
          csvEscape(r.note ?? ''),
          r.createdAt.toISOString(),
        ].join(','),
      );
    }
    return lines.join('\n');
  }

  /** Müşteri profili: özet + tüm hareketler (damga, ödül, puan, cashback, düzeltme vb.) */
  async customerTimeline(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        displayName: true,
        phoneLast4: true,
        stampCount: true,
        rewardReady: true,
        createdAt: true,
      },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');

    const rows = await this.prisma.stampLedger.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true,
        type: true,
        amount: true,
        source: true,
        note: true,
        createdAt: true,
        program: { select: { name: true, type: true } },
        branch: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    const visitDays = new Set(
      rows.filter((r) => r.type === 'STAMP').map((r) => r.createdAt.toISOString().slice(0, 10)),
    );
    const redeems = rows.filter((r) => r.type === 'REDEEM').length;

    return {
      customer: {
        id: customer.id,
        displayName: customer.displayName,
        phoneLast4: customer.phoneLast4,
        stampCount: customer.stampCount,
        rewardReady: customer.rewardReady,
        createdAt: customer.createdAt.toISOString(),
      },
      summary: {
        visitDays: visitDays.size,
        redeems,
        totalEvents: rows.length,
        firstAt: rows.length ? rows[rows.length - 1].createdAt.toISOString() : null,
        lastAt: rows.length ? rows[0].createdAt.toISOString() : null,
      },
      events: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        source: r.source,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        programName: r.program?.name ?? null,
        programType: r.program?.type ?? null,
        branchName: r.branch?.name ?? null,
        byName: r.createdBy?.name ?? null,
      })),
    };
  }

  async exportCustomerData(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        stampLedger: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { name: true, email: true } },
          },
        },
        passes: {
          select: {
            id: true,
            platform: true,
            externalId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');
    return {
      exportedAt: new Date().toISOString(),
      purpose: 'KVKK veri taşınabilirliği',
      customer: this.publicCustomer(customer),
      ledger: customer.stampLedger.map((l) => ({
        id: l.id,
        type: l.type,
        source: l.source,
        note: l.note,
        createdAt: l.createdAt,
        by: l.createdBy
          ? { name: l.createdBy.name, email: l.createdBy.email }
          : null,
      })),
      passes: customer.passes,
    };
  }

  async deleteCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, phone: true, phoneEnc: true, phoneLast4: true },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');
    await this.prisma.customer.delete({ where: { id: customer.id } });
    return {
      ok: true,
      deletedId: customer.id,
      phone: this.pii.phoneMasked(customer),
    };
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
