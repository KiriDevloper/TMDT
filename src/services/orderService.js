const db = require('../db');

const getOrder = id => db.order.findUnique({
  where: { id: +id },
  include: { items: { include: { product: { include: { images: true } } } }, dispute: true, review: true, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } },
});
const productIds = o => ({ id: { in: o.items.map(i => i.productId) } });
const payout = o => o.total - o.commission + o.shippingFee; // người bán nhận: tiền hàng trừ hoa hồng, cộng phí ship đã thu hộ
const shipData = o => ({ status: 'SHIPPED', shippedAt: new Date(), trackingCode: (o.carrier || 'rw').toUpperCase() + String(Math.floor(Math.random() * 1e9)).padStart(9, '0') });

// Giải ngân cho người bán
const release = o => db.$transaction([
  db.order.update({ where: { id: o.id }, data: { status: 'COMPLETED' } }),
  db.user.update({ where: { id: o.sellerId }, data: { wallet: { increment: payout(o) } } }),
  db.txn.create({ data: { userId: o.sellerId, orderId: o.id, type: 'RELEASE', amount: payout(o) } }),
  db.product.updateMany({ where: productIds(o), data: { status: 'SOLD' } }),
  db.consignment.updateMany({ where: { productId: { in: o.items.map(i => i.productId) } }, data: { status: 'SOLD' } }),
]);

// Hoàn tiền cho người mua (gồm phí ship), sản phẩm quay lại trạng thái đang bán
const refund = o => db.$transaction([
  db.order.update({ where: { id: o.id }, data: { status: 'REFUNDED' } }),
  db.txn.create({ data: { userId: o.buyerId, orderId: o.id, type: 'REFUND', amount: o.total + o.shippingFee } }),
  db.product.updateMany({ where: productIds(o), data: { status: 'APPROVED' } }),
]);

module.exports = { getOrder, productIds, release, refund, shipData };
