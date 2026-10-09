import { boDau } from "/js/search-rules.js";
import { phanLoaiTon, NGUONG_SAP_HET } from "/js/inventory-rules.js";

export const SO_NGAY_LA_MOI = 14;
export const MAU_NHOM = ["copper", "teal", "blue", "green", "amber"];

const NGAY_MS = 86400000;
const ms = (x) => (typeof x === "number" ? x : x?.toMillis?.() ?? 0);

export const laMoi = (sp, bayGio = Date.now()) => ms(sp.ngayTao) > 0 && bayGio - ms(sp.ngayTao) <= SO_NGAY_LA_MOI * NGAY_MS;
export const nhanTon = (sp) => phanLoaiTon(sp.soLuongTon);

const BIEU_TUONG = [
  ["cpu", ["cpu", "vi xu ly", "bo xu ly", "processor"]],
  ["mainboard", ["mainboard", "main", "bo mach chu"]],
  ["ram", ["ram", "bo nho"]],
  ["vga", ["vga", "card do hoa", "card man hinh", "gpu"]],
  ["ssd", ["ssd", "o cung", "hdd", "luu tru"]],
  ["psu", ["nguon", "psu"]],
  ["case", ["case", "vo may", "thung may"]],
  ["monitor", ["man hinh", "monitor"]],
  ["keyboard", ["ban phim", "keyboard"]],
  ["mouse", ["chuot", "mouse"]],
  ["headset", ["tai nghe", "headset", "loa"]],
];

/** @returns {string} mã biểu tượng trong images/home/icons.svg, mặc định "box" */
export function bieuTuongDanhMuc(ten) {
  const chuoi = boDau(ten);
  const tu = chuoi.split(/[^a-z0-9]+/).filter(Boolean);
  for (const [ma, tuKhoa] of BIEU_TUONG) {
    if (tuKhoa.some((k) => (k.includes(" ") ? chuoi.includes(k) : tu.includes(k)))) return ma;
  }
  return "box";
}

const conHangTruoc = (a, b) => (b.soLuongTon > 0) - (a.soLuongTon > 0) || ms(b.ngayTao) - ms(a.ngayTao);

/**
 * @returns {{ma: string, tieuDe: string, phu: string, bieuTuong: string, lienKet: string, mau: string, sanPham: object[]}[]}
 * thứ tự: mới về, từng danh mục (nhiều sản phẩm nhất trước), sắp hết hàng
 */
export function chonCacNhom(sanPham, danhMuc, { soDanhMuc = 6, soMoiHang = 12 } = {}) {
  const dangBan = sanPham.filter((sp) => sp.trangThai === "dang_ban");
  const nhom = [];

  const conHang = dangBan.filter((sp) => sp.soLuongTon > 0);
  const coNgay = conHang.some((sp) => ms(sp.ngayTao) > 0);
  const moi = [...conHang].sort((a, b) => ms(b.ngayTao) - ms(a.ngayTao)).slice(0, soMoiHang);
  if (moi.length) {
    nhom.push({
      ma: "moi",
      tieuDe: coNgay ? "Mới về" : "Sản phẩm của cửa hàng",
      phu: coNgay ? "Vừa lên kệ gần đây" : "Một vài gợi ý để bắt đầu",
      bieuTuong: "spark",
      lienKet: coNgay ? "/product-list.html?sapxep=moi_nhat" : "/product-list.html",
      sanPham: moi,
    });
  }

  const theoDanhMuc = new Map();
  for (const sp of dangBan) theoDanhMuc.set(sp.danhMucId, [...(theoDanhMuc.get(sp.danhMucId) ?? []), sp]);
  const cacDanhMuc = danhMuc
    .filter((dm) => theoDanhMuc.has(dm.id))
    .sort((a, b) => theoDanhMuc.get(b.id).length - theoDanhMuc.get(a.id).length || String(a.tenDanhMuc).localeCompare(String(b.tenDanhMuc), "vi"))
    .slice(0, soDanhMuc);
  for (const dm of cacDanhMuc) {
    const ds = theoDanhMuc.get(dm.id);
    nhom.push({
      ma: `dm-${dm.id}`,
      tieuDe: dm.tenDanhMuc,
      phu: `${ds.length} sản phẩm`,
      bieuTuong: bieuTuongDanhMuc(dm.tenDanhMuc),
      lienKet: `/product-list.html?danhmuc=${encodeURIComponent(dm.id)}`,
      sanPham: [...ds].sort(conHangTruoc).slice(0, soMoiHang),
    });
  }

  const sapHet = dangBan.filter((sp) => sp.soLuongTon > 0 && sp.soLuongTon <= NGUONG_SAP_HET).sort((a, b) => a.soLuongTon - b.soLuongTon);
  if (sapHet.length >= 3) {
    nhom.push({ ma: "sap-het", tieuDe: "Sắp hết hàng", phu: "Số lượng còn ít, nên chốt sớm", bieuTuong: "flame", lienKet: "/product-list.html", sanPham: sapHet.slice(0, soMoiHang) });
  }

  return nhom.map((n, i) => ({ ...n, mau: MAU_NHOM[i % MAU_NHOM.length] }));
}

/** đánh giá 4 đến 5 sao, đủ dài, sản phẩm còn bán, mỗi sản phẩm một lần */
export function chonDanhGiaNoiBat(dsDanhGia, sanPhamTheoId, soLuong = 3) {
  const daCo = new Set();
  return dsDanhGia
    .filter((dg) => [4, 5].includes(dg.soSao) && String(dg.noiDung ?? "").trim().length >= 20 && sanPhamTheoId.get(dg.sanPhamId)?.trangThai === "dang_ban")
    .sort((a, b) => b.soSao - a.soSao || ms(b.ngayDanhGia) - ms(a.ngayDanhGia))
    .filter((dg) => !daCo.has(dg.sanPhamId) && daCo.add(dg.sanPhamId))
    .slice(0, soLuong);
}

export function catNoiDung(chuoi, toiDa = 140) {
  const s = String(chuoi ?? "").trim().replace(/\s+/g, " ");
  if (s.length <= toiDa) return s;
  const cat = s.slice(0, toiDa);
  return `${cat.slice(0, Math.max(cat.lastIndexOf(" "), toiDa * 0.6))}…`;
}
