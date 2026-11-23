const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');
const { getOrder, productIds, release, refund } = require('../../services/orderService');

router.get('/orders', wrap(async (q, s) => {
  const { status, q: kw } = q.query, where = {};
  if (status) where.status = status;
  if (kw) {
    const id = /^#?(?:DH)?(\d+)$/i.exec(kw.trim());
    where.OR = id ? [{ id: +id[1] }] : [{ buyer: { name: { contains: kw, mode: 'insensitive' } } }, { seller: { name: { contains: kw, mode: 'insensitive' } } }];
  }
  s.json(await db.order.findMany({ where, orderBy: { id: 'desc' }, take: 300, include: { buyer: { select: { name: true } }, seller: { select: { name: true } }, items: { include: { product: { select: { title: true } } } } } }));
}));

router.get('/orders/:id', wrap(async (q, s) => {
  const o = await getOrder(q.params.id);
  if (!o) return s.status(404).json({ error: 'Không tìm thấy đơn' });
  s.json({ ...o, txns: await db.txn.findMany({ where: { orderId: o.id }, orderBy: { id: 'asc' } }) });
}));

// Admin xử lý đơn: hủy, xác nhận đã gửi, hoàn tiền, giải ngân
router.post('/orders/:id/action', wrap(async (q, s) => {
  const o = await getOrder(q.params.id);
  if (!o) return s.status(404).json({ error: 'Không tìm thấy đơn' });
  const a = q.body.action;
  const can = { cancel: ['PENDING_PAYMENT'], ship: ['PAID'], refund: ['PAID', 'SHIPPED', 'RECEIVED', 'DISPUTED'], release: ['RECEIVED', 'DISPUTED'] };
  if (!can[a] || !can[a].includes(o.status)) throw bad('Không thể thực hiện thao tác này với trạng thái hiện tại');
  if (a === 'cancel') {
    await db.order.update({ where: { id: o.id }, data: { status: 'CANCELLED' } });
    await db.product.updateMany({ where: productIds(o), data: { status: 'APPROVED' } });
  }
  if (a === 'ship') await db.order.update({ where: { id: o.id }, data: { status: 'SHIPPED' } });
  if (a === 'refund') await refund(o);
  if (a === 'release') await release(o);
  if (o.dispute && o.dispute.status === 'OPEN')
    await db.dispute.update({ where: { id: o.dispute.id }, data: { status: 'RESOLVED', decision: a === 'refund' ? 'REFUND' : 'RELEASE', note: 'Xử lý từ trang quản lý đơn hàng' } });
  s.json({ ok: true });
}));
module.exports = router;
