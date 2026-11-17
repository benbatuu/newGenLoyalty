import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgramType, Role, StampLedgerType, StampSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StampsService } from '../stamps/stamps.service';
import type {
  CreateNfcDeviceDto,
  NfcConfirmDto,
  NfcTapDto,
  UpdateNfcDeviceDto,
} from './dto/nfc.dto';

@Injectable()
export class NfcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stamps: StampsService,
  ) {}

  async listDevices(tenantId: string) {
    return this.prisma.nfcDevice.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { label: 'asc' }],
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async createDevice(tenantId: string, dto: CreateNfcDeviceDto) {
    if (dto.branchId) {
      await this.assertBranch(tenantId, dto.branchId);
    }
    return this.prisma.nfcDevice.create({
      data: {
        tenantId,
        label: dto.label.trim(),
        tagUrl: dto.tagUrl.trim(),
        branchId: dto.branchId ?? null,
      },
    });
  }

  async updateDevice(tenantId: string, id: string, dto: UpdateNfcDeviceDto) {
    await this.getOwnedDevice(tenantId, id);
    if (dto.branchId) {
      await this.assertBranch(tenantId, dto.branchId);
    }
    return this.prisma.nfcDevice.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.tagUrl !== undefined ? { tagUrl: dto.tagUrl.trim() } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async removeDevice(tenantId: string, id: string) {
    await this.getOwnedDevice(tenantId, id);
    await this.prisma.nfcDevice.delete({ where: { id } });
    return { ok: true };
  }

  async tap(tenantId: string | null, dto: NfcTapDto) {
    const device = await this.prisma.nfcDevice.findFirst({
      where: {
        id: dto.deviceId,
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (!device) {
      throw new NotFoundException('NFC cihazı bulunamadı');
    }

    let customerId = dto.customerId ?? null;
    if (!customerId && dto.passCode) {
      customerId = this.stamps.parsePassCode(dto.passCode);
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId: device.tenantId },
      });
      if (!customer) {
        throw new NotFoundException('Müşteri bulunamadı');
      }
    }

    // Kayıtlı müşteri + passCode → otomatik damga (onay bypass)
    if (customerId && dto.passCode) {
      const owner = await this.prisma.user.findFirst({
        where: {
          tenantId: device.tenantId,
          role: Role.STORE_OWNER,
          isActive: true,
        },
        select: { id: true },
      });
      if (owner) {
        const stampResult = await this.stamps.addStamp(
          device.tenantId,
          customerId,
          owner.id,
          StampSource.nfc,
        );
        const event = await this.prisma.nfcTapEvent.create({
          data: {
            tenantId: device.tenantId,
            deviceId: device.id,
            customerId,
            status: 'CONFIRMED',
            metadata: {
              branchId: device.branchId,
              autoConfirmed: true,
            },
          },
        });
        return {
          tapEventId: event.id,
          status: 'CONFIRMED',
          tenantId: device.tenantId,
          customerId,
          autoConfirmed: true,
          stamp: stampResult,
          device: { id: device.id, label: device.label },
        };
      }
    }

    const event = await this.prisma.nfcTapEvent.create({
      data: {
        tenantId: device.tenantId,
        deviceId: device.id,
        customerId,
        status: 'PENDING',
        metadata: {
          branchId: device.branchId,
          tagUrl: device.tagUrl,
        },
      },
    });

    return {
      tapEventId: event.id,
      status: event.status,
      tenantId: device.tenantId,
      customerId,
      device: { id: device.id, label: device.label },
    };
  }

  async listPending(tenantId: string) {
    return this.prisma.nfcTapEvent.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        device: { select: { id: true, label: true, branchId: true } },
      },
    });
  }

  async confirm(
    tenantId: string,
    actorUserId: string,
    dto: NfcConfirmDto,
  ) {
    const event = await this.prisma.nfcTapEvent.findFirst({
      where: { id: dto.tapEventId, tenantId, status: 'PENDING' },
    });
    if (!event) {
      throw new NotFoundException('Bekleyen NFC dokunuşu bulunamadı');
    }
    if (!event.customerId) {
      throw new BadRequestException(
        'Müşteri tanımlanmamış dokunuş onaylanamaz',
      );
    }

    const stampResult = await this.stamps.addStamp(
      tenantId,
      event.customerId,
      actorUserId,
      StampSource.nfc,
      {
        skipPassSync: false,
      },
    );

    await this.prisma.nfcTapEvent.update({
      where: { id: event.id },
      data: {
        status: 'CONFIRMED',
        metadata: {
          ...(typeof event.metadata === 'object' && event.metadata
            ? (event.metadata as Record<string, unknown>)
            : {}),
          confirmedByUserId: actorUserId,
          confirmedAt: new Date().toISOString(),
        },
      },
    });

    return { tapEventId: event.id, status: 'CONFIRMED', stamp: stampResult };
  }

  private async getOwnedDevice(tenantId: string, id: string) {
    const row = await this.prisma.nfcDevice.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('NFC cihazı bulunamadı');
    return row;
  }

  private async assertBranch(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isActive: true },
    });
    if (!branch) throw new BadRequestException('Geçersiz şube');
  }
}
