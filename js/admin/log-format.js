const NHAN = {
  dat_hang: ["Đặt hàng", "don_hang"],
  huy_don_hang: ["Huỷ đơn hàng", "don_hang"],
  cap_nhat_don_hang: ["Cập nhật đơn hàng", "don_hang"],
  duyet_don_hang: ["Cập nhật đơn hàng", "don_hang"],
  tu_choi_yeu_cau_huy: ["Từ chối yêu cầu huỷ", "don_hang"],
  them_san_pham: ["Thêm sản phẩm", "san_pham"],
  cap_nhat_ton_kho: ["Cập nhật tồn kho", "san_pham"],
  sua_san_pham: ["Sửa sản phẩm", "san_pham"],
  xoa_san_pham: ["Xóa sản phẩm", "san_pham"],
  doi_trang_thai_san_pham: ["Đổi trạng thái sản phẩm", "san_pham"],
  them_danh_muc: ["Thêm danh mục", "san_pham"],
  sua_danh_muc: ["Sửa danh mục", "san_pham"],
  xoa_danh_muc: ["Xóa danh mục", "san_pham"],
  them_danh_gia: ["Thêm đánh giá", "san_pham"],
  tao_tai_khoan: ["Tạo tài khoản", "nguoi_dung"],
  sua_nguoi_dung: ["Sửa người dùng", "nguoi_dung"],
  khoa_nguoi_dung: ["Khoá tài khoản", "nguoi_dung"],
  mo_khoa_nguoi_dung: ["Mở khoá tài khoản", "nguoi_dung"],
  tiep_nhan_ho_tro: ["Tiếp nhận hỗ trợ", "ho_tro"],
  tra_ve_ho_tro: ["Trả yêu cầu về danh sách chờ", "ho_tro"],
  phan_hoi_ho_tro: ["Phản hồi hỗ trợ", "ho_tro"],
  tiep_nhan_tu_van: ["Tiếp nhận tư vấn", "ho_tro"],
  tra_ve_tu_van: ["Trả phiên tư vấn về danh sách chờ", "ho_tro"],
  dong_tu_van: ["Kết thúc tư vấn", "ho_tro"],
  giao_lai_tu_van: ["Giao lại phiên tư vấn", "ho_tro"],
  giao_lai_ho_tro: ["Giao lại yêu cầu hỗ trợ", "ho_tro"],
  sua_nhan_su: ["Sửa hồ sơ nhân sự", "nhan_su"],
  diem_danh_vao_ca: ["Điểm danh vào ca", "cham_cong"],
  diem_danh_ra_ca: ["Điểm danh ra ca", "cham_cong"],
};

export const NHOM_HANH_DONG = {
  don_hang: "Đơn hàng",
  san_pham: "Sản phẩm và danh mục",
  nguoi_dung: "Người dùng",
  ho_tro: "Hỗ trợ",
  cham_cong: "Chấm công",
  nhan_su: "Nhân sự",
};

/** @returns {{ma: string, nhan: string, nhom: string, doiTuong: string, chiTiet: string}} */
export function phanTichHanhDong(chuoi) {
  const [phanDau, ...conLai] = String(chuoi ?? "").split(":");
  const ma = phanDau.trim();
  const [doiTuong = "", chiTiet = ""] = conLai.join(":").trim().split(" -> ");
  const [nhan, nhom] = NHAN[ma] ?? [ma || "(không rõ)", "khac"];
  return { ma, nhan, nhom, doiTuong: doiTuong.trim(), chiTiet: chiTiet.trim() };
}
