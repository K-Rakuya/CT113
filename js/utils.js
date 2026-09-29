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

// -----------------------------------------------------------------------------
// Cache tạm trong phiên làm việc (sessionStorage). KHÔNG dùng cache/persistence
// riêng của Firestore SDK (enableIndexedDbPersistence / persistentLocalCache) —
// đây là cache tự viết, chỉ tồn tại trong 1 tab, để tránh gọi lại Firestore cho
// dữ liệu ít đổi mỗi khi người dùng chuyển qua lại giữa các trang (vd. vai trò
// đăng nhập, danh mục sản phẩm). Tự xoá khi tab đóng, hoặc ngay khi đăng xuất
// vì router-guard.js đã gọi sessionStorage.clear() trong hàm đăng xuất.
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
