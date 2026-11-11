# Sprint 2 — Hạng thành viên và xử lý đơn

Nhánh: `feature/customer-membership-sprint-2`, kế thừa Sprint 1 ở `feature/customer-foundation-sprint-1`. Đây là code thật, chưa gộp vào `feature/sprint-2`.

## 1. Phạm vi và giả định

- 5 hạng theo yêu cầu: Đồng 0đ, Bạc 2.000.000đ, Vàng 5.000.000đ, Kim cương 15.000.000đ, Platinum 30.000.000đ.
- Mốc, tên và quyền lợi lưu ở bảng `membership_tiers`. Không ghi cứng mốc trong logic tính hạng.
- Chi tiêu tích lũy trọn đời = tổng đơn **DELIVERED + PAID** của đúng tài khoản. Đơn hủy/hoàn trả không tính.
- Đơn COD cũ đã giao nhưng chưa xác nhận thu tiền vẫn là UNPAID; không tự đoán khách đã trả tiền. Admin phải đối chiếu và xác nhận.
- Hạng được tính từ đơn tại mỗi lần gọi API, không dùng một cột tổng chi tiêu có thể lệch. Thanh toán/hoàn trả có hiệu lực ở lần tải tiếp theo; khách bấm Cập nhật hoặc mở lại tab Thành viên.
- Hoàn trả **toàn bộ đơn**, chỉ sau khi đã giao. Chưa làm hoàn một phần, yêu cầu đổi trả tự gửi của khách hoặc hoàn tiền qua cổng thanh toán.
- Nhập lại kho là lựa chọn rõ ràng khi nhận hàng hoàn; mặc định tắt. Hàng hỏng không nhập kho.
- Hoàn tiền là bước ghi nhận **đã hoàn tiền bên ngoài hệ thống**. API không chuyển tiền.
- Quyền lợi theo hạng chưa được shop quyết định nên để trống; UI thông báo rõ, không tự hứa giảm giá/voucher. Quản lý voucher thuộc sprint sau.
- Giữ nền trắng, màu xanh và font KD hiện có. Dùng serif hệ thống cho số tiền/tên hạng; không thêm font tải ngoài. Năm chất liệu màu chỉ áp dụng cho thẻ thành viên.

## 2. Database, migration và rollback

Migration 004 thêm:
- `membership_tiers(code,name,rank,min_spend,benefits)`.
- `order_action_audit(order_id,actor_id,action,reason,reference,restocked,before_state,after_state,created_at)`.
- Trạng thái đơn RETURNED; thanh toán REFUNDED.
- Index đơn DELIVERED + PAID theo user, index lịch sử xử lý.
- Phiên bản migration ghi trong schema_migrations; khóa migration chung, chạy trong transaction. Chạy lặp không ghi đè cấu hình hoặc dữ liệu.
- Không đổi giá trị thanh toán, địa chỉ, tổng tiền hay lịch sử đơn cũ. API không trả password_hash.

**Cập nhật:** dừng API trước, sao lưu database hiện tại; chạy tại thư mục gốc:
```bash
git fetch origin
git switch feature/customer-membership-sprint-2
git pull --ff-only origin feature/customer-membership-sprint-2
npm run db:init
```
Sau đó mở hai terminal: `npm run dev:api` và `npm run dev:store`.
Không chạy seed trên dữ liệu đang dùng. Không sửa .env hay khóa bí mật.

**Rollback:** dừng API mới, chạy `npm run db:rollback:membership`, rồi chuyển về `feature/customer-foundation-sprint-1` và khởi động.
- Nếu chưa có đơn RETURNED/REFUNDED: chuyển hai bảng mới sang `rollback_004_*`, giữ cấu hình và audit; khôi phục CHECK cũ, bỏ index mới. Apply lại khôi phục bảng lưu.
- Nếu đã có RETURNED/REFUNDED: rollback **dừng và không thay đổi dữ liệu**. Không đổi ngược trạng thái tiền chỉ để chạy code cũ. Giữ bản này hoặc thực hiện khôi phục backup đã đối chiếu nghiệp vụ; backup cũ có thể không chứa giao dịch phát sinh sau đó.
- Đây là giới hạn có chủ đích để tránh làm mất lịch sử hoàn trả/hoàn tiền. Không chạy rollback khi API còn phục vụ.
- Nếu cần rollback Sprint 1, xử lý Sprint 2 trước.

