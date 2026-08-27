import { PrismaClient, Role, StampLedgerType, StampSource, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS: { code: string; description: string; roles: Role[] }[] = [
  {
    code: 'tenant:manage',
    description: 'Tüm kafeleri yönet',
    roles: [Role.SUPER_ADMIN],
  },
  {
    code: 'tenant:read',
    description: 'Kendi kafesini görüntüle',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER],
  },
  {
    code: 'tenant:update',
    description: 'Kafe profili / ödül kuralı güncelle',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER],
  },
  {
    code: 'staff:manage',
    description: 'Kasiyer davet / yönet',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER],
  },
  {
    code: 'customer:write',
    description: 'Müşteri kayıt ve damga',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER],
  },
  {
    code: 'reward:redeem',
    description: 'Ödül kullan',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER],
  },
  {
    code: 'reports:read',
    description: 'Basit özet raporları',
    roles: [Role.SUPER_ADMIN, Role.STORE_OWNER, Role.CASHIER],
  },
];

async function ensureTenant(opts: {
  slug: string;
  name: string;
  color: string;
  ownerEmail: string;
  ownerName: string;
  cashierEmail: string;
  cashierName: string;
  passwordHash: string;
  stampsRequired: number;
  rewardLabel: string;
  subscriptionStatus: SubscriptionStatus;
}) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: opts.slug },
    update: {
      name: opts.name,
      primaryColor: opts.color,
      planCode: 'cafe',
      planPriceTry: 990,
      subscriptionStatus: opts.subscriptionStatus,
      isActive: true,
    },
    create: {
      name: opts.name,
      slug: opts.slug,
      primaryColor: opts.color,
      planCode: 'cafe',
      planPriceTry: 990,
      subscriptionStatus: opts.subscriptionStatus,
    },
  });

  await prisma.rewardRule.upsert({
    where: { tenantId: tenant.id },
    update: {
      stampsRequired: opts.stampsRequired,
      rewardLabel: opts.rewardLabel,
    },
    create: {
      tenantId: tenant.id,
      stampsRequired: opts.stampsRequired,
      rewardLabel: opts.rewardLabel,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: opts.ownerEmail },
    update: {
      passwordHash: opts.passwordHash,
      name: opts.ownerName,
      role: Role.STORE_OWNER,
      tenantId: tenant.id,
      isActive: true,
    },
    create: {
      email: opts.ownerEmail,
      passwordHash: opts.passwordHash,
      name: opts.ownerName,
      role: Role.STORE_OWNER,
      tenantId: tenant.id,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: opts.cashierEmail },
    update: {
      passwordHash: opts.passwordHash,
      name: opts.cashierName,
      role: Role.CASHIER,
      tenantId: tenant.id,
      isActive: true,
    },
    create: {
      email: opts.cashierEmail,
      passwordHash: opts.passwordHash,
      name: opts.cashierName,
      role: Role.CASHIER,
      tenantId: tenant.id,
    },
  });

  return { tenant, owner, cashier };
}

async function main() {
  for (const item of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: item.code },
      update: { description: item.description },
      create: { code: item.code, description: item.description },
    });

    for (const role of item.roles) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: { role, permissionId: permission.id },
        },
        update: {},
        create: { role, permissionId: permission.id },
      });
    }
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@dokunkazan.local' },
    update: { passwordHash, name: 'Super Admin', role: Role.SUPER_ADMIN },
    create: {
      email: 'admin@dokunkazan.local',
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  const demo = await ensureTenant({
    slug: 'demo-kafe',
    name: 'Demo Kafe',
    color: '#1B4332',
    ownerEmail: 'owner@demo-kafe.local',
    ownerName: 'Demo Owner',
    cashierEmail: 'cashier@demo-kafe.local',
    cashierName: 'Demo Cashier',
    passwordHash,
    stampsRequired: 10,
    rewardLabel: '1 bedava kahve',
    subscriptionStatus: SubscriptionStatus.TRIAL,
  });

  const pilot = await ensureTenant({
    slug: 'pilot-bahce',
    name: 'Pilotçe Kahve',
    color: '#3D405B',
    ownerEmail: 'owner@pilot-bahce.local',
    ownerName: 'Bahçe Owner',
    cashierEmail: 'cashier@pilot-bahce.local',
    cashierName: 'Bahçe Cashier',
    passwordHash,
    stampsRequired: 8,
    rewardLabel: '1 bedava filtre',
    subscriptionStatus: SubscriptionStatus.ACTIVE,
  });

  await prisma.tenant.update({
    where: { id: pilot.tenant.id },
    data: { subscriptionActivatedAt: new Date() },
  });

  // Demo müşteri + birkaç damga (idempotent telefon)
  const samplePhone = '5551112233';
  let customer = await prisma.customer.findUnique({
    where: {
      tenantId_phone: { tenantId: demo.tenant.id, phone: samplePhone },
    },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: demo.tenant.id,
        phone: samplePhone,
        stampCount: 3,
        rewardReady: false,
        consentAt: new Date(),
      },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.stampLedger.create({
        data: {
          tenantId: demo.tenant.id,
          customerId: customer.id,
          type: StampLedgerType.STAMP,
          source: StampSource.cashier,
          createdByUserId: demo.cashier.id,
        },
      });
    }
  }

  console.log('Seed OK');
  console.log({
    password: 'Password123!',
    superAdmin: superAdmin.email,
    demo: {
      tenant: demo.tenant.slug,
      owner: demo.owner.email,
      cashier: demo.cashier.email,
      sampleCustomerPhone: samplePhone,
    },
    pilot: {
      tenant: pilot.tenant.slug,
      owner: pilot.owner.email,
      cashier: pilot.cashier.email,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
