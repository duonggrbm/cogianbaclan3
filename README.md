# Xì Dách Online — 4 file GitHub Pages

## Luật đã cài
- Người tạo phòng **chính là Cái**. Không có thêm một “người chơi của Cái”.
- Cái chỉ có **một bộ bài của Cái**.
- Mỗi người chơi có bộ bài riêng của mình.
- Chia 2 lá đầu cho Cái và từng người chơi, **không lật/ẩn riêng một lá nào**.
- Người chơi chỉ nhận dữ liệu bài của chính mình; Cái không nhận bài người chơi và người chơi không nhận bài Cái.
- Cái và người chơi đều có **Rút / Dừng**.
- **Cái < 15 điểm bắt buộc Rút; Cái >= 15 được Rút hoặc Dừng.**
- Trên 21 là Quắc; nhận diện Xì Dách, Xì Bàng, Ngũ Linh.
- Có mã phòng và link mời bạn bè.

## Cách chơi
1. Cái mở website, nhập tên và bấm **Tạo phòng — làm Cái**.
2. Cái bấm **Copy** ở ô Link mời bạn bè và gửi link cho bạn bè.
3. Bạn bè mở link, nhập tên rồi bấm **Vào phòng**.
4. Cái bấm **Bắt đầu ván**.
5. Mỗi người dùng nút **Rút** hoặc **Dừng**. Cái phải đạt tối thiểu 15 mới được Dừng.
6. Khi tất cả đã xong, hệ thống tự so bài và hiện kết quả.

## Vì sao bản này khác bản cũ?
Bản cũ coi Cái vừa là Cái vừa có một “player hand”, làm bài của Cái bị trùng và còn khiến máy Cái có thể nhận dữ liệu bài của người chơi. Bản này tách hẳn: **Cái = dealer duy nhất**, không phải một player thứ hai.

Host chỉ quản lý bộ bài và phát từng lá cho đúng người. Khi người chơi Dừng, máy người chơi gửi **điểm + loại bài**, không gửi danh sách lá bài, nên Cái không nhìn thấy bài của họ.

## Nếu bạn bè không vào được
- Cái phải mở website và giữ nguyên tab đó.
- Link phải được copy từ ô **Link mời bạn bè** sau khi tạo phòng.
- Cả hai nên dùng URL GitHub Pages `https://...` thay vì mở file `file:///...` trên máy.
- Nếu mạng của một trong hai bên chặn WebRTC/NAT, PeerJS có thể không tạo được kết nối trực tiếp. Khi đó hãy thử mạng 4G/5G hoặc Wi‑Fi khác.
- Nếu vẫn không được, tải lại trang của Cái, tạo phòng mới và gửi **link mới**.

## GitHub Pages
Đặt đúng 4 file ở thư mục gốc:
- `index.html`
- `style.css`
- `app.js`
- `README.md`

Vào **Settings → Pages → Deploy from a branch → main → /(root)**.

> Đây là game giải trí, không dùng tiền thật.
