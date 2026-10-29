# Sprint 1 — Tài khoản và hồ sơ khách hàng

## a) Phạm vi và giả định

Triển khai trên cấu trúc thực tế React/Vite + Express + PostgreSQL. Giữ font, màu xanh và nền trắng, quy ước `kd-` của KD. Email là tên đăng nhập duy nhất và chỉ đọc trong hồ sơ. Điện thoại và avatar không bắt buộc khi đăng ký.

Hoàn thành: đăng ký/đăng nhập, hồ sơ, avatar, đổi mật khẩu, quên/đặt lại mật khẩu qua email, thông báo tiếng Việt, skeleton, lỗi có thử lại, toast lưu hồ sơ, bàn phím và bố cục responsive. Tab Đơn hàng sử dụng lại chức năng hiện có. Địa chỉ mặc định, nâng cấp lịch sử đơn hàng và trang Admin Users thuộc Sprint 2/3.

Chọn Resend làm dịch vụ gửi email, sử dụng fetch có sẵn trong Node 22. Không thêm package mới. Avatar lưu trên ổ đĩa của API giống cơ chế ảnh sản phẩm hiện có; cần giữ thư mục uploads khi triển khai lại, và dùng volume chung nếu chạy nhiều API instance.

## b) Database và cách chạy

Migration: [server/sql/002_customer_accounts.sql](../server/sql/002_customer_accounts.sql).

- `users`: thêm phone, avatar_url, status (active/blocked), token_version, updated_at, last_login_at.
- Chuẩn hóa email cũ về chữ thường, bỏ khoảng trắng hai đầu; unique index lower(email). Nếu dữ liệu cũ có email trùng sau chuẩn hóa, migration dừng và rollback để tránh gộp nhầm tài khoản.
- `password_reset_tokens`: chỉ giữ SHA-256 của token ngẫu nhiên 32 byte, phiên bản mật khẩu, thời hạn 30 phút, thời điểm sử dụng. Không lưu token gốc.
- `auth_rate_limits`: bộ đếm dùng chung trong PostgreSQL, key được HMAC; không lưu IP/email dạng rõ trong bảng này.
- `db:init` chạy schema và migration trong transaction, có thể chạy lại. Không cần chạy seed trên dữ liệu đang sử dụng.

Tại thư mục gốc repository:

```bash
git switch feature/sprint-2
git pull --ff-only origin feature/sprint-2
npm install
npm run db:init
```

Khởi động lại API và frontend ở hai terminal:

```bash
npm run dev:api
```

```bash
npm run dev:store
```

Đảm bảo DATABASE_URL, JWT_SECRET và ALLOWED_ORIGINS trong `server/.env` phù hợp môi trường hiện tại. Phiên đăng nhập cũ trước migration cần đăng nhập lại vì JWT mới có token_version.

Để bật email, thêm vào **server/.env** (không commit key, không đưa vào biến VITE_* của frontend):

```dotenv
APP_URL=http://localhost:5173
RESEND_API_KEY=your-real-server-side-api-key
MAIL_FROM=KD <accounts@your-verified-domain.example>
```

Production dùng APP_URL là origin HTTPS của storefront và người gửi thuộc domain đã xác minh ở Resend. Tham khảo [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email). Nếu thiếu cấu hình, forgot-password trả 503 EMAIL_UNAVAILABLE. Nếu nhà cung cấp báo lỗi, API ghi mã ACCOUNT_RESET_EMAIL_FAILED, hủy token vừa tạo và vẫn trả thông báo chung; không tiết lộ tài khoản có tồn tại hay không. CI dùng bộ nhận email giả lập cục bộ, không xác nhận khả năng gửi email thật của domain của bạn.

Nếu API nằm sau reverse proxy, cấu hình trust proxy đúng với hạ tầng trước khi triển khai để giới hạn theo IP hoạt động như dự kiến; không bật tin cậy mọi proxy tùy tiện.

## c) API

Tiền tố: `/api`. Endpoint có xác thực yêu cầu `Authorization: Bearer <token>`. Mọi response trong /auth đặt Cache-Control: no-store.

PublicUser chỉ gồm:
`id, name, email, phone, avatar_url, role, status, created_at, last_login_at`.
Không trả password, password_hash, token_version hoặc reset token qua API.

| Method / endpoint | Request | Thành công |
| --- | --- | --- |
| POST /auth/register | JSON: name, email, password; phone tùy chọn | 201: {user: PublicUser, token} |
| POST /auth/login | JSON: email, password | 200: {user: PublicUser, token} |
| GET /auth/me | Bearer token | 200: PublicUser |
| PATCH /auth/me | Bearer; JSON hoặc multipart: name, phone; avatar là file tùy chọn; remove_avatar=true để xóa ảnh | 200: {user: PublicUser, message} |
| POST /auth/change-password | Bearer; JSON: current_password, new_password, confirm_password | 200: {message}; kết thúc các phiên cũ |
| POST /auth/forgot-password | JSON: email | 202: {message}; nội dung giống nhau với email không tồn tại/bị khóa |
| POST /auth/reset-password | JSON: token, new_password, confirm_password | 200: {message}; kết thúc các phiên cũ |

