# Vòng Xơ Cần Giờ — Landing Page (Euréka 2026)

Trang chủ đã được chuyển sang landing page kể chuyện nghiên cứu và trải nghiệm số. Mô hình 3D **không bị xóa**.

## Các đường dẫn
- **Trang chủ:** `index.html` — nội dung nghiên cứu, câu chuyện, hành trình và giá trị dự án.
- **Bản dựng 3D:** `3d.html` — mô hình rừng ngập mặn Three.js đang được phát triển.
- **Terrain Studio:** `studio.html` — chỉnh vị trí địa hình và công trình; nút "Xem 3D" trỏ về `3d.html`.

## Những phần đã có trên trang chủ
1. **Hero:** “Đi để hiểu. Hiểu để gìn giữ.” và giới thiệu dự án.
2. **Câu chuyện:** khoảng cách giữa thông điệp xanh và hành động xanh.
3. **Nền tảng khoa học:** GMS (dịch vụ, quảng cáo, phân phối, giá) → EC/GT → ETB/WTP; GWP là yếu tố điều tiết.
4. **Hành trình dự kiến:** bốn giai đoạn trải nghiệm Cần Giờ, có điều khiển chuyển nội dung.
5. **Giá trị dự án:** diễn giải khoa học bằng không gian, lựa chọn và góc nhìn sinh thái.
6. **Thông tin dự án:** khung nghiên cứu, ứng dụng và bối cảnh Euréka 2026.

**Ghi chú:** nội dung hành trình là **kịch bản trải nghiệm đang thiết kế**, không phải tuyên bố rằng các trạm đã triển khai xong. Minh họa tĩnh trong phần hành trình là khung giữ chỗ cho phiên bản 3D sau này.

## Các tệp của landing
- `index.html`: văn bản và cấu trúc trang.
- `landing.css`: màu sắc, kiểu chữ, layout và responsive.
- `landing.js`: menu mobile, progress đọc, hiệu ứng vào khung và chuyển bốn chặng.

## Thay khung minh họa bằng 3D thật
Trong `index.html`, tìm `<div class="scene-demo" ...>`.
Hiện bên trong là SVG minh họa, phần chữ các chặng và đường dẫn sang `3d.html`. Khi mô hình đạt chất lượng, có thể gắn viewer hoặc ảnh/video preview vào `.scene-stage`, giữ nguyên các đoạn nội dung và nút chọn chặng.

## Lưu ý về khoa học
- Không sử dụng kết quả trò chơi như bằng chứng kiểm định mô hình nghiên cứu.
- Nội dung giới thiệu không công bố con số thống kê hay tuyên bố tác động chưa được kiểm chứng trên trang.
- Nên đối chiếu tên biến, kết quả và thông tin nhóm với bài báo/poster cuối cùng trước khi công bố chính thức.

## Điều chỉnh nội dung nhanh
- Đổi slogan: tìm `Đi để hiểu.` trong `index.html`.
- Đổi thứ tự/copy bốn chặng: sửa nút trong `index.html` và `stageData` trong `landing.js`.
- Đổi bảng màu: sửa các biến `:root` ở đầu `landing.css`.
- Đổi liên kết model: các vị trí `href="./3d.html"`.
