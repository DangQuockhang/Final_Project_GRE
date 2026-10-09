# BẮT ĐẦU DỰ ÁN KD DESGIN — SPRINT 1

## Bạn nhận được gì?

**Hai trang web React/Vite + một backend Express/PostgreSQL dùng chung:**

- **KD Store** (`http://localhost:5173`): Trang chủ, Shop, Brands, Product Details, Cart, Login/Register, Checkout COD demo, đơn hàng, Admin CRUD.
- **KD Fitting Studio** (`http://localhost:5174`): mannequin 3D xoay 360°, đổi vóc dáng, chiều cao, vòng ngực, size áo, màu áo minh họa. Mở từ trang sản phẩm Store.
- **Backend API** (`http://localhost:4000/api`): đăng ký/đăng nhập, bảo vệ API theo User/Admin, CRUD thương hiệu/sản phẩm/biến thể, giỏ hàng local, tạo và quản lý đơn hàng, kiểm tra tồn kho trong giao dịch PostgreSQL.

**Lưu ý:** Đây là code của *Sprint 1*, chưa phải hệ thống bán hàng production. Mô hình 3D mới là hình học mẫu, chưa tích hợp AI/ML hay mô phỏng vật lý chất liệu vải. Sản phẩm/brand là dữ liệu demo giả lập, không phải đối tác phân phối chính thức.

## Chuẩn bị

Cài **Node.js 22 LTS**, **Docker Desktop**, **VS Code** và **Git**. Docker Desktop phải được mở và khởi động xong.

## Chạy trên Windows PowerShell

Giải nén file zip. Mở thư mục `KD-Desgin-Starter` trong VS Code, rồi mở Terminal (**Ctrl + `**).

**Bước 1 — Cài dependencies (cần mạng):**

```powershell
npm install
```

**Bước 2 — Tạo các file cấu hình:**

```powershell
Copy-Item server/.env.example server/.env
Copy-Item apps/store/.env.example apps/store/.env
Copy-Item apps/studio/.env.example apps/studio/.env
```

**Bước 3 — Sửa `server/.env`:**

- Đặt `JWT_SECRET` là chuỗi ngẫu nhiên ít nhất 32 ký tự.
- Đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` là thông tin tài khoản admin riêng (password từ 12 ký tự).
- Không commit file `.env` lên GitHub.

**Bước 4 — Bật PostgreSQL:**

```powershell
docker compose up -d
```

Dự án sử dụng port **5433** trên máy để tránh xung đột với PostgreSQL mặc định port 5432.

**Bước 5 — Tạo bảng và dữ liệu demo:**

```powershell
npm run db:init
npm run db:seed
```

**Bước 6 — Mở 3 Terminal riêng và chạy các lệnh:**

```powershell
# Terminal 1:
npm run dev:api

# Terminal 2:
npm run dev:store

# Terminal 3:
npm run dev:studio
```

**Bước 7 — Mở website:**

- Store: http://localhost:5173
- Fitting Studio: http://localhost:5174
- API Health: http://localhost:4000/api/health
- Login Admin tại Store bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` đã cấu hình.

Nếu bạn chỉ muốn xem giao diện, chạy `npm run dev:store` và `npm run dev:studio` sau khi cài dependencies. Website sẽ hiện dữ liệu demo, nhưng không đặt được đơn và không đăng nhập được khi backend chưa chạy.

## Test và build

```powershell
npm test
npm run build
```

## Upload lên GitHub

Sau khi thử chạy xong, tạo một **private repository** trống tên `KD-Desgin` trên GitHub. Tại thư mục dự án chạy:

```powershell
git init -b main
git add .
git commit -m "feat: initial KD Store and 3D Studio"
git remote add origin https://github.com/USERNAME/KD-Desgin.git
git push -u origin main
```

Thay `USERNAME` bằng username GitHub thật. `.gitignore` đã loại bỏ `.env`, `node_modules`, `dist`. Không dùng GitHub để sao lưu database; dùng PostgreSQL backups riêng.

## Tiếp theo làm gì?

1. Kiểm tra giao diện trên điện thoại / desktop, thiết kế logo và bảng màu thật.
2. Thiết kế database brand/SKU chuẩn, thêm danh mục và upload ảnh được phép sử dụng.
3. Thay mannequin hình học bằng asset mannequin GLB có morph target; tạo bộ áo GLB riêng cho size phù hợp.
4. Tích hợp AI gợi ý size **sau khi** có dữ liệu số đo sản phẩm chính xác và dữ liệu kiểm chứng độ vừa.
5. Chỉ phát hành bán thật sau khi hoàn thiện bảo mật, quyền thương hiệu, vận hành và pháp lý.

Xem `README.md` và `docs/roadmap.md` để có tài liệu kỹ thuật chi tiết.