Ví dụ cập nhật hồ sơ không đổi avatar:

```json
{"name":"Nguyễn An","phone":"0912345678"}
```

Ví dụ đổi mật khẩu:

```json
{"current_password":"<mật khẩu hiện tại>","new_password":"<mật khẩu mới>","confirm_password":"<nhập lại mật khẩu mới>"}
```

Dạng lỗi chung: `{code, error}`, trong đó error là thông báo tiếng Việt.
API admin hiện có tiếp tục kiểm tra quyền phía server; customer gọi API admin nhận 403.

| HTTP | code | Trường hợp |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Tên/email/SĐT/mật khẩu sai, xác nhận không khớp, mật khẩu mới giống cũ; PATCH gửi trường ngoài name/phone/remove_avatar |
| 400 | CURRENT_PASSWORD_INVALID | Mật khẩu cũ không đúng |
| 400 | AVATAR_INVALID / AVATAR_UPLOAD_INVALID | Chữ ký file không phải JPG/PNG/WebP, sai trường upload, quá nhiều file |
| 400 | RESET_INVALID | Token sai, hết hạn, đã dùng hoặc bị thu hồi |
| 401 | INVALID_CREDENTIALS | Đăng nhập sai |
| 401 | SESSION_EXPIRED | Thiếu/sai/hết hạn JWT, phiên bản bị thu hồi hoặc token cũ trước nâng cấp |
| 403 | ACCOUNT_BLOCKED | Tài khoản bị khóa |
| 409 | EMAIL_EXISTS | Email đã đăng ký, không phân biệt hoa/thường |
| 413 | AVATAR_UPLOAD_INVALID | File lớn hơn 2 MiB |
| 429 | RATE_LIMITED | Quá số lượt; có Retry-After |
| 503 | EMAIL_UNAVAILABLE | Cấu hình gửi email chưa sẵn sàng |
| 500 | INTERNAL_ERROR | Lỗi máy chủ; không trả stack/query/credentials |

Quy tắc:
- Tên 2–100 ký tự, bỏ khoảng trắng hai đầu.
- SĐT bỏ khoảng trắng, dấu chấm, ngoặc, dấu gạch; cho phép 8–15 chữ số, dấu + ở đầu.
- Mật khẩu tối thiểu 8 ký tự, tối đa 72 byte UTF-8 để tránh bcrypt cắt ngầm; bcrypt cost 12.
- Avatar JPG/PNG/WebP tối đa 2 MiB; kiểm tra MIME/dung lượng/khả năng đọc ảnh ở client và chữ ký byte ở server. Không hỗ trợ SVG/GIF. Tên file do server tạo; không cho nhập URL avatar. Không re-encode ảnh phía server.
- Rate limit trong 15 phút: đăng ký 10/IP, đăng nhập 30/IP, hồ sơ 30/user, đổi mật khẩu 5/user, quên mật khẩu 20/IP và 3/email, reset 20/IP.
- Link reset dạng /reset-password#token=..., không đặt token trong query; frontend lấy vào state rồi xóa fragment khỏi thanh địa chỉ. Tải lại trang reset sau khi fragment đã xóa cần mở lại link từ email.
- Chỉ link mới nhất còn hiệu lực; đổi/reset mật khẩu vô hiệu hóa toàn bộ link reset và JWT trước đó. Khóa hàng database bảo đảm hai request đồng thời không dùng thành công cùng một token.
- Email là chỉ đọc; không có luồng đổi email trong Sprint 1. Không có chức năng cấp quyền admin hoặc giao diện khóa tài khoản trong Sprint 1.

## d) Code đầy đủ và phân chia file

Các liên kết dưới đây mở **toàn bộ mã nguồn**, không phải đoạn minh họa.

