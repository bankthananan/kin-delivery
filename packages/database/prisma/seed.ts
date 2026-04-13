import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const platformConfigs = [
    { key: 'base_fee', value: '15' },
    { key: 'distance_rate', value: '10' },
    { key: 'commission_pct', value: '15' },
    { key: 'min_order', value: '100' },
    { key: 'min_withdrawal', value: '100' },
    { key: 'surge_threshold', value: '0.5' },
    { key: 'surge_multiplier', value: '1.5' },
  ];

  for (const config of platformConfigs) {
    await prisma.platformConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log('PlatformConfig seeded');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kin.dev' },
    update: {},
    create: {
      email: 'admin@kin.dev',
      phone: '+66800000001',
      passwordHash,
      role: Role.ADMIN,
      admin: {
        create: { level: 'superadmin' },
      },
    },
  });
  console.log('Admin user seeded:', adminUser.email);

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@kin.dev' },
    update: {},
    create: {
      email: 'customer@kin.dev',
      phone: '+66800000002',
      passwordHash,
      role: Role.CUSTOMER,
      customer: {
        create: {
          wallet: {
            create: { balance: 500 },
          },
        },
      },
    },
  });
  console.log('Customer user seeded:', customerUser.email);

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@kin.dev' },
    update: {},
    create: {
      email: 'driver@kin.dev',
      phone: '+66800000003',
      passwordHash,
      role: Role.DRIVER,
      driver: {
        create: {
          vehiclePlate: 'กข 1234',
          isOnline: false,
          wallet: {
            create: { balance: 0 },
          },
        },
      },
    },
  });
  console.log('Driver user seeded:', driverUser.email);

  const restaurant1 = await prisma.restaurant.upsert({
    where: { userId: 'seed-restaurant-user-1' },
    update: {},
    create: {
      userId: 'seed-restaurant-user-1',
      name: 'ข้าวมันไก่ สมชาย',
      description: 'ข้าวมันไก่ต้นตำรับ สูตรดั้งเดิม หอมนุ่ม อร่อย',
      isOpen: true,
      openingTime: '07:00',
      closingTime: '20:00',
      lat: 13.7563,
      lng: 100.5018,
      wallet: {
        create: { balance: 0 },
      },
      menuCategories: {
        create: [
          {
            name: 'เมนูหลัก',
            sortOrder: 1,
            items: {
              create: [
                {
                  name: 'ข้าวมันไก่ต้ม',
                  description: 'ข้าวมันไก่ต้มพร้อมน้ำจิ้มสูตรพิเศษ',
                  price: 55,
                  isAvailable: true,
                },
                {
                  name: 'ข้าวมันไก่ทอด',
                  description: 'ข้าวมันไก่ทอดกรอบ เนื้อนุ่ม',
                  price: 60,
                  isAvailable: true,
                },
                {
                  name: 'ข้าวมันไก่รวม (ต้ม+ทอด)',
                  description: 'ข้าวมันไก่รวมสองอย่างในจานเดียว',
                  price: 75,
                  isAvailable: true,
                },
              ],
            },
          },
          {
            name: 'เครื่องดื่ม',
            sortOrder: 2,
            items: {
              create: [
                {
                  name: 'น้ำเต้าหู้',
                  description: 'น้ำเต้าหู้สด หวานน้อย',
                  price: 20,
                  isAvailable: true,
                },
                {
                  name: 'ชาเย็น',
                  description: 'ชาไทยเย็นหวานมัน',
                  price: 25,
                  isAvailable: true,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('Restaurant 1 seeded:', restaurant1.name);

  const restaurant2 = await prisma.restaurant.upsert({
    where: { userId: 'seed-restaurant-user-2' },
    update: {},
    create: {
      userId: 'seed-restaurant-user-2',
      name: 'ผัดไทยคุณนาย',
      description: 'ผัดไทยสูตรโบราณ ใส่กุ้งสด เส้นเหนียวนุ่ม',
      isOpen: true,
      openingTime: '10:00',
      closingTime: '22:00',
      lat: 13.7466,
      lng: 100.5349,
      wallet: {
        create: { balance: 0 },
      },
      menuCategories: {
        create: [
          {
            name: 'เมนูหลัก',
            sortOrder: 1,
            items: {
              create: [
                {
                  name: 'ผัดไทยกุ้งสด',
                  description: 'ผัดไทยใส่กุ้งสดตัวใหญ่ ไข่ไก่',
                  price: 80,
                  isAvailable: true,
                },
                {
                  name: 'ผัดไทยไก่',
                  description: 'ผัดไทยใส่เนื้อไก่นุ่ม ไข่ไก่',
                  price: 70,
                  isAvailable: true,
                },
                {
                  name: 'ผัดไทยเต้าหู้ (เจ)',
                  description: 'ผัดไทยเจ ใส่เต้าหู้แทนเนื้อสัตว์',
                  price: 65,
                  isAvailable: true,
                },
              ],
            },
          },
          {
            name: 'ของหวาน',
            sortOrder: 2,
            items: {
              create: [
                {
                  name: 'มะม่วงข้าวเหนียว',
                  description: 'มะม่วงสุก ข้าวเหนียวมูน กะทิหอม',
                  price: 60,
                  isAvailable: true,
                },
                {
                  name: 'บัวลอยไข่หวาน',
                  description: 'บัวลอยสีสัน ไข่ไก่ กะทิมะพร้าว',
                  price: 45,
                  isAvailable: true,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('Restaurant 2 seeded:', restaurant2.name);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
