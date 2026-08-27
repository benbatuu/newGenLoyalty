import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StampLedgerType, StampSource, PassNotifyKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
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
  ) {}

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) {
      return digits.slice(2);
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return digits.slice(1);
    }
    return digits;
  }

  async findByPhone(tenantId: string, phoneQuery: string) {
    const normalized = this.normalizePhone(phoneQuery);
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        phone: { endsWith: normalized },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return customers;
  }

  async register(
    tenantId: string,
    phoneRaw: string,
    actorUserId: string,
  ) {
    const phone = this.normalizePhone(phoneRaw);
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
    if (existing) {
      throw new ConflictException('Bu telefon zaten kayıtlı');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        phone,
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

    return { ...stampResult, walletInviteUrl };
  }

  /** Invite link only (for counter QR popup). Does not send SMS. */
  async walletInviteLink(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }
    return {
      walletInviteUrl: this.wallet.inviteUrl(customerId, tenantId),
      customer: {
        id: customer.id,
        phone: customer.phone,
        displayName: customer.displayName,
      },
    };
  }

  async addStamp(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    source: StampSource = StampSource.cashier,
    options?: { skipPassSync?: boolean },
  ) {
    // MVP: only cashier source accepted on public endpoints
    if (source !== StampSource.cashier) {
      throw new BadRequestException(
        'NFC damga henüz aktif değil; source=cashier kullanın',
      );
    }

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

    if (
      customer.rewardReady ||
      customer.stampCount >= rule.stampsRequired
    ) {
      throw new BadRequestException(
        'Ödül hazır. Yeni damga için önce ödülü kullanın.',
      );
    }

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

    const nextCount = customer.stampCount + 1;
    const rewardReady = nextCount >= rule.stampsRequired;

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
          walletInviteUrl = this.wallet.inviteUrl(customerId, tenantId);
        }
      } catch (err) {
        this.logger.warn(`Pass sync (stamp) başarısız: ${(err as Error).message}`);
        walletInviteUrl = this.wallet.inviteUrl(customerId, tenantId);
      }
    }

    return {
      customer: updated,
      stampsRequired: rule.stampsRequired,
      rewardLabel: rule.rewardLabel,
      stampsRemaining: Math.max(rule.stampsRequired - updated.stampCount, 0),
      appleWalletLinked,
      walletInviteUrl,
    };
  }

  async redeemReward(
    tenantId: string,
    customerId: string,
    actorUserId: string,
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

    if (!customer.rewardReady && customer.stampCount < rule.stampsRequired) {
      throw new BadRequestException('Ödül henüz hazır değil');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          stampCount: 0,
          rewardReady: false,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          type: StampLedgerType.REDEEM,
          createdByUserId: actorUserId,
          note: rule.rewardLabel,
        },
      }),
    ]);

    void this.wallet
      .syncPasses(customerId, tenantId, { notifyKind: PassNotifyKind.REDEEM })
      .catch((err: Error) => {
        this.logger.warn(`Pass sync (redeem) başarısız: ${err.message}`);
      });

    return {
      customer: updated,
      redeemed: rule.rewardLabel,
    };
  }

  async dailySummary(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

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
                ? [{ phone: { contains: digits } }]
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

    const [customers, total, rule] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ rewardReady: 'desc' }, { updatedAt: 'desc' }],
        take: pageSize,
        skip,
        include: {
          _count: { select: { stampLedger: true, passes: true } },
        },
      }),
      this.prisma.customer.count({ where }),
      this.prisma.rewardRule.findUnique({
        where: { tenantId },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      stampsRequired: rule?.stampsRequired ?? 10,
      rewardLabel: rule?.rewardLabel ?? '',
      total,
      page,
      pageSize,
      totalPages,
      customers: customers.map((c) => ({
        id: c.id,
        phone: c.phone,
        displayName: c.displayName,
        birthMonth: c.birthMonth,
        birthDay: c.birthDay,
        stampCount: c.stampCount,
        rewardReady: c.rewardReady,
        hasWallet: c._count.passes > 0,
        consentAt: c.consentAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        ledgerCount: c._count.stampLedger,
      })),
    };
  }

  async reports(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

    const [
      stampsToday,
      redeemsToday,
      stampsWeek,
      redeemsWeek,
      stampsMonth,
      redeemsMonth,
      totalCustomers,
      newCustomersWeek,
      rewardReadyCount,
      recent,
      topNearReward,
    ] = await Promise.all([
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
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.STAMP,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.stampLedger.count({
        where: {
          tenantId,
          type: StampLedgerType.REDEEM,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: weekStart } },
      }),
      this.prisma.customer.count({
        where: { tenantId, rewardReady: true },
      }),
      this.prisma.stampLedger.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          customer: { select: { id: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: { tenantId, rewardReady: false, stampCount: { gt: 0 } },
        orderBy: { stampCount: 'desc' },
        take: 8,
      }),
    ]);

    const rule = await this.prisma.rewardRule.findUnique({
      where: { tenantId },
    });

    return {
      stampsRequired: rule?.stampsRequired ?? 10,
      rewardLabel: rule?.rewardLabel ?? '',
      totals: {
        stampsToday,
        redeemsToday,
        stampsWeek,
        redeemsWeek,
        stampsMonth,
        redeemsMonth,
        totalCustomers,
        newCustomersWeek,
        rewardReadyCount,
      },
      recentActivity: recent.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        phone: r.customer.phone,
        customerId: r.customer.id,
        byName: r.createdBy?.name ?? null,
        note: r.note,
      })),
      nearReward: topNearReward.map((c) => ({
        id: c.id,
        phone: c.phone,
        stampCount: c.stampCount,
        remaining: Math.max((rule?.stampsRequired ?? 10) - c.stampCount, 0),
      })),
    };
  }

  async exportCustomersCsv(tenantId: string): Promise<string> {
    const [customers, rule] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { passes: true, stampLedger: true } } },
      }),
      this.prisma.rewardRule.findUnique({ where: { tenantId } }),
    ]);
    const req = rule?.stampsRequired ?? 10;
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
          c.phone,
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
        customer: { select: { phone: true, displayName: true } },
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
          r.customer.phone,
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
      customer: {
        id: customer.id,
        phone: customer.phone,
        displayName: customer.displayName,
        stampCount: customer.stampCount,
        rewardReady: customer.rewardReady,
        birthMonth: customer.birthMonth,
        birthDay: customer.birthDay,
        consentAt: customer.consentAt,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
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
      select: { id: true, phone: true },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');
    await this.prisma.customer.delete({ where: { id: customer.id } });
    return { ok: true, deletedId: customer.id, phone: customer.phone };
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
