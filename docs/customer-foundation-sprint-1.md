# Sprint 1 — Nền tảng tài khoản khách hàng

## 1. Phạm vi và giả định

Nhánh: `feature/customer-foundation-sprint-1`, dựa trên `feature/sprint-2`.

- Một địa chỉ mặc định cho mỗi tài khoản; người nhận và số điện thoại giao hàng có thể khác hồ sơ.
- Checkout lấy tên/SĐT hồ sơ khi chưa có địa chỉ. Nếu có, điền địa chỉ mặc định; không ghi đè trường khách đã nhập khi API trả lời chậm.
- Sửa địa chỉ trong checkout chỉ áp dụng cho đơn đó. Sửa/xóa địa chỉ mặc định không sửa các đơn cũ.
- Lịch sử đơn có 10 đơn/trang, lọc trạng thái, lỗi/thử lại/rỗng riêng biệt. Lỗi hướng dẫn chuyển khoản không làm mất danh sách đơn.
- Đăng xuất thu hồi đúng token hiện tại trên server. Đổi/reset mật khẩu vẫn kết thúc toàn bộ phiên cũ.
- JWT_SECRET phải có ít nhất 32 ký tự không tính khoảng trắng hai đầu. API dừng khởi động nếu thiếu/không đạt; không in giá trị khóa.
- Tái sử dụng màu xanh KD, component tài khoản, OrderCard, Lucide và font hiện có. Input giao hàng/hồ sơ 16px; tab tài khoản 2 cột trên mobile.
- Sprint này chưa thêm hạng thành viên, Admin Users hoặc voucher; chưa sửa quy trình COD/hoàn trả thuộc Sprint 2.
- Không chỉnh sửa .env, khóa bí mật, ảnh hoặc dữ liệu đơn hàng cũ.

## 2. Database và migration

`server/sql/003_account_foundation.sql`:
- `account_default_addresses`: user_id là primary key/FK, recipient, phone, address, updated_at.
- `auth_revoked_tokens`: hash SHA-256 của token, user_id, expires_at, revoked_at; không lưu token gốc.
- Index `orders_user_created_idx` cho lịch sử theo khách/ngày, index hạn token.
- `schema_migrations` theo dõi phiên bản 003; chạy lặp không tạo lại dữ liệu.
- Chạy trong transaction; advisory lock ngăn apply/rollback đồng thời.

Không lấy địa chỉ từ đơn cũ để tự ghi thành mặc định: địa chỉ đó có thể là quà tặng hoặc không còn dùng.

### Chạy bản mới

Tại thư mục gốc repository, dừng API đang chạy trước khi cập nhật:

```bash
git fetch origin
git switch feature/customer-foundation-sprint-1
git pull --ff-only origin feature/customer-foundation-sprint-1
npm run db:init
```

Sau đó mở hai terminal:

```bash
npm run dev:api
```

```bash
npm run dev:store
```

Nếu API báo JWT_SECRET không hợp lệ, chủ dự án cần cấu hình khóa phù hợp ở môi trường của mình. Thay khóa sẽ yêu cầu đăng nhập lại. Không gửi khóa qua chat và không commit vào git.

### Rollback có giữ dữ liệu

Dừng API/frontend mới và tạo bản sao database trước khi rollback:

```bash
npm run db:rollback:accounts
git switch feature/sprint-2
```

Sau đó khởi động bản API/frontend trước sprint này.

Rollback 003:
- Chuyển hai bảng mới sang tên `rollback_003_account_default_addresses` và `rollback_003_auth_revoked_tokens`, không xóa địa chỉ.
- Tăng token_version cho mọi tài khoản để token đã thu hồi không sống lại khi chạy API cũ.
- Gỡ index đơn hàng mới và dấu phiên bản 003; giữ các schema 001/002.
- Khi áp dụng lại bằng `npm run db:init` ở nhánh sprint này, khôi phục các bảng đã lưu.
- Nếu cả bảng hiện hành và bảng lưu đều tồn tại, migration dừng để tránh gộp/xóa nhầm.
- Không chạy rollback trong lúc API mới đang phục vụ request.

## 3. API

Mọi endpoint dưới đây đều có tiền tố `/api` và yêu cầu Bearer token.

