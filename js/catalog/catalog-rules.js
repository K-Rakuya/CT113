import { khopTuKhoa, sapXepSanPham, KIEU_SAP_XEP } from "/js/search-rules.js";
import { laMoi } from "/js/home/home-rules.js";
import { phanLoaiTon } from "/js/inventory-rules.js";

export const SO_SP_MOI_TRANG = 12;

export const BO_LOC_MAC_DINH = Object.freeze({
  tuKhoa: "",
  danhMuc: "",
  giaTu: null,
  giaDen: null,
  sapXep: "mac_dinh",
  conHang: false,
  trang: 1,
});

const soKhongAm = (chuoi) => {
  if (chuoi === null || chuoi === undefined || chuoi === "") return null;
  const n = Number(chuoi);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/** @returns {{giaTu: number|null, giaDen: number|null}} giá không hợp lệ thành null, hai đầu ngược nhau được đổi chỗ */
export function chuanHoaKhoangGia(tu, den) {
  let giaTu = soKhongAm(tu);
  let giaDen = soKhongAm(den);
  if (giaTu !== null && giaDen !== null && giaTu > giaDen) [giaTu, giaDen] = [giaDen, giaTu];
  return { giaTu, giaDen };
}

/** @returns {typeof BO_LOC_MAC_DINH} bộ lọc đã chuẩn hoá từ query string; giá trị sai được thay bằng mặc định */
export function docBoLoc(search) {
  const tham = new URLSearchParams(search);
  const sapXep = tham.get("sapxep");
  return {
    tuKhoa: (tham.get("tukhoa") ?? "").trim().slice(0, 100),
    danhMuc: tham.get("danhmuc") ?? "",
    ...chuanHoaKhoangGia(tham.get("giatu"), tham.get("giaden")),
    sapXep: Object.hasOwn(KIEU_SAP_XEP, sapXep) ? sapXep : BO_LOC_MAC_DINH.sapXep,
    conHang: tham.get("conhang") === "1",
    trang: Math.max(1, parseInt(tham.get("trang"), 10) || 1),
  };
}

/** @returns {string} query string không có "?", bỏ qua các giá trị mặc định */
export function ghiBoLoc(boLoc) {
  const tham = new URLSearchParams();
  if (boLoc.tuKhoa) tham.set("tukhoa", boLoc.tuKhoa);
  if (boLoc.danhMuc) tham.set("danhmuc", boLoc.danhMuc);
  if (boLoc.giaTu !== null) tham.set("giatu", boLoc.giaTu);
  if (boLoc.giaDen !== null) tham.set("giaden", boLoc.giaDen);
  if (boLoc.sapXep !== BO_LOC_MAC_DINH.sapXep) tham.set("sapxep", boLoc.sapXep);
  if (boLoc.conHang) tham.set("conhang", "1");
  if (boLoc.trang > 1) tham.set("trang", boLoc.trang);
  return tham.toString();
}

function khop(sp, boLoc, boQua) {
  if (boQua !== "tuKhoa" && boLoc.tuKhoa && !khopTuKhoa(sp.tenSanPham, boLoc.tuKhoa)) return false;
  if (boQua !== "danhMuc" && boLoc.danhMuc && sp.danhMucId !== boLoc.danhMuc) return false;
  if (boQua !== "gia") {
    const gia = sp.gia ?? 0;
    if (boLoc.giaTu !== null && gia < boLoc.giaTu) return false;
    if (boLoc.giaDen !== null && gia > boLoc.giaDen) return false;
  }
  if (boQua !== "conHang" && boLoc.conHang && !((sp.soLuongTon ?? 0) > 0)) return false;
  return true;
}

export const locSanPham = (dsSanPham, boLoc) => sapXepSanPham(dsSanPham.filter((sp) => khop(sp, boLoc)), boLoc.sapXep);

/** số sản phẩm của từng danh mục khi áp dụng mọi tiêu chí trừ danh mục */
export function demTheoDanhMuc(dsSanPham, boLoc) {
  const dem = new Map();
  for (const sp of dsSanPham) {
    if (khop(sp, boLoc, "danhMuc")) dem.set(sp.danhMucId, (dem.get(sp.danhMucId) ?? 0) + 1);
  }
  return dem;
}

/** @returns {{muc: object[], tong: number, trang: number, tongTrang: number}} trang được kẹp vào khoảng hợp lệ */
export function phanTrang(dsSanPham, trang, kichThuoc = SO_SP_MOI_TRANG) {
  const tongTrang = Math.max(1, Math.ceil(dsSanPham.length / kichThuoc));
  const hienTai = Math.min(Math.max(1, trang), tongTrang);
  const batDau = (hienTai - 1) * kichThuoc;
  return { muc: dsSanPham.slice(batDau, batDau + kichThuoc), tong: dsSanPham.length, trang: hienTai, tongTrang };
}

/** @returns {(number|"…")[]} luôn có trang đầu, trang cuối và các trang quanh trang hiện tại */
export function cuaSoTrang(hienTai, tongTrang, bienDo = 1) {
  if (tongTrang < 1) return [];
  const co = new Set([1, tongTrang]);
  for (let i = hienTai - bienDo; i <= hienTai + bienDo; i++) if (i >= 1 && i <= tongTrang) co.add(i);
  const ds = [...co].sort((a, b) => a - b);
  const kq = [];
  ds.forEach((t, i) => {
    const truoc = ds[i - 1];
    if (truoc !== undefined) {
      if (t - truoc === 2) kq.push(truoc + 1);
      else if (t - truoc > 2) kq.push("…");
    }
    kq.push(t);
  });
  return kq;
}

export function dinhDangGiaGon(so) {
  if (so >= 1e6) return `${(so / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  if (so >= 1e3) return `${Math.round(so / 1e3).toLocaleString("vi-VN")} nghìn`;
  return `${so} ₫`;
}

const lamTronDep = (so) => {
  const buoc = Math.max(1000, 5 * 10 ** (Math.floor(Math.log10(so)) - 1));
  return Math.round(so / buoc) * buoc;
};

/**
 * Chia dải giá thực tế của cửa hàng thành các mức theo tứ phân vị, mốc làm tròn gọn.
 * @returns {{tu: number|null, den: number|null, nhan: string}[]} rỗng nếu dữ liệu quá ít để chia
 */
export function chiaMucGia(dsGia, soMuc = 4) {
  const gia = dsGia.filter((g) => Number.isFinite(g) && g > 0).sort((a, b) => a - b);
  if (gia.length < soMuc * 2) return [];
  const moc = [];
  for (let k = 1; k < soMuc; k++) {
    const m = lamTronDep(gia[Math.floor((gia.length * k) / soMuc)]);
    if (m > (moc.at(-1) ?? 0)) moc.push(m);
  }
  if (!moc.length) return [];
  const mucs = [
    { tu: null, den: moc[0], nhan: `Dưới ${dinhDangGiaGon(moc[0])}` },
    ...moc.slice(1).map((m, i) => ({ tu: moc[i], den: m, nhan: `${dinhDangGiaGon(moc[i])} – ${dinhDangGiaGon(m)}` })),
    { tu: moc.at(-1), den: null, nhan: `Trên ${dinhDangGiaGon(moc.at(-1))}` },
  ];
  return mucs;
}

/** @returns {{khoa: "tuKhoa"|"danhMuc"|"gia"|"conHang", nhan: string}[]} các bộ lọc đang bật, theo thứ tự hiển thị */
export function chipBoLoc(boLoc, tenDanhMuc) {
  const chip = [];
  if (boLoc.tuKhoa) chip.push({ khoa: "tuKhoa", nhan: `“${boLoc.tuKhoa}”` });
  if (boLoc.danhMuc) chip.push({ khoa: "danhMuc", nhan: tenDanhMuc || "Danh mục" });
  if (boLoc.giaTu !== null || boLoc.giaDen !== null) {
    const nhan = boLoc.giaTu !== null && boLoc.giaDen !== null
      ? `${dinhDangGiaGon(boLoc.giaTu)} – ${dinhDangGiaGon(boLoc.giaDen)}`
      : boLoc.giaTu !== null ? `Từ ${dinhDangGiaGon(boLoc.giaTu)}` : `Đến ${dinhDangGiaGon(boLoc.giaDen)}`;
    chip.push({ khoa: "gia", nhan });
  }
  if (boLoc.conHang) chip.push({ khoa: "conHang", nhan: "Còn hàng" });
  return chip;
}

export function boLocKhiGo(boLoc, khoa) {
  const moi = { ...boLoc, trang: 1 };
  if (khoa === "tuKhoa") moi.tuKhoa = "";
  else if (khoa === "danhMuc") moi.danhMuc = "";
  else if (khoa === "gia") Object.assign(moi, { giaTu: null, giaDen: null });
  else if (khoa === "conHang") moi.conHang = false;
  return moi;
}

export const boLocKhiXoaHet = (boLoc) => ({ ...BO_LOC_MAC_DINH, sapXep: boLoc.sapXep });

/** @returns {"het"|"sap_het"|"moi"|null} nhãn nổi trên thẻ sản phẩm, ưu tiên cảnh báo tồn kho */
export function nhanSanPham(sp, bayGio = Date.now()) {
  const ton = phanLoaiTon(sp.soLuongTon);
  if (ton !== "con") return ton;
  return laMoi(sp, bayGio) ? "moi" : null;
}

/** chuỗi đổi khi giá hoặc tồn kho của bất kỳ sản phẩm nào đổi; dùng để biết bản tải mới có khác bản cache không */
export const chuKyDanhSach = (dsSanPham) => dsSanPham.map((sp) => `${sp.id}:${sp.gia}:${sp.soLuongTon}:${sp.trangThai}`).join("|");

export function tieuDeTrang(boLoc, tenDanhMuc) {
  if (boLoc.tuKhoa) return `Kết quả cho “${boLoc.tuKhoa}”`;
  if (boLoc.danhMuc && tenDanhMuc) return tenDanhMuc;
  return "Sản phẩm";
}

export const mucGiaDangChon = (muc, boLoc) => muc.tu === boLoc.giaTu && muc.den === boLoc.giaDen;

/** @returns {{tu: number, den: number}} thứ tự sản phẩm đang hiển thị trên trang, tính từ 1 */
export function khoangHienThi(trang, kichThuoc, tong) {
  const tu = (trang - 1) * kichThuoc + 1;
  return { tu, den: Math.min(trang * kichThuoc, tong) };
}
