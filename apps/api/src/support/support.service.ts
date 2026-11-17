import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../tenants/assets.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import {
  CreateSupportTicketDto,
  SupportReplyDto,
  UpdateSupportStatusDto,
} from './support.dto';

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type SupportFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
    private readonly objects: ObjectStorageService,
  ) {}

  /** Takip kodu: DK-XXXX-XXXX (karıştırılabilir karakterler yok) */
  private async newCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const pick = () =>
        Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
      const code = `DK-${pick()}-${pick()}`;
      const exists = await this.prisma.supportTicket.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('Takip kodu üretilemedi, lütfen tekrar deneyin');
  }

  async createTicket(dto: CreateSupportTicketDto, files: SupportFile[] = []) {
    const email = dto.requesterEmail.trim().toLowerCase();
    // Aynı e-postaya sahip işletme varsa talebi o işletmeye bağla
    const owner = await this.prisma.user.findFirst({
      where: { email, tenantId: { not: null } },
      select: { tenantId: true },
    });
    const code = await this.newCode();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        code,
        tenantId: owner?.tenantId ?? null,
        requesterName: dto.requesterName.trim(),
        requesterEmail: email,
        cafe: dto.cafe.trim(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject.trim(),
        messages: {
          create: {
            authorType: 'OWNER',
            authorName: dto.requesterName.trim(),
            body: dto.message.trim(),
          },
        },
      },
      select: { id: true, code: true },
    });
    if (files.length) {
      const first = await this.prisma.supportMessage.findFirst({
        where: { ticketId: ticket.id },
        select: { id: true },
      });
      if (first) await this.attachFiles(ticket.code, first.id, files);
    }
    return { ok: true, code: ticket.code };
  }

  /** Takip kodu + e-posta eşleşmesi olmadan hiçbir yazışma döndürülmez */
  async findForRequester(code: string, email: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } } },
    });
    if (!ticket || ticket.requesterEmail !== email.trim().toLowerCase()) {
      throw new NotFoundException('Talep bulunamadı. Takip kodunu ve e-postayı kontrol edin.');
    }
    return {
      code: ticket.code,
      subject: ticket.subject,
      cafe: ticket.cafe,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map((m) => this.toMessageView(m)),
    };
  }

  async requesterReply(code: string, email: string, dto: SupportReplyDto, files: SupportFile[] = []) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!ticket || ticket.requesterEmail !== email.trim().toLowerCase()) {
      throw new NotFoundException('Talep bulunamadı');
    }
    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorType: 'OWNER',
        authorName: ticket.requesterName,
        body: dto.body.trim(),
      },
      select: { id: true },
    });
    await this.attachFiles(ticket.code, msg.id, files);
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      await this.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
    }
    return { ok: true };
  }

  async adminList(opts: { status?: string; q?: string }) {
    const q = opts.q?.trim();
    const items = await this.prisma.supportTicket.findMany({
      where: {
        ...(opts.status && opts.status !== 'ALL' ? { status: opts.status } : {}),
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { requesterEmail: { contains: q, mode: 'insensitive' } },
                { cafe: { contains: q, mode: 'insensitive' } },
                { requesterName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        code: true,
        cafe: true,
        requesterName: true,
        requesterEmail: true,
        subject: true,
        status: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    const counts = await this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return { items, byStatus };
  }

  async adminDetail(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } } },
    });
    if (!ticket) throw new NotFoundException('Talep bulunamadı');
    const tenant = ticket.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: ticket.tenantId },
          select: { id: true, name: true, slug: true, isActive: true, subscriptionStatus: true, planCode: true },
        })
      : null;
    return {
      ...ticket,
      tenant,
      messages: ticket.messages.map((m) => this.toMessageView(m)),
    };
  }

  async adminReply(id: string, adminName: string, dto: SupportReplyDto, files: SupportFile[] = []) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, select: { id: true, code: true, status: true } });
    if (!ticket) throw new NotFoundException('Talep bulunamadı');
    const msg = await this.prisma.supportMessage.create({
      data: { ticketId: id, authorType: 'ADMIN', authorName: adminName, body: dto.body.trim() },
      select: { id: true },
    });
    await this.attachFiles(ticket.code, msg.id, files);
    if (ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
    } else {
      await this.prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
    }
    return { ok: true };
  }

  async adminSetStatus(id: string, dto: UpdateSupportStatusDto) {
    await this.prisma.supportTicket.update({ where: { id }, data: { status: dto.status } }).catch(() => {
      throw new NotFoundException('Talep bulunamadı');
    });
    return { ok: true };
  }

  private toMessageView(m: {
    id: string;
    authorType: string;
    authorName: string;
    body: string;
    createdAt: Date;
    attachments: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; url: string }>;
  }) {
    return {
      id: m.id,
      authorType: m.authorType,
      authorName: m.authorName,
      body: m.body,
      createdAt: m.createdAt,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        url: a.url,
      })),
    };
  }

  /** Dosyaları doğrular, R2 (varsa) ya da yerel diske yazar ve kayıt oluşturur */
  private async attachFiles(ticketCode: string, messageId: string, files: SupportFile[]) {
    if (!files.length) return;
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`En fazla ${MAX_FILES} dosya ekleyebilirsiniz`);
    }
    for (const f of files) {
      const ext = ALLOWED_MIME[f.mimetype];
      if (!ext) throw new BadRequestException('Sadece PNG, JPEG, WebP, GIF veya PDF yükleyin');
      if (f.size > MAX_FILE_BYTES) throw new BadRequestException('Dosya en fazla 10 MB olabilir');
    }
    for (const f of files) {
      const ext = ALLOWED_MIME[f.mimetype];
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filename = `${stamp}.${ext}`;
      const objectKey = `support/${ticketCode}/${filename}`;
      let url: string | null = null;
      if (this.objects.isConfigured()) {
        try {
          const stored = await this.objects.putObject({ key: objectKey, body: f.buffer, contentType: f.mimetype });
          url = stored.url;
        } catch (err) {
          this.logger.error(`R2 support upload failed, local fallback: ${(err as Error).message}`);
        }
      }
      if (!url) {
        const dir = path.join(this.assets.uploadsRoot, 'support', ticketCode);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, filename), f.buffer);
        url = `${this.assets.publicBaseUrl()}/uploads/${objectKey}`;
      }
      await this.prisma.supportAttachment.create({
        data: {
          messageId,
          fileName: this.safeName(f.originalname),
          mimeType: f.mimetype,
          sizeBytes: f.size,
          url,
        },
      });
    }
  }

  private safeName(name: string): string {
    return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'dosya';
  }
}
