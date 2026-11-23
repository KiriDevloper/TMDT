const db = require('../db');
const { HOLD_MS } = require('../config');
const { release } = require('../services/orderService');

// Mỗi 30 giây: đơn đã nhận hàng quá thời hạn khiếu nại thì tự giải ngân
module.exports = () => setInterval(async () => {
  try {
    const os = await db.order.findMany({ where: { status: 'RECEIVED', receivedAt: { lt: new Date(Date.now() - HOLD_MS) } }, include: { items: true } });
    for (const o of os) await release(o);
  } catch (e) { console.error(e); }
}, 30000);
