/* RE-WEAR Admin Panel: một trang, định tuyến bằng hash (#/products ...) */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const short = n => n >= 1e9 ? (n / 1e9).toFixed(1) + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
const dt = d => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dday = d => new Date(d).toLocaleDateString('vi-VN');
const localInput = d => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const oid = id => '#DH' + String(id).padStart(4, '0');

const ICONS = {
  home: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  bag: '<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3.5-6 6.5-6s6 2 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.2 1.7 4.5 5"/>',
  store: '<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9"/><path d="M5 12v8h14v-8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
};
const ic = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

const ORDER_ST = { PENDING_PAYMENT: ['Chờ thanh toán', 'warn'], PAID: ['Đã thanh toán', 'info'], SHIPPED: ['Đang giao', 'info'], RECEIVED: ['Đã nhận', 'ok'], DISPUTED: ['Khiếu nại', 'bad'], COMPLETED: ['Hoàn tất', 'ok'], REFUNDED: ['Đã hoàn tiền', 'gray'], CANCELLED: ['Đã hủy', 'gray'] };
const PROD_ST = { PENDING: ['Chờ duyệt', 'warn'], APPROVED: ['Đang bán', 'ok'], REJECTED: ['Từ chối', 'bad'], HIDDEN: ['Đang ẩn', 'gray'], RESERVED: ['Đang có đơn', 'info'], SOLD: ['Đã bán', 'gray'] };
const SHOP_ST = { pending: ['Chờ xác minh', 'warn'], verified: ['Đã xác minh', 'ok'], rejected: ['Bị từ chối', 'bad'] };
const COND = { NEW: 'Mới 99%', GOOD: 'Rất tốt', FAIR: 'Khá tốt', FLAW: 'Có lỗi nhỏ' };
const pill = (map, k) => `<span class="pill ${(map[k] || ['', 'gray'])[1]}">${(map[k] || [k])[0]}</span>`;

let token = localStorage.t, me = null, pend = { products: 0, disputes: 0, sellers: 0, violations: 0, consignments: 0 }, CATS = [];
const F = { dashboard: { days: 7 }, products: { q: '', status: '', category: '' }, orders: { q: '', status: '' }, customers: { q: '', status: '' }, sellers: { q: '', status: '' }, consign: { status: '' }, disputes: { status: 'OPEN' }, promotions: { tab: 'coupons' }, reports: { days: 30 } };
const catName = k => (CATS.find(c => c.key === k) || {}).name || k;
const loadCats = async () => { CATS = await api('/admin/categories'); };

