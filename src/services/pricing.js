const db = require('../db');
const { bad } = require('../utils');

// Chương trình sale đang chạy
const activeSales = () => { const n = new Date(); return db.sale.findMany({ where: { active: true, startsAt: { lte: n }, endsAt: { gte: n } } }); };
const withSale = (p, sales) => {
  const pct = Math.max(0, ...sales.filter(s => !s.category || s.category === p.category).map(s => s.percent));
  return pct ? { ...p, salePercent: pct, salePrice: Math.round(p.price * (100 - pct) / 100) } : p;
};

// Kiểm tra mã giảm giá cho giá trị đơn `amount`
async function checkCoupon(code, amount) {
  const c = await db.coupon.findUnique({ where: { code: (code || '').trim().toUpperCase() } });
  const n = new Date();
  if (!c || !c.active) throw bad('Mã giảm giá không hợp lệ');
  if ((c.startsAt && c.startsAt > n) || (c.endsAt && c.endsAt < n)) throw bad('Mã giảm giá chưa bắt đầu hoặc đã hết hạn');
  if (c.maxUses && c.used >= c.maxUses) throw bad('Mã giảm giá đã hết lượt sử dụng');
  if (amount < c.minOrder) throw bad('Đơn tối thiểu ' + c.minOrder.toLocaleString('vi-VN') + 'đ để dùng mã này');
  const discount = c.type === 'percent' ? Math.round(amount * c.value / 100) : Math.min(c.value, amount);
  return { coupon: c, discount };
}
module.exports = { activeSales, withSale, checkCoupon };