**Điều chỉnh hạng:** sửa bảng membership_tiers trong transaction qua công cụ quản trị DB. Giữ 5 code/rank hiện có, hạng Đồng bắt đầu 0 và mốc tăng dần. `benefits` là JSON array các chuỗi (tối đa 300 ký tự/chuỗi), chỉ nhập quyền lợi shop thực sự áp dụng. Ví dụ:
```sql
BEGIN;
UPDATE membership_tiers SET min_spend=2500000 WHERE code='silver';
COMMIT;
```
API đọc cấu hình ở mỗi request; cấu hình sai trả 503 thay vì gán nhầm hạng. Giao diện chỉnh cấu hình admin chưa thuộc sprint này.

## 3. API

Tiền tố /api. Tất cả endpoint yêu cầu Bearer token; /admin còn kiểm tra admin ở server.

| Method / endpoint | Request | Response |
| --- | --- | --- |
| GET /account/membership | Không nhận user_id làm chủ dữ liệu | 200: name, member_number, member_since, lifetime_spend, completed_orders, current, next, remaining, progress, tiers |
| PATCH /admin/orders/:id/payment | {status:"PAID",reason} | 200: đơn đã cập nhật |
| PATCH /admin/orders/:id/status | {status:"CONFIRMED" hoặc "SHIPPED"/"DELIVERED"/"CANCELLED"} | 200: đơn; có audit |
| POST /admin/orders/:id/return | {reason,confirmed:true,restock:boolean} | 200: đơn RETURNED; PAID chuyển REFUND_PENDING |
| POST /admin/orders/:id/refund | {reason,confirmed:true,reference} | 200: đơn REFUNDED |
| GET /admin/orders/:id/audit | Không body | 200: {items:[id,action,reason,reference,restocked,before_state,after_state,actor_id,actor_name,created_at]} |

- reason của COD/hoàn trả/hoàn tiền: chuỗi 10–500 ký tự. Chuyển khoản cũ vẫn tương thích request {status:"PAID"}; UI mới luôn nhập ghi chú.
- reference hoàn tiền: 3–120 ký tự; chỉ là mã tham chiếu ghi nhận, không phải kết nối ngân hàng.
- Chuyển khoản đã hủy/hoàn trả không thể đánh dấu PAID.
- COD chỉ xác nhận thu tiền khi DELIVERED + UNPAID. Chuyển giao hàng không tự xác nhận thanh toán.
- Đơn bị khóa FOR UPDATE trong transaction. Gửi lặp/concurrent: một thao tác thành công, lần còn lại 409; không nhập kho/ghi audit hai lần.
- Nhập kho khóa SKU theo thứ tự ID để giảm deadlock.
- Customer orders, Admin Orders và báo cáo hỗ trợ RETURNED/REFUNDED. Doanh thu và bán chạy loại đơn hoàn trả.

| HTTP | Ý nghĩa |
| --- | --- |
| 400 VALIDATION_ERROR | ID/body/lý do/xác nhận/mã tham chiếu không hợp lệ |
| 401 | Chưa đăng nhập, phiên hết hạn hoặc bị thu hồi |
| 403 | Không có quyền admin hoặc tài khoản bị khóa |
| 404 | Không tìm thấy đơn |
| 409 ORDER_CONFLICT | Trạng thái không phù hợp, đã xử lý hoặc thao tác lặp |
| 503 MEMBERSHIP_UNAVAILABLE | Cấu hình mốc hạng hoặc tổng chi tiêu không hợp lệ |
| 500 | Lỗi nội bộ; không trả stack/query/khóa bí mật |

## 4. Code giao diện và logic

Code đầy đủ ở từng file trong nhánh:
- `server/src/membership.js`: tính hạng và API riêng tài khoản, không cache tổng tiền.
- `server/src/orderLifecycle.js`: kiểm tra chuyển trạng thái, transaction kho/tiền/audit.
- `apps/store/src/pages/account/Membership.jsx`: thẻ, tiến độ, mốc, quyền lợi, rỗng/lỗi/thử lại.
- `apps/store/src/components/orders/OrderActionDialog.jsx`: form kiểm tra và xác nhận, giữ nội dung khi lỗi, khóa bấm lặp, focus trap và trả focus.
- `apps/store/src/pages/admin/OrdersPanel.jsx`: mở thao tác theo đơn.
- `apps/store/src/components/orders/OrderCard.jsx`: hiển thị nút đúng điều kiện và trạng thái cho khách/admin.
- `apps/store/src/styles/membership.css`, `order-actions.css`: 5 chất liệu thẻ, responsive, vùng bấm 44px, input 16px, reduced motion.
- Bản chi tiết các thay đổi xem Files changed trong PR; không có code demo thay thế nghiệp vụ.

