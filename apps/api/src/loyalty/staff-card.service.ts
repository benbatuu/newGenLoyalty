import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgramType,
  StampLedgerType,
  StampSource,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { customerPhonePlain } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import {
  DEFAULT_STAFF_CARD_CONFIG,
  type StaffCardConfig,
  type StaffProgramMeta,
} from './loyalty.types';

const TR_TZ = 'Europe/Istanbul';

function startOfCalendarDay(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

@Injectable()
export class StaffCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pii: PiiService,
  ) {}

  parseConfig(raw: unknown): StaffCardConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_STAFF_CARD_CONFIG };
    }
    const c = raw as Partial<StaffCardConfig>;
    return {
      ...DEFAULT_STAFF_CARD_CONFIG,
      ...c,
      allowance: {
        ...DEFAULT_STAFF_CARD_CONFIG.allowance,
        ...(c.allowance ?? {}),
      },
    };
  }

  async getStaffProgram(tenantId: string, programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { id: programId, tenantId, isActive: true },
    });
    if (!program) throw new NotFoundException('Kart bulunamadı');
    if (program.type !== ProgramType.STAFF_CARD) {
      throw new BadRequestException('Bu kart personel kartı değil');
    }
    return program;
  }

  private resolveManagerPin(
    tenantId: string,
    config: StaffCardConfig,
  ): string | null {
    return (
      config.managerPin?.trim() ||
      this.config.get<string>('STAFF_MANAGER_PIN')?.trim() ||
      null
    );
  }

  assertManagerPin(
    tenantId: string,
    config: StaffCardConfig,
    amountKurus: number,
    pin?: string,
  ) {
    const threshold = config.requireManagerPinAbove ?? 10_000;
    if (amountKurus < threshold) return;

    const expected = this.resolveManagerPin(tenantId, config);
    if (!expected) {
      throw new BadRequestException(
        'Yönetici PIN yapılandırılmamış (STAFF_MANAGER_PIN)',
      );
    }
    if (!pin || pin !== expected) {
      throw new ForbiddenException('Geçersiz yönetici PIN');
    }
  }

  private readMeta(metadata: unknown): StaffProgramMeta {
    if (!metadata || typeof metadata !== 'object') return {};
    return metadata as StaffProgramMeta;
  }

  async assertWhitelisted(
    tenantId: string,
    programId: string,
    phone: string,
    inviteCode?: string,
  ) {
    const program = await this.getStaffProgram(tenantId, programId);
    const config = this.parseConfig(program.config);

    if (config.enrollment === 'WHITELIST') {
      const normalized = phone.replace(/\D/g, '').slice(-10);
      const allowed = (config.whitelistedPhones ?? []).some((p) => {
        const digits = p.replace(/\D/g, '').slice(-10);
        return digits === normalized;
      });
      if (!allowed) {
        throw new ForbiddenException('Telefon personel whitelist\'inde değil');
      }
    } else if (config.enrollment === 'INVITE_CODE') {
      if (!inviteCode || !(config.inviteCodes ?? []).includes(inviteCode)) {
        throw new ForbiddenException('Geçersiz personel davet kodu');
      }
    }

    return { program, config };
  }

  async enrollStaff(
    tenantId: string,
    programId: string,
    customerId: string,
    inviteCode?: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı');

    await this.assertWhitelisted(
      tenantId,
      programId,
      customerPhonePlain(this.pii, customer),
      inviteCode,
    );

    const [updated] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { isStaff: true },
      }),
      this.prisma.customerProgram.upsert({
        where: {
          customerId_programId: { customerId, programId },
        },
        create: {
          tenantId,
          customerId,
          programId,
          balance: 0,
          metadata: {
            monthlySpendKurus: 0,
            dailyRedeemCount: 0,
          } as Prisma.InputJsonValue,
        },
        update: {},
      }),
    ]);

    return updated;
  }

  async redeemStaffBenefit(
    tenantId: string,
    programId: string,
    customerId: string,
    actorUserId: string,
    dto: {
      amountKurus: number;
      managerPin?: string;
      note?: string;
      branchId?: string;
    },
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, isStaff: true },
    });
    if (!customer) {
      throw new ForbiddenException('Personel kartı bulunamadı');
    }

    const program = await this.getStaffProgram(tenantId, programId);
    const config = this.parseConfig(program.config);

    if (
      config.linkedBranchIds?.length &&
      dto.branchId &&
      !config.linkedBranchIds.includes(dto.branchId)
    ) {
      throw new ForbiddenException('Bu şubede personel hakkı kullanılamaz');
    }

    this.assertManagerPin(
      tenantId,
      config,
      dto.amountKurus,
      dto.managerPin,
    );

    const cp = await this.prisma.customerProgram.upsert({
      where: {
        customerId_programId: { customerId, programId },
      },
      create: {
        tenantId,
        customerId,
        programId,
        metadata: {} as Prisma.InputJsonValue,
      },
      update: {},
    });

    const meta = this.readMeta(cp.metadata);
    const today = startOfCalendarDay();
    const dailyCount =
      meta.lastRedeemDay === today ? (meta.dailyRedeemCount ?? 0) : 0;
    const dailyLimit = config.allowance.dailyRedeemLimit ?? 1;
    if (dailyCount >= dailyLimit) {
      throw new BadRequestException('Günlük personel kullanım limiti doldu');
    }

    const monthlyBudget = (config.allowance.monthlyBudgetTry ?? 0) * 100;
    const monthlySpend = meta.monthlySpendKurus ?? 0;
    if (monthlyBudget > 0 && monthlySpend + dto.amountKurus > monthlyBudget) {
      throw new BadRequestException('Aylık personel bütçesi aşıldı');
    }

    const nextMeta: StaffProgramMeta = {
      monthlySpendKurus: monthlySpend + dto.amountKurus,
      dailyRedeemCount: dailyCount + 1,
      lastRedeemDay: today,
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.customerProgram.update({
        where: { id: cp.id },
        data: { metadata: nextMeta as Prisma.InputJsonValue },
      }),
      this.prisma.stampLedger.create({
        data: {
          tenantId,
          customerId,
          programId,
          type: StampLedgerType.STAFF_REDEEM,
          source: StampSource.cashier,
          createdByUserId: actorUserId,
          branchId: dto.branchId ?? null,
          amount: dto.amountKurus,
          note: dto.note ?? null,
          metadata: {
            benefitType: config.benefitType,
            percentDiscount: config.allowance.percentDiscount ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      ok: true,
      metadata: updated.metadata,
      amountKurus: dto.amountKurus,
      benefitType: config.benefitType,
    };
  }

  async getStaffState(tenantId: string, programId: string, customerId: string) {
    const program = await this.getStaffProgram(tenantId, programId);
    const config = this.parseConfig(program.config);
    const cp = await this.prisma.customerProgram.findUnique({
      where: {
        customerId_programId: { customerId, programId },
      },
    });
    const meta = this.readMeta(cp?.metadata);
    const monthlyBudget = (config.allowance.monthlyBudgetTry ?? 0) * 100;

    return {
      programId: program.id,
      programName: program.name,
      isStaff: true,
      config: {
        benefitType: config.benefitType,
        allowance: config.allowance,
        requireManagerPinAbove: config.requireManagerPinAbove,
      },
      usage: {
        monthlySpendKurus: meta.monthlySpendKurus ?? 0,
        monthlyBudgetKurus: monthlyBudget,
        dailyRedeemCount: meta.dailyRedeemCount ?? 0,
        dailyLimit: config.allowance.dailyRedeemLimit ?? 1,
      },
    };
  }
}
