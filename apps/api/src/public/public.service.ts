import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { ContactLeadDto, PublicSignupDto } from './dto/public.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async createLead(dto: ContactLeadDto) {
    const lead = await this.prisma.contactLead.create({
      data: {
        name: dto.name.trim(),
        cafe: dto.cafe.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        sector: dto.sector?.trim() || null,
        message: dto.message.trim(),
        source: dto.source?.trim() || 'contact',
      },
    });
    return { ok: true, id: lead.id };
  }

  async listLeads(opts?: { status?: string; take?: number }) {
    const take = Math.min(opts?.take ?? 50, 100);
    const where = opts?.status ? { status: opts.status } : {};
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
    });

    // Also store as lead for SuperAdmin visibility
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
}
