import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GiftCreditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.giftCredit.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(tenantId: string, amountKurus: number, expiresAt?: Date) {
    if (amountKurus < 100) {
      throw new BadRequestException('Minimum 1 TL');
    }
    const code = randomBytes(4).toString('hex').toUpperCase();
    return this.prisma.giftCredit.create({
      data: {
        tenantId,
        code,
        amountKurus,
        expiresAt: expiresAt ?? null,
      },
    });
  }

  async redeem(tenantId: string, code: string, customerId: string) {
    const gift = await this.prisma.giftCredit.findFirst({
      where: { tenantId, code: code.trim().toUpperCase(), status: 'ACTIVE' },
    });
    if (!gift) throw new NotFoundException('Geçersiz veya kullanılmış kod');
    if (gift.expiresAt && gift.expiresAt < new Date()) {
      throw new BadRequestException('Kod süresi dolmuş');
    }

    return this.prisma.giftCredit.update({
      where: { id: gift.id },
      data: {
        status: 'REDEEMED',
        redeemedByCustomerId: customerId,
        redeemedAt: new Date(),
      },
    });
  }

  async cancel(tenantId: string, id: string) {
    const gift = await this.prisma.giftCredit.findFirst({
      where: { id, tenantId, status: 'ACTIVE' },
    });
    if (!gift) throw new NotFoundException('Hediye kartı bulunamadı');
    return this.prisma.giftCredit.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
