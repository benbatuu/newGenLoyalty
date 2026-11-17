import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  Prisma,
  ProgramType,
  PassNotifyKind,
  StampLedgerType,
  StampSource,
} from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  DEFAULT_EVENT_CARD_CONFIG,
  type EventCardConfig,
} from './loyalty.types';

type EventCustomerMeta = {
  entriesUsed?: number;
  lastCheckInAt?: string;
};

@Injectable()
export class EventCardService {
  private readonly logger = new Logger(EventCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WalletService))
    private readonly wallet: WalletService,
  ) {}

  parseConfig(raw: unknown): EventCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_EVENT_CARD_CONFIG };
    }
    const c = raw as Partial<EventCardConfig>;
    return {
      ...DEFAULT_EVENT_CARD_CONFIG,
      ...c,
      collectFields:
        c.collectFields?.length
          ? c.collectFields
          : DEFAULT_EVENT_CARD_CONFIG.collectFields,
      reminderPush: c.reminderPush ?? DEFAULT_EVENT_CARD_CONFIG.reminderPush,
    };
  }

  async getEventProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) {
      throw new NotFoundException('Kart bulunamadı');
    }
    if (program.type !== ProgramType.EVENT_CARD) {
      throw new BadRequestException('Bu kart etkinlik kartı değil');
    }
    return program;
  }

  async findActiveEventProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true, type: ProgramType.EVENT_CARD },
      orderBy: { createdAt: 'desc' },
    });
  }

  private readMeta(metadata: unknown): EventCustomerMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as EventCustomerMeta;
  }

  private resolveValidity(
    config: EventCardConfig,
    program: { validFrom: Date | null; validUntil: Date | null },
  ): { validFrom: Date; validUntil: Date } {
    const validFrom = config.validFrom
      ? new Date(config.validFrom)
      : program.validFrom ?? new Date();
    const validUntil = config.validUntil
      ? new Date(config.validUntil)
      : program.validUntil ?? new Date(Date.now() + 86_400_000);

    return { validFrom, validUntil };
  }

  private assertEventOpen(
    config: EventCardConfig,
    program: { validFrom: Date | null; validUntil: Date | null },
  ) {
    const now = new Date();
    const { validFrom, validUntil } = this.resolveValidity(config, program);

    if (now < validFrom) {
      throw new BadRequestException('Etkinlik henüz başlamadı');
    }
    if (now > validUntil) {
      throw new BadRequestException('Etkinlik süresi doldu');
    }
  }

  async ensureCustomerProgram(
    tenantId: string,
    customerId: string,
    programId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }

    return this.prisma.customerProgram.upsert({
      where: {
        customerId_programId: { customerId, programId },
      },
      create: {
        tenantId,
        customerId,
        programId,
        balance: 0,
        rewardReady: false,
        metadata: { entriesUsed: 0 } as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  async getCustomerState(
    tenantId: string,
    programId: string,
    customerId: string,
  ) {
    const program = await this.getEventProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const entriesUsed = meta.entriesUsed ?? 0;
    const entriesRemaining = Math.max(0, config.entryLimit - entriesUsed);
    const { validFrom, validUntil } = this.resolveValidity(config, program);

    return {
      programId: program.id,
      programName: program.name,
      eventName: config.eventName,
      entryLimit: config.entryLimit,
      entriesUsed,
      entriesRemaining,
      canCheckIn: entriesRemaining > 0 && new Date() <= validUntil,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
      venue: config.venue ?? null,
      checkInMode: config.checkInMode,
      lastCheckInAt: meta.lastCheckInAt ?? null,
    };
  }

  async checkIn(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto?: {
      source?: StampSource;
      idempotencyKey?: string;
    },
  ) {
    if (dto?.idempotencyKey) {
      const dup = await this.prisma.stampLedger.findFirst({
        where: {
          tenantId,
          programId,
          customerId,
          type: StampLedgerType.EVENT_CHECKIN,
          metadata: {
            path: ['idempotencyKey'],
            equals: dto.idempotencyKey,
          },
        },
      });
      if (dup) {
        throw new ConflictException('Bu check-in zaten kaydedildi');
      }
    }

    const program = await this.getEventProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    this.assertEventOpen(config, program);

    const cp = await this.ensureCustomerProgram(tenantId, customerId, programId);
    const meta = this.readMeta(cp.metadata);
    const entriesUsed = meta.entriesUsed ?? 0;

    if (entriesUsed >= config.entryLimit) {
      throw new ConflictException('Giriş hakkı kalmadı');
    }

    const nextEntriesUsed = entriesUsed + 1;
    const nextMeta: EventCustomerMeta = {
      entriesUsed: nextEntriesUsed,
      lastCheckInAt: new Date().toISOString(),
    };

    const ledgerMetadata: Prisma.InputJsonValue = {
      entryNumber: nextEntriesUsed,
      entryLimit: config.entryLimit,
      eventName: config.eventName,
      ...(dto?.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : {}),
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: {
          metadata: nextMeta as Prisma.InputJsonValue,
          rewardReady: nextEntriesUsed >= config.entryLimit,
        },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.EVENT_CHECKIN,
          source: dto?.source ?? StampSource.cashier,
          createdByUserId: actorUserId,
          amount: 1,
          metadata: ledgerMetadata,
        },
      }),
    ]);

    const updatedMeta = this.readMeta(updated.metadata);

    return {
      checkedIn: true,
      entryNumber: updatedMeta.entriesUsed ?? nextEntriesUsed,
      entriesRemaining: Math.max(
        0,
        config.entryLimit - (updatedMeta.entriesUsed ?? nextEntriesUsed),
      ),
      entryLimit: config.entryLimit,
      program: { id: program.id, name: program.name, eventName: config.eventName },
    };
  }

  /** Cron hook — validUntil geçmiş etkinlik kartlarını pasifleştirir */
  async autoDeactivateExpiredEvents(): Promise<{ deactivated: number }> {
    const now = new Date();
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: {
        isActive: true,
        type: ProgramType.EVENT_CARD,
      },
      select: {
        id: true,
        tenantId: true,
        validUntil: true,
        config: true,
      },
    });

    let deactivated = 0;
    for (const program of programs) {
      const config = this.parseConfig(program.config);
      if (!config.autoDeactivateAfterEvent) continue;

      const validUntil = config.validUntil
        ? new Date(config.validUntil)
        : program.validUntil;

      if (validUntil && validUntil < now) {
        await this.prisma.loyaltyProgram.update({
          where: { id: program.id },
          data: { isActive: false },
        });
        deactivated += 1;
        this.logger.log(
          `Event card deactivated: program=${program.id} tenant=${program.tenantId}`,
        );
      }
    }

    return { deactivated };
  }

  /** Her saat — etkinlik öncesi hatırlatma push */
  @Cron('0 * * * *', { timeZone: 'Europe/Istanbul' })
  async cronEventReminders() {
    await this.sendEventReminders();
  }

  /** Her gece — süresi dolan etkinlik kartlarını pasifleştir */
  @Cron('15 0 * * *', { timeZone: 'Europe/Istanbul' })
  async cronAutoDeactivateExpiredEvents() {
    const result = await this.autoDeactivateExpiredEvents();
    if (result.deactivated > 0) {
      this.logger.log(`Event auto-deactivate: ${result.deactivated} kart`);
    }
  }

  async sendEventReminders(): Promise<{ notified: number }> {
    const now = new Date();
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true, type: ProgramType.EVENT_CARD },
      select: {
        id: true,
        tenantId: true,
        config: true,
        validFrom: true,
        name: true,
      },
    });

    let notified = 0;
    for (const program of programs) {
      const config = this.parseConfig(program.config);
      if (!config.reminderPush?.length) continue;

      const eventStart = new Date(
        config.validFrom ?? program.validFrom ?? now.toISOString(),
      );
      if (eventStart <= now) continue;

      for (const reminder of config.reminderPush) {
        const remindAt = new Date(
          eventStart.getTime() - reminder.hoursBefore * 3_600_000,
        );
        const windowEnd = new Date(remindAt.getTime() + 3_600_000);
        if (now < remindAt || now >= windowEnd) continue;

        const enrolled = await this.prisma.customerProgram.findMany({
          where: { tenantId: program.tenantId, programId: program.id },
          select: { customerId: true },
        });

        for (const row of enrolled) {
          try {
            await this.wallet.syncPasses(row.customerId, program.tenantId, {
              notifyKind: PassNotifyKind.STAMP,
            });
            notified += 1;
          } catch (err) {
            this.logger.warn(
              `Event reminder push failed program=${program.id} customer=${row.customerId}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    return { notified };
  }

  walletFields(
    config: EventCardConfig,
    meta: EventCustomerMeta,
  ): { label: string; value: string; hint?: string } {
    const entriesUsed = meta.entriesUsed ?? 0;
    const remaining = Math.max(0, config.entryLimit - entriesUsed);
    const until = new Date(config.validUntil);
    return {
      label: config.eventName,
      value: `${remaining}/${config.entryLimit} giriş`,
      hint: until.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }
}
