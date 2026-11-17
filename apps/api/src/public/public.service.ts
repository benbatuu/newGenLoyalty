import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgramType, Role, StampSource } from '@prisma/client';
import { PROGRAM_TYPE_LABELS, type ProgramTypeCode } from '@ngl/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { OtpService } from '../auth/otp.service';
import { TenantsService } from '../tenants/tenants.service';
import { StampsService } from '../stamps/stamps.service';
import { WalletService } from '../wallet/wallet.service';
import { customerCreatePhoneData } from '../pii/customer-pii';
import { PiiService } from '../pii/pii.service';
import {
  ContactLeadDto,
  PublicPortalDto,
  PublicSignupDto,
  PublicSocialClaimDto,
} from './dto/public.dto';

const MAX_SELF_ENROLL_PER_DAY = 200;

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly plans: PlansService,
    private readonly stamps: StampsService,
    private readonly wallet: WalletService,
    private readonly pii: PiiService,
    private readonly otp: OtpService,
  ) {}

  async createLead(dto: ContactLeadDto) {
    if (dto.fax_number?.trim()) {
      return { ok: true, discarded: true };
    }

    const lead = await this.prisma.contactLead.create({
      data: {
        name: dto.name.trim(),
        cafe: dto.cafe?.trim() || '—',
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        sector: dto.sector?.trim() || null,
        message: dto.message.trim(),
        source: dto.source?.trim() || 'contact',
      },
    });
    return { ok: true, id: lead.id };
  }

  async listLeads(opts?: { status?: string; source?: string; take?: number }) {
    const take = Math.min(opts?.take ?? 50, 100);
    const where = {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.source ? { source: opts.source } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.contactLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.contactLead.count({ where }),
    ]);
    return { total, items };
  }

  async updateLeadStatus(id: string, status: string, notes?: string | null) {
    const allowed = new Set(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']);
    if (!allowed.has(status)) {
      throw new BadRequestException('Geçersiz durum');
    }
    try {
      return await this.prisma.contactLead.update({
        where: { id },
        data: {
          status,
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        },
      });
    } catch {
      throw new NotFoundException('Lead bulunamadı');
    }
  }

  async signup(dto: PublicSignupDto) {
    if (dto.fax_number?.trim()) {
      return { ok: true, discarded: true };
    }

    const slug =
      dto.slug?.trim() ||
      dto.cafeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'kafe';

    await this.otp.assertRegisterProof(dto.verificationToken, dto.ownerEmail);

    let uniqueSlug = slug;
    for (let i = 0; i < 8; i++) {
      const exists = await this.prisma.tenant.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!exists) break;
      uniqueSlug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const result = await this.tenants.create({
      name: dto.cafeName.trim(),
      slug: uniqueSlug,
      ownerEmail: dto.ownerEmail,
      ownerName: dto.ownerName,
      ownerPassword: dto.ownerPassword,
      planCode: dto.planCode?.trim() || undefined,
    });

    await this.prisma.contactLead.create({
      data: {
        name: dto.ownerName.trim(),
        cafe: dto.cafeName.trim(),
        email: dto.ownerEmail.toLowerCase().trim(),
        message: `Self-serve trial signup · slug=/${uniqueSlug}`,
        source: 'signup',
        status: 'CONVERTED',
      },
    });

    return {
      ok: true,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        subscriptionStatus: result.tenant.subscriptionStatus,
      },
      owner: result.owner,
      loginHint: 'Hesabın hazır. Admin paneline e-posta ve şifrenle giriş yap.',
    };
  }

  listPlans() {
    return this.plans.listPublic();
  }

  /** Müşteri portalı — slug + telefon ile tüm program bakiyeleri */
  async portalStatus(slug: string, phone: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.trim() },
      include: { rewardRule: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Kafe bulunamadı');
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      throw new BadRequestException('Geçerli telefon girin');
    }

    const customer = await this.prisma.customer.findFirst({
      where: this.pii.phoneLookupFilter(tenant.id, phone),
      include: {
        customerPrograms: {
          include: {
            program: {
              select: {
                id: true,
                name: true,
                type: true,
                config: true,
              },
            },
          },
        },
        vipTier: { select: { name: true } },
      },
    });
    if (!customer) {
      throw new NotFoundException('Kayıt bulunamadı');
    }

    const rule = tenant.rewardRule;
    const programs = customer.customerPrograms.map((cp) => {
      const type = cp.program.type as ProgramTypeCode;
      const label =
        PROGRAM_TYPE_LABELS[type] ?? cp.program.name;
      let summary = `${cp.balance}`;
      if (type === ProgramType.CASHBACK_CARD) {
        summary = `${(cp.balance / 100).toFixed(2)} ₺`;
      } else if (type === ProgramType.MULTI_STAMP && cp.balances) {
        const lanes = cp.balances as Record<string, number>;
        summary = Object.entries(lanes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
      }
      return {
        programId: cp.programId,
        name: cp.program.name,
        type,
        typeLabel: label,
        balance: cp.balance,
        balances: cp.balances,
        rewardReady: cp.rewardReady,
        summary,
      };
    });

    const history = await this.prisma.stampLedger.findMany({
      where: { tenantId: tenant.id, customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        type: true,
        amount: true,
        createdAt: true,
        note: true,
      },
    });

    return {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      stampCount: customer.stampCount,
      stampsRequired: rule?.stampsRequired ?? 10,
      rewardLabel: rule?.rewardLabel ?? null,
      rewardReady: customer.rewardReady,
      vipTier: customer.vipTier?.name ?? null,
      programs,
      history: history.map((h) => ({
        type: h.type,
        amount: h.amount,
        note: h.note,
        at: h.createdAt.toISOString(),
      })),
    };
  }


  /**
   * Consumer-visible loyalty programs for a tenant slug (excludes STAFF_CARD).
   * Used by Marketplace DiscoveryService.getPrograms.
   */
  async getPublicPrograms(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.trim() },
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        loyaltyPrograms: {
          where: {
            isActive: true,
            type: { not: ProgramType.STAFF_CARD },
          },
          include: {
            branch: { select: { id: true, name: true } },
            tiers: { orderBy: { sortOrder: 'asc' }, take: 3 },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('İşletme bulunamadı');
    }

    return tenant.loyaltyPrograms.map((p) => {
      const config = (p.config ?? {}) as Record<string, unknown>;
      const primaryTier = p.tiers[0];
      const goal =
        typeof config.stampsRequired === 'number'
          ? (config.stampsRequired as number)
          : typeof config.goal === 'number'
            ? (config.goal as number)
            : primaryTier?.threshold ?? null;
      const label =
        (typeof config.rewardLabel === 'string' && config.rewardLabel) ||
        primaryTier?.rewardLabel ||
        null;
      const name = p.name || label || p.type;
      const description =
        (typeof config.description === 'string' && config.description) ||
        label ||
        null;

      return {
        id: p.id,
        type: p.type,
        name,
        // LoyaltyProgram has no i18n columns yet — mirror name for TR/EN/RU
        nameTr: name,
        nameEn: name,
        nameRu: name,
        description,
        descriptionTr: description,
        descriptionEn: description,
        descriptionRu: description,
        goal,
        label,
        branchId: p.branchId ?? p.branch?.id ?? null,
        branchName: p.branch?.name ?? null,
        config: {
          goal,
          label,
          type: p.type,
        },
      };
    });
  }

  /** Self-enroll sayfası verisi */
  async getEnrollPageData(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.trim() },
      include: { rewardRule: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('İşletme bulunamadı');
    }
    return {
      slug: tenant.slug,
      tenantName: tenant.name,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor ?? '#1B4332',
      inviteHeadline: tenant.inviteHeadline?.trim() || null,
      inviteSubtitle: tenant.inviteSubtitle?.trim() || null,
      inviteLegalText: tenant.inviteLegalText?.trim() || null,
      invitePolicies: tenant.invitePolicies,
      stampsRequired: tenant.rewardRule?.stampsRequired ?? 10,
      rewardLabel: tenant.rewardRule?.rewardLabel ?? 'Ödül',
      welcomeStamp: true,
    };
  }

  /** QR self-enrollment — telefon + KVKK onayı */
  async selfEnroll(slug: string, phoneRaw: string, consent: boolean) {
    if (!consent) {
      throw new BadRequestException('Devam etmek için onay gerekli');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.trim() },
      include: { rewardRule: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('İşletme bulunamadı');
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const enrollToday = await this.prisma.customer.count({
      where: { tenantId: tenant.id, createdAt: { gte: dayStart } },
    });
    if (enrollToday >= MAX_SELF_ENROLL_PER_DAY) {
      throw new BadRequestException(
        'Günlük kayıt limitine ulaşıldı. Lütfen personele başvurun.',
      );
    }

    const phoneData = customerCreatePhoneData(this.pii, phoneRaw);
    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_phoneHash: {
          tenantId: tenant.id,
          phoneHash: phoneData.phoneHash,
        },
      },
    });

    if (existing) {
      const invite = await this.wallet.createWalletInvite(
        existing.id,
        tenant.id,
      );
      return {
        isNew: false,
        inviteUrl: invite.link,
        redirectPath: `/wallet/invite/${this.extractToken(invite.link)}`,
      };
    }

    const owner = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, role: Role.STORE_OWNER, isActive: true },
      select: { id: true },
    });
    if (!owner) {
      throw new BadRequestException('İşletme yapılandırması eksik');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId: tenant.id,
        phone: null,
        ...phoneData,
        consentAt: new Date(),
      },
    });

    await this.stamps.addStamp(
      tenant.id,
      customer.id,
      owner.id,
      StampSource.cashier,
      { skipPassSync: true },
    );

    const invite = await this.wallet.createWalletInvite(
      customer.id,
      tenant.id,
    );

    return {
      isNew: true,
      welcomeStamp: true,
      inviteUrl: invite.link,
      redirectPath: `/wallet/invite/${this.extractToken(invite.link)}`,
    };
  }

  /** Sosyal ödül talebi — müşteri kanıt gönderir */
  async submitSocialClaim(dto: PublicSocialClaimDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.trim() },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Kafe bulunamadı');
    }

    const digits = dto.phone.replace(/\D/g, '');
    if (digits.length < 10) {
      throw new BadRequestException('Geçerli telefon girin');
    }

    const customer = await this.prisma.customer.findFirst({
      where: this.pii.phoneLookupFilter(tenant.id, dto.phone),
    });
    if (!customer) {
      throw new NotFoundException(
        'Önce sadakat programına kayıt olmalısınız',
      );
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const claimsToday = await this.prisma.socialRewardClaim.count({
      where: { tenantId: tenant.id, customerId: customer.id, createdAt: { gte: dayStart } },
    });
    if (claimsToday >= 3) {
      throw new BadRequestException('Günlük talep limitine ulaşıldı');
    }

    const pending = await this.prisma.socialRewardClaim.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: customer.id,
        platform: dto.platform,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new ConflictException('Bu platform için bekleyen talebiniz var');
    }

    const claim = await this.prisma.socialRewardClaim.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        platform: dto.platform,
        actionType: dto.actionType?.trim() || dto.platform,
        proofUrl: dto.proofUrl?.trim() || null,
        rewardStamps: dto.rewardStamps ?? 1,
      },
    });

    return { ok: true, id: claim.id, status: claim.status };
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `90${digits.slice(1)}`;
    if (digits.length >= 10) return digits;
    throw new BadRequestException('Geçerli telefon girin');
  }

  private extractToken(inviteUrl: string): string {
    const parts = inviteUrl.split('/wallet/invite/');
    return parts[1]?.split('?')[0] ?? '';
  }
}
