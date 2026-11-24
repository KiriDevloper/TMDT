const db = require('../db');
const { getSettings } = require('../services/settings');
const { release, refund } = require('../services/orderService');

// Mỗi 30 giây:
// 1. Đơn đã nhận hàng quá thời hạn khiếu nại thì tự giải ngân cho người bán
// 2. Đơn đã thanh toán nhưng người bán không gửi hàng đúng hạn thì tự hoàn tiền cho người mua
// 3. Hàng ký gửi hết hạn thì ẩn khỏi sàn
module.exports = () => setInterval(async () => {
  try {
    const { holdHours } = await getSettings(), now = new Date();
    for (const o of await db.order.findMany({ where: { status: 'RECEIVED', receivedAt: { lt: new Date(Date.now() - holdHours * 3600e3) } }, include: { items: true } })) await release(o);
    for (const o of await db.order.findMany({ where: { status: 'PAID', shipDeadline: { lt: now } }, include: { items: true } })) await refund(o);
    for (const c of await db.consignment.findMany({ where: { status: 'LISTED', expiresAt: { lt: now } } })) {
      const p = c.productId && await db.product.findUnique({ where: { id: c.productId } });
      if (p && p.status === 'APPROVED') await db.$transaction([db.product.update({ where: { id: p.id }, data: { status: 'HIDDEN' } }), db.consignment.update({ where: { id: c.id }, data: { status: 'EXPIRED' } })]);
    }
  } catch (e) { console.error(e); }
}, 30000);
