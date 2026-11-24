// Tạo dữ liệu mẫu (người dùng, đơn hàng 30 ngày, khiếu nại, khuyến mãi) để trang Admin có số liệu hiển thị.
// Chạy: npm run seed:demo   (chạy một lần, tài khoản mẫu: userN@demo.rewear.vn / 123456)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[R(0, a.length - 1)];
const day = n => new Date(Date.now() - n * 864e5 - R(0, 80000) * 1e3);

(async () => {
  if (await db.user.findFirst({ where: { email: { endsWith: '@demo.rewear.vn' } } })) return console.log('Dữ liệu demo đã tồn tại, bỏ qua.');
  const pw = await bcrypt.hash('123456', 10);
  const names = ['Nguyễn Văn A', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thị Dung', 'Hoàng Đức', 'Võ Thu Hà', 'Đặng Quốc Huy', 'Bùi Lan Anh', 'Ngô Gia Bảo', 'Đỗ Khánh Linh', 'Phan Hải Yến', 'Vũ Tuấn Kiệt'];
  const users = [];
  for (const [i, n] of names.entries()) users.push(await db.user.create({ data: { name: n, email: `user${i + 1}@demo.rewear.vn`, password: pw, createdAt: day(R(0, 40)) } }));
  const sellers = users.slice(0, 5);
  for (const [i, st] of ['verified', 'verified', 'pending', 'pending', 'rejected'].entries()) await db.user.update({ where: { id: sellers[i].id }, data: { shopStatus: st } });

  const cat = [['Áo hoodie Brooklyn', 'thun', 'Champion'], ['Áo thun cotton basic', 'thun', 'Uniqlo'], ['Áo sơ mi trắng oversize', 'somi', 'Zara'], ['Áo sơ mi caro flannel', 'somi', 'H&M'], ['Quần jeans ống rộng', 'jeans', "Levi's"], ['Quần jeans skinny', 'jeans', 'Zara'], ['Áo khoác denim vintage', 'khoac', "Levi's"], ['Áo khoác kaki', 'khoac', 'Uniqlo'], ['Áo bomber xanh rêu', 'khoac', 'Alpha'], ['Túi đeo vai da vintage', 'phukien', 'Handmade'], ['Mũ lưỡi trai NY', 'phukien', 'New Era'], ['Kính mắt retro', 'phukien', 'Ray-Ban']];
  const imgs = ['/img/p1.jpg', '/img/p2.jpg', '/img/p3.jpg', '/img/p4.jpg'], products = [];
  for (let i = 0; i < 18; i++) {
    const [title, category, brand] = cat[i % cat.length], seller = sellers[i % sellers.length];
    products.push(await db.product.create({ data: { sellerId: seller.id, title: title + (i >= cat.length ? ' (#2)' : ''), brand, size: pick(['S', 'M', 'L']), measures: 'Ngực 52cm, dài 68cm', category, condition: pick(['NEW', 'GOOD', 'GOOD', 'FAIR']), price: R(8, 35) * 10000, status: i % 6 === 5 ? 'PENDING' : 'APPROVED', createdAt: day(R(0, 30)), images: { create: [{ url: imgs[i % 4] }] } } }));
  }
  const live = products.filter(p => p.status === 'APPROVED');
  const buyers = users.slice(5), W = [['COMPLETED', 50], ['SHIPPED', 10], ['PAID', 8], ['PENDING_PAYMENT', 6], ['RECEIVED', 8], ['DISPUTED', 5], ['REFUNDED', 4], ['CANCELLED', 9]];
  const status = () => { let r = R(1, 100); for (const [s, w] of W) { if ((r -= w) <= 0) return s; } return 'COMPLETED'; };
  for (let i = 0; i < 70; i++) {
    const p = pick(live), buyer = pick(buyers), st = status(), created = day(R(0, 29)), total = p.price;
    const car = pick([['ghn', 30000], ['ghtk', 22000], ['viettel', 25000]]), shipped = ['SHIPPED', 'RECEIVED', 'COMPLETED', 'DISPUTED', 'REFUNDED'].includes(st);
    const o = await db.order.create({ data: { buyerId: buyer.id, sellerId: p.sellerId, total, commission: Math.round(total * 0.1), carrier: car[0], shippingFee: car[1], trackingCode: shipped ? car[0].toUpperCase() + R(100000000, 999999999) : null, shipDeadline: st === 'PAID' ? new Date(Date.now() + 2 * 864e5) : null, address: '12 Nguyễn Huệ, Buôn Ma Thuột', status: st, createdAt: created, receivedAt: ['RECEIVED', 'COMPLETED', 'DISPUTED', 'REFUNDED'].includes(st) ? created : null, items: { create: [{ productId: p.id, price: total }] } } });
    if (st === 'DISPUTED') await db.dispute.create({ data: { orderId: o.id, reason: pick(['Áo có vết ố không được nêu trong mô tả', 'Size thực tế nhỏ hơn số đo ghi trên tin đăng', 'Nghi ngờ hàng không chính hãng']) } });
    if (st === 'REFUNDED') await db.dispute.create({ data: { orderId: o.id, reason: 'Hàng sai mô tả', status: 'RESOLVED', decision: 'REFUND', note: 'Đã xác minh ảnh người mua gửi' } });
    if (st === 'COMPLETED' && Math.random() < .6) await db.review.create({ data: { orderId: o.id, authorId: buyer.id, sellerId: p.sellerId, rating: pick([4, 5, 5, 5, 3]), comment: pick(['Hàng đẹp đúng mô tả', 'Đóng gói cẩn thận', 'Shop nhiệt tình']) } });
  }
  // Báo cáo tin đăng vi phạm và yêu cầu ký gửi mẫu
  for (const p of live.slice(0, 2)) await db.violation.create({ data: { productId: p.id, reporterId: pick(buyers).id, reason: pick(['Nghi ngờ hàng nhái, logo không giống chính hãng', 'Ảnh lấy từ shop khác, mô tả không đúng sự thật']) } });
  const cs = [['Áo khoác bomber vintage', 'khoac', 'SUBMITTED'], ['Váy hoa nhí dáng dài', 'khac', 'RECEIVED'], ['Giày da cũ', 'phukien', 'REJECTED']];
  for (const [title, category, status] of cs) await db.consignment.create({ data: { sellerId: pick(buyers).id, title, brand: 'Zara', size: 'M', measures: 'Ngực 50cm, dài 90cm', category, condition: 'GOOD', expectedPrice: 180000, images: pick(imgs), status, adminNote: status === 'REJECTED' ? 'Đế giày bị mòn nhiều, không đạt chuẩn' : null } });
  const now = Date.now();
  await db.coupon.createMany({ data: [{ code: 'WELCOME10', type: 'percent', value: 10, minOrder: 100000 }, { code: 'GIAM20K', type: 'fixed', value: 20000, minOrder: 150000, maxUses: 100 }] });
  await db.sale.create({ data: { name: 'Sale cuối tuần', percent: 15, category: null, startsAt: new Date(now - 864e5), endsAt: new Date(now + 14 * 864e5) } });
  console.log('Đã tạo dữ liệu demo: 12 người dùng, 18 sản phẩm, 70 đơn hàng, báo cáo vi phạm, yêu cầu ký gửi, mã giảm giá WELCOME10 / GIAM20K và chương trình sale 15%.');
})().finally(() => db.$disconnect());
