const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');
const { getSettings } = require('../../services/settings');

router.get('/consignments', wrap(async (q, s) => {
  const where = q.query.status ? { status: q.query.status } : {};
  s.json(await db.consignment.findMany({ where, orderBy: { id: 'desc' }, take: 300, include: { seller: { select: { name: true, email: true } } } }));
}));

// Quy trình: SUBMITTED, sàn nhận hàng (RECEIVED), đăng bán (LISTED), bán xong (SOLD) hoặc hết hạn (EXPIRED), trả hàng (RETURNED)
router.post('/consignments/:id/action', wrap(async (q, s) => {
  const c = await db.consignment.findUnique({ where: { id: +q.params.id } });
  if (!c) throw bad('Không tìm thấy yêu cầu ký gửi');
  const a = q.body.action, note = (q.body.note || '').trim() || null;
  const can = { receive: ['SUBMITTED'], reject: ['SUBMITTED', 'RECEIVED'], list: ['RECEIVED'], return: ['RECEIVED', 'REJECTED', 'EXPIRED'] };
  if (!can[a] || !can[a].includes(c.status)) throw bad('Không thể thực hiện thao tác này ở trạng thái hiện tại');
  if (a === 'receive') await db.consignment.update({ where: { id: c.id }, data: { status: 'RECEIVED', adminNote: note } });
  if (a === 'reject') {
    if (!note) throw bad('Cần ghi lý do từ chối để người bán biết');
    await db.consignment.update({ where: { id: c.id }, data: { status: 'REJECTED', adminNote: note } });
  }
  if (a === 'return') await db.consignment.update({ where: { id: c.id }, data: { status: 'RETURNED', adminNote: note || c.adminNote } });
  if (a === 'list') {
    const price = Math.round(+q.body.price || c.expectedPrice), st = await getSettings();
    if (!(price > 0)) throw bad('Giá bán không hợp lệ');
    const p = await db.product.create({ data: {
      sellerId: c.sellerId, title: c.title, brand: c.brand, size: c.size, measures: c.measures, category: c.category, condition: c.condition,
      price, description: c.description, status: 'APPROVED', consigned: true,
      images: { create: c.images.split(',').filter(Boolean).map(url => ({ url })) },
    } });
    await db.consignment.update({ where: { id: c.id }, data: { status: 'LISTED', productId: p.id, finalPrice: price, listedAt: new Date(), expiresAt: new Date(Date.now() + st.consignDays * 864e5), adminNote: note } });
  }
  s.json({ ok: true });
}));
module.exports = router;
