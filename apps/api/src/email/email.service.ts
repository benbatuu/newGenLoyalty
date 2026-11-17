import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  EMAIL_MERGE_TAGS,
  applyEmailBranding,
  applyMergeTags,
  emailDocumentFromMarkdown,
  getEmailStarter,
  isEmailDocument,
  listEmailStarters,
  mergeContextFromCustomer,
  personalizeEmailDocument,
  plainTextFromDocument,
  planHasFeature,
  renderEmailHtml,
  type EmailDocument,
  type EmailMergeContext,
} from '@ngl/shared';
import { CrmService } from '../crm/crm.service';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../tenants/assets.service';
import type { CreateEmailCampaignDto } from './dto/email-campaign.dto';
import type { CreateFromStarterDto } from './dto/email-starter.dto';
import type {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';

type SendResult = { ok: boolean; provider: string; error?: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly plans: PlansService,
    private readonly crm: CrmService,
    private readonly assets: AssetsService,
  ) {}

  private env(key: string): string | undefined {
    return (
      process.env[key]?.trim() ||
      this.config.get<string>(key)?.trim() ||
      undefined
    );
  }

  provider(): string {
    return (this.env('EMAIL_PROVIDER') ?? 'mock').toLowerCase();
  }

  async assertEmailFeature(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    if (!planHasFeature(plan.planCode, 'email', plan.features)) {
      throw new ForbiddenException(
        'E-posta modülü paketinizde yok. Business pakete geçin.',
      );
    }
  }

  resolveTemplateBody(template: {
    bodyMd: string;
    bodyJson: unknown;
    bodyHtml: string | null;
  }): { html: string; text: string } {
    if (template.bodyHtml?.trim()) {
      const doc = isEmailDocument(template.bodyJson)
        ? template.bodyJson
        : null;
      return {
        html: template.bodyHtml,
        text: doc ? plainTextFromDocument(doc) : template.bodyMd,
      };
    }
    if (isEmailDocument(template.bodyJson)) {
      const html = renderEmailHtml(template.bodyJson);
      return {
        html,
        text: plainTextFromDocument(template.bodyJson),
      };
    }
    if (template.bodyMd.trim()) {
      const doc = emailDocumentFromMarkdown(template.bodyMd);
      return {
        html: renderEmailHtml(doc),
        text: template.bodyMd,
      };
    }
    const empty = emailDocumentFromMarkdown('');
    return {
      html: renderEmailHtml(empty),
      text: '',
    };
  }

  prepareTemplatePayload(dto: {
    bodyJson: EmailDocument;
    bodyHtml?: string;
  }): { bodyJson: EmailDocument; bodyHtml: string; bodyMd: string } {
    const bodyJson = dto.bodyJson;
    const bodyHtml = dto.bodyHtml?.trim() || renderEmailHtml(bodyJson);
    return {
      bodyJson,
      bodyHtml,
      bodyMd: plainTextFromDocument(bodyJson),
    };
  }

  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<SendResult> {
    const apiKey = this.env('RESEND_API_KEY');
    const from =
      this.env('EMAIL_FROM') ?? 'Dokun & Kazan <onboarding@resend.dev>';
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY eksik — mock moda düşülüyor');
      return { ok: true, provider: 'mock' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => res.statusText);
        this.logger.warn(`Resend failed ${res.status}: ${raw}`);
        return { ok: false, provider: 'resend', error: raw.slice(0, 200) };
      }
      return { ok: true, provider: 'resend' };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`Resend error: ${msg}`);
      return { ok: false, provider: 'resend', error: msg };
    }
  }

  async sendTransactional(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    tenantId?: string;
  }): Promise<SendResult> {
    const provider = this.provider();
    if (provider === 'mock') {
      this.logger.log(
        `[mock email] to=${opts.to} subject=${opts.subject}`,
      );
      return { ok: true, provider: 'mock' };
    }
    if (provider === 'resend') {
      return this.sendViaResend(
        opts.to,
        opts.subject,
        opts.html,
        opts.text,
      );
    }
    this.logger.warn(`Email provider ${provider} desteklenmiyor — mock`);
    return { ok: true, provider: 'mock' };
  }

  async listMergeTags() {
    return EMAIL_MERGE_TAGS;
  }

  private async businessMergeContext(
    tenantId: string,
  ): Promise<EmailMergeContext> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        passPhone: true,
        passWebsiteUrl: true,
      },
    });
    return {
      businessName: tenant.name,
      businessPhone: tenant.passPhone ?? undefined,
      businessWebsite: tenant.passWebsiteUrl ?? undefined,
    };
  }

  private resolveBodyForContext(
    template: {
      bodyMd: string;
      bodyJson: unknown;
      bodyHtml: string | null;
    },
    ctx: EmailMergeContext,
  ): { html: string; text: string } {
    if (isEmailDocument(template.bodyJson)) {
      const doc = personalizeEmailDocument(template.bodyJson, ctx);
      return {
        html: renderEmailHtml(doc),
        text: plainTextFromDocument(doc),
      };
    }
    const base = this.resolveTemplateBody(template);
    return {
      html: applyMergeTags(base.html, ctx),
      text: applyMergeTags(base.text, ctx),
    };
  }

  private async resolveRecipientProfiles(
    tenantId: string,
    segmentId?: string | null,
  ) {
    let ids: Set<string> | null = null;
    if (segmentId) {
      ids = await this.crm.listSegmentCustomerIds(tenantId, segmentId);
    }

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      email: { not: null },
      ...(ids ? { id: { in: [...ids] } } : {}),
    };

    const rows = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        stampCount: true,
        rewardReady: true,
        lifecycleStage: true,
        vipTier: { select: { name: true } },
      },
    });

    return rows.filter((r) => Boolean(r.email?.trim()));
  }

  async listStarters() {
    return listEmailStarters().map((s) => ({
      id: s.id,
      sectorId: s.sectorId,
      sectorLabel: s.sectorLabel,
      name: s.name,
      subject: s.subject,
      description: s.description,
    }));
  }

  async createFromStarter(tenantId: string, dto: CreateFromStarterDto) {
    await this.assertEmailFeature(tenantId);
    const starter = getEmailStarter(dto.starterId);
    if (!starter) {
      throw new NotFoundException('Örnek şablon bulunamadı');
    }
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, logoUrl: true, primaryColor: true },
    });
    const branded = applyEmailBranding(starter.document, {
      businessName: tenant.name,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
    });
    return this.createTemplate(tenantId, {
      name: dto.name?.trim() || starter.name,
      subject: starter.subject,
      bodyJson: branded,
    });
  }

  async uploadMedia(tenantId: string, file: Express.Multer.File) {
    await this.assertEmailFeature(tenantId);
    const { url } = await this.assets.saveEmailMedia(tenantId, file);
    return { url: this.assets.rewriteStoredAssetUrl(url) ?? url };
  }

  async listTemplates(tenantId: string) {
    await this.assertEmailFeature(tenantId);
    return this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        bodyJson: true,
        bodyHtml: true,
        bodyMd: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getTemplate(tenantId: string, templateId: string) {
    await this.assertEmailFeature(tenantId);
    const row = await this.prisma.emailTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!row) {
      throw new NotFoundException('E-posta şablonu bulunamadı');
    }
    return row;
  }

  async createTemplate(tenantId: string, dto: CreateEmailTemplateDto) {
    await this.assertEmailFeature(tenantId);
    const payload = this.prepareTemplatePayload(dto);
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        subject: dto.subject.trim(),
        bodyJson: payload.bodyJson as unknown as Prisma.InputJsonValue,
        bodyHtml: payload.bodyHtml,
        bodyMd: payload.bodyMd,
      },
    });
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    dto: UpdateEmailTemplateDto,
  ) {
    await this.assertEmailFeature(tenantId);
    const existing = await this.getTemplate(tenantId, templateId);
    const payload = dto.bodyJson
      ? this.prepareTemplatePayload({
          bodyJson: dto.bodyJson,
          bodyHtml: dto.bodyHtml,
        })
      : null;

    return this.prisma.emailTemplate.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject.trim() } : {}),
        ...(payload
          ? {
              bodyJson: payload.bodyJson as unknown as Prisma.InputJsonValue,
              bodyHtml: payload.bodyHtml,
              bodyMd: payload.bodyMd,
            }
          : {}),
      },
    });
  }

  /**
   * Şablonu siler. Kampanyası olan şablon silinmez: kampanya kayıtları (gönderim geçmişi)
   * şablon silinince birlikte silinirdi.
   */
  async deleteTemplate(tenantId: string, templateId: string) {
    await this.assertEmailFeature(tenantId);
    await this.getTemplate(tenantId, templateId);
    const campaigns = await this.prisma.emailCampaign.count({
      where: { tenantId, templateId },
    });
    if (campaigns > 0) {
      throw new ConflictException(
        'Bu şablonla oluşturulmuş kampanyalar var. Gönderim geçmişini korumak için şablon silinemez.',
      );
    }
    await this.prisma.emailTemplate.delete({ where: { id: templateId } });
    return { ok: true as const };
  }

  async duplicateTemplate(tenantId: string, templateId: string) {
    const source = await this.getTemplate(tenantId, templateId);
    const bodyJson = isEmailDocument(source.bodyJson)
      ? source.bodyJson
      : emailDocumentFromMarkdown(source.bodyMd);
    const payload = this.prepareTemplatePayload({
      bodyJson,
      bodyHtml: source.bodyHtml ?? undefined,
    });

    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        name: `${source.name} (kopya)`,
        subject: source.subject,
        bodyJson: payload.bodyJson as unknown as Prisma.InputJsonValue,
        bodyHtml: payload.bodyHtml,
        bodyMd: payload.bodyMd,
      },
    });
  }

  async listCampaigns(tenantId: string) {
    await this.assertEmailFeature(tenantId);
    return this.prisma.emailCampaign.findMany({
      where: { tenantId },
      include: { template: { select: { id: true, name: true, subject: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(tenantId: string, dto: CreateEmailCampaignDto) {
    await this.assertEmailFeature(tenantId);
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id: dto.templateId, tenantId },
    });
    if (!template) {
      throw new NotFoundException('E-posta şablonu bulunamadı');
    }

    if (dto.segmentId) {
      const segment = await this.prisma.segment.findFirst({
        where: { id: dto.segmentId, tenantId },
      });
      if (!segment) {
        throw new NotFoundException('Segment bulunamadı');
      }
    }

    return this.prisma.emailCampaign.create({
      data: {
        tenantId,
        templateId: dto.templateId,
        segmentId: dto.segmentId ?? null,
        status: 'DRAFT',
      },
      include: { template: { select: { id: true, name: true, subject: true } } },
    });
  }

  async duplicateCampaign(campaignId: string, tenantId: string) {
    await this.assertEmailFeature(tenantId);
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { template: true },
    });
    if (!campaign) {
      throw new NotFoundException('E-posta kampanyası bulunamadı');
    }

    const template = await this.duplicateTemplate(
      tenantId,
      campaign.templateId,
    );
    const draft = await this.prisma.emailCampaign.create({
      data: {
        tenantId,
        templateId: template.id,
        segmentId: campaign.segmentId,
        status: 'DRAFT',
      },
      include: { template: true },
    });

    return { template, campaign: draft };
  }

  async sendCampaign(campaignId: string, tenantId: string) {
    await this.assertEmailFeature(tenantId);
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { template: true },
    });
    if (!campaign) {
      throw new NotFoundException('E-posta kampanyası bulunamadı');
    }
    if (campaign.status === 'SENT') {
      return {
        sent: campaign.sentCount,
        skipped: 0,
        failed: 0,
        template: campaign.template.name,
      };
    }

    const recipients = await this.resolveRecipientProfiles(
      tenantId,
      campaign.segmentId,
    );
    if (recipients.length === 0) {
      throw new NotFoundException(
        'Gönderilecek e-posta adresi yok (müşteri e-postası veya segment)',
      );
    }

    const businessCtx = await this.businessMergeContext(tenantId);
    let sent = 0;
    let failed = 0;
    for (const customer of recipients) {
      const ctx = mergeContextFromCustomer(customer, businessCtx);
      const body = this.resolveBodyForContext(campaign.template, ctx);
      const subject = applyMergeTags(campaign.template.subject, ctx);
      const result = await this.sendTransactional({
        to: customer.email!.trim(),
        subject,
        html: body.html,
        text: body.text,
        tenantId,
      });
      if (result.ok) sent += 1;
      else failed += 1;
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentCount: sent,
      },
    });

    return {
      sent,
      failed,
      skipped: 0,
      total: recipients.length,
      template: campaign.template.name,
      provider: this.provider(),
    };
  }
}
