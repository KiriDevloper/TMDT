require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 3000,
  SECRET: process.env.JWT_SECRET || 'dev-secret',
  COMMISSION: +process.env.COMMISSION || 0.1,                     // Phí hoa hồng
  HOLD_MS: (+process.env.HOLD_HOURS || 48) * 3600e3,              // Thời hạn khiếu nại / giữ tiền
  CATEGORIES: ['thun', 'somi', 'jeans', 'khoac', 'phukien', 'khac'],
  CONDITIONS: ['NEW', 'GOOD', 'FAIR', 'FLAW'],
  BANNED: /(fake|replica|super ?fake|nhái|f1)/i,                  // Hàng cấm (lọc cơ bản)
};
