import type { PrismaService } from '../prisma/prisma.service';

/** Ana damga kartının ödül eşiği ve ödül adı (yoksa eski RewardRule). */
export async function resolveStampRewardMeta(
  prisma: PrismaService,
  tenantId: string,
): Promise<{ stampsRequired: number; rewardLabel: string }> {
  const primary = await prisma.loyaltyProgram.findFirst({
    where: { tenantId, isPrimary: true, isActive: true },
    include: { tiers: { orderBy: { sortOrder: 'asc' } } },
  });
  if (primary?.tiers?.length) {
    const stampsRequired = Math.max(...primary.tiers.map((t) => t.threshold));
    const rewardLabel =
      primary.tiers.find((t) => t.threshold === stampsRequired)?.rewardLabel ??
      primary.tiers[0]!.rewardLabel;
    return { stampsRequired, rewardLabel };
  }
  const rule = await prisma.rewardRule.findUnique({ where: { tenantId } });
  return {
    stampsRequired: rule?.stampsRequired ?? 10,
    rewardLabel: rule?.rewardLabel ?? '',
  };
}
