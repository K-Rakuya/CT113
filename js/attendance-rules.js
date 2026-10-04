import { ngayHienTai } from "/js/utils.js";

export const NHAN_TRANG_THAI_CA = {
  chua_vao: ["Chưa vào ca", "cho_duyet"],
  dang_lam: ["Đang trong ca", "dang_giao"],
  da_ra: ["Đã ra ca", "hoan_thanh"],
};

export const thangHienTai = (d = new Date()) => ngayHienTai(d).slice(0, 7);

export const khoangThang = (thang) => ({ tu: `${thang}-01`, den: `${thang}-31` });

/** @returns {number|null} số phút giữa hai mốc ms, null nếu thiếu mốc hoặc ra trước vào */
export function thoiLuongPhut(vao, ra) {
  return vao != null && ra != null && ra >= vao ? Math.round((ra - vao) / 60000) : null;
}

export function dinhDangThoiLuong(phut) {
  if (phut == null) return "—";
  const gio = Math.floor(phut / 60);
  return gio ? `${gio} giờ ${phut % 60} phút` : `${phut} phút`;
}

/** @param {{gioRa: number|null}[]} banGhiTrongNgay @returns {"chua_vao"|"dang_lam"|"da_ra"} */
export function trangThaiCa(banGhiTrongNgay) {
  if (!banGhiTrongNgay.length) return "chua_vao";
  return banGhiTrongNgay.some((b) => b.gioRa == null) ? "dang_lam" : "da_ra";
}

/** @returns {Map<string, {soNgay: number, tongPhut: number}>} theo mã nhân viên */
export function tongHopThang(banGhi) {
  const theoNguoi = new Map();
  for (const b of banGhi) {
    const o = theoNguoi.get(b.nhanVienId) ?? { ngay: new Set(), tongPhut: 0 };
    o.ngay.add(b.ngay);
    o.tongPhut += thoiLuongPhut(b.gioVao, b.gioRa) ?? 0;
    theoNguoi.set(b.nhanVienId, o);
  }
  return new Map([...theoNguoi].map(([id, o]) => [id, { soNgay: o.ngay.size, tongPhut: o.tongPhut }]));
}
