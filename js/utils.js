// js/utils.js
// -----------------------------------------------------------------------------
// Hàm tiện ích dùng chung: định dạng, thông báo, ghi nhật ký hệ thống.
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/**
 * Định dạng số tiền theo VND.
 * @param {number} soTien
 * @returns {string} vd. 1500000 → "1.500.000 ₫"
 */
export function formatCurrency(soTien) {
  const so = Number(soTien);
  const hopLe = Number.isFinite(so) ? so : 0;
  return hopLe.toLocaleString("vi-VN") + " ₫";
}

/**
 * Định dạng ngày kiểu dd/mm/yyyy (locale vi-VN).
 * @param {*} timestamp Firestore Timestamp | Date | number(ms) | chuỗi ngày
 * @returns {string} chuỗi đã định dạng, "" nếu giá trị rỗng/null,
 *   "Invalid Date" nếu giá trị sai định dạng (không ném lỗi).
 */
export function formatDate(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === "") return "";

  const d =
    typeof timestamp?.toDate === "function" ? timestamp.toDate() : new Date(timestamp);

  if (isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleDateString("vi-VN");
}

/**
 * Hiện thông báo nổi 3 giây rồi tự xoá. Cần class .toast trong style.css
 * @param {string} message
 * @param {"success"|"error"|"info"} [type="info"]
 * @returns {void}
 */
export function showToast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  host.appendChild(el);

  setTimeout(() => el.remove(), 3000);
}

/**
 * Ghi 1 dòng vào collection "nhatky". Quy ước chuỗi hanhDong:
 * "<hanh_dong>: <collection>/<id>" (vd. "duyet_don_hang: donhang/abc123").
 * không ném lỗi nếu chưa đăng nhập.
 *
 * QUAN TRỌNG: hàm này tự bọc try/catch bên trong
 *
 * @param {string} hanhDong
 * @returns {Promise<void>}
 */
export async function ghiNhatKy(hanhDong) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, "nhatky"), {
      nguoiThucHienId: user.uid,
      hanhDong,
      thoiGian: serverTimestamp(),
    });
  } catch (err) {
    console.error("ghiNhatKy thất bại (đã bỏ qua, không ảnh hưởng thao tác chính):", err);
  }
}
