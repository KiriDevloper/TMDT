const dayKey = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
const pct = (c, p) => p ? Math.round((c - p) / p * 1000) / 10 : (c ? 100 : 0);
// Doanh thu (đơn hoàn tất) và số đơn theo từng ngày
function series(orders, start, days) {
  const m = {};
  for (let i = 0; i < days; i++) { const k = dayKey(addDays(start, i)); m[k] = { date: k, revenue: 0, orders: 0 }; }
  for (const o of orders) { const e = m[dayKey(o.createdAt)]; if (!e) continue; e.orders++; if (o.status === 'COMPLETED') e.revenue += o.total; }
  return Object.values(m);
}
const countByDay = (items, start, days) => { const m = {}; for (let i = 0; i < days; i++) m[dayKey(addDays(start, i))] = 0; items.forEach(x => { const k = dayKey(x.createdAt); if (k in m) m[k]++; }); return Object.values(m); };
module.exports = { dayKey, startOfDay, addDays, pct, series, countByDay };