## 5. Checklist kiểm thử

Tự động:
- Unit: các mốc đúng ngưỡng, cấu hình thay đổi/sai, COD chưa thu tiền, hoàn trả/hoàn tiền, thao tác lặp.
- PostgreSQL/API: auth/ownership, xác nhận tiền đồng thời, kho hoàn đúng một lần, không nhập lại hàng hỏng, audit, chi tiêu trọn đời, đổi cấu hình, báo cáo loại đơn hoàn, rollback/re-apply và chặn rollback mất lịch sử.
- Browser: 360/390/768/1024/1440px, vào tab Thành viên, lỗi/thử lại, năm chất liệu, hết tiến độ, form admin validate/lỗi mạng/giữ draft/confirm, lịch sử, focus và không tràn ngang.
- Giữ bộ kiểm thử cũ, build cả Store/Studio, smoke-test trang.

Thủ công:
- [ ] Khách mới thấy Đồng, 0đ và hướng dẫn mua đơn đầu tiên.
- [ ] Tạo COD, giao xong vẫn chưa cộng hạng; xác nhận thu tiền thì cộng đúng tổng.
- [ ] Đơn chạm đúng 2/5/15/30 triệu chuyển đúng hạng.
- [ ] Admin nhận đủ hàng hoàn: hạng tính lại; chỉ nhập kho nếu tích chọn.
- [ ] PAID hoàn trả thành REFUND_PENDING; chỉ sau xác nhận hoàn tiền mới REFUNDED.
- [ ] Thử hai tab admin thao tác cùng đơn: không cộng kho/tiền hai lần.
- [ ] Xem lịch sử: đúng người/lý do/thời điểm, không có password hash.
- [ ] Đơn cũ còn nguyên; không tự đánh dấu COD cũ PAID.
- [ ] Bàn phím: Tab giữ trong hộp thoại, Escape/Đóng trả focus; màn hình nhỏ không tràn.
- [ ] Kiểm tra bàn phím thật Android/iOS, zoom 200% và trình đọc màn hình.
- [ ] Chỉ thử rollback trên bản sao DB; xác nhận hành vi chặn khi có hoàn trả.

Chưa đo Lighthouse hoặc kiểm tra trên điện thoại vật lý. Không tích hợp tự động hoàn tiền.

## 6. Danh sách file thêm / sửa

- `.github/workflows/ci.yml`
- `apps/store/src/components/orders/OrderActionDialog.jsx`
- `apps/store/src/components/orders/OrderCard.jsx`
- `apps/store/src/pages/account/CustomerAccountPage.jsx`
- `apps/store/src/pages/account/CustomerOrders.jsx`
- `apps/store/src/pages/account/Membership.jsx`
- `apps/store/src/pages/admin/AdminReportPage.jsx`
- `apps/store/src/pages/admin/DashboardOverview.jsx`
- `apps/store/src/pages/admin/OrdersPanel.jsx`
- `apps/store/src/styles/membership.css`
- `apps/store/src/styles/order-actions.css`
- `apps/store/src/utils/adminValidation.js`
- `docs/customer-membership-sprint-2.md`
- `package.json`
- `server/package.json`
- `server/sql/001_schema.sql`
- `server/sql/004_membership_orders.down.sql`
- `server/sql/004_membership_orders.sql`
- `server/src/adminReports.js`
- `server/src/customerOrderRoutes.js`
- `server/src/dashboard.js`
- `server/src/index.js`
- `server/src/init.js`
- `server/src/membership.js`
- `server/src/membershipMigration.js`
- `server/src/orderLifecycle.js`
- `server/src/rollbackMembership.js`
- `tests/api-integration.ci.js`
- `tests/membership-browser.jsx`
- `tests/membership-browser.test.js`
- `tests/membership-orders.ci.js`
- `tests/membership-orders.test.js`
- `apps/store/src/styles/order-management.css`
