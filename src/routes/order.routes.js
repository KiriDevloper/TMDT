const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const { COMMISSION, HOLD_MS } = require('../config');
const { bad, wrap } = require('../utils');
const { getOrder, productIds } = require('../services/orderService');

// Tạo đơn: tách theo người bán, sản phẩm chuyển sang RESERVED
router.post('/orders', auth(), wrap(async (q, s) => {
  const ids = [...new Set((q.body.productIds || []).map(Number))], address = (q.body.address || '').trim();
  if (!ids.length || !address) throw bad('Cần có sản phẩm và địa chỉ nhận hàng');
  const ps = await db.product.findMany({ where: { id: { in: ids }, status: 'APPROVED' } });
  if (ps.length !== ids.length) throw bad('Có sản phẩm đã được bán hoặc không còn hiển thị');
  if (ps.some(p => p.sellerId === q.user.id)) throw bad('Không thể mua sản phẩm của chính mình');
  const by = {};
  ps.forEach(p => (by[p.sellerId] ??= []).push(p));
  const orderIds = [];
  for (const sid in by) {
    const items = by[sid], total = items.reduce((a, p) => a + p.price, 0);
    const o = await db.$transaction(async tx => {
      const o = await tx.order.create({ data: { buyerId: q.user.id, sellerId: +sid, total, commission: Math.round(total * COMMISSION), address, items: { create: items.map(p => ({ productId: p.id, price: p.price })) } } });
      await tx.product.updateMany({ where: { id: { in: items.map(p => p.id) } }, data: { status: 'RESERVED' } });
      return o;
    });
    orderIds.push(o.id);
  }
  s.json({ orderIds });
}));

router.get('/orders', auth(), wrap(async (q, s) => {
  const where = q.query.role === 'sell' ? { sellerId: q.user.id } : { buyerId: q.user.id };
  s.json(await db.order.findMany({ where, orderBy: { id: 'desc' }, include: { items: { include: { product: { include: { images: true } } } }, dispute: true, review: true, buyer: { select: { name: true } }, seller: { select: { id: true, name: true } } } }));
}));

// Mỗi bước của luồng đơn: ai được làm, từ trạng thái nào
const step = (name, who, from, fn) => router.post('/orders/:id/' + name, auth(), wrap(async (q, s) => {
  const o = await getOrder(q.params.id);
  if (!o) return s.status(404).json({ error: 'Không tìm thấy đơn' });
  if (o[who + 'Id'] !== q.user.id) return s.status(403).json({ error: 'Không có quyền' });
  if (!from.includes(o.status)) throw bad('Đơn đang ở trạng thái không cho phép thao tác này');
  await fn(o, q);
  s.json({ ok: true });
}));

step('pay', 'buyer', ['PENDING_PAYMENT'], o => db.$transaction([ // thanh toán mô phỏng: sàn giữ tiền
  db.order.update({ where: { id: o.id }, data: { status: 'PAID' } }),
  db.txn.create({ data: { userId: o.buyerId, orderId: o.id, type: 'HOLD', amount: o.total } }),
]));
step('cancel', 'buyer', ['PENDING_PAYMENT'], async o => {
  await db.order.update({ where: { id: o.id }, data: { status: 'CANCELLED' } });
  await db.product.updateMany({ where: productIds(o), data: { status: 'APPROVED' } });
});
step('ship', 'seller', ['PAID'], o => db.order.update({ where: { id: o.id }, data: { status: 'SHIPPED' } }));
step('receive', 'buyer', ['SHIPPED'], o => db.order.update({ where: { id: o.id }, data: { status: 'RECEIVED', receivedAt: new Date() } }));
step('dispute', 'buyer', ['RECEIVED'], async (o, q) => {
  if (Date.now() - o.receivedAt > HOLD_MS) throw bad('Đã quá thời hạn khiếu nại');
  if (!(q.body.reason || '').trim()) throw bad('Cần nêu lý do khiếu nại (hàng sai mô tả, có lỗi không nêu, hàng giả...)');
  await db.$transaction([
    db.dispute.create({ data: { orderId: o.id, reason: q.body.reason } }),
    db.order.update({ where: { id: o.id }, data: { status: 'DISPUTED' } }),
  ]);
});
step('review', 'buyer', ['COMPLETED'], async (o, q) => {
  const rating = +q.body.rating;
  if (o.review) throw bad('Đơn này đã được đánh giá');
  if (!(rating >= 1 && rating <= 5)) throw bad('Số sao từ 1 đến 5');
  await db.review.create({ data: { orderId: o.id, authorId: o.buyerId, sellerId: o.sellerId, rating, comment: q.body.comment || '' } });
});

module.exports = router;