| Method / endpoint | Request | Response thành công |
| --- | --- | --- |
| GET /auth/address | Không có body | 200: {address: null hoặc {recipient,phone,address,updated_at}} |
| PUT /auth/address | {recipient,phone,address} | 200: {address,message} |
| DELETE /auth/address | Không có body | 200: {address:null,message} |
| POST /auth/logout | Không có body | 200: {message}; token hiện tại bị thu hồi |
| GET /account/orders | page=1, status=all hoặc trạng thái hợp lệ | 200: {items:[đơn và items],pagination:{page,page_size:10,total,pages}} |
| POST /orders (cải thiện) | recipient,phone,address,items,payment_method như trước | 201: đơn đã lưu; server chuẩn hóa và kiểm tra giao hàng |

- Endpoint lịch sử cũ `GET /orders/mine` vẫn giữ response array để tương thích.
- API luôn dùng user_id từ phiên đã xác thực; không nhận chủ sở hữu từ body/query.
- PUT địa chỉ chỉ cho phép ba trường đã liệt kê. SĐT 8–15 chữ số, có thể bắt đầu bằng +; tên 2–120 ký tự; địa chỉ 10–750 ký tự.
- Đơn được sắp xếp ngày giảm dần, rồi id giảm dần. Trang vượt tổng số được đưa về trang cuối.
- Không có dữ liệu: items=[], total=0, pages=0, page=1.

| HTTP | Trường hợp |
| --- | --- |
| 400 VALIDATION_ERROR | Trường giao hàng sai, body có trường không cho phép hoặc bộ lọc lịch sử không hợp lệ |
| 401 SESSION_EXPIRED | Thiếu/sai/hết hạn token, phiên bị thu hồi |
| 403 ACCOUNT_BLOCKED | Tài khoản bị khóa |
| 429 RATE_LIMITED | Quá số lần cập nhật/xóa địa chỉ |
| 409 | Xung đột tồn kho hoặc phương thức thanh toán chưa được cửa hàng bật |
| 500 | Lỗi máy chủ, không trả query/stack/mật khẩu |

Lỗi giao hàng trả `{code:"VALIDATION_ERROR",error,errors:{recipient?,phone?,address?}}` để form hiển thị lỗi tại từng ô.

## 4. Code giao diện và logic

Code đầy đủ nằm trong các file của nhánh, không phải bản demo riêng:

| File | Vai trò |
| --- | --- |
| apps/store/src/pages/account/DefaultAddress.jsx | Xem/lưu/xóa địa chỉ, validate, lỗi/thử lại và toast |
| apps/store/src/components/account/DeliveryFields.jsx | Form dùng chung cho địa chỉ và checkout |
| apps/store/src/hooks/useCheckoutAddress.js | Lấy mặc định, dự phòng bằng hồ sơ, bảo vệ trường đang nhập |
| apps/store/src/components/checkout/SavedAddressNotice.jsx | Thông báo và chọn lại địa chỉ đã lưu |
| apps/store/src/pages/account/CustomerOrders.jsx | Lịch sử có lọc/phân trang; tải hướng dẫn thanh toán độc lập |
| apps/store/src/pages/account/CustomerAccountPage.jsx | Thêm tab Địa chỉ |
| apps/store/src/components/orders/OrderCard.jsx | Nội dung tiếng Việt cho khách, lazy-load ảnh; giữ nội dung admin |
| apps/store/src/main.jsx | Gắn checkout/history, thu hồi phiên, truyền lỗi theo trường |
| apps/store/src/styles/customer-account.css | Responsive và chuẩn hóa vùng bấm/input |
| packages/catalog/delivery.js | Validation giao hàng dùng chung client/server |
| packages/catalog/index.js | Export validator |
| server/src/accountRoutes.js | Địa chỉ và thu hồi phiên |
| server/src/customerOrderRoutes.js | Lịch sử chỉ dành cho chủ đơn, phân trang tại DB |
| server/src/orderQueries.js | Tái sử dụng truy vấn chi tiết đơn |
| server/src/authConfig.js | Kiểm tra cấu hình JWT trước khi khởi động |
| server/src/index.js | Gắn API mới, validate checkout |
| server/src/accountMigration.js | Chạy/rollback migration 003 có ghi nhận phiên bản |
| server/src/rollbackAccountFoundation.js | Lệnh rollback giữ dữ liệu |
| server/src/init.js | Gắn migration mới vào db:init |
| server/sql/003_account_foundation.sql | Migration thuận |
| server/sql/003_account_foundation.down.sql | Migration ngược |
| package.json; server/package.json | Thêm script rollback |

