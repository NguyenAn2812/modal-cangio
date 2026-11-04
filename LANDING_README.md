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

## Landing Page V2 — áp dụng skill `landing-page-design`

Nguồn kỹ năng: https://github.com/qu-skills/superpowers/tree/main/guides/design/landing-page-design (đường dẫn `qu-skills/skills` cũ được chuyển sang kho này).

Thiết kế có **một hành động chính**: mở `3d.html` để khám phá bản dựng rừng ngập mặn Cần Giờ. Trên trang chủ, nút này được ưu tiên ở hero, hành trình, cuối trang và thanh CTA dành cho điện thoại.

### Những thay đổi chính
- **Hero rõ mục tiêu trong 5 giây**: tiêu đề “Khám phá rừng ngập mặn. Hiểu để gìn giữ.”, mô tả về mô hình 3D và nền tảng nghiên cứu Euréka; không dùng lời hứa thương mại chung chung.
- **Minh họa tạm có ngữ cảnh**: rễ đước, đất bùn, lạch nước; có thẻ chú thích và một tuyến khám phá ba bước.
- **Dẫn dắt từ trải nghiệm đến bằng chứng**: Hero → thông tin dự án → câu hỏi thực tế → hành trình → cơ chế nghiên cứu → giá trị → giới thiệu dự án → FAQ → CTA.
- **Thông tin tin cậy có kiểm soát**: chỉ dùng các thuộc tính được dự án xác định; không tự thêm logo đối tác, lượt khách, testimonial hay số liệu hiệu quả chưa kiểm chứng.
- **Mobile-first**: CTA 3D toàn chiều ngang ở hero và thanh CTA bám đáy chỉ khi đã cuộn qua hero; tránh che nút CTA cuối trang.
- **FAQ**: phân biệt bản thử nghiệm với trò chơi hoàn chỉnh, làm rõ vai trò của nghiên cứu và không ngụ ý đo lường nhân quả bằng game.

### Các file cần sửa khi thiết kế tiếp
- `index.html`: nội dung, thứ tự các phần, nút CTA, FAQ.
- `landing.css`: hệ thống kiểu dáng ban đầu.
- `landing-v2.css`: lớp thiết kế giao diện v2, bảng màu rừng Sác và CSS responsive (được tải sau `landing.css`).
- `landing.js`: chuyển chặng trải nghiệm, menu mobile, hiệu ứng cuộn và thanh CTA di động.

### Giới hạn kiểm thử
Đã kiểm tra cú pháp JavaScript và tính đúng của anchor/link nội bộ bằng mã nguồn; workflow GitHub Pages hoàn thành thành công. Bố cục WebGL và giao diện thực tế vẫn nên được xem trực tiếp trên máy tính và điện thoại trước khi chốt.
