const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');

const sumBy = async (field) => Object.fromEntries((await db.order.groupBy({ by: [field], where: { status: 'COMPLETED' }, _sum: { total: true } })).map(r => [r[field], r._sum.total]));

// Khách hàng: mọi tài khoản không phải admin
router.get('/users', wrap(async (q, s) => {
  const { q: kw, status } = q.query, where = { role: 'user' };
  if (status) where.status = status;
  if (kw) where.OR = [{ name: { contains: kw, mode: 'insensitive' } }, { email: { contains: kw, mode: 'insensitive' } }];
  const [us, spent] = await Promise.all([
    db.user.findMany({ where, orderBy: { id: 'desc' }, take: 300, select: { id: true, name: true, email: true, status: true, createdAt: true, wallet: true, _count: { select: { buys: true, products: true } } } }),
    sumBy('buyerId'),
  ]);
  s.json(us.map(u => ({ ...u, spent: spent[u.id] || 0 })));
}));

router.post('/users/:id/ban', wrap(async (q, s) => {
  const u = await db.user.findUnique({ where: { id: +q.params.id } });
  if (!u) throw bad('Không tìm thấy tài khoản');
  if (u.role === 'admin') throw bad('Không thể khóa tài khoản quản trị');
  await db.user.update({ where: { id: u.id }, data: { status: q.body.banned ? 'banned' : 'active' } });
  s.json({ ok: true });
}));

// Người bán: tài khoản có đăng sản phẩm hoặc đã được xác minh
router.get('/sellers', wrap(async (q, s) => {
  const { q: kw, status } = q.query;
  const where = { role: 'user', OR: [{ products: { some: {} } }, { shopStatus: 'verified' }] };
  if (status) where.shopStatus = status;
  if (kw) where.AND = [{ OR: [{ name: { contains: kw, mode: 'insensitive' } }, { email: { contains: kw, mode: 'insensitive' } }] }];
  const [us, sales, ratings] = await Promise.all([
    db.user.findMany({ where, orderBy: { id: 'desc' }, take: 300, select: { id: true, name: true, email: true, status: true, shopStatus: true, createdAt: true, _count: { select: { products: true, sells: true } } } }),
    sumBy('sellerId'),
    db.review.groupBy({ by: ['sellerId'], _avg: { rating: true }, _count: true }),
  ]);
  const rt = Object.fromEntries(ratings.map(r => [r.sellerId, r]));
  s.json(us.map(u => ({ ...u, revenue: sales[u.id] || 0, rating: rt[u.id]?._avg.rating ?? null, reviews: rt[u.id]?._count ?? 0 })));
}));

router.post('/sellers/:id/status', wrap(async (q, s) => {
  if (!['pending', 'verified', 'rejected'].includes(q.body.status)) throw bad('Trạng thái không hợp lệ');
  await db.user.update({ where: { id: +q.params.id }, data: { shopStatus: q.body.status } });
  s.json({ ok: true });
}));
module.exports = router;
