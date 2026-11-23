const router = require('express').Router();
const db = require('../../db');
const { wrap } = require('../../utils');
const { startOfDay, addDays, series } = require('../../services/stats');

router.get('/reports', wrap(async (q, s) => {
  const days = [7, 30, 90, 365].includes(+q.query.days) ? +q.query.days : 30;
  const end = addDays(startOfDay(new Date()), 1), start = addDays(end, -days);
  const orders = await db.order.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { seller: { select: { id: true, name: true } }, items: { include: { product: { select: { title: true, category: true } } } } } });
  const done = orders.filter(o => o.status === 'COMPLETED');
  const byStatus = {}, cat = {}, prod = {}, sel = {};
  orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
  for (const o of done) {
    for (const i of o.items) {
      cat[i.product.category] = (cat[i.product.category] || 0) + i.price;
      const e = (prod[i.product.title] ??= { title: i.product.title, qty: 0, revenue: 0 }); e.qty++; e.revenue += i.price;
    }
    const e = (sel[o.seller.id] ??= { id: o.seller.id, name: o.seller.name, orders: 0, revenue: 0 }); e.orders++; e.revenue += o.total;
  }
  const top = o => Object.values(o).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const gmv = done.reduce((a, o) => a + o.total, 0);
  s.json({
    days, gmv, commission: done.reduce((a, o) => a + o.commission, 0), orders: orders.length, completed: done.length,
    refunded: byStatus.REFUNDED || 0, aov: done.length ? Math.round(gmv / done.length) : 0,
    byStatus, categories: cat, topSellers: top(sel), topProducts: top(prod), series: series(orders, start, days),
  });
}));
module.exports = router;
