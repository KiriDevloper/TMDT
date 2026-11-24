const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const { bad, wrap } = require('../utils');

// Cảnh báo giao dịch ngoài sàn: số điện thoại, tài khoản ngân hàng, ví
const OFF_PLATFORM = /(\d[\s.\-]?){9,}|zalo|momo|chuyển khoản|stk|số tài khoản/i;

router.get('/messages/threads', auth(), wrap(async (q, s) => {
  const me = q.user.id, seen = new Map();
  const msgs = await db.message.findMany({ where: { OR: [{ fromId: me }, { toId: me }] }, orderBy: { id: 'desc' }, take: 500 });
  for (const m of msgs) {
    const other = m.fromId === me ? m.toId : m.fromId;
    if (!seen.has(other)) seen.set(other, { userId: other, last: m, unread: 0 });
    if (m.toId === me && !m.readAt) seen.get(other).unread++;
  }
  const users = await db.user.findMany({ where: { id: { in: [...seen.keys()] } }, select: { id: true, name: true } });
  s.json([...seen.values()].map(t => ({ ...t, name: users.find(u => u.id === t.userId)?.name })));
}));

router.get('/messages/unread', auth(), wrap(async (q, s) => s.json({ count: await db.message.count({ where: { toId: q.user.id, readAt: null } }) })));

router.get('/messages/:userId', auth(), wrap(async (q, s) => {
  const me = q.user.id, other = +q.params.userId;
  const u = await db.user.findUnique({ where: { id: other }, select: { id: true, name: true } });
  if (!u) throw bad('Không tìm thấy người dùng');
  const messages = await db.message.findMany({ where: { OR: [{ fromId: me, toId: other }, { fromId: other, toId: me }] }, orderBy: { id: 'asc' }, take: 200 });
  await db.message.updateMany({ where: { fromId: other, toId: me, readAt: null }, data: { readAt: new Date() } });
  s.json({ other: u, messages });
}));

router.post('/messages', auth(), wrap(async (q, s) => {
  const toId = +q.body.toId, body = (q.body.body || '').trim();
  if (!body || body.length > 1000) throw bad('Tin nhắn từ 1 đến 1000 ký tự');
  if (toId === q.user.id) throw bad('Không thể nhắn cho chính mình');
  const to = await db.user.findUnique({ where: { id: toId } });
  if (!to || to.status === 'banned') throw bad('Không thể gửi tin nhắn cho người dùng này');
  await db.message.create({ data: { fromId: q.user.id, toId, body, productId: q.body.productId ? +q.body.productId : null } });
  s.json({ ok: true, warning: OFF_PLATFORM.test(body) ? 'Vì an toàn, vui lòng không chia sẻ số điện thoại hoặc tài khoản ngân hàng. Hãy đặt hàng và thanh toán ngay trên sàn để được sàn giữ tiền và bảo vệ.' : null });
}));
module.exports = router;
