import { tongHopDanhGia } from "/js/product-rules.js";
import { phanLoaiTon } from "/js/inventory-rules.js";
import { catNoiDung } from "/js/home/home-rules.js";

export const SO_DANH_GIA_MOI_LAN = 5;
export const GIOI_HAN_NHAN_XET = 1000;

const NHAN_TON = {
  con: { nhan: "Còn hàng", muc: "ok" },
  sap_het: { nhan: "Sắp hết hàng", muc: "warn" },
  het: { nhan: "Tạm hết hàng", muc: "out" },
};

const TINH_TRANG_SCHEMA = {
  con: "InStock",
  sap_het: "LimitedAvailability",
  het: "OutOfStock",
  ngung: "Discontinued",
};

const msDanhGia = (dg) => dg?.ngayDanhGia?.toMillis?.() ?? (typeof dg?.ngayDanhGia === "number" ? dg.ngayDanhGia : 0);

/** @returns {{ma: "con"|"sap_het"|"het"|"ngung", nhan: string, muc: "ok"|"warn"|"out", banDuoc: boolean, chiTiet: string}} */
export function trangThaiBan(sp) {
  if (sp?.trangThai && sp.trangThai !== "dang_ban") {
    return { ma: "ngung", nhan: "Ngừng bán", muc: "out", banDuoc: false, chiTiet: "Sản phẩm này hiện không còn được bán." };
  }
  const ton = Math.max(0, Number(sp?.soLuongTon) || 0);
  const ma = phanLoaiTon(ton);
  const chiTiet = {
    con: `Còn ${ton} sản phẩm`,
    sap_het: `Chỉ còn ${ton} sản phẩm`,
    het: "Hãy hỏi nhân viên để biết khi nào có hàng trở lại.",
  }[ma];
  return { ma, ...NHAN_TON[ma], banDuoc: ma !== "het", chiTiet };
}

/** @returns {{soLuong: number, vuotTon: boolean}} số lượng được kẹp vào khoảng 1 đến tồn kho; bằng 0 khi hết hàng */
export function kepSoLuong(yeuCau, ton) {
  const toiDa = Math.max(0, Math.trunc(Number(ton)) || 0);
  const muon = Math.trunc(Number(yeuCau)) || 1;
  if (toiDa === 0) return { soLuong: 0, vuotTon: false };
  return { soLuong: Math.min(toiDa, Math.max(1, muon)), vuotTon: muon > toiDa };
}

/** @returns {{soLuot: number, trungBinh: number, theoSao: {sao: number, so: number, tyLe: number}[]}} theoSao xếp từ 5 xuống 1 */
export function phanBoSao(dsSoSao) {
  const { soLuot, trungBinh } = tongHopDanhGia(dsSoSao);
  const dem = new Map([1, 2, 3, 4, 5].map((sao) => [sao, 0]));
  for (const sao of dsSoSao) if (dem.has(sao)) dem.set(sao, dem.get(sao) + 1);
  const theoSao = [5, 4, 3, 2, 1].map((sao) => ({ sao, so: dem.get(sao), tyLe: soLuot ? dem.get(sao) / soLuot : 0 }));
  return { soLuot, trungBinh, theoSao };
}

export const sapXepDanhGia = (dsDanhGia) => [...dsDanhGia].sort((a, b) => msDanhGia(b) - msDanhGia(a));

/** @returns {{muc: object[], conLai: number}} */
export function cuaSoDanhGia(dsDanhGia, soHien) {
  const muc = dsDanhGia.slice(0, Math.max(0, soHien));
  return { muc, conLai: dsDanhGia.length - muc.length };
}

/** @returns {{hopLe: boolean, loi: {soSao?: string, noiDung?: string}, giaTri: {soSao: number, noiDung: string}}} */
export function kiemTraDanhGia({ soSao, noiDung }) {
  const giaTri = { soSao: Number(soSao), noiDung: String(noiDung ?? "").trim() };
  const loi = {};
  if (!Number.isInteger(giaTri.soSao) || giaTri.soSao < 1 || giaTri.soSao > 5) loi.soSao = "Vui lòng chọn số sao.";
  if (!giaTri.noiDung) loi.noiDung = "Vui lòng nhập nhận xét.";
  else if (giaTri.noiDung.length > GIOI_HAN_NHAN_XET) loi.noiDung = `Nhận xét tối đa ${GIOI_HAN_NHAN_XET} ký tự.`;
  return { hopLe: Object.keys(loi).length === 0, loi, giaTri };
}

const urlTuyetDoi = (giaTri, goc) => {
  try {
    return new URL(giaTri, goc).href;
  } catch {
    return null;
  }
};

/** @returns {{tieuDe: string, moTa: string}} nội dung thẻ title và meta description */
export function thongTinMeta(sp, { giaChu, tenCuaHang }) {
  const ban = trangThaiBan(sp);
  const moTa = sp.moTa ? ` ${catNoiDung(sp.moTa, 110)}` : "";
  return {
    tieuDe: `${sp.tenSanPham} — ${tenCuaHang}`,
    moTa: `${sp.tenSanPham}, giá ${giaChu}. ${ban.nhan}.${moTa}`,
  };
}

/** @returns {object} dữ liệu có cấu trúc schema.org/Product; url phải là địa chỉ tuyệt đối của trang */
export function dungJsonLd(sp, { url, tenDanhMuc, tomTat } = {}) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sp.tenSanPham,
    sku: sp.id,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "VND",
      price: Number(sp.gia) || 0,
      availability: `https://schema.org/${TINH_TRANG_SCHEMA[trangThaiBan(sp).ma]}`,
    },
  };
  const anh = sp.hinhAnh && urlTuyetDoi(sp.hinhAnh, url);
  if (anh) ld.image = [anh];
  if (sp.moTa) ld.description = catNoiDung(sp.moTa, 300);
  if (tenDanhMuc) ld.category = tenDanhMuc;
  if (tomTat?.soLuot > 0) {
    ld.aggregateRating = { "@type": "AggregateRating", ratingValue: tomTat.trungBinh, reviewCount: tomTat.soLuot, bestRating: 5, worstRating: 1 };
  }
  return ld;
}
