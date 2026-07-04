import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // This script wipes orders, products, customers, and most operational
  // tables before seeding demo data (see the deleteMany calls below) — it
  // must never run against a database with real merchant data. Production
  // deploys never call `db seed` (see entrypoint.sh), but as a second line
  // of defense, refuse to run in a production NODE_ENV unless the operator
  // explicitly opts in.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    console.error(
      '❌ Refusing to seed: NODE_ENV=production and ALLOW_SEED is not "true".\n' +
      '   This script deletes existing orders/products/customers. If you really\n' +
      '   intend to seed this database, set ALLOW_SEED=true and re-run.',
    );
    process.exit(1);
  }

  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productModifier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.storefrontSettings.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.merchantUser.deleteMany();
  await prisma.role.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create platform admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@waslak.com',
      passwordHash: hashedPassword,
      name: 'Waslak Admin',
      phone: '+249912000000',
      role: 'PLATFORM_OWNER',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 2. Create demo merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: 'مطعم الشيف',
      slug: 'chef-restaurant',
      description: 'أشهى المأكولات والمشروبات الطازجة - منذ 2020',
      phone: '+249912111111',
      email: 'chef@restaurant.com',
      address: 'شارع النيل - الخرطوم',
      businessType: 'RESTAURANT',
      status: 'ACTIVE',
      currency: 'SDG',
      timezone: 'Africa/Khartoum',
      isActive: true,
    },
  });
  console.log('✅ Demo merchant created:', merchant.name);

  // 3. Link admin to merchant
  await prisma.merchantUser.create({
    data: {
      userId: admin.id,
      merchantId: merchant.id,
      role: 'MERCHANT_OWNER',
      isOwner: true,
    },
  });

  // 4. Create main branch
  const branch = await prisma.branch.create({
    data: {
      merchantId: merchant.id,
      name: 'الفرع الرئيسي',
      address: 'شارع النيل - الخرطوم',
      phone: '+249912111111',
      isMain: true,
      isActive: true,
    },
  });
  console.log('✅ Main branch created');

  // 5. Create categories
  const catMain = await prisma.category.create({
    data: { merchantId: merchant.id, name: 'وجبات رئيسية', slug: 'main-dishes', sortOrder: 1, isActive: true },
  });
  const catDrinks = await prisma.category.create({
    data: { merchantId: merchant.id, name: 'مشروبات', slug: 'drinks', sortOrder: 2, isActive: true },
  });
  const catDesserts = await prisma.category.create({
    data: { merchantId: merchant.id, name: 'حلويات', slug: 'desserts', sortOrder: 3, isActive: true },
  });
  console.log('✅ Categories created');

  // 6. Create products with inventory
  const products = [
    { name: 'شاورما دجاج', slug: 'chicken-shawarma', categoryId: catMain.id, price: 250, desc: 'شاورما دجاج طازجة مع صلصة الثوم والمخللات' },
    { name: 'برجر لحم', slug: 'beef-burger', categoryId: catMain.id, price: 300, desc: 'برجر لحم بقري مع جبنة شيدر وخس وطماطم' },
    { name: 'فلافل عراقي', slug: 'iraqi-falafel', categoryId: catMain.id, price: 180, desc: 'فلافل عراقي مع طحينة وسلطة' },
    { name: 'عصير مانجو', slug: 'mango-juice', categoryId: catDrinks.id, price: 80, desc: 'عصير مانجو طبيعي طازج' },
    { name: 'شاي أحمر', slug: 'red-tea', categoryId: catDrinks.id, price: 30, desc: 'شاي أحمر سوداني تقليدي' },
    { name: 'كيك شوكولاتة', slug: 'chocolate-cake', categoryId: catDesserts.id, price: 150, desc: 'كيك شوكولاتة بلجيكية فاخرة' },
    { name: 'بسبوسة', slug: 'basbousa', categoryId: catDesserts.id, price: 100, desc: 'بسبوسة تقليدية بالقطر' },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.desc,
        price: p.price,
        images: [],
        isActive: true,
      },
    });

    await prisma.inventoryItem.create({
      data: {
        productId: product.id,
        merchantId: merchant.id,
        quantity: Math.floor(Math.random() * 50) + 10,
        lowStockThreshold: 5,
      },
    });
  }
  console.log('✅ Products and inventory created');

  // 7. Create demo customer
  const customer = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: 'أحمد محمد',
      phone: '+249912222222',
      email: 'ahmed@example.com',
    },
  });

  await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      label: 'المنزل',
      address: 'حي المطار - الخرطوم',
      area: 'الخرطوم',
      city: 'الخرطوم',
      isDefault: true,
    },
  });
  console.log('✅ Demo customer created');

  // 8. Create storefront settings
  await prisma.storefrontSettings.create({
    data: {
      merchantId: merchant.id,
      welcomeText: 'مرحباً بكم في مطعم الشيف! اطلب الآن واستمتع بأشهى الأكلات',
      isOpen: true,
      minimumOrderAmount: 50,
      deliveryEnabled: true,
      pickupEnabled: true,
      workingHours: {
        sunday: { open: '09:00', close: '23:00' },
        monday: { open: '09:00', close: '23:00' },
        tuesday: { open: '09:00', close: '23:00' },
        wednesday: { open: '09:00', close: '23:00' },
        thursday: { open: '09:00', close: '23:00' },
        friday: { open: '14:00', close: '23:00' },
        saturday: { open: '09:00', close: '23:00' },
      },
    },
  });
  console.log('✅ Storefront settings created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Login: admin@waslak.com / admin123');
  console.log('🌐 Store: /store/chef-restaurant');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
