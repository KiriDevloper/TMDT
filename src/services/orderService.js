const db = require('../db');

const getOrder = id => db.order.findUnique({
  where: { id: +id },
  include: { items: { include: { product: { include: { images: true } } } }, dispute: true, review: true, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } },
});
const productIds = o => ({ id: { in: o.items.map(i => i.productId) } });

// Giải ngân cho người bán (đã trừ hoa hồng)
const release = o => db.$transaction([
  db.order.update({ where: { id: o.id }, data: { status: 'COMPLETED' } }),
  db.user.update({ where: { id: o.sellerId }, data: { wallet: { increment: o.total - o.commission } } }),
  db.txn.create({ data: { userId: o.sellerId, orderId: o.id, type: 'RELEASE', amount: o.total - o.commission } }),
  db.product.updateMany({ where: productIds(o), data: { status: 'SOLD' } }),
]);

// Hoàn tiền cho người mua, sản phẩm quay lại trạng thái đang bán
const refund = o => db.$transaction([
  db.order.update({ where: { id: o.id }, data: { status: 'REFUNDED' } }),
  db.txn.create({ data: { userId: o.buyerId, orderId: o.id, type: 'REFUND', amount: o.total } }),
  db.product.updateMany({ where: productIds(o), data: { status: 'APPROVED' } }),
]);

module.exports = { getOrder, productIds, release, refund };