async function api(p, o = {}) {
  const r = await fetch('/api' + p, { ...o, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { showLogin(); throw new Error('Phiên đăng nhập đã hết hạn'); }
  if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra');
  return d;
}
const post = (p, b) => api(p, { method: 'POST', body: b || {} });
const toast = (m, err) => { const d = document.createElement('div'); d.textContent = m; if (err) d.className = 'e'; $('#toast').append(d); setTimeout(() => d.remove(), 3200); };
async function act(fn, msg) { try { await fn(); if (msg) toast(msg); route(); } catch (e) { toast(e.message, 1); } }
const setF = (pg, k, v) => { F[pg][k] = v; route(); };
const fsel = (pg, k, opts) => `<select onchange="setF('${pg}','${k}',this.value)">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(F[pg][k]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const finp = (pg, k, ph) => `<input class="srch" value="${esc(F[pg][k])}" placeholder="${ph}" onchange="setF('${pg}','${k}',this.value)">`;
const head = (icon, title, sub, right = '') => `<div class="ph"><span class="phi">${ic(icon, 34)}</span><div><h1>${title}</h1><p>${sub}</p></div><div class="phr">${right}</div></div>`;
const tbl = (heads, rows, empty = 'Không có dữ liệu') => `<div class="card tw"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${heads.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
const goto = pg => { if (location.hash === '#/' + pg) route(); else location.hash = '#/' + pg; };

/* ---------- Hộp thoại ---------- */
function field(f, v) {
  const val = v ?? f.value ?? '';
  let c;
  if (f.type === 'select') c = `<select name="${f.name}">${f.options.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') c = `<textarea name="${f.name}" rows="3">${esc(val)}</textarea>`;
  else if (f.type === 'check') c = `<label class="chk"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}> ${esc(f.hint || '')}</label>`;
  else c = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${f.req ? 'required' : ''} ${f.ro ? 'readonly' : ''} ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`;
  return `<label class="fld${f.wide ? ' wide' : ''}"><span>${esc(f.label)}</span>${c}</label>`;
}
function formModal(title, fields, vals, onSave, ok = 'Lưu') {
  $('#dlg-t').textContent = title;
  $('#dlg-b').innerHTML = `<div class="fgrid">${fields.map(f => field(f, vals && vals[f.name])).join('')}</div>`;
  $('#dlg-a').innerHTML = `<button type="button" class="btn alt" onclick="$('#dlg').close()">Hủy</button><button class="btn">${ok}</button>`;
  $('#dlg-f').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    fields.filter(f => f.type === 'check').forEach(f => { d[f.name] = e.target[f.name].checked; });
    try { await onSave(d); $('#dlg').close(); route(); } catch (err) { toast(err.message, 1); }
  };
  $('#dlg').showModal();
}
function info(title, html) {
  $('#dlg-t').textContent = title; $('#dlg-b').innerHTML = html;
  $('#dlg-a').innerHTML = `<button type="button" class="btn" onclick="$('#dlg').close()">Đóng</button>`;
  $('#dlg-f').onsubmit = e => { e.preventDefault(); $('#dlg').close(); };
  $('#dlg').showModal();
}

/* ---------- Biểu đồ SVG ---------- */
const niceMax = m => { const p = Math.pow(10, Math.floor(Math.log10(m))), n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const lbl = (d, n) => { const x = new Date(d + 'T00:00'); return n <= 7 ? WD[x.getDay()] : String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0'); };
const bucket = (ser, size) => { if (size <= 1) return ser; const o = []; for (let i = 0; i < ser.length; i += size) { const g = ser.slice(i, i + size); o.push({ date: g[0].date, revenue: g.reduce((a, x) => a + x.revenue, 0), orders: g.reduce((a, x) => a + x.orders, 0) }); } return o; };
function spark(v, color) {
  const w = 150, h = 46, m = Math.max(...v, 1), n = v.length;
  const pts = v.map((y, i) => [n > 1 ? i * w / (n - 1) : 0, h - 4 - (y / m) * (h - 10)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}L${w} ${h}L0 ${h}Z" fill="${color}" opacity=".13"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}
function revChart(ser, bars) {
  const W = 640, H = 230, L = 48, R = 14, T = 14, B = 30, top = niceMax(Math.max(...ser.map(x => x.revenue), 1)), n = ser.length;
  const x = i => bars ? L + (i + .5) * (W - L - R) / n : L + (n > 1 ? i * (W - L - R) / (n - 1) : 0), y = v => T + (H - T - B) * (1 - v / top);
  const grid = [0, .25, .5, .75, 1].map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t * top)}" y2="${y(t * top)}" stroke="#e8e2d6"/><text x="${L - 8}" y="${y(t * top) + 4}" text-anchor="end">${short(t * top)}</text>`).join('');
  const step = Math.ceil(n / 8), labels = ser.map((p, i) => (i % step === 0 || i === n - 1) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${lbl(p.date, n)}</text>` : '').join('');
  let body;
  if (bars) { const bw = Math.max(4, (W - L - R) / n * .6); body = ser.map((p, i) => `<rect x="${x(i) - bw / 2}" y="${y(p.revenue)}" width="${bw}" height="${y(0) - y(p.revenue)}" rx="3" fill="#2f6b3f"><title>${lbl(p.date, 99)}: ${vnd(p.revenue)}</title></rect>`).join(''); }
  else {
    const pts = ser.map((p, i) => [x(i), y(p.revenue)]), line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(''), last = pts[n - 1];
    const dots = n <= 31 ? pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#24502f"><title>${lbl(ser[i].date, 99)}: ${vnd(ser[i].revenue)}</title></circle>`).join('') : '';
    const tip = short(ser[n - 1].revenue) + ' đ', tw = tip.length * 7 + 16;
    body = `<path d="${line}L${last[0]} ${y(0)}L${pts[0][0]} ${y(0)}Z" fill="url(#ga)"/><path d="${line}" fill="none" stroke="#24502f" stroke-width="2.4"/>${dots}<rect x="${last[0] - tw + 8}" y="${last[1] - 34}" width="${tw}" height="22" rx="6" fill="#24502f"/><text x="${last[0] - tw / 2 + 8}" y="${last[1] - 19}" text-anchor="middle" style="fill:#fff;font-weight:700">${tip}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="chart"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6b3f" stop-opacity=".3"/><stop offset="1" stop-color="#2f6b3f" stop-opacity="0"/></linearGradient></defs>${grid}${labels}${body}</svg>`;
}
function donut(parts, total) {
  const r = 62, c = 2 * Math.PI * r; let off = 0;
  const segs = parts.map(p => { const len = total ? p.v / total * c : 0; const s = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${p.color}" stroke-width="26" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`; off += len; return s; }).join('');
  return `<svg viewBox="0 0 180 180" class="donut">${segs}<text x="90" y="90" text-anchor="middle" class="dn">${short(total)}</text><text x="90" y="108" text-anchor="middle" class="dl">Tổng người dùng</text></svg>`;
}

/* ---------- 1. Dashboard ---------- */
async function dashboard(v) {
  const days = F.dashboard.days, d = await api('/admin/stats?days=' + days), c = d.cards;
  const card = (cls, icon, label, x, val, color) => `<div class="stat ${cls}"><div>${ic(icon, 40)}</div><div><div class="sl">${label}</div><div class="sv">${val}</div><div class="sc ${x.change < 0 ? 'down' : ''}">${x.change < 0 ? '↓' : '↑'} ${x.change > 0 ? '+' : ''}${x.change}%</div></div>${spark(x.spark, color)}</div>`;
  const u = d.userStats, ut = u.customers + u.sellers + u.admins;
  v.innerHTML = head('chart', 'Tổng quan hệ thống', `Chào mừng bạn quay trở lại, ${esc(me.name)}!`, `<select class="range" onchange="setF('dashboard','days',+this.value)">${[7, 30, 90].map(n => `<option value="${n}" ${n === days ? 'selected' : ''}>${n} ngày qua</option>`).join('')}</select>`)
  + `<div class="stats">${card('g', 'bag', 'Tổng đơn hàng', c.orders, c.orders.value.toLocaleString('vi-VN'), '#2f6b3f')}${card('b', 'users', 'Người dùng mới', c.users, c.users.value.toLocaleString('vi-VN'), '#b9893a')}${card('g', 'store', 'Người bán mới', c.sellers, c.sellers.value.toLocaleString('vi-VN'), '#2f6b3f')}${card('b', 'tag', 'Doanh thu', c.revenue, vnd(c.revenue.value), '#b9893a')}</div>
  <div class="two"><div class="card pad"><div class="ch"><h3>${ic('chart', 22)} Thống kê doanh thu</h3><div class="seg">${[7, 30, 90].map(n => `<button class="${n === days ? 'on' : ''}" onclick="setF('dashboard','days',${n})">${n} ngày</button>`).join('')}</div></div>${revChart(d.series)}</div>
  <div class="card pad"><div class="ch"><h3>${ic('bag', 22)} Đơn hàng gần đây</h3><a href="#/orders">Xem tất cả →</a></div><div class="tw"><table><thead><tr><th>#Đơn hàng</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>${d.recent.map(o => `<tr><td>${oid(o.id)}</td><td>${esc(o.buyer.name)}</td><td class="num"><b>${vnd(o.total)}</b></td><td>${pill(ORDER_ST, o.status)}</td><td class="num">${dt(o.createdAt)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Chưa có đơn hàng</td></tr>'}</tbody></table></div></div></div>
  <div class="two"><div class="card pad"><div class="ch"><h3>${ic('box', 22)} Sản phẩm nổi bật</h3><a href="#/products">Xem tất cả →</a></div><div class="feat">${d.featured.map(p => `<div class="fc fcw">${p.salePercent ? `<span class="tg">-${p.salePercent}%</span>` : ''}<img src="${esc(p.images[0]?.url || '')}" alt=""><div>${esc(p.title)}<br><b>${vnd(p.salePrice ?? p.price)}</b> ${p.salePrice ? `<span class="old">${vnd(p.price)}</span>` : ''}</div></div>`).join('') || '<p class="empty">Chưa có sản phẩm</p>'}</div></div>
  <div class="card pad"><div class="ch"><h3>${ic('users', 22)} Thống kê người dùng</h3><a href="#/customers">Xem chi tiết →</a></div><div class="dwrap">${donut([{ v: u.customers, color: '#1f5a2d' }, { v: u.sellers, color: '#e4c98f' }, { v: u.admins, color: '#9fd08b' }], ut)}<div class="leg">${[['Khách hàng', u.customers, '#1f5a2d'], ['Người bán', u.sellers, '#e4c98f'], ['Quản trị viên', u.admins, '#9fd08b']].map(([l, n, col]) => `<div><i style="background:${col}"></i>${l}<br><small>(${ut ? Math.round(n / ut * 100) : 0}%) ${n}</small></div>`).join('')}</div></div>
  <p style="margin:14px 0 0;color:var(--mut);font-size:.85rem">Cần xử lý: <a class="lk" href="#/products">${d.pending.products} sản phẩm chờ duyệt</a>, <a class="lk" href="#/disputes">${d.pending.disputes} khiếu nại</a>, <a class="lk" href="#/sellers">${d.pending.sellers} shop chờ xác minh</a></p></div></div>`;
}

/* ---------- 2. Quản lý sản phẩm ---------- */
let PL = {};
async function products(v) {
  const f = F.products, qs = new URLSearchParams(Object.entries(f).filter(([, x]) => x));
  const [list] = await Promise.all([api('/admin/products?' + qs), loadCats()]);
  PL = Object.fromEntries(list.map(p => [p.id, p]));
  v.innerHTML = head('box', 'Quản lý sản phẩm', 'Duyệt, sửa, ẩn hoặc xóa sản phẩm trên sàn')
  + `<div class="bar">${finp('products', 'q', 'Tìm theo tên sản phẩm')}${fsel('products', 'status', [['', 'Mọi trạng thái'], ...Object.entries(PROD_ST).map(([k, x]) => [k, x[0]])])}${fsel('products', 'category', [['', 'Mọi danh mục'], ...CATS.map(c => [c.key, c.name])])}</div>`
  + tbl(['Sản phẩm', 'Người bán', 'Danh mục', 'Giá', 'Trạng thái', 'Ngày đăng', 'Thao tác'], list.map(p => {
    const A = [`<button class="lk" onclick="viewProduct(${p.id})">Xem</button>`];
    if (p.status === 'PENDING') A.push(`<button class="btn sm" onclick="pAct(${p.id},'approve')">Duyệt</button>`, `<button class="btn sm red" onclick="pAct(${p.id},'reject')">Từ chối</button>`);
    if (p.status === 'APPROVED') A.push(`<button class="lk" onclick="pAct(${p.id},'hide')">Ẩn</button>`);
    if (p.status === 'HIDDEN') A.push(`<button class="lk" onclick="pAct(${p.id},'unhide')">Hiện lại</button>`);
    if (p.status === 'REJECTED') A.push(`<button class="lk" onclick="pAct(${p.id},'approve')">Duyệt lại</button>`);
    A.push(`<button class="lk" onclick="editProduct(${p.id})">Sửa</button>`, `<button class="lk red" onclick="delProduct(${p.id})">Xóa</button>`);
    return [`<div class="pcell"><img src="${esc(p.images[0]?.url || '')}" alt=""><div><b>${esc(p.title)}</b>${p.consigned ? ' <span class="pill info">Ký gửi</span>' : ''}<small>${esc(p.brand)}, size ${esc(p.size)}</small></div></div>`, esc(p.seller.name), esc(catName(p.category)), `<span class="num">${vnd(p.price)}</span>`, pill(PROD_ST, p.status), `<span class="num">${dday(p.createdAt)}</span>`, `<div class="acts">${A.join('')}</div>`];
  }), 'Không có sản phẩm nào');
}
const pAct = (id, a) => act(() => post(`/admin/products/${id}/${a}`), 'Đã cập nhật sản phẩm');
const delProduct = id => confirm('Xóa vĩnh viễn sản phẩm này?') && act(() => api('/admin/products/' + id, { method: 'DELETE' }), 'Đã xóa sản phẩm');
function viewProduct(id) {
  const p = PL[id];
  info(p.title, `<div class="imgs-big">${p.images.map(i => `<img src="${esc(i.url)}" alt="">`).join('') || '<p class="empty">Chưa có ảnh</p>'}</div><dl class="kv"><dt>Giá</dt><dd>${vnd(p.price)}</dd><dt>Thương hiệu</dt><dd>${esc(p.brand)}</dd><dt>Size</dt><dd>${esc(p.size)}</dd><dt>Số đo</dt><dd>${esc(p.measures)}</dd><dt>Chất liệu</dt><dd>${esc(p.material) || '-'}</dd><dt>Tình trạng</dt><dd>${COND[p.condition]}</dd><dt>Danh mục</dt><dd>${esc(catName(p.category))}</dd><dt>Người bán</dt><dd>${esc(p.seller.name)}</dd><dt>Mô tả</dt><dd>${esc(p.description) || '-'}</dd></dl>`);
}
function editProduct(id) {
  formModal('Sửa sản phẩm', [
    { name: 'title', label: 'Tên sản phẩm', req: 1, wide: 1 }, { name: 'brand', label: 'Thương hiệu', req: 1 }, { name: 'size', label: 'Size', req: 1 },
    { name: 'measures', label: 'Số đo thực tế', req: 1, wide: 1 }, { name: 'material', label: 'Chất liệu' }, { name: 'price', label: 'Giá (VNĐ)', type: 'number', req: 1, min: 1000 },
    { name: 'condition', label: 'Tình trạng', type: 'select', options: Object.entries(COND) }, { name: 'category', label: 'Danh mục', type: 'select', options: CATS.map(c => [c.key, c.name]) },
    { name: 'description', label: 'Mô tả', type: 'textarea', wide: 1 },
  ], PL[id], d => api('/admin/products/' + id, { method: 'PATCH', body: d }));
}

/* ---------- 3. Quản lý đơn hàng ---------- */
let OL = {};
async function orders(v) {
  const f = F.orders, list = await api('/admin/orders?' + new URLSearchParams(Object.entries(f).filter(([, x]) => x)));
  OL = Object.fromEntries(list.map(o => [o.id, o]));
  v.innerHTML = head('bag', 'Quản lý đơn hàng', 'Theo dõi và xử lý đơn hàng toàn sàn')
  + `<div class="bar">${finp('orders', 'q', 'Mã đơn (VD: DH0012), tên khách hoặc shop')}${fsel('orders', 'status', [['', 'Mọi trạng thái'], ...Object.entries(ORDER_ST).map(([k, x]) => [k, x[0]])])}</div>`
  + tbl(['Mã đơn', 'Khách hàng', 'Người bán', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', 'Thời gian', 'Thao tác'], list.map(o => {
    const A = [`<button class="lk" onclick="showOrder(${o.id})">Chi tiết</button>`], b = (a, l, cls = 'lk') => A.push(`<button class="${cls}" onclick="oAct(${o.id},'${a}')">${l}</button>`);
    if (o.status === 'PENDING_PAYMENT') b('cancel', 'Hủy đơn', 'lk red');
    if (o.status === 'PAID') b('ship', 'Xác nhận đã gửi');
    if (['PAID', 'SHIPPED', 'RECEIVED', 'DISPUTED'].includes(o.status)) b('refund', 'Hoàn tiền', 'lk red');
    if (['RECEIVED', 'DISPUTED'].includes(o.status)) b('release', 'Giải ngân');
    return [oid(o.id), esc(o.buyer.name), esc(o.seller.name), `<small>${esc(o.items.map(i => i.product.title).join(', '))}</small>`, `<b class="num">${vnd(o.total)}</b>${o.discount ? `<br><small>giảm ${vnd(o.discount)}${o.couponCode ? ' (' + esc(o.couponCode) + ')' : ''}</small>` : ''}`, pill(ORDER_ST, o.status), `<span class="num">${dt(o.createdAt)}</span>`, `<div class="acts">${A.join('')}</div>`];
  }), 'Không có đơn hàng nào');
}
const OACT = { cancel: 'Hủy đơn hàng này?', ship: 'Xác nhận đơn đã được gửi đi?', refund: 'Hoàn tiền cho người mua? Sản phẩm sẽ được bán lại.', release: 'Giải ngân tiền cho người bán?' };
const oAct = (id, a) => confirm(OACT[a]) && act(() => post(`/admin/orders/${id}/action`, { action: a }), 'Đã xử lý đơn hàng');
async function showOrder(id) {
  const o = await api('/admin/orders/' + id);
  info('Đơn ' + oid(o.id), `<dl class="kv"><dt>Trạng thái</dt><dd>${pill(ORDER_ST, o.status)}</dd><dt>Khách hàng</dt><dd>${esc(o.buyer.name)}</dd><dt>Người bán</dt><dd>${esc(o.seller.name)}</dd><dt>Địa chỉ giao</dt><dd>${esc(o.address)}</dd><dt>Vận chuyển</dt><dd>${esc(o.carrier || '-')}, phí ${vnd(o.shippingFee)}${o.trackingCode ? ', mã vận đơn ' + esc(o.trackingCode) : ''}</dd>${o.shipDeadline ? `<dt>Hạn gửi hàng</dt><dd>${dt(o.shipDeadline)}</dd>` : ''}<dt>Sản phẩm</dt><dd>${o.items.map(i => `${esc(i.product.title)} (${vnd(i.price)})`).join('<br>')}</dd><dt>Giảm giá</dt><dd>${o.discount ? vnd(o.discount) + (o.couponCode ? ' (mã ' + esc(o.couponCode) + ')' : '') : 'Không'}</dd><dt>Tổng tiền</dt><dd><b>${vnd(o.total)}</b></dd><dt>Phí sàn</dt><dd>${vnd(o.commission)}</dd><dt>Ngày đặt</dt><dd>${dt(o.createdAt)}</dd>${o.dispute ? `<dt>Khiếu nại</dt><dd>${esc(o.dispute.reason)}</dd>` : ''}<dt>Giao dịch ví</dt><dd>${o.txns.map(t => `${esc(t.type)}: ${vnd(t.amount)}`).join('<br>') || 'Chưa có'}</dd></dl>`);
}

/* ---------- 4. Quản lý khách hàng ---------- */
async function customers(v) {
  const f = F.customers, list = await api('/admin/users?' + new URLSearchParams(Object.entries(f).filter(([, x]) => x)));
  v.innerHTML = head('users', 'Quản lý khách hàng', 'Xem, khóa và mở khóa tài khoản')
  + `<div class="bar">${finp('customers', 'q', 'Tìm theo tên hoặc email')}${fsel('customers', 'status', [['', 'Mọi trạng thái'], ['active', 'Đang hoạt động'], ['banned', 'Đã khóa']])}</div>`
  + tbl(['Tài khoản', 'Email', 'Đơn đã mua', 'Tổng chi tiêu', 'Ngày tham gia', 'Trạng thái', 'Thao tác'], list.map(u => [`<b>${esc(u.name)}</b>${u._count.products ? ' <span class="pill info">Người bán</span>' : ''}`, esc(u.email), u._count.buys, `<span class="num">${vnd(u.spent)}</span>`, `<span class="num">${dday(u.createdAt)}</span>`, u.status === 'banned' ? '<span class="pill bad">Đã khóa</span>' : '<span class="pill ok">Hoạt động</span>', u.status === 'banned' ? `<button class="btn sm" onclick="ban(${u.id},false)">Mở khóa</button>` : `<button class="btn sm red" onclick="ban(${u.id},true)">Khóa</button>`]), 'Không có tài khoản nào');
}
const ban = (id, banned) => confirm(banned ? 'Khóa tài khoản này? Người dùng sẽ không đăng nhập được.' : 'Mở khóa tài khoản này?') && act(() => post(`/admin/users/${id}/ban`, { banned }), banned ? 'Đã khóa tài khoản' : 'Đã mở khóa');

/* ---------- 5. Quản lý người bán ---------- */
async function sellers(v) {
  const f = F.sellers, list = await api('/admin/sellers?' + new URLSearchParams(Object.entries(f).filter(([, x]) => x)));
  v.innerHTML = head('store', 'Quản lý người bán', 'Duyệt và xác minh shop')
  + `<div class="bar">${finp('sellers', 'q', 'Tìm theo tên hoặc email')}${fsel('sellers', 'status', [['', 'Mọi trạng thái'], ...Object.entries(SHOP_ST).map(([k, x]) => [k, x[0]])])}</div>`
  + tbl(['Shop', 'Sản phẩm', 'Đơn bán', 'Doanh thu', 'Đánh giá', 'Xác minh', 'Tài khoản', 'Thao tác'], list.map(u => {
    const A = [];
    if (u.shopStatus !== 'verified') A.push(`<button class="btn sm" onclick="shopSt(${u.id},'verified')">Xác minh</button>`);
    if (u.shopStatus !== 'rejected') A.push(`<button class="btn sm red" onclick="shopSt(${u.id},'rejected')">Từ chối</button>`);
    if (u.shopStatus !== 'pending') A.push(`<button class="lk" onclick="shopSt(${u.id},'pending')">Đặt lại chờ duyệt</button>`);
    A.push(u.status === 'banned' ? `<button class="lk" onclick="ban(${u.id},false)">Mở khóa</button>` : `<button class="lk red" onclick="ban(${u.id},true)">Khóa</button>`);
    return [`<b>${esc(u.name)}</b><br><small>${esc(u.email)}</small>`, u._count.products, u._count.sells, `<span class="num">${vnd(u.revenue)}</span>`, u.rating ? `★ ${u.rating.toFixed(1)} (${u.reviews})` : '-', pill(SHOP_ST, u.shopStatus), u.status === 'banned' ? '<span class="pill bad">Đã khóa</span>' : '<span class="pill ok">Hoạt động</span>', `<div class="acts">${A.join('')}</div>`];
  }), 'Chưa có người bán nào');
}
const shopSt = (id, status) => act(() => post(`/admin/sellers/${id}/status`, { status }), 'Đã cập nhật trạng thái shop');

/* ---------- 6. Quản lý danh mục ---------- */
async function categories(v) {
  await loadCats();
  v.innerHTML = head('grid', 'Quản lý danh mục', 'Thêm, sửa, xóa danh mục sản phẩm', `<button class="btn" onclick="addCat()">+ Thêm danh mục</button>`)
  + tbl(['Mã', 'Tên danh mục', 'Số sản phẩm', 'Hiển thị', 'Thao tác'], CATS.map(c => [`<code>${esc(c.key)}</code>`, `<b>${esc(c.name)}</b>`, c.products, c.active ? '<span class="pill ok">Đang hiển thị</span>' : '<span class="pill gray">Đang ẩn</span>', `<div class="acts"><button class="lk" onclick="editCat(${c.id})">Sửa</button><button class="lk" onclick="togCat(${c.id},${!c.active})">${c.active ? 'Ẩn' : 'Hiện'}</button><button class="lk red" onclick="delCat(${c.id})">Xóa</button></div>`]));
}
const addCat = () => formModal('Thêm danh mục', [{ name: 'key', label: 'Mã (chữ thường, không dấu)', req: 1, ph: 'vd: vay' }, { name: 'name', label: 'Tên hiển thị', req: 1, ph: 'vd: Váy đầm' }], {}, d => post('/admin/categories', d), 'Thêm');
const editCat = id => { const c = CATS.find(x => x.id === id); formModal('Sửa danh mục', [{ name: 'key', label: 'Mã', ro: 1 }, { name: 'name', label: 'Tên hiển thị', req: 1 }, { name: 'active', label: 'Hiển thị', type: 'check', hint: 'Hiển thị trên trang bán hàng', wide: 1 }], c, d => api('/admin/categories/' + id, { method: 'PATCH', body: { name: d.name, active: d.active } })); };
const togCat = (id, active) => act(() => api('/admin/categories/' + id, { method: 'PATCH', body: { active } }), 'Đã cập nhật');
const delCat = id => confirm('Xóa danh mục này?') && act(() => api('/admin/categories/' + id, { method: 'DELETE' }), 'Đã xóa danh mục');

/* ---------- 7. Quản lý khuyến mãi ---------- */
let CL = {}, SL = {};
const runState = (x, from, to) => { const n = Date.now(); if (!x.active) return '<span class="pill gray">Tạm dừng</span>'; if (from && new Date(from) > n) return '<span class="pill warn">Chưa bắt đầu</span>'; if (to && new Date(to) < n) return '<span class="pill gray">Hết hạn</span>'; return '<span class="pill ok">Đang chạy</span>'; };
async function promotions(v) {
  const tab = F.promotions.tab; await loadCats();
  const tabs = `<div class="seg">${[['coupons', 'Mã giảm giá'], ['sales', 'Chương trình sale']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="setF('promotions','tab','${k}')">${l}</button>`).join('')}</div>`;
  if (tab === 'coupons') {
    const list = await api('/admin/coupons'); CL = Object.fromEntries(list.map(c => [c.id, c]));
    v.innerHTML = head('tag', 'Quản lý khuyến mãi', 'Tạo mã giảm giá và chương trình sale', tabs + '<button class="btn" onclick="addCoupon()">+ Tạo mã giảm giá</button>')
    + tbl(['Mã', 'Giảm', 'Đơn tối thiểu', 'Đã dùng', 'Thời gian', 'Trạng thái', 'Thao tác'], list.map(c => [`<b><code>${esc(c.code)}</code></b>`, c.type === 'percent' ? c.value + '%' : vnd(c.value), vnd(c.minOrder), `${c.used}${c.maxUses ? ' / ' + c.maxUses : ' / không giới hạn'}`, `<small>${c.startsAt ? dt(c.startsAt) : 'Ngay'}<br>${c.endsAt ? 'đến ' + dt(c.endsAt) : 'Không hết hạn'}</small>`, runState(c, c.startsAt, c.endsAt), `<div class="acts"><button class="lk" onclick="editCoupon(${c.id})">Sửa</button><button class="lk" onclick="togCoupon(${c.id},${!c.active})">${c.active ? 'Dừng' : 'Bật'}</button><button class="lk red" onclick="delCoupon(${c.id})">Xóa</button></div>`]), 'Chưa có mã giảm giá');
  } else {
    const list = await api('/admin/sales'); SL = Object.fromEntries(list.map(c => [c.id, c]));
    v.innerHTML = head('tag', 'Quản lý khuyến mãi', 'Tạo mã giảm giá và chương trình sale', tabs + '<button class="btn" onclick="addSale()">+ Tạo chương trình sale</button>')
    + tbl(['Chương trình', 'Giảm', 'Áp dụng cho', 'Thời gian', 'Trạng thái', 'Thao tác'], list.map(c => [`<b>${esc(c.name)}</b>`, '-' + c.percent + '%', c.category ? esc(catName(c.category)) : 'Toàn sàn', `<small>${dt(c.startsAt)}<br>đến ${dt(c.endsAt)}</small>`, runState(c, c.startsAt, c.endsAt), `<div class="acts"><button class="lk" onclick="editSale(${c.id})">Sửa</button><button class="lk" onclick="togSale(${c.id},${!c.active})">${c.active ? 'Dừng' : 'Bật'}</button><button class="lk red" onclick="delSale(${c.id})">Xóa</button></div>`]), 'Chưa có chương trình sale');
  }
}
const couponFields = (edit) => [
  { name: 'code', label: 'Mã giảm giá', req: 1, ro: edit, ph: 'VD: WELCOME10' }, { name: 'type', label: 'Loại giảm', type: 'select', options: [['percent', 'Phần trăm (%)'], ['fixed', 'Số tiền cố định (đ)']] },
  { name: 'value', label: 'Giá trị giảm', type: 'number', req: 1, min: 1 }, { name: 'minOrder', label: 'Đơn tối thiểu (đ)', type: 'number', min: 0 },
  { name: 'maxUses', label: 'Số lượt dùng tối đa (0 = không giới hạn)', type: 'number', min: 0 }, { name: 'startsAt', label: 'Bắt đầu (để trống = ngay)', type: 'datetime-local' }, { name: 'endsAt', label: 'Kết thúc (để trống = không hết hạn)', type: 'datetime-local' },
];
const addCoupon = () => formModal('Tạo mã giảm giá', couponFields(false), { type: 'percent', minOrder: 0, maxUses: 0 }, d => post('/admin/coupons', d), 'Tạo mã');
const editCoupon = id => { const c = CL[id]; formModal('Sửa mã giảm giá', couponFields(true), { ...c, startsAt: localInput(c.startsAt), endsAt: localInput(c.endsAt) }, d => api('/admin/coupons/' + id, { method: 'PATCH', body: { value: d.value, minOrder: d.minOrder, maxUses: d.maxUses, startsAt: d.startsAt, endsAt: d.endsAt } })); };
const togCoupon = (id, active) => act(() => api('/admin/coupons/' + id, { method: 'PATCH', body: { active } }), 'Đã cập nhật');
const delCoupon = id => confirm('Xóa mã giảm giá này?') && act(() => api('/admin/coupons/' + id, { method: 'DELETE' }), 'Đã xóa');
const saleFields = () => [
  { name: 'name', label: 'Tên chương trình', req: 1, wide: 1, ph: 'VD: Sale cuối tuần' }, { name: 'percent', label: 'Giảm (%)', type: 'number', req: 1, min: 1, max: 90 },
  { name: 'category', label: 'Áp dụng cho', type: 'select', options: [['', 'Toàn sàn'], ...CATS.map(c => [c.key, c.name])] },
  { name: 'startsAt', label: 'Bắt đầu', type: 'datetime-local', req: 1 }, { name: 'endsAt', label: 'Kết thúc', type: 'datetime-local', req: 1 },
];
const addSale = () => formModal('Tạo chương trình sale', saleFields(), { startsAt: localInput(new Date()), endsAt: localInput(Date.now() + 7 * 864e5) }, d => post('/admin/sales', d), 'Tạo');
const editSale = id => { const c = SL[id]; formModal('Sửa chương trình sale', saleFields(), { ...c, category: c.category || '', startsAt: localInput(c.startsAt), endsAt: localInput(c.endsAt) }, d => api('/admin/sales/' + id, { method: 'PATCH', body: d })); };
const togSale = (id, active) => act(() => api('/admin/sales/' + id, { method: 'PATCH', body: { active } }), 'Đã cập nhật');
const delSale = id => confirm('Xóa chương trình sale này?') && act(() => api('/admin/sales/' + id, { method: 'DELETE' }), 'Đã xóa');

/* ---------- 8. Quản lý khiếu nại và báo cáo vi phạm ---------- */
const ev = urls => (urls || '').split(',').filter(Boolean).map(u => /\.(mp4|webm)$/i.test(u) ? `<video src="${esc(u)}" controls preload="metadata" style="height:90px;border-radius:8px"></video>` : `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Bằng chứng" style="width:90px;height:90px;object-fit:cover;border-radius:8px"></a>`).join('');
async function disputes(v) {
  const st = F.disputes.status;
  const tabs = `<div class="seg">${[['OPEN', 'Đang mở'], ['RESOLVED', 'Đã xử lý'], ['', 'Tất cả'], ['VIOL', 'Tin đăng bị báo cáo']].map(([k, l]) => `<button class="${st === k ? 'on' : ''}" onclick="setF('disputes','status','${k}')">${l}${k === 'VIOL' && pend.violations ? ` (${pend.violations})` : ''}</button>`).join('')}</div>`;
  if (st === 'VIOL') {
    const list = await api('/admin/violations?status=OPEN');
    v.innerHTML = head('alert', 'Báo cáo tin đăng vi phạm', 'Người dùng báo cáo hàng giả, hàng nhái hoặc nội dung sai sự thật', tabs)
    + (list.map(x => `<div class="card dcard"><div class="ch" style="margin:0"><h3>${esc(x.product.title)}</h3>${pill(PROD_ST, x.product.status)}</div><div class="imgs">${x.product.images.slice(0, 4).map(i => `<img src="${esc(i.url)}" alt="">`).join('')}</div>
      <div>Người bán: <b>${esc(x.product.seller.name)}</b>, người báo cáo: <b>${esc(x.reporter.name)}</b>, ${dt(x.createdAt)}</div><div><b>Lý do báo cáo:</b> ${esc(x.reason)}</div>
      <div class="acts"><button class="btn red" onclick="vAct(${x.id},'hide')">Gỡ tin (ẩn sản phẩm)</button><button class="btn alt" onclick="vAct(${x.id},'dismiss')">Bỏ qua báo cáo</button></div></div>`).join('') || '<div class="card pad empty">Không có báo cáo nào đang chờ xử lý</div>');
    return;
  }
  const list = await api('/admin/disputes?status=' + st);
  v.innerHTML = head('alert', 'Quản lý khiếu nại', 'Xử lý báo cáo và tranh chấp giữa người mua và người bán', tabs)
  + (list.map(d => { const o = d.order; return `<div class="card dcard"><div class="ch" style="margin:0"><h3>${oid(o.id)}, ${vnd(o.total)}</h3>${d.status === 'OPEN' ? '<span class="pill bad">Đang mở</span>' : `<span class="pill ok">${d.decision === 'REFUND' ? 'Đã hoàn tiền' : 'Đã giải ngân cho người bán'}</span>`}</div>
    <div>Người mua: <b>${esc(o.buyer.name)}</b> (${esc(o.buyer.email)}), người bán: <b>${esc(o.seller.name)}</b></div><div class="imgs">${o.items.map(i => `<img src="${esc(i.product.images[0]?.url || '')}" alt="" title="${esc(i.product.title)}">`).join('')}</div>
    <div>Sản phẩm: ${esc(o.items.map(i => i.product.title).join(', '))}</div><div><b>Lý do khiếu nại:</b> ${esc(d.reason)}</div>${d.evidence ? `<div><b>Bằng chứng của người mua:</b></div><div class="imgs" style="flex-wrap:wrap">${ev(d.evidence)}</div>` : '<small style="color:var(--mut)">Người mua không đính kèm bằng chứng</small>'}<small style="color:var(--mut)">Gửi lúc ${dt(d.createdAt)}</small>${d.note ? `<div><b>Ghi chú xử lý:</b> ${esc(d.note)}</div>` : ''}
    ${d.status === 'OPEN' ? `<div class="acts"><button class="btn red" onclick="resolveDispute(${d.id},'REFUND')">Hoàn tiền cho người mua</button><button class="btn" onclick="resolveDispute(${d.id},'RELEASE')">Giải ngân cho người bán</button></div>` : ''}</div>`; }).join('') || '<div class="card pad empty">Không có khiếu nại nào</div>');
}
const vAct = (id, action) => confirm(action === 'hide' ? 'Gỡ tin đăng này khỏi sàn?' : 'Bỏ qua báo cáo này?') && act(() => post(`/admin/violations/${id}/resolve`, { action }), 'Đã xử lý báo cáo');
const resolveDispute = (id, decision) => formModal(decision === 'REFUND' ? 'Hoàn tiền cho người mua' : 'Giải ngân cho người bán', [{ name: 'note', label: 'Ghi chú xử lý (lưu lại để đối chiếu)', type: 'textarea', wide: 1 }], {}, d => post(`/admin/disputes/${id}/resolve`, { decision, note: d.note }), 'Xác nhận');

/* ---------- Quản lý ký gửi ---------- */
const CONS_ST = { SUBMITTED: ['Chờ nhận hàng', 'warn'], RECEIVED: ['Đã nhận, chờ đăng bán', 'info'], REJECTED: ['Không đạt', 'bad'], LISTED: ['Đang bán', 'ok'], SOLD: ['Đã bán', 'gray'], EXPIRED: ['Hết hạn', 'warn'], RETURNED: ['Đã trả lại', 'gray'] };
let CNL = {};
async function consign(v) {
  const list = await api('/admin/consignments?status=' + F.consign.status);
  CNL = Object.fromEntries(list.map(c => [c.id, c]));
  v.innerHTML = head('truck', 'Quản lý ký gửi', 'Nhận hàng, kiểm tra, đăng bán và theo dõi hàng ký gửi', fsel('consign', 'status', [['', 'Mọi trạng thái'], ...Object.entries(CONS_ST).map(([k, x]) => [k, x[0]])]))
  + tbl(['Sản phẩm', 'Người ký gửi', 'Giá mong muốn', 'Trạng thái', 'Hạn ký gửi', 'Ghi chú', 'Thao tác'], list.map(c => {
    const A = [`<button class="lk" onclick="viewConsign(${c.id})">Xem</button>`];
    if (c.status === 'SUBMITTED') A.push(`<button class="btn sm" onclick="cAct(${c.id},'receive')">Đã nhận hàng</button>`);
    if (c.status === 'RECEIVED') A.push(`<button class="btn sm" onclick="cAct(${c.id},'list')">Đăng bán</button>`);
    if (['SUBMITTED', 'RECEIVED'].includes(c.status)) A.push(`<button class="lk red" onclick="cAct(${c.id},'reject')">Từ chối</button>`);
    if (['RECEIVED', 'REJECTED', 'EXPIRED'].includes(c.status)) A.push(`<button class="lk" onclick="cAct(${c.id},'return')">Đã trả hàng</button>`);
    return [`<div class="pcell"><img src="${esc((c.images || '').split(',')[0])}" alt=""><div><b>${esc(c.title)}</b><small>${esc(c.brand)}, size ${esc(c.size)}</small></div></div>`, `${esc(c.seller.name)}<br><small>${esc(c.seller.email)}</small>`, `<span class="num">${vnd(c.expectedPrice)}</span>${c.finalPrice ? `<br><small>bán ${vnd(c.finalPrice)}</small>` : ''}`, pill(CONS_ST, c.status), c.expiresAt ? `<span class="num">${dday(c.expiresAt)}</span>` : '-', `<small>${esc(c.adminNote || '')}</small>`, `<div class="acts">${A.join('')}</div>`];
  }), 'Chưa có yêu cầu ký gửi nào');
}
function viewConsign(id) {
  const c = CNL[id];
  info(c.title, `<div class="imgs-big">${(c.images || '').split(',').filter(Boolean).map(u => `<img src="${esc(u)}" alt="">`).join('')}</div><dl class="kv"><dt>Người ký gửi</dt><dd>${esc(c.seller.name)} (${esc(c.seller.email)})</dd><dt>Thương hiệu</dt><dd>${esc(c.brand)}</dd><dt>Size</dt><dd>${esc(c.size)}</dd><dt>Số đo</dt><dd>${esc(c.measures)}</dd><dt>Tình trạng</dt><dd>${COND[c.condition]}</dd><dt>Danh mục</dt><dd>${esc(catName(c.category))}</dd><dt>Giá mong muốn</dt><dd>${vnd(c.expectedPrice)}</dd><dt>Mô tả</dt><dd>${esc(c.description) || '-'}</dd></dl>`);
}
async function cAct(id, a) {
  if (!CATS.length) await loadCats();
  const c = CNL[id], T = { receive: 'Xác nhận đã nhận hàng', reject: 'Từ chối ký gửi', list: 'Đăng bán hàng ký gửi', return: 'Xác nhận đã trả hàng' };
  const fields = a === 'list' ? [{ name: 'price', label: 'Giá bán trên sàn (VNĐ)', type: 'number', req: 1, min: 1000 }, { name: 'note', label: 'Ghi chú cho người bán', type: 'textarea', wide: 1 }] : [{ name: 'note', label: a === 'reject' ? 'Lý do từ chối (bắt buộc, người bán sẽ thấy)' : 'Ghi chú', type: 'textarea', wide: 1 }];
  formModal(T[a], fields, { price: c.expectedPrice }, d => post(`/admin/consignments/${id}/action`, { action: a, price: d.price, note: d.note }), 'Xác nhận');
}

/* ---------- 9. Thống kê báo cáo ---------- */
let LAST_REPORT = null;
async function reports(v) {
  const days = F.reports.days, r = await api('/admin/reports?days=' + days); LAST_REPORT = r; await loadCats();
  const ser = bucket(r.series, days > 90 ? 7 : 1), cats = Object.entries(r.categories).sort((a, b) => b[1] - a[1]), cmax = Math.max(...cats.map(c => c[1]), 1);
  const kpi = (l, x) => `<div class="card"><span style="color:var(--mut)">${l}</span><b>${x}</b></div>`;
  v.innerHTML = head('chart', 'Thống kê báo cáo', 'Doanh thu và số lượng giao dịch của sàn', `<select class="range" onchange="setF('reports','days',+this.value)">${[[7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày'], [365, '12 tháng']].map(([n, l]) => `<option value="${n}" ${n === days ? 'selected' : ''}>${l} qua</option>`).join('')}</select><button class="btn alt" onclick="exportCSV()">Xuất CSV</button>`)
  + `<div class="kpi">${kpi('Doanh thu (GMV)', vnd(r.gmv))}${kpi('Hoa hồng sàn thu', vnd(r.commission))}${kpi('Tổng giao dịch', r.orders)}${kpi('Đơn hoàn tất', r.completed)}${kpi('Giá trị đơn trung bình', vnd(r.aov))}</div>
  <div class="two"><div class="card pad"><div class="ch"><h3>Doanh thu theo ${days > 90 ? 'tuần' : 'ngày'}</h3></div>${revChart(ser, true)}</div>
  <div class="card pad"><div class="ch"><h3>Doanh thu theo danh mục</h3></div><div class="hb">${cats.map(([k, n]) => `<div><span>${esc(catName(k))}</span><span class="t"><i style="width:${n / cmax * 100}%"></i></span><b>${short(n)}đ</b></div>`).join('') || '<p class="empty">Chưa có dữ liệu</p>'}</div>
  <div class="ch" style="margin-top:18px"><h3>Đơn theo trạng thái</h3></div><div class="acts">${Object.entries(r.byStatus).map(([k, n]) => `${pill(ORDER_ST, k)} <b>${n}</b>`).join(' &nbsp; ') || '<span class="empty">Chưa có đơn</span>'}</div></div></div>
  <div class="two" style="grid-template-columns:1fr 1fr"><div><div class="ch"><h3>Top người bán</h3></div>${tbl(['Shop', 'Đơn', 'Doanh thu'], r.topSellers.map(s => [esc(s.name), s.orders, `<b class="num">${vnd(s.revenue)}</b>`]), 'Chưa có dữ liệu')}</div>
  <div><div class="ch"><h3>Sản phẩm bán chạy</h3></div>${tbl(['Sản phẩm', 'SL', 'Doanh thu'], r.topProducts.map(p => [esc(p.title), p.qty, `<b class="num">${vnd(p.revenue)}</b>`]), 'Chưa có dữ liệu')}</div></div>`;
}
function exportCSV() {
  const r = LAST_REPORT; if (!r) return;
  const rows = [['Ngày', 'Số đơn', 'Doanh thu'], ...r.series.map(x => [x.date, x.orders, x.revenue]), [], ['Tổng doanh thu (GMV)', r.gmv], ['Hoa hồng sàn', r.commission], ['Tổng giao dịch', r.orders], ['Đơn hoàn tất', r.completed]];
  const blob = new Blob(['\ufeff' + rows.map(x => x.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bao-cao-${r.days}-ngay.csv`; a.click();
}

/* ---------- 10. Cài đặt hệ thống ---------- */
async function settings(v) {
  const s = await api('/admin/settings');
  v.innerHTML = head('gear', 'Cài đặt hệ thống', 'Cấu hình chính sách bán hàng và thông tin sàn')
  + `<form id="sf" class="card pad" style="max-width:760px"><div class="fgrid">
    ${field({ name: 'siteName', label: 'Tên sàn', req: 1 }, s.siteName)}${field({ name: 'supportEmail', label: 'Email hỗ trợ', type: 'email' }, s.supportEmail)}
    ${field({ name: 'commission', label: 'Phí hoa hồng (%)', type: 'number', min: 0, max: 50, req: 1 }, s.commission)}${field({ name: 'holdHours', label: 'Thời gian giữ tiền / thời hạn khiếu nại (giờ)', type: 'number', min: 0, max: 720, req: 1 }, s.holdHours)}
    ${field({ name: 'minImages', label: 'Số ảnh tối thiểu khi đăng bán', type: 'number', min: 1, max: 8, req: 1 }, s.minImages)}${field({ name: 'shipDays', label: 'Hạn người bán gửi hàng (ngày), quá hạn tự hoàn tiền', type: 'number', min: 1, max: 14, req: 1 }, s.shipDays)}
    ${field({ name: 'newShopDays', label: 'Ưu đãi hoa hồng cho người bán mới (số ngày)', type: 'number', min: 0, max: 365, req: 1 }, s.newShopDays)}${field({ name: 'newShopCommission', label: 'Hoa hồng trong thời gian ưu đãi (%)', type: 'number', min: 0, max: 50, req: 1 }, s.newShopCommission)}
    ${field({ name: 'consignCommission', label: 'Hoa hồng hàng ký gửi (%)', type: 'number', min: 0, max: 60, req: 1 }, s.consignCommission)}${field({ name: 'consignDays', label: 'Thời hạn ký gửi (ngày)', type: 'number', min: 7, max: 365, req: 1 }, s.consignDays)}
    ${field({ name: 'bannedWords', label: 'Từ khóa cấm (cách nhau bằng dấu phẩy)', type: 'textarea', wide: 1 }, s.bannedWords)}</div>
    <div class="dlg-a"><button class="btn">Lưu cài đặt</button></div></form>
    <p style="color:var(--mut);max-width:760px">Phí hoa hồng áp dụng cho các đơn tạo mới. Thời gian giữ tiền áp dụng ngay cho việc tự động giải ngân và hạn khiếu nại. Để demo nhanh, đặt 0.01 giờ.</p>`;
  $('#sf').onsubmit = e => { e.preventDefault(); act(() => api('/admin/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }), 'Đã lưu cài đặt'); };
}

/* ---------- Khung, đăng nhập, tìm kiếm nhanh ---------- */
const NAV = [['dashboard', 'Tổng quan', 'home'], ['products', 'Quản lý sản phẩm', 'box'], ['orders', 'Quản lý đơn hàng', 'bag'], ['customers', 'Quản lý khách hàng', 'users'], ['sellers', 'Quản lý người bán', 'store'], ['consign', 'Quản lý ký gửi', 'truck'], ['categories', 'Danh mục', 'grid'], ['promotions', 'Khuyến mãi', 'tag'], ['disputes', 'Khiếu nại', 'alert'], ['reports', 'Báo cáo thống kê', 'chart'], ['settings', 'Cài đặt hệ thống', 'gear']];
const PAGES = { dashboard, products, orders, customers, sellers, consign, categories, promotions, disputes, reports, settings };
const curPage = () => location.hash.slice(2).split('?')[0] || 'dashboard';
function nav() {
  const cur = curPage(), bd = { products: pend.products, disputes: pend.disputes + pend.violations, sellers: pend.sellers, consign: pend.consignments };
  $('#nav').innerHTML = NAV.map(([k, l, i]) => `<a href="#/${k}" class="${cur === k ? 'on' : ''}">${ic(i, 22)}<span>${l}</span>${bd[k] ? `<span class="nb">${bd[k]}</span>` : ''}</a>`).join('') + `<hr><a href="#" onclick="logout();return false">${ic('logout', 22)}<span>Đăng xuất</span></a>`;
}
async function refreshPending() {
  try { pend = await api('/admin/pending'); } catch {}
  const n = pend.products + pend.disputes + pend.sellers + pend.violations + pend.consignments; $('#bn').textContent = n; $('#bn').hidden = !n;
}
function showLogin(msg) { $('#shell').hidden = true; $('#login').hidden = false; $('#lerr').textContent = msg || ''; }
async function ensureAdmin() {
  if (!token) return showLogin(), false;
  if (!me) { try { me = await api('/me'); } catch { return showLogin(), false; } }
  if (me.role !== 'admin') { me = null; delete localStorage.t; token = null; showLogin('Tài khoản này không có quyền quản trị'); return false; }
  $('#login').hidden = true; $('#shell').hidden = false; $('#wn').textContent = me.name; $('#av').textContent = me.name.trim()[0].toUpperCase();
  return true;
}
async function route() {
  if (!(await ensureAdmin())) return;
  await refreshPending(); nav();
  try { await (PAGES[curPage()] || dashboard)($('#view')); } catch (e) { $('#view').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
function logout() { delete localStorage.t; token = me = null; showLogin(); }
function toggleSide() { $('#shell').classList.toggle('collapsed'); }

$('#lf').onsubmit = async e => {
  e.preventDefault();
  try { const d = await api('/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); token = localStorage.t = d.token; me = d.user; route(); } catch (err) { $('#lerr').textContent = err.message; }
};
let gt;
$('#gq').oninput = e => {
  clearTimeout(gt); const q = e.target.value.trim(), box = $('#gres');
  if (!q) return box.hidden = true;
  gt = setTimeout(async () => {
    const r = await api('/admin/search?q=' + encodeURIComponent(q)).catch(() => null); if (!r) return;
    const sec = (t, a) => a.length ? `<h4>${t}</h4>${a.join('')}` : '';
    box.innerHTML = sec('Sản phẩm', r.products.map(p => `<a onclick="gsGo('products','q','${p.id}')">${esc(p.title)} ${pill(PROD_ST, p.status)}</a>`)) + sec('Đơn hàng', r.orders.map(o => `<a onclick="gsGo('orders','q','${o.id}')">${oid(o.id)}, ${vnd(o.total)} ${pill(ORDER_ST, o.status)}</a>`)) + sec('Người dùng', r.users.map(u => `<a onclick="gsGo('customers','q','${u.id}')">${esc(u.name)} <small>${esc(u.email)}</small></a>`)) || '<p class="empty">Không tìm thấy kết quả</p>';
    box.hidden = false; window._gr = r;
  }, 250);
};
function gsGo(pg, key, id) {
  const r = window._gr; id = +id;
  F[pg][key] = pg === 'products' ? r.products.find(x => x.id === id).title : pg === 'orders' ? oid(id) : r.users.find(x => x.id === id).email;
  $('#gres').hidden = true; $('#gq').value = ''; goto(pg);
}
document.addEventListener('click', e => { if (!e.target.closest('.gsearch')) $('#gres').hidden = true; });
$('#burger').innerHTML = ic('menu', 26); $('#gsi').innerHTML = ic('search', 20); $('#bell').innerHTML = ic('bell', 24);
if (innerWidth < 800) $('#shell').classList.add('collapsed');
addEventListener('hashchange', route);
route();
