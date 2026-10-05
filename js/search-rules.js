export const KIEU_SAP_XEP = {
  mac_dinh: "Mặc định",
  moi_nhat: "Mới nhất",
  gia_tang: "Giá thấp đến cao",
  gia_giam: "Giá cao đến thấp",
  ten_az: "Tên A đến Z",
};

export const boDau = (chuoi) =>
  String(chuoi ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

/** mọi từ trong từ khoá đều phải có trong tên, không phân biệt dấu và thứ tự */
export function khopTuKhoa(ten, tuKhoa) {
  const tu = boDau(tuKhoa).split(/\s+/).filter(Boolean);
  const chuoi = boDau(ten);
  return tu.every((t) => chuoi.includes(t));
}

const ms = (ngay) => ngay?.toMillis?.() ?? (typeof ngay === "number" ? ngay : 0);

/** @returns bản sao đã sắp xếp, sản phẩm chưa có ngày tạo xếp cuối khi chọn "mới nhất" */
export function sapXepSanPham(dsSanPham, kieu) {
  const ds = [...dsSanPham];
  switch (kieu) {
    case "moi_nhat": return ds.sort((a, b) => ms(b.ngayTao) - ms(a.ngayTao));
    case "gia_tang": return ds.sort((a, b) => (a.gia ?? 0) - (b.gia ?? 0));
    case "gia_giam": return ds.sort((a, b) => (b.gia ?? 0) - (a.gia ?? 0));
    case "ten_az": return ds.sort((a, b) => String(a.tenSanPham ?? "").localeCompare(String(b.tenSanPham ?? ""), "vi"));
    default: return ds;
  }
}
