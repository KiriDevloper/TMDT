const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');

const date = v => (v ? new Date(v) : null);

// ----- Mã giảm giá -----
router.get('/coupons', wrap(async (q, s) => s.json(await db.coupon.findMany({ orderBy: { id: 'desc' } }))));
router.post('/coupons', wrap(async (q, s) => {
  const b = q.body, code = (b.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) throw bad('Mã gồm chữ, số, gạch (3-20 ký tự)');
  if (!['percent', 'fixed'].includes(b.type)) throw bad('Loại giảm giá không hợp lệ');
  const value = Math.round(+b.value);
  if (!(value > 0) || (b.type === 'percent' && value > 100)) throw bad('Giá trị giảm không hợp lệ');
  if (await db.coupon.findUnique({ where: { code } })) throw bad('Mã đã tồn tại');
  s.json(await db.coupon.create({ data: { code, type: b.type, value, minOrder: Math.round(+b.minOrder) || 0, maxUses: Math.round(+b.maxUses) || 0, startsAt: date(b.startsAt), endsAt: date(b.endsAt) } }));
}));
router.patch('/coupons/:id', wrap(async (q, s) => {
  const b = q.body, data = {};
  if (b.active !== undefined) data.active = !!b.active;
  if (b.value !== undefined) data.value = Math.round(+b.value);
  if (b.minOrder !== undefined) data.minOrder = Math.round(+b.minOrder) || 0;
  if (b.maxUses !== undefined) data.maxUses = Math.round(+b.maxUses) || 0;
  if (b.startsAt !== undefined) data.startsAt = date(b.startsAt);
  if (b.endsAt !== undefined) data.endsAt = date(b.endsAt);
  s.json(await db.coupon.update({ where: { id: +q.params.id }, data }));
}));
router.delete('/coupons/:id', wrap(async (q, s) => { await db.coupon.delete({ where: { id: +q.params.id } }); s.json({ ok: true }); }));

// ----- Chương trình sale (giảm giá theo danh mục / toàn sàn) -----
router.get('/sales', wrap(async (q, s) => s.json(await db.sale.findMany({ orderBy: { id: 'desc' } }))));
const saleData = b => {
  const percent = Math.round(+b.percent);
  if (!(b.name || '').trim()) throw bad('Cần nhập tên chương trình');
  if (!(percent >= 1 && percent <= 90)) throw bad('Phần trăm giảm từ 1 đến 90');
  if (!b.startsAt || !b.endsAt || new Date(b.endsAt) <= new Date(b.startsAt)) throw bad('Thời gian bắt đầu/kết thúc không hợp lệ');
  return { name: b.name.trim(), percent, category: b.category || null, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt) };
};
router.post('/sales', wrap(async (q, s) => s.json(await db.sale.create({ data: saleData(q.body) }))));
router.patch('/sales/:id', wrap(async (q, s) => {
  const data = q.body.active !== undefined && Object.keys(q.body).length === 1 ? { active: !!q.body.active } : { ...saleData(q.body), active: q.body.active === undefined ? undefined : !!q.body.active };
  s.json(await db.sale.update({ where: { id: +q.params.id }, data }));
}));
router.delete('/sales/:id', wrap(async (q, s) => { await db.sale.delete({ where: { id: +q.params.id } }); s.json({ ok: true }); }));
module.exports = router;
