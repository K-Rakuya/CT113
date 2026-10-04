// js/admin/account-create.js
// -----------------------------------------------------------------------------
// Admin tạo tài khoản nhân viên / chủ cửa hàng / quản trị viên.
//
// Vì sao dùng app Firebase "phụ": createUserWithEmailAndPassword() tự đăng nhập vào
// tài khoản vừa tạo. Gọi trên `auth` chính sẽ làm admin đang thao tác bị đăng xuất
// và nhảy sang tài khoản mới. App phụ có phiên Auth riêng nên phiên của admin
// không đổi. Hồ sơ users/{uid} vẫn được ghi bằng `db` chính (đang là admin) — khớp
// firestore.rules: `allow create ... || laQT()`.
// Cấu hình dự án lấy từ auth.app.options nên không phải sửa firebase-config.js.
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import { ghiNhatKy } from "/js/utils.js";
import { laNhanSu } from "/js/admin/users-rules.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/** Khách hàng tự đăng ký ở /register.html nên không nằm trong danh sách này. */
export const VAI_TRO_TAO_DUOC = ["nhan_vien", "chu_cua_hang", "quan_tri"];
export const MAT_KHAU_TOI_THIEU = 6; // giới hạn của Firebase Auth

const THONG_BAO_LOI = {
  "auth/email-already-in-use": "Email này đã được dùng cho một tài khoản khác.",
  "auth/invalid-email": "Email không đúng định dạng.",
  "auth/weak-password": `Mật khẩu quá yếu (tối thiểu ${MAT_KHAU_TOI_THIEU} ký tự).`,
  "auth/network-request-failed": "Mất kết nối mạng, vui lòng thử lại.",
  "auth/too-many-requests": "Thao tác quá nhiều lần, vui lòng đợi một lát rồi thử lại.",
};

/** Lỗi nghiệp vụ có sẵn câu tiếng Việt cho người dùng. */
export class LoiTaoTaiKhoan extends Error {}

/** @returns {string} thông báo hiển thị cho người dùng */
export function thongBaoLoi(err) {
  if (err instanceof LoiTaoTaiKhoan) return err.message;
  return THONG_BAO_LOI[err?.code] ?? "Không tạo được tài khoản, vui lòng thử lại.";
}

/**
 * @param {{hoTen: string, email: string, matKhau: string, vaiTro: string}} thongTin
 * @returns {Promise<string>} uid của tài khoản mới
 * @throws {LoiTaoTaiKhoan|Error} dùng thongBaoLoi(err) để lấy câu hiển thị
 */
export async function taoTaiKhoanNhanSu({ hoTen, email, matKhau, vaiTro }) {
  hoTen = String(hoTen ?? "").trim();
  email = String(email ?? "").trim();
  if (!hoTen) throw new LoiTaoTaiKhoan("Vui lòng nhập họ tên.");
  if (!VAI_TRO_TAO_DUOC.includes(vaiTro)) throw new LoiTaoTaiKhoan("Vai trò không hợp lệ.");
  if (String(matKhau ?? "").length < MAT_KHAU_TOI_THIEU) {
    throw new LoiTaoTaiKhoan(`Mật khẩu tạm cần tối thiểu ${MAT_KHAU_TOI_THIEU} ký tự.`);
  }

  const appPhu = initializeApp(auth.app.options, `tao-tai-khoan-${Date.now()}`);
  try {
    const authPhu = getAuth(appPhu);
    const { user } = await createUserWithEmailAndPassword(authPhu, email, matKhau);
    await signOut(authPhu);

    try {
      await setDoc(doc(db, "users", user.uid), {
        hoTen,
        email,
        soDienThoai: "",
        diaChi: "",
        vaiTro,
        trangThai: "hoat_dong",
        ...(laNhanSu(vaiTro) ? { chucVu: "", luongCoBan: 0 } : {}),
        ngayTao: serverTimestamp(),
      });
    } catch (err) {
      console.error("Đã tạo tài khoản đăng nhập nhưng ghi hồ sơ thất bại:", err);
      throw new LoiTaoTaiKhoan(
        `Đã tạo tài khoản đăng nhập cho ${email} nhưng chưa lưu được hồ sơ. Đừng tạo lại cùng email; hãy báo bộ phận kỹ thuật để xử lý.`
      );
    }

    await ghiNhatKy(`tao_tai_khoan: users/${user.uid}`);
    return user.uid;
  } finally {
    deleteApp(appPhu).catch(() => {}); // giải phóng app phụ, tránh rò rỉ sau mỗi lần tạo
  }
}
