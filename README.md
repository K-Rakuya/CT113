# 🖥️ Ứng dụng web bán Máy Tính

> **Đồ Án Môn CT113 (Nhập Môn Công Nghệ Phần Mềm)**  
> Dự án xây dựng hệ thống website bán máy tính phục vụ môn học Nhập môn Công nghệ phần mềm (CT113).

---

## 👥 Phân Quyền Hệ Thống

Hệ thống được thiết kế với tính năng phân quyền bảo mật, phục vụ cho **4 nhóm đối tượng** chính bao gồm:

- 🛒 **Khách hàng:** Xem sản phẩm, thêm vào giỏ hàng, đặt hàng và quản lý tài khoản cá nhân.
- 🧑‍💻 **Nhân viên:** Xử lý đơn hàng, hỗ trợ khách hàng và quản lý các tác vụ được giao.
- ⚙️ **Quản trị viên (Admin):** Quản lý kho hàng, sản phẩm, danh mục và tài khoản người dùng.
- 👑 **Chủ cửa hàng:** Xem báo cáo doanh thu, thống kê, quản lý nhân viên và các nghiệp vụ tài chính (tính lương).

---

## 🛠️ Công Nghệ Sử Dụng

### 🎨 Giao diện (Frontend)
- **HTML5 & CSS3:** Xây dựng cấu trúc và định dạng giao diện.
- **Bootstrap:** Sử dụng qua CDN để thiết kế giao diện responsive nhanh chóng.
- **JavaScript (ES6+):** Viết bằng JS thuần, tổ chức code theo chuẩn **ES Module** (`import/export`).

### 🗄️ Dịch vụ Backend (BaaS - Firebase)
- **Firebase Authentication:** Xác thực người dùng qua Email/Password.
- **Cloud Firestore:** Cơ sở dữ liệu NoSQL lưu trữ thông tin sản phẩm, đơn hàng, user...
- **Firebase Storage:** Lưu trữ tệp tin tĩnh (ảnh sản phẩm, avatar).

### 🚀 Triển khai & Serverless (Hosting)
- **Vercel Static Hosting:** Triển khai trang web tĩnh trực tiếp từ GitHub lên Vercel.
- **Vercel Serverless Functions (Node.js):** *(Tùy chọn)* Hỗ trợ xử lý các nghiệp vụ Backend logic phức tạp như tính lương nhân viên.

---

## 🚀 Hướng Dẫn Chạy Dự Án (Local Development)

1. **Clone dự án về máy:**
   ```bash
   git clone https://github.com/K-Rakuya/CT113.git
   cd CT113