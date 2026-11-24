const db = require('../db');

// Thống kê và huy hiệu uy tín của người bán
async function sellerStats(id) {
  const [completed, refunded, r, u] = await Promise.all([
    db.order.count({ where: { sellerId: id, status: 'COMPLETED' } }),
    db.order.count({ where: { sellerId: id, status: 'REFUNDED' } }),
    db.review.aggregate({ where: { sellerId: id }, _avg: { rating: true }, _count: true }),
    db.user.findUnique({ where: { id }, select: { shopStatus: true, createdAt: true } }),
  ]);
  const rating = r._avg.rating, reviews = r._count, total = completed + refunded, refundRate = total ? refunded / total : 0;
  let tier = 'new', label = 'Người bán mới';
  if (completed >= 3 && refundRate < .2) { tier = 'active'; label = 'Người bán tích cực'; }
  if (completed >= 10 && (rating ?? 0) >= 4.5 && refundRate < .1) { tier = 'trusted'; label = 'Người bán uy tín'; }
  if (completed >= 30 && (rating ?? 0) >= 4.7 && refundRate < .05 && u.shopStatus === 'verified') { tier = 'gold'; label = 'Shop xuất sắc'; }
  return { completed, rating, reviews, refundRate, tier, label, verified: u.shopStatus === 'verified', since: u.createdAt };
}
module.exports = { sellerStats };
