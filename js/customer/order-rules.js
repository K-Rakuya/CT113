export const NHAN_TRANG_THAI_DON = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

export const THU_TU_TIEN_TRINH = ["cho_duyet", "dang_giao", "hoan_thanh"];

export const BO_LOC_DON = [{ ma: "", nhan: "Tất cả" }, ...Object.entries(NHAN_TRANG_THAI_DON).map(([ma, nhan]) => ({ ma, nhan }))];

export const maDon = (id) => `#${String(id).slice(0, 8).toUpperCase()}`;

export const laMaLocHopLe = (ma) => BO_LOC_DON.some((m) => m.ma === ma);

export const locDon = (dsDon, trangThai) => (trangThai ? dsDon.filter((d) => d.trangThai === trangThai) : dsDon);

export function demTheoTrangThai(dsDon) {
  const dem = Object.fromEntries(BO_LOC_DON.map((m) => [m.ma, 0]));
  dem[""] = dsDon.length;
  for (const d of dsDon) if (d.trangThai in dem) dem[d.trangThai]++;
  return dem;
}

export const buocTienTrinh = (trangThai) => THU_TU_TIEN_TRINH.indexOf(trangThai);

export const tongSoLuong = (chiTiet) => chiTiet.reduce((t, ct) => t + (Number(ct.soLuong) || 0), 0);

export function hanhDongCuaDon(don) {
  switch (don.trangThai) {
    case "cho_duyet":
      return don.yeuCauHuy
        ? { ghiChu: "Đã gửi yêu cầu huỷ, đang chờ cửa hàng xác nhận.", nut: null }
        : { ghiChu: null, nut: "yeu-cau-huy" };
    case "dang_giao":
      return { ghiChu: "Đơn hàng đang được giao.", nut: null };
    case "huy":
      return { ghiChu: "Đơn hàng đã được huỷ.", nut: "mua-lai" };
    default:
      return { ghiChu: null, nut: "mua-lai" };
  }
}
