const db = require('../db');
const { getSettings } = require('../services/settings');
const { release } = require('../services/orderService');

// Mỗi 30 giây: đơn đã nhận hàng quá thời hạn khiếu nại (cài đặt trong trang Admin) thì tự giải ngân
module.exports = () => setInterval(async () => {
  try {
    const { holdHours } = await getSettings();
    const os = await db.order.findMany({ where: { status: 'RECEIVED', receivedAt: { lt: new Date(Date.now() - holdHours * 3600e3) } }, include: { items: true } });
    for (const o of os) await release(o);
  } catch (e) { console.error(e); }
}, 30000);
