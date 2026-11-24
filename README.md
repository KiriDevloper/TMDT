# ReWear - Sàn thương mại điện tử quần áo secondhand

Đồ án học phần Thương mại điện tử. Công nghệ: Node.js, Express, Prisma, PostgreSQL, giao diện HTML/JS thuần với Tailwind CDN.

## Chạy dự án

Yêu cầu: Node.js 18 trở lên.

1. Tạo cơ sở dữ liệu: `psql -U postgres -c "CREATE DATABASE rewear;"` (hoặc tạo bằng pgAdmin).
2. Chép `.env.example` thành `.env`, sửa `DATABASE_URL` cho đúng mật khẩu PostgreSQL.
3. Chạy:

```bash
npm install
npm run setup     # tạo bảng và dữ liệu mẫu (chạy lại khi schema thay đổi)
npm start         # mở http://localhost:3000
```

Muốn trang Admin có sẵn số liệu để xem và chụp ảnh: `npm run seed:demo` (chạy một lần).

Trang quản trị: `http://localhost:3000/admin/` (đăng nhập `admin@rewear.vn / admin123`).

Tài khoản mẫu: `admin@rewear.vn / admin123`, `shop@rewear.vn / 123456`, `buyer@rewear.vn / 123456`.

Để demo nhanh luồng giải ngân tự động, đặt `HOLD_HOURS=0.01` trong `.env` (khoảng 36 giây thay vì 48 giờ).

## Cấu trúc thư mục

```
server.js                    khởi động ứng dụng
src/
  config.js                  biến cấu hình (hoa hồng, thời hạn giữ tiền, hàng cấm)
  db.js                      kết nối Prisma
  utils.js                   bad, wrap, sign, pub
  middlewares/               auth.js (đăng nhập, phân quyền), upload.js (tải ảnh)
  services/orderService.js   getOrder, release (giải ngân), refund (hoàn tiền)
  jobs/autoRelease.js        tự động giải ngân khi hết hạn khiếu nại
  routes/                    auth, public, product, shop, order, wallet (+ index.js gom lại)
  routes/admin/              dashboard, products, orders, users, categories, promotions, disputes, reports, settings
public/admin/                giao diện quản trị riêng (index.html, admin.css, admin.js)
seed-demo.js                 dữ liệu mẫu cho trang Admin
```

Thêm API mới: tạo file `src/routes/ten.routes.js`, rồi khai báo trong `src/routes/index.js`.

## Chính sách trong báo cáo được cài đặt ở đâu

| Chính sách | Cài đặt (trong src/) |
|---|---|
| Tối thiểu 4 ảnh, khai báo size/số đo/tình trạng | `routes/product.routes.js` |
| Cấm hàng giả, hàng nhái | `BANNED` trong `config.js` |
| Duyệt tin trước khi hiển thị | trạng thái `PENDING`, `/api/admin/products` |
| Hoa hồng giao dịch | `COMMISSION` trong `.env` (mặc định 10%) |
| Sàn giữ tiền đến khi người mua xác nhận | `order.routes.js` (pay), `orderService.release` |
| Khiếu nại trong 48 giờ, sàn làm trọng tài | `dispute`, `/api/admin/disputes/:id/resolve` |
| Tự động giải ngân khi hết hạn khiếu nại | `jobs/autoRelease.js` |
| Đánh giá và uy tín người bán | `review`, `/api/shops/:id` |
| Ví và rút tiền | `/api/wallet` |
| Khiếu nại kèm ảnh/video bằng chứng | `order.routes.js` (dispute), `middlewares/upload.js` (evidence) |
| Hiển thị phí sàn khi đăng bán, ưu đãi người bán mới | `GET /api/fees`, `services/settings.js` (sellerRate), form đăng bán |
| Chọn đơn vị vận chuyển, phí ship, mã vận đơn, hạn gửi hàng, tự hoàn tiền khi quá hạn | `config.js` (CARRIERS), `order.routes.js`, `jobs/autoRelease.js` |
| Chat người mua và người bán, cảnh báo giao dịch ngoài sàn | `message.routes.js` |
| Báo cáo tin đăng vi phạm | `product.routes.js` (report), `admin/violations.js` |
| Huy hiệu uy tín người bán | `services/reputation.js` |
| Ký gửi (nhận hàng, đăng bán, hoa hồng riêng, hết hạn) | `consign.routes.js`, `admin/consignments.js`, `jobs/autoRelease.js` |
| Phí hoa hồng, thời hạn giữ tiền, số ảnh tối thiểu, từ khóa cấm | Admin, trang Cài đặt (`services/settings.js`) |
| Mã giảm giá, chương trình sale | Admin, trang Khuyến mãi (`services/pricing.js`) |
| Khóa tài khoản, xác minh shop | Admin, trang Khách hàng và Người bán |

Luồng đơn: `PENDING_PAYMENT, PAID, SHIPPED, RECEIVED, COMPLETED`, nhánh phụ `DISPUTED, REFUNDED, CANCELLED`.

## Giới hạn của bản này

- Thanh toán và giữ tiền là **mô phỏng** trong CSDL. Triển khai thật cần cổng thanh toán có sandbox (VNPay, PayOS) và đơn vị trung gian thanh toán có giấy phép.
- Chưa có: tích hợp API vận chuyển thật (phí ship và mã vận đơn đang mô phỏng), thanh toán nhiều phương thức, gợi ý sản phẩm, gói gian hàng, kiểm định hàng hiệu, điểm thưởng, thông báo email. Chat dùng cơ chế tải lại mỗi 5 giây, chưa phải WebSocket.
- Trước khi đưa lên mạng: đặt `JWT_SECRET` mạnh, thêm giới hạn số lần gọi API (rate limit), HTTPS.
