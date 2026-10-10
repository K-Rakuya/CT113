// js/site-header.js
// -----------------------------------------------------------------------------
// Khối Đăng nhập / Tài khoản / Đăng xuất của header dùng chung. Nạp bằng
// <script type="module" src="/js/site-header.js"></script> ở MỌI trang có header
// công khai, thay cho đoạn script chép tay trong từng file HTML.
//
// Việc hiện khối nào do CSS quyết định từ html[data-auth-hint] (đặt bởi js/firebase-config.js,
// crossfade — xem .site-header__nav [data-auth] trong css/style.css), nên ở đây không bật/tắt
// thuộc tính hidden nữa. Còn lại: nút Đăng xuất + đóng băng khối Tài khoản trong lúc đăng xuất.
// -----------------------------------------------------------------------------

import { auth } from "/js/firebase-config.js";
import { dangXuat } from "/js/auth.js";
import { setBusy } from "/js/motion.js";

const header = document.querySelector(".site-header");
const nutDangXuat = document.getElementById("btn-dang-xuat");

nutDangXuat?.addEventListener("click", async () => {
  if (nutDangXuat.disabled) return;
  // Đang đăng xuất: auth đổi sang "out" nhưng header phải đứng yên (nút quay) tới khi chuyển trang,
  // không được lật sang "Đăng nhập" rồi mới điều hướng. CSS: .site-header[data-auth-lock].
  header?.setAttribute("data-auth-lock", "in");
  setBusy(nutDangXuat, true);
  try {
    await dangXuat();
    window.location.href = "/index.html";
  } catch (err) {
    console.error("Đăng xuất thất bại:", err);
    setBusy(nutDangXuat, false);
    header?.removeAttribute("data-auth-lock");
    document.documentElement.dataset.authHint = auth.currentUser ? "in" : "out"; // đồng bộ lại với trạng thái thật
  }
});