| File | Trách nhiệm |
| --- | --- |
| [server/src/accountRoutes.js](../server/src/accountRoutes.js) | Routes, xác thực từ DB, rate limit, transaction và thu hồi session |
| [server/src/accountValidation.js](../server/src/accountValidation.js) | Validate và allowlist PublicUser |
| [server/src/accountMedia.js](../server/src/accountMedia.js) | Upload/xóa avatar, giới hạn file |
| [server/src/accountEmail.js](../server/src/accountEmail.js) | Cấu hình và gửi email reset |
| [server/src/index.js](../server/src/index.js) | Gắn service và media route vào Express |
| [server/src/init.js](../server/src/init.js) | Chạy migration bằng transaction |
| [server/.env.example](../server/.env.example) | Biến môi trường mẫu |
| [apps/store/src/main.jsx](../apps/store/src/main.jsx) | Route, auth provider, cập nhật hồ sơ và xử lý phiên hết hạn |
| [apps/store/src/pages/account/AuthPage.jsx](../apps/store/src/pages/account/AuthPage.jsx) | Đăng nhập/đăng ký |
| [apps/store/src/pages/account/CustomerAccountPage.jsx](../apps/store/src/pages/account/CustomerAccountPage.jsx) | Hồ sơ, avatar, mật khẩu, menu tài khoản |
| [apps/store/src/pages/account/PasswordRecoveryPage.jsx](../apps/store/src/pages/account/PasswordRecoveryPage.jsx) | Quên/đặt lại mật khẩu |
| [apps/store/src/components/account/AccountFields.jsx](../apps/store/src/components/account/AccountFields.jsx) | Field, avatar fallback, thông báo và toast |
| [apps/store/src/utils/accountValidation.js](../apps/store/src/utils/accountValidation.js) | Validate client |
| [apps/store/src/styles/customer-account.css](../apps/store/src/styles/customer-account.css) | Giao diện responsive, focus, skeleton, toast |
| [tests/account-validation.test.js](../tests/account-validation.test.js) | Độ dài byte mật khẩu, phone, serializer |
| [tests/account-browser.test.js](../tests/account-browser.test.js) và [fixture](../tests/account-browser.jsx) | Kiểm thử tương tác form bằng Chrome desktop/mobile |
| [tests/account-integration.ci.js](../tests/account-integration.ci.js) | API thật + PostgreSQL + email capture, được gọi từ api-integration.ci.js |

## e) Checklist kiểm thử thủ công

- [ ] Đăng ký với tên/email/mật khẩu hợp lệ, bỏ SĐT/avatar vẫn thành công.
- [ ] Đăng ký thiếu thông tin hoặc mật khẩu dưới 8 ký tự có lỗi tiếng Việt, không gửi request.
- [ ] Đăng ký email đã có với cách viết HOA/thường khác nhau nhận 409.
- [ ] Đăng nhập sai mật khẩu nhận thông báo rõ ràng; tài khoản blocked không đăng nhập được.
- [ ] Mở /account hiển thị skeleton rồi hồ sơ; mất mạng hiển thị lỗi và Thử lại.
- [ ] Chưa có avatar hiển thị chữ cái đầu; cập nhật tên/SĐT và tải lại trang thấy dữ liệu đã lưu.
- [ ] Email chỉ đọc; thử PATCH email/role/user_id bị từ chối, không thay đổi tài khoản khác.
- [ ] Chọn JPG/PNG/WebP hợp lệ có preview trước Save; cùng một Save lưu thông tin và ảnh.
- [ ] SVG/GIF/file giả ảnh/ảnh vượt 2 MiB bị từ chối, avatar đã lưu không bị mất.
- [ ] Xóa avatar rồi Save trở lại chữ cái đầu; không Save thì ảnh trên server vẫn giữ nguyên.
- [ ] Lưu thành công có toast; dùng Tab/Shift+Tab/Enter thao tác được, focus nhìn thấy rõ.
- [ ] Đổi mật khẩu: sai mật khẩu cũ, xác nhận không khớp, mật khẩu mới giống cũ đều bị từ chối.
- [ ] Hủy hộp xác nhận đổi mật khẩu không gửi request.
- [ ] Đổi mật khẩu thành công yêu cầu đăng nhập lại; tab/thiết bị dùng JWT cũ bị từ chối ở API tiếp theo.
- [ ] Quên mật khẩu với email tồn tại và không tồn tại có cùng nội dung phản hồi.
- [ ] Sau khi cấu hình Resend, kiểm tra email thật đến inbox/spam và link mở đúng frontend.
- [ ] Link reset sai/hết 30 phút/đã dùng nhận lỗi và có đường dẫn yêu cầu link mới.
- [ ] Gửi hai request cùng token chỉ một thành công; password cũ không đăng nhập được.
- [ ] Đổi mật khẩu từ hồ sơ làm link reset đã gửi trước đó hết hiệu lực.
- [ ] Thử quá giới hạn nhận 429; thiếu cấu hình email nhận 503.
- [ ] Kiểm tra Network không response nào chứa password_hash hoặc mật khẩu.
- [ ] Customer gọi API admin nhận 403; token sai/hết hạn nhận 401.
- [ ] Kiểm tra desktop/tablet/mobile: form vừa màn hình, menu chuyển thành hàng ngang, nút đủ lớn.
- [ ] Luồng sản phẩm/giỏ hàng/checkout/admin hiện có vẫn hoạt động sau khi đăng nhập lại.

Kiểm thử tự động: `npm test`, `npm run build`. Kiểm thử API chạy bằng GitHub Actions với PostgreSQL dùng riêng database kd_test; không chạy file integration trên database bán hàng thật. Workflow chạy db:init hai lần để kiểm tra migration có thể chạy lại.
