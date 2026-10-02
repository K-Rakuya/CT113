export const NHAN_VAI_TRO = {
  khach_hang: "Khách hàng",
  nhan_vien: "Nhân viên",
  chu_cua_hang: "Chủ cửa hàng",
  quan_tri: "Quản trị viên",
};

export const laNhanSu = (vaiTro) => vaiTro !== "khach_hang";

/**
 * Kiểm tra thay đổi vai trò/trạng thái trước khi ghi.
 * @param {{id: string, vaiTro: string, trangThai: string}} nguoi người đang bị sửa
 * @param {{vaiTro: string, trangThai: string}} moi
 * @param {{vaiTro: string, trangThai: string}[]} tatCa
 * @param {string} uidHienTai
 * @returns {string|null} thông báo lỗi, hoặc null nếu hợp lệ
 */
export function kiemTraThayDoi(nguoi, moi, tatCa, uidHienTai) {
  const doiVaiTro = moi.vaiTro !== nguoi.vaiTro;
  const doiTrangThai = moi.trangThai !== nguoi.trangThai;
  if (nguoi.id === uidHienTai && (doiVaiTro || doiTrangThai)) {
    return "Không thể đổi vai trò hoặc khoá chính tài khoản của bạn.";
  }
  const laQuanTriHoatDong = (u) => u.vaiTro === "quan_tri" && u.trangThai === "hoat_dong";
  if (laQuanTriHoatDong(nguoi) && !laQuanTriHoatDong(moi) && tatCa.filter(laQuanTriHoatDong).length <= 1) {
    return "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.";
  }
  return null;
}
