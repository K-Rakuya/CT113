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
 * Hiện thông báo nổi rồi tự đóng: 3 giây, tạm dừng khi rê chuột/focus vào.
 * Tối đa 4 toast cùng lúc. Vào/ra bằng animation, các toast bên dưới trượt lên mượt.
 * Cần .toast / .toast-item trong style.css.
 * @param {string} message
 * @param {"success"|"error"|"info"} [type="info"]
 * @returns {void}
 */
export function showToast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }

  // .toast-item là khung để toast co lại mượt khi đóng
  const item = document.createElement("div");
  item.className = "toast-item";
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  if (type === "error") el.setAttribute("role", "alert"); // thông báo thường được đọc qua aria-live của #toast-host
  el.textContent = message;
  item.appendChild(el);
  host.appendChild(item);

  // Tối đa 4 toast cùng lúc: đóng cái cũ nhất nếu vượt
  const dangHien = host.querySelectorAll(".toast-item:not(.is-leaving)");
  if (dangHien.length > 4) dongToast(dangHien[0]);

  // Lỗi cần thời gian đọc lâu hơn (5s) thông báo thường (3s). Tạm dừng khi rê chuột / focus.
  let conLai = type === "error" ? 5000 : 3000;
  let moc = 0;
  let timer = 0;
  let tamDung = false;
  const chay = () => {
    tamDung = false;
    moc = Date.now();
    timer = setTimeout(() => dongToast(item), conLai);
  };
  const dung = () => {
    if (tamDung) return;
    tamDung = true;
    clearTimeout(timer);
    conLai = Math.max(1200, conLai - (Date.now() - moc)); // còn ít nhất 1,2s sau khi thả ra
  };
  item.addEventListener("pointerenter", dung);
  item.addEventListener("focusin", dung);
  item.addEventListener("pointerleave", chay);
  item.addEventListener("focusout", chay);
  chay();
}

/** Ẩn 1 toast bằng animation rồi gỡ khỏi DOM (có timer dự phòng nếu transition không chạy). */
function dongToast(item) {
  if (item.classList.contains("is-leaving")) return;
  item.classList.add("is-leaving");
  let daGo = false;
  const go = () => {
    if (daGo) return;
    daGo = true;
    item.remove();
  };
  item.addEventListener("transitionend", (e) => {
    if (e.target === item && e.propertyName === "grid-template-rows") go();
  });
  setTimeout(go, 600);
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
