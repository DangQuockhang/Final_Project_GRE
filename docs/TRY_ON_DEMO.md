# Chạy thử Live Try-On trên KD Design

Nhánh: `demo/decart-live-tryon`, phát triển từ `feature/customer-membership-sprint-2`.

## Kéo code

```sh
git fetch origin
git switch --track origin/demo/decart-live-tryon
npm ci
```

Nếu nhánh đã có trên máy: `git switch demo/decart-live-tryon` rồi `git pull --ff-only`.

## Cấu hình

Giữ nguyên database, JWT_SECRET và cấu hình hiện có của dự án. Thêm vào `server/.env`:

```dotenv
TRY_ON_ENABLED=true
DECART_API_KEY=your-private-decart-key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Lấy key tại https://platform.decart.ai mục API Keys; kiểm tra credits và quyền dùng Lucy Virtual Try-On. Không đưa key vào `VITE_*`, frontend, Git hoặc chat. File `.env` đã được Git bỏ qua. Chạy API từ workspace để dotenv đọc `server/.env`:

```sh
npm run dev:api
```

Trong cửa sổ khác:

```sh
npm run dev:store
```

Nếu database chưa được cài, làm theo README/BAT_DAU của dự án trước. Không seed lại database đang có dữ liệu chỉ để thử tính năng này.

## Thử

1. Mở storefront trên localhost, đăng nhập tài khoản hiện có.
2. Mở một sản phẩm có ảnh rồi bấm `TRY ON LIVE · AI DEMO`, hoặc truy cập `/try-on` để dùng ảnh mẫu.
3. Chọn ảnh áo mẫu hoặc tải JPG/PNG/WebP dưới 5 MB. Ảnh được chuyển sang Decart khi bắt đầu hoặc thay áo trong phiên.
4. Đồng ý gửi camera/ảnh áo cho Decart, bấm Start và cấp quyền camera.
5. So sánh camera gốc với video AI; đổi áo trong phiên; bấm Stop để tắt camera.

Mỗi phiên có giới hạn 30 giây từ nhà cung cấp; app cũng dừng khi ẩn tab/rời trang. API token tồn tại 60 giây, chỉ dùng cho origin được cho phép và model `lucy-vton-3.6`. Backoff 30 giây theo tài khoản trong bộ nhớ tiến trình giúp hạn chế bấm liên tục, không thay thế giới hạn chi tiêu cấp tài khoản.

Máy chủ yêu cầu đăng nhập, trạng thái tài khoản/session dùng middleware hiện có. Để tắt: đặt `TRY_ON_ENABLED=false` rồi khởi động lại API. Không có thay đổi database.

Chưa có key/credits thì UI báo chưa cấu hình; không tạo kết quả AI giả. Ảnh mẫu chính thức từ Anywear được ghi rõ không phải sản phẩm KD. Có thể dùng ảnh sản phẩm thật từ trang chi tiết. Preview AI không đo size hoặc đảm bảo độ vừa; chưa bảo đảm mọi món khác giữ nguyên từng chi tiết khi đổi áo.

Nguồn SDK: https://platform.decart.ai/models/lucy-vton và https://docs.platform.decart.ai/getting-started/client-tokens.
