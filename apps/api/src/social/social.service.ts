import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StampSource } from '@prisma/client';
import { planHasFeature, ROLLOUT_FLAGS } from '@ngl/shared';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { StampsService } from '../stamps/stamps.service';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly stamps: StampsService,
  ) {}

  private assertSocialEnabled() {
    if (!ROLLOUT_FLAGS.socialRewards) {
      throw new ServiceUnavailableException(
        'Sosyal ödüller şu an kullanılamıyor.',
      );
    }
  }

  private async assertSocialFeature(tenantId: string) {
    this.assertSocialEnabled();
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { planCode: true },
    });
    const plan = await this.plans.getTenantPlan(tenant.planCode);
    if (!planHasFeature(plan.planCode, 'crm', plan.features)) {
      throw new ForbiddenException(
        'Sosyal ödüller paketinizde yok. Business pakete geçin.',
      );
    }
  }

  async listPending(tenantId: string) {
    await this.assertSocialFeature(tenantId);
    return this.prisma.socialRewardClaim.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            phone: true,
            displayName: true,
            stampCount: true,
          },
        },
      },
    });
  }

  async approve(tenantId: string, id: string, actorUserId: string) {
    await this.assertSocialFeature(tenantId);
    const claim = await this.prisma.socialRewardClaim.findFirst({
      where: { id, tenantId },
    });
    if (!claim) {
      throw new NotFoundException('Talep bulunamadı');
    }
    if (claim.status !== 'PENDING') {
      throw new BadRequestException('Bu talep zaten işlendi');
    }

    const stampsToGrant = Math.max(1, claim.rewardStamps ?? 1);
    for (let i = 0; i < stampsToGrant; i++) {
      await this.stamps.addStamp(
        tenantId,
        claim.customerId,
        actorUserId,
        StampSource.cashier,
      );
    }

    return this.prisma.socialRewardClaim.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(tenantId: string, id: string) {
    await this.assertSocialFeature(tenantId);
    return this.updateStatus(tenantId, id, 'REJECTED');
  }

  private async updateStatus(
    tenantId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const claim = await this.prisma.socialRewardClaim.findFirst({
      where: { id, tenantId },
    });
    if (!claim) {
      throw new NotFoundException('Talep bulunamadı');
    }
    if (claim.status !== 'PENDING') {
      throw new BadRequestException('Bu talep zaten işlendi');
    }

    return this.prisma.socialRewardClaim.update({
      where: { id },
      data: { status },
    });
  }
}
