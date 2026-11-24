const router = require('express').Router();
const { bad, wrap } = require('../../utils');
const { getSettings, saveSettings } = require('../../services/settings');

router.get('/settings', wrap(async (q, s) => s.json(await getSettings())));
router.put('/settings', wrap(async (q, s) => {
  const b = q.body;
  if (!(+b.commission >= 0 && +b.commission <= 50)) throw bad('Phí hoa hồng từ 0 đến 50%');
  if (!(+b.holdHours >= 0 && +b.holdHours <= 720)) throw bad('Thời gian giữ tiền từ 0 đến 720 giờ');
  if (!(+b.minImages >= 1 && +b.minImages <= 8)) throw bad('Số ảnh tối thiểu từ 1 đến 8');
  if (!(+b.shipDays >= 1 && +b.shipDays <= 14)) throw bad('Hạn gửi hàng từ 1 đến 14 ngày');
  if (!(+b.newShopDays >= 0 && +b.newShopDays <= 365)) throw bad('Thời gian ưu đãi người bán mới từ 0 đến 365 ngày');
  if (!(+b.newShopCommission >= 0 && +b.newShopCommission <= 50)) throw bad('Hoa hồng ưu đãi từ 0 đến 50%');
  if (!(+b.consignCommission >= 0 && +b.consignCommission <= 60)) throw bad('Hoa hồng ký gửi từ 0 đến 60%');
  if (!(+b.consignDays >= 7 && +b.consignDays <= 365)) throw bad('Thời hạn ký gửi từ 7 đến 365 ngày');
  if (!String(b.siteName || '').trim()) throw bad('Cần nhập tên sàn');
  await saveSettings(b);
  s.json(await getSettings());
}));
module.exports = router;
