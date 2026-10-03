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

export function formatDateTime(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === "") return "";
  const d = typeof timestamp?.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Thoát ký tự HTML trước khi chèn chuỗi người dùng/dữ liệu vào innerHTML.
 * @param {*} giaTri
 * @returns {string}
 */
export function escapeHtml(giaTri) {
  return String(giaTri ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/**
 * Hiện thông báo nổi rồi tự đóng: 3 giây, tạm dừng khi rê chuột/focus vào.
 * Tối đa 4 toast cùng lúc. Vào/ra bằng animation, các toast bên dưới trượt lên mượt.
 * Cần .toast / .toast-item trong style.css.
 * @param {string} message
 * @param {"success"|"error"|"info"} [type="info"]
 * @param {{ action?: { nhan: string, onClick: () => void } }} [tuyChon] nút hành động trong toast (vd. Hoàn tác, giữ 6 giây)
 * @returns {void}
 */
export function showToast(message, type = "info", { action } = {}) {
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
  if (action) {
    const nut = document.createElement("button");
    nut.type = "button";
    nut.className = "toast__action";
    nut.textContent = action.nhan;
    nut.addEventListener("click", () => {
      action.onClick();
      dongToast(item);
    });
    el.classList.add("toast--has-action");
    el.append(nut);
  }
  item.appendChild(el);
  host.appendChild(item);

  // Tối đa 4 toast cùng lúc: đóng cái cũ nhất nếu vượt
  const dangHien = host.querySelectorAll(".toast-item:not(.is-leaving)");
  if (dangHien.length > 4) dongToast(dangHien[0]);

  // Lỗi cần thời gian đọc lâu hơn (5s) thông báo thường (3s). Tạm dừng khi rê chuột / focus.
  let conLai = type === "error" ? 5000 : action ? 6000 : 3000;
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

/**
 * Ngày hiện tại theo GIỜ MÁY ở dạng "YYYY-MM-DD".
 * Không dùng new Date().toISOString(): hàm đó trả ngày theo UTC nên ở Việt Nam (UTC+7)
 * mọi thời điểm trước 07:00 sáng sẽ bị tính là ngày hôm trước.
 * @param {Date} [d]
 * @returns {string}
 */
export function ngayHienTai(d = new Date()) {
  const hai = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
}

// -----------------------------------------------------------------------------
// Cache tạm trong phiên làm việc (sessionStorage). KHÔNG dùng cache/persistence
// riêng của Firestore SDK (enableIndexedDbPersistence / persistentLocalCache) —
// đây là cache tự viết, chỉ tồn tại trong 1 tab, để tránh gọi lại Firestore cho
// dữ liệu ít đổi mỗi khi người dùng chuyển qua lại giữa các trang (vd. danh mục
// sản phẩm). Tự xoá khi tab đóng. Vai trò đăng nhập có cache riêng
// (docVaiTroDem/luuVaiTroDem trong auth.js, xoá khi đăng xuất). Dữ liệu CỦA TỪNG
// NGƯỜI DÙNG đưa vào đây phải được xoá bằng xoaCache() khi đăng xuất.
// -----------------------------------------------------------------------------

const TIEN_TO_CACHE = "cache:";

/**
 * Đọc dữ liệu đã cache.
 * @param {string} key
 * @returns {*} dữ liệu đã lưu (đã JSON.parse), hoặc null nếu chưa có / đã hết
 *   hạn / đọc lỗi (vd. sessionStorage bị chặn ở chế độ ẩn danh khắt khe) —
 *   mọi trường hợp lỗi đều coi là cache-miss, không ném lỗi ra ngoài.
 */
export function layCache(key) {
  try {
    const raw = sessionStorage.getItem(TIEN_TO_CACHE + key);
    if (!raw) return null;
    const { giaTri, hetHan } = JSON.parse(raw);
    if (Date.now() > hetHan) {
      sessionStorage.removeItem(TIEN_TO_CACHE + key);
      return null;
    }
    return giaTri;
  } catch {
    return null;
  }
}

/**
 * Lưu dữ liệu vào cache kèm thời gian sống.
 * @param {string} key
 * @param {*} giaTri Dữ liệu cần lưu — phải serialize được bằng JSON.stringify.
 * @param {number} [ttlMs=60000] Thời gian sống tính bằng mili-giây.
 * @returns {void}
 */
export function luuCache(key, giaTri, ttlMs = 60000) {
  try {
    sessionStorage.setItem(
      TIEN_TO_CACHE + key,
      JSON.stringify({ giaTri, hetHan: Date.now() + ttlMs })
    );
  } catch {
    /* sessionStorage đầy / bị chặn — bỏ qua, lần đọc sau tự coi là cache-miss */
  }
}

/**
 * Xoá 1 khoá cache cụ thể — dùng khi dữ liệu vừa bị sửa và cần buộc trang sau
 * đó tải lại từ Firestore thay vì dùng bản cache cũ.
 * @param {string} key
 * @returns {void}
 */
export function xoaCache(key) {
  try {
    sessionStorage.removeItem(TIEN_TO_CACHE + key);
  } catch {
    /* bỏ qua */
  }
}
