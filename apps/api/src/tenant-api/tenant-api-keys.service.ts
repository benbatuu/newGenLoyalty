import { createHash, randomBytes } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { planHasFeature } from '@ngl/shared';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
  ) {}

  private async assertApiFeature(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    if (!planHasFeature(plan.planCode, 'api', plan.features)) {
      throw new ForbiddenException('API erişimi Enterprise pakette.');
    }
  }

  async list(tenantId: string) {
    await this.assertApiFeature(tenantId);
    return this.prisma.tenantApiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async create(tenantId: string, label: string) {
    await this.assertApiFeature(tenantId);
    const raw = `ngl_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.slice(0, 12);

    const row = await this.prisma.tenantApiKey.create({
      data: {
        tenantId,
        label: label.trim(),
        keyHash,
        keyPrefix,
      },
    });

    return {
      id: row.id,
      label: row.label,
      keyPrefix: row.keyPrefix,
      apiKey: raw,
      hint: 'Bu anahtar yalnızca bir kez gösterilir.',
    };
  }

  async revoke(tenantId: string, id: string) {
    await this.assertApiFeature(tenantId);
    const row = await this.prisma.tenantApiKey.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Anahtar bulunamadı');
    return this.prisma.tenantApiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validateKey(rawKey: string): Promise<{ tenantId: string; keyId: string }> {
    const keyHash = createHash('sha256').update(rawKey.trim()).digest('hex');
    const row = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, isActive: true },
      select: { id: true, tenantId: true },
    });
    if (!row) {
      throw new UnauthorizedException('Geçersiz veya iptal edilmiş API anahtarı');
    }
    await this.prisma.tenantApiKey.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return { tenantId: row.tenantId, keyId: row.id };
  }
}
