// js/router-guard.js
// -----------------------------------------------------------------------------
// Chặn truy cập trang theo vai trò. Đặt ngay đầu <body>
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import { docVaiTroDem, luuVaiTroDem } from "/js/auth.js";
import { duongDanDangNhap } from "/js/redirect-rules.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const TAI_KHOAN_BI_KHOA = Symbol("khoa");

/**
 * @param {string[]} vaiTroChoPhep - vd. ["nhan_vien"], ["quan_tri"],
 *   ["chu_cua_hang"], ["khach_hang"]
 * @param {(vaiTro:string)=>void} [onDaXacThuc] - (bổ sung, tuỳ chọn) callback
 *   chạy đúng 1 lần khi vai trò hợp lệ đã xác nhận xong. Dùng để giải quyết
 *   trang lộ khung giao diện trong tích tắc trước khi checkRole
 *   chạy xong: ẩn <body hidden> trong HTML, rồi trong callback này mới bỏ
 *   thuộc tính hidden. Hoàn toàn tương thích ngược — không truyền tham số
 *   này thì checkRole hoạt động y như trước.
 *
 * Phần tử #user-info (nếu trang có) được điền tên người dùng từ chính lần đọc
 * hồ sơ phục vụ kiểm tra vai trò, không tốn thêm lượt đọc Firestore.
 * @returns {void}
 */
export function checkRole(vaiTroChoPhep, onDaXacThuc) {
  // Trang dùng callback thường ẩn <body hidden> tới khi xác thực xong → CSS (.is-guarded body) cho hiện dần
  if (onDaXacThuc) document.documentElement.classList.add("is-guarded");
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      luuVaiTroDem(null);
      window.location.href = duongDanDangNhap(window.location.pathname + window.location.search);
      return;
    }

    hienTenNguoiDung(user); // hiện email ngay, thay bằng họ tên khi đã đọc xong hồ sơ

    // đã biết vai trò trong phiên này → mở trang ngay, xác minh lại ở nền.
    const vaiTroDem = docVaiTroDem(user.uid);
    if (vaiTroDem && vaiTroChoPhep.includes(vaiTroDem)) {
      onDaXacThuc?.(vaiTroDem);
      layHoSo(user.uid).then((hoSo) => {
        if (hoSo === undefined) return;
        if (hoSo === TAI_KHOAN_BI_KHOA) return dangXuatTaiKhoanKhoa();
        luuVaiTroDem(user.uid, hoSo.vaiTro);
        hienTenNguoiDung(user, hoSo.hoTen);
        if (!vaiTroChoPhep.includes(hoSo.vaiTro)) window.location.href = "/index.html";
      });
      return;
    }

    // Đường đầy đủ (lần đầu trong phiên): chờ Firestore như trước.
    const hoSo = await layHoSo(user.uid);
    if (hoSo === TAI_KHOAN_BI_KHOA) return dangXuatTaiKhoanKhoa();
    const vaiTro = hoSo === undefined ? null : hoSo.vaiTro;
    luuVaiTroDem(user.uid, vaiTro);

    if (!vaiTroChoPhep.includes(vaiTro)) {
      window.location.href = "/index.html";
      return;
    }

    hienTenNguoiDung(user, hoSo.hoTen);
    onDaXacThuc?.(vaiTro);
  });
}

/** Điền tên vào #user-info; chưa có họ tên thì dùng email. */
function hienTenNguoiDung(user, hoTen) {
  const el = document.getElementById("user-info");
  if (el) el.textContent = hoTen || user.email || "";
}

async function dangXuatTaiKhoanKhoa() {
  luuVaiTroDem(null);
  await signOut(auth);
  window.location.href = "/login.html";
}

/**
 * @returns {Promise<{vaiTro: string|null, hoTen: string}|symbol|undefined>}
 *   hồ sơ (vaiTro null nếu chưa có hồ sơ); TAI_KHOAN_BI_KHOA nếu bị khoá;
 *   undefined nếu đọc lỗi
 */
async function layHoSo(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { vaiTro: null, hoTen: "" };
    const d = snap.data();
    if (d.trangThai === "khoa") return TAI_KHOAN_BI_KHOA;
    return { vaiTro: d.vaiTro ?? null, hoTen: d.hoTen ?? "" };
  } catch (err) {
    console.error("Lỗi lấy thông tin vai trò:", err);
    return undefined;
  }
}
