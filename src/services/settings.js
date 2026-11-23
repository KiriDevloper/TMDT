const db = require('../db');
const cfg = require('../config');

const DEFAULTS = {
  commission: cfg.COMMISSION * 100,          // % hoa hồng
  holdHours: cfg.HOLD_MS / 3600e3,           // giờ giữ tiền / khiếu nại
  minImages: 4,
  bannedWords: 'fake,replica,super fake,nhái,f1',
  siteName: 'RE-WEAR',
  supportEmail: 'support@rewear.vn',
};

async function getSettings() {
  const o = { ...DEFAULTS };
  for (const r of await db.setting.findMany()) if (r.key in DEFAULTS) o[r.key] = typeof DEFAULTS[r.key] === 'number' ? +r.value : r.value;
  return o;
}
async function saveSettings(b) {
  for (const k of Object.keys(DEFAULTS)) if (b[k] !== undefined)
    await db.setting.upsert({ where: { key: k }, update: { value: String(b[k]) }, create: { key: k, value: String(b[k]) } });
}
const bannedRegex = st => {
  const w = st.bannedWords.split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return w.length ? new RegExp(w.join('|'), 'i') : null;
};
module.exports = { getSettings, saveSettings, bannedRegex, DEFAULTS };