## 5. Kiểm thử thủ công

- [ ] Tài khoản chưa có địa chỉ: form lấy tên/SĐT hồ sơ, có hướng dẫn thêm địa chỉ.
- [ ] Nhập tên rỗng/quá dài, SĐT chữ, địa chỉ quá ngắn: lỗi tiếng Việt tại đúng ô.
- [ ] Lưu thành công rồi tải lại trang: dữ liệu còn nguyên.
- [ ] Lỗi mạng khi lưu: giữ toàn bộ nội dung đang nhập, cho lưu lại.
- [ ] Xóa: hủy xác nhận giữ dữ liệu; đồng ý thì xóa địa chỉ mặc định.
- [ ] Checkout tự điền tên/SĐT/địa chỉ; chỉnh riêng cho đơn không thay đổi địa chỉ mặc định.
- [ ] Làm chậm mạng: nhập trước khi địa chỉ tải xong; nội dung nhập không bị ghi đè.
- [ ] Địa chỉ không tải được: vẫn nhập tay được, có nút thử lại.
- [ ] Đơn đã đặt vẫn giữ địa chỉ cũ sau khi sửa/xóa địa chỉ mặc định.
- [ ] Lịch sử chỉ hiển thị đơn của tài khoản hiện tại; chuyển trang/lọc giữ trong URL.
- [ ] Lỗi API đơn: có nút thử tải, không hiện nhầm “chưa có đơn”.
- [ ] Lỗi cấu hình chuyển khoản: danh sách đơn vẫn hiển thị.
- [ ] Hai phiên đăng nhập: đăng xuất phiên A khiến token A bị từ chối; phiên B còn hoạt động.
- [ ] Nếu mất mạng lúc đăng xuất: trình duyệt vẫn xóa phiên, hiện thông báo chưa xác nhận thu hồi với server.
- [ ] Tài khoản bị khóa không gọi được API địa chỉ hoặc đơn.
- [ ] Đổi/reset mật khẩu vẫn thu hồi toàn bộ token cũ; không API nào trả password_hash.
- [ ] Kiểm tra 360/390/768/1024/1440px: không tràn ngang, input 16px, nút chính tối thiểu 44px.
- [ ] Kiểm tra Tab/Shift+Tab, đọc nhãn/lỗi; thử bàn phím thật iOS/Android.
- [ ] Chạy migration hai lần; trên DB thử nghiệm chạy rollback và áp dụng lại, kiểm tra địa chỉ không mất.
- [ ] Không chạy seed trên dữ liệu bán hàng để thử sprint.

### Kiểm thử tự động

- `tests/account-foundation.test.js`: validate giao hàng, cấu hình JWT và bộ lọc.
- `tests/account-foundation.ci.js`: PostgreSQL/API thật; quyền sở hữu, phân trang, địa chỉ đơn cũ, thu hồi từng phiên, khởi động với khóa sai, rollback/re-apply.
- `tests/account-foundation-browser.jsx` và `.test.js`: năm chiều rộng, tương tác địa chỉ/history, prefill và phản hồi mạng chậm.
- `tests/api-integration.ci.js`: gắn bộ kiểm thử mới vào CI.
- Giữ toàn bộ bộ kiểm thử tài khoản, admin và sản phẩm có sẵn.

Email reset được kiểm thử bằng dịch vụ nhận email giả lập trong CI, gồm hết hạn/dùng lại/link lỗi/gửi thất bại. Chưa xác nhận khả năng gửi email thật của domain: cần cấu hình hợp lệ của chủ dự án và một lần kiểm tra nhận email thực tế. Không thay đổi .env hoặc gửi email thật trong quá trình triển khai này.

Lighthouse và bàn phím trên thiết bị thật chưa được đo trong sprint này; không khẳng định đạt 90 điểm.

## 6. File thêm/sửa

Danh sách ở mục 4, hai file package.json, năm file kiểm thử được liệt kê ở mục 5 và tài liệu này là toàn bộ phạm vi. Không thay đổi file cấu hình bí mật hoặc dữ liệu seed.
