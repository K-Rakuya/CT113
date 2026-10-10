// js/site-header.js
// -----------------------------------------------------------------------------
// Khối Đăng nhập / Tài khoản / Đăng xuất của header dùng chung. Nạp bằng
// <script type="module" src="/js/site-header.js"></script> ở MỌI trang có header
// công khai, thay cho đoạn script chép tay trong từng file HTML.
// -----------------------------------------------------------------------------

import { auth } from "/js/firebase-config.js";
import { dangXuat } from "/js/auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const nutDangXuat = document.getElementById("btn-dang-xuat");

document.querySelectorAll(".site-header__nav a[href]").forEach((a) => {
  const url = new URL(a.href, location.href);
  if (url.origin === location.origin && url.pathname === location.pathname) a.setAttribute("aria-current", "page");
});

document.querySelectorAll(".site-header__nav a[href]").forEach((a) => {
  if (new URL(a.href).pathname === location.pathname) a.setAttribute("aria-current", "page");
});

onAuthStateChanged(auth, (user) => {
  document.querySelectorAll('.site-header [data-auth="in"]').forEach((el) => (el.hidden = !user));
  document.querySelectorAll('.site-header [data-auth="out"]').forEach((el) => (el.hidden = !!user));
});

nutDangXuat?.addEventListener("click", async () => {
  if (nutDangXuat.disabled) return;
  nutDangXuat.disabled = true;
  try {
    await dangXuat();
    window.location.href = "/index.html";
  } catch (err) {
    console.error("Đăng xuất thất bại:", err);
    nutDangXuat.disabled = false;
  }
});
