// js/auth.js
// -----------------------------------------------------------------------------
// Xác thực dùng chung. Mọi module (customer/staff/admin/owner) PHẢI gọi các hàm
// ở đây — KHÔNG tự viết lại logic đăng ký/đăng nhập/đăng xuất
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// -----------------------------------------------------------------------------
// Bộ nhớ đệm vai trò theo phiên tab
// -----------------------------------------------------------------------------
const KHOA_VAI_TRO = "ct113.role";

/** @returns {string|null} vai trò đã nhớ cho uid này, hoặc null */
export function docVaiTroDem(uid) {
  try {
    const o = JSON.parse(sessionStorage.getItem(KHOA_VAI_TRO));
    return o && o.uid === uid ? o.vaiTro : null;
  } catch {
    return null;
  }
}

/** Nhớ vai trò (hoặc xoá nếu vaiTro rỗng). */
export function luuVaiTroDem(uid, vaiTro) {
  try {
    if (uid && vaiTro) sessionStorage.setItem(KHOA_VAI_TRO, JSON.stringify({ uid, vaiTro }));
    else sessionStorage.removeItem(KHOA_VAI_TRO);
  } catch {
    /* chế độ riêng tư có thể chặn storage */
  }
}

/**
 * Đăng ký tài khoản KHÁCH HÀNG mới (dangKy chỉ tạo khách hàng — nhân viên /
 * quản trị / chủ cửa hàng do quản trị viên tạo riêng ở admin/users-manage.html
 *
 * @param {{hoTen:string, email:string, matKhau:string, soDienThoai:string}} thongTin
 * @returns {Promise<import("firebase/auth").User>}
 * @throws {Error} email đã dùng (auth/email-already-in-use), mật khẩu yếu
 *   (auth/weak-password), email sai định dạng (auth/invalid-email), hoặc lỗi
 *   ghi Firestore sau khi đã tạo tài khoản Auth
 */
export async function dangKy({ hoTen, email, matKhau, soDienThoai }) {
  const cred = await createUserWithEmailAndPassword(auth, email, matKhau);

  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      hoTen,
      email,
      soDienThoai,
      diaChi: "",
      ngayTao: serverTimestamp(),
      trangThai: "hoat_dong",
      vaiTro: "khach_hang",
    });
  } catch (err) {
    // Báo rõ cho người dùng thay vì im lặng.
    throw new Error(
      "Tạo tài khoản thành công nhưng lưu hồ sơ thất bại (" + err.message +
        "). Vui lòng thử đăng nhập lại; nếu vẫn lỗi hãy liên hệ quản trị viên."
    );
  }

  luuVaiTroDem(cred.user.uid, "khach_hang");
  return cred.user;
}

/**
 * Đăng nhập bằng email/mật khẩu. Tự động đăng xuất nếu tài khoản đang bị khoá.
 * @param {{email:string, matKhau:string}} thongTin
 * @returns {Promise<import("firebase/auth").User>}
 * @throws {Error} "Tài khoản đã bị khoá..." nếu trangThai === "khoa"; hoặc lỗi Firebase gốc
 */
export async function dangNhap({ email, matKhau }) {
  const cred = await signInWithEmailAndPassword(auth, email, matKhau);

  const snap = await getDoc(doc(db, "users", cred.user.uid));
  const trangThai = snap.exists() ? snap.data().trangThai : null;

  if (trangThai === "khoa") {
    await signOut(auth);
    throw new Error("Tài khoản đã bị khoá. Liên hệ quản trị viên.");
  }

  luuVaiTroDem(cred.user.uid, snap.exists() ? snap.data().vaiTro ?? null : null);
  return cred.user;
}

/** Đăng xuất người dùng hiện tại. @returns {Promise<void>} */
export function dangXuat() {
  luuVaiTroDem(null);
  return signOut(auth);
}

/**
 * Lấy vai trò của người đang đăng nhập.
 *
 * LƯU Ý QUAN TRỌNG: hàm này đọc auth.currentUser, mà biến này vẫn là
 * null trong khoảnh khắc trang vừa tải xong.
 * ĐỪNG gọi ở top-level của file — luôn gọi bên trong callback onAuthStateChanged.
 *
 * @returns {Promise<"khach_hang"|"nhan_vien"|"quan_tri"|"chu_cua_hang"|null>}
 *   null nếu chưa đăng nhập HOẶC chưa có document users/{uid}
 */
export async function layVaiTroHienTai() {
  const user = auth.currentUser;
  if (!user) return null;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return null;

  return snap.data().vaiTro ?? null;
}

/**
 * Thiết kế gốc chưa có hàm điều
 * hướng sau đăng nhập theo vai trò. Đây là hàm dùng chung do bổ sung để
 * mọi trang đăng nhập/điều hướng gọi thống nhất, tránh mỗi module tự viết
 * switch-case riêng dễ lệch nhau.
 *
 * Dùng ngay sau khi đăng nhập thành công:
 *
 *   await dangNhap({ email, matKhau });
 *   const vaiTro = await layVaiTroHienTai();
 *   window.location.href = duongDanTheoVaiTro(vaiTro);
 *
 * @param {string|null} vaiTro
 * @returns {string} đường dẫn tuyệt đối tới trang chủ tương ứng vai trò
 */
export function duongDanTheoVaiTro(vaiTro) {
  switch (vaiTro) {
    case "nhan_vien":
      return "/staff/dashboard.html";
    case "quan_tri":
      return "/admin/dashboard.html";
    case "chu_cua_hang":
      return "/owner/dashboard.html";
    case "khach_hang":
    default:
      return "/index.html";
  }
}
