// js/router-guard.js
// -----------------------------------------------------------------------------
// Chặn truy cập trang theo vai trò. Đặt ngay đầu <body>
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import { docVaiTroDem, luuVaiTroDem } from "/js/auth.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/**
 * @param {string[]} vaiTroChoPhep - vd. ["nhan_vien"], ["quan_tri"],
 *   ["chu_cua_hang"], ["khach_hang"]
 * @param {(vaiTro:string)=>void} [onDaXacThuc] - (bổ sung, tuỳ chọn) callback
 *   chạy đúng 1 lần khi vai trò hợp lệ đã xác nhận xong. Dùng để giải quyết
 *   trang lộ khung giao diện trong tích tắc trước khi checkRole
 *   chạy xong: ẩn <body hidden> trong HTML, rồi trong callback này mới bỏ
 *   thuộc tính hidden. Hoàn toàn tương thích ngược — không truyền tham số
 *   này thì checkRole hoạt động y như trước.
 * @returns {void}
 */
export function checkRole(vaiTroChoPhep, onDaXacThuc) {
  // Trang dùng callback thường ẩn <body hidden> tới khi xác thực xong → CSS (.is-guarded body) cho hiện dần
  if (onDaXacThuc) document.documentElement.classList.add("is-guarded");
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      luuVaiTroDem(null);
      window.location.href = "/login.html";
      return;
    }

    // đã biết vai trò trong phiên này → mở trang trang, xác minh lại ở nền.
    const vaiTroDem = docVaiTroDem(user.uid);
    if (vaiTroDem && vaiTroChoPhep.includes(vaiTroDem)) {
      onDaXacThuc?.(vaiTroDem);
      layVaiTro(user.uid).then((that) => {
        if (that === undefined) return;
        if (that === TAI_KHOAN_BI_KHOA) return dangXuatTaiKhoanKhoa();
        luuVaiTroDem(user.uid, that);
        if (!vaiTroChoPhep.includes(that)) window.location.href = "/index.html";
      });
      return;
    }

    // Đường đầy đủ (lần đầu trong phiên): chờ Firestore như trước.
    let vaiTro = await layVaiTro(user.uid);
    if (vaiTro === TAI_KHOAN_BI_KHOA) return dangXuatTaiKhoanKhoa();
    if (vaiTro === undefined) vaiTro = null;
    luuVaiTroDem(user.uid, vaiTro);

    if (!vaiTroChoPhep.includes(vaiTro)) {
      window.location.href = "/index.html";
      return;
    }

    onDaXacThuc?.(vaiTro);
  });
}

/** @returns {Promise<string|null|undefined>} vai trò; null nếu chưa có hồ sơ; undefined nếu đọc lỗi */
const TAI_KHOAN_BI_KHOA = Symbol("khoa");

async function dangXuatTaiKhoanKhoa() {
  luuVaiTroDem(null);
  await signOut(auth);
  window.location.href = "/login.html";
}

async function layVaiTro(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists() && snap.data().trangThai === "khoa") return TAI_KHOAN_BI_KHOA;
    return snap.exists() ? snap.data().vaiTro ?? null : null;
  } catch {
    return undefined;
  }
}
