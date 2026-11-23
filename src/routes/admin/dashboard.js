const router = require('express').Router();
const db = require('../../db');
const { wrap } = require('../../utils');
const { activeSales, withSale } = require('../../services/pricing');
const { startOfDay, addDays, pct, series, countByDay } = require('../../services/stats');

// Số việc đang chờ xử lý (chuông thông báo + huy hiệu menu)
router.get('/pending', wrap(async (q, s) => {
  const [products, disputes, sellers] = await Promise.all([
    db.product.count({ where: { status: 'PENDING' } }),
    db.dispute.count({ where: { status: 'OPEN' } }),
    db.user.count({ where: { shopStatus: 'pending', products: { some: {} } } }),
  ]);
  s.json({ products, disputes, sellers });
}));

router.get('/search', wrap(async (q, s) => {
  const kw = (q.query.q || '').trim();
  if (!kw) return s.json({ products: [], orders: [], users: [] });
  const id = /^#?(?:DH)?(\d+)$/i.exec(kw);
  const [products, orders, users] = await Promise.all([
    db.product.findMany({ where: { title: { contains: kw, mode: 'insensitive' } }, take: 5, select: { id: true, title: true, status: true } }),
    id ? db.order.findMany({ where: { id: +id[1] }, select: { id: true, total: true, status: true } }) : [],
    db.user.findMany({ where: { OR: [{ name: { contains: kw, mode: 'insensitive' } }, { email: { contains: kw, mode: 'insensitive' } }] }, take: 5, select: { id: true, name: true, email: true } }),
  ]);
  s.json({ products, orders, users });
}));

router.get('/stats', wrap(async (q, s) => {
  const days = [7, 30, 90].includes(+q.query.days) ? +q.query.days : 7;
  const end = addDays(startOfDay(new Date()), 1), start = addDays(end, -days), prev = addDays(start, -days);
  const [orders, users, allUsers, pProducts, pDisputes, recent, featured, sales] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: prev, lt: end } }, select: { createdAt: true, total: true, status: true } }),
    db.user.findMany({ where: { createdAt: { gte: prev, lt: end } }, select: { createdAt: true, _count: { select: { products: true } } } }),
    db.user.findMany({ select: { role: true, shopStatus: true, _count: { select: { products: true } } } }),
    db.product.count({ where: { status: 'PENDING' } }),
    db.dispute.count({ where: { status: 'OPEN' } }),
    db.order.findMany({ orderBy: { id: 'desc' }, take: 6, include: { buyer: { select: { name: true } }, items: { include: { product: { select: { title: true } } } } } }),
    db.product.findMany({ where: { status: 'APPROVED' }, orderBy: { id: 'desc' }, take: 4, include: { images: true } }),
    activeSales(),
  ]);
  const cur = orders.filter(o => o.createdAt >= start), old = orders.filter(o => o.createdAt < start);
  const rev = a => a.filter(o => o.status === 'COMPLETED').reduce((x, o) => x + o.total, 0);
  const cu = users.filter(u => u.createdAt >= start), ou = users.filter(u => u.createdAt < start);
  const sel = a => a.filter(u => u._count.products > 0);
  const ser = series(cur, start, days);
  s.json({
    days, series: ser,
    cards: {
      orders: { value: cur.length, change: pct(cur.length, old.length), spark: ser.map(x => x.orders) },
      users: { value: cu.length, change: pct(cu.length, ou.length), spark: countByDay(cu, start, days) },
      sellers: { value: sel(cu).length, change: pct(sel(cu).length, sel(ou).length), spark: countByDay(sel(cu), start, days) },
      revenue: { value: rev(cur), change: pct(rev(cur), rev(old)), spark: ser.map(x => x.revenue) },
    },
    recent, featured: featured.map(p => withSale(p, sales)),
    userStats: {
      customers: allUsers.filter(u => u.role === 'user' && !u._count.products).length,
      sellers: allUsers.filter(u => u.role === 'user' && u._count.products > 0).length,
      admins: allUsers.filter(u => u.role === 'admin').length,
    },
    pending: { products: pProducts, disputes: pDisputes, sellers: allUsers.filter(u => u._count.products > 0 && u.shopStatus === 'pending').length },
  });
}));
module.exports = router;
