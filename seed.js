require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
  const hash = await bcrypt.hash('123456', 10);
  await db.user.upsert({ where: { email: 'admin@rewear.vn' }, update: {}, create: { name: 'Admin', email: 'admin@rewear.vn', password: await bcrypt.hash('admin123', 10), role: 'admin' } });
  const seller = await db.user.upsert({ where: { email: 'shop@rewear.vn' }, update: { shopStatus: 'verified' }, create: { name: 'Vintage Shop', email: 'shop@rewear.vn', password: hash, shopStatus: 'verified' } });
  for (const [key, name] of [['thun', 'Áo thun'], ['somi', 'Áo sơ mi'], ['jeans', 'Quần jeans'], ['khoac', 'Áo khoác'], ['phukien', 'Phụ kiện'], ['khac', 'Khác']])
    await db.category.upsert({ where: { key }, update: {}, create: { key, name } });
  await db.user.upsert({ where: { email: 'buyer@rewear.vn' }, update: {}, create: { name: 'Minh Anh', email: 'buyer@rewear.vn', password: hash } });

  // Xóa sản phẩm mẫu cũ (không ảnh) nếu chưa có đơn hàng
  await db.product.deleteMany({ where: { sellerId: seller.id, title: { in: ['Áo sơ mi denim vintage', 'Váy hoa nhí dáng dài', 'Áo khoác bomber', 'Quần jeans ống rộng'] }, items: { none: {} }, images: { none: {} } } });

  const demo = [
    ['Áo khoác denim vintage', "Levi's", 'M', 'Ngực 54cm, dài 55cm, vai 46cm', 'khoac', 'GOOD', 180000, '/img/p1.jpg'],
    ['Áo sơ mi form oversize', 'Uniqlo', 'L', 'Ngực 58cm, dài 72cm, vai 52cm', 'somi', 'NEW', 120000, '/img/p2.jpg'],
    ['Quần jeans ống rộng', 'H&M', 'M', 'Eo 36cm, dài 98cm, ống 28cm', 'jeans', 'GOOD', 150000, '/img/p3.jpg'],
    ['Túi đeo vai da vintage', 'Handmade', 'Free', 'Rộng 28cm, cao 20cm, dây dài 60cm', 'phukien', 'NEW', 200000, '/img/p4.jpg'],
  ];
  for (const [title, brand, size, measures, category, condition, price, img] of demo) {
    const found = await db.product.findFirst({ where: { sellerId: seller.id, title }, include: { images: true } });
    if (!found) await db.product.create({ data: { sellerId: seller.id, title, brand, size, measures, category, condition, price, status: 'APPROVED', images: { create: [{ url: img }] } } });
    else {
      await db.product.update({ where: { id: found.id }, data: { category } });
      if (!found.images.length) await db.image.create({ data: { productId: found.id, url: img } });
    }
  }
  console.log('Seed xong. Admin: admin@rewear.vn / admin123 | Shop: shop@rewear.vn / 123456 | Buyer: buyer@rewear.vn / 123456');
})().finally(() => db.$disconnect());
