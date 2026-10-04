export const MOT_NGAY = 86400000;

export const batDauNgay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const cuoiNgay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function dauTuan(d) {
  const ngay = batDauNgay(d);
  const lech = (ngay.getDay() + 6) % 7;
  return new Date(ngay.getFullYear(), ngay.getMonth(), ngay.getDate() - lech);
}

/**
 * @param {"7"|"30"|"90"|"thang"|"tuy_chon"} kieu
 * @returns {{tu: Date, den: Date, truocTu: Date, truocDen: Date}} khoảng hiện tại và khoảng liền trước cùng độ dài
 */
export function taoKhoang(kieu, tuyChon = {}, bayGio = new Date()) {
  let tu;
  let den = cuoiNgay(bayGio);
  if (kieu === "tuy_chon") {
    tu = batDauNgay(tuyChon.tu);
    den = cuoiNgay(tuyChon.den);
  } else if (kieu === "thang") {
    tu = new Date(bayGio.getFullYear(), bayGio.getMonth(), 1);
  } else {
    const soNgay = Number(kieu);
    tu = new Date(batDauNgay(bayGio).getFullYear(), bayGio.getMonth(), bayGio.getDate() - (soNgay - 1));
  }
  const soNgay = Math.round((batDauNgay(den) - tu) / MOT_NGAY) + 1;
  const truocDen = new Date(tu.getFullYear(), tu.getMonth(), tu.getDate() - 1, 23, 59, 59, 999);
  const truocTu = new Date(tu.getFullYear(), tu.getMonth(), tu.getDate() - soNgay);
  return { tu, den, truocTu, truocDen };
}

const trongKhoang = (don, tu, den) => don.ngay >= tu && don.ngay <= den;

/** @param {{ngay: Date, trangThai: string, tongTien: number}[]} donHang */
export function thongKeDon(donHang, tu, den) {
  const theoTrangThai = { cho_duyet: 0, dang_giao: 0, hoan_thanh: 0, huy: 0 };
  let doanhThu = 0;
  let tong = 0;
  for (const don of donHang) {
    if (!trongKhoang(don, tu, den)) continue;
    tong++;
    if (don.trangThai in theoTrangThai) theoTrangThai[don.trangThai]++;
    if (don.trangThai === "hoan_thanh") doanhThu += Number(don.tongTien) || 0;
  }
  const soDonHoanThanh = theoTrangThai.hoan_thanh;
  return {
    doanhThu,
    soDonHoanThanh,
    giaTriTB: soDonHoanThanh ? Math.round(doanhThu / soDonHoanThanh) : 0,
    tong,
    tyLeHuy: tong ? theoTrangThai.huy / tong : 0,
    choXuLy: theoTrangThai.cho_duyet + theoTrangThai.dang_giao,
    theoTrangThai,
  };
}

/** @returns {number|null} % thay đổi so với kỳ trước; null nếu kỳ trước bằng 0 */
export function phanTramThayDoi(moi, cu) {
  if (!cu) return null;
  return ((moi - cu) / cu) * 100;
}

const dd = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Gom doanh thu đơn hoàn thành theo ngày (khoảng ≤ 35 ngày) hoặc theo tuần. */
export function doanhThuTheoKy(donHang, tu, den) {
  const soNgay = Math.round((batDauNgay(den) - batDauNgay(tu)) / MOT_NGAY) + 1;
  const theoTuan = soNgay > 35;
  const nhom = new Map();

  if (theoTuan) {
    for (let d = dauTuan(tu); d <= den; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
      nhom.set(d.getTime(), { nhan: dd(d), batDau: d, doanhThu: 0, soDon: 0 });
    }
  } else {
    for (let d = batDauNgay(tu); d <= den; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      nhom.set(d.getTime(), { nhan: dd(d), batDau: d, doanhThu: 0, soDon: 0 });
    }
  }

  for (const don of donHang) {
    if (don.trangThai !== "hoan_thanh" || !trongKhoang(don, tu, den)) continue;
    const khoa = (theoTuan ? dauTuan(don.ngay) : batDauNgay(don.ngay)).getTime();
    const o = nhom.get(khoa);
    if (!o) continue;
    o.doanhThu += Number(don.tongTien) || 0;
    o.soDon++;
  }
  return { theoTuan, cacKy: [...nhom.values()] };
}

/** @param {{sanPhamId: string, soLuong: number, thanhTien: number}[]} chiTiet */
export function topSanPham(chiTiet, tenSanPham, n = 5) {
  const gop = new Map();
  for (const ct of chiTiet) {
    const o = gop.get(ct.sanPhamId) ?? { id: ct.sanPhamId, ten: tenSanPham.get(ct.sanPhamId) ?? "(Sản phẩm đã bị xoá)", soLuong: 0, doanhThu: 0 };
    o.soLuong += Number(ct.soLuong) || 0;
    o.doanhThu += Number(ct.thanhTien) || 0;
    gop.set(ct.sanPhamId, o);
  }
  return [...gop.values()].sort((a, b) => b.doanhThu - a.doanhThu).slice(0, n);
}

export function lamTronTran(max) {
  if (max <= 0) return 1;
  const bac = 10 ** Math.floor(Math.log10(max));
  const ty = max / bac;
  return (ty <= 1 ? 1 : ty <= 2 ? 2 : ty <= 5 ? 5 : 10) * bac;
}

export function rutGonTien(n) {
  const gon = (v, hau) => `${String(Math.round(v * 10) / 10).replace(".", ",")} ${hau}`;
  if (n >= 1e9) return gon(n / 1e9, "tỷ");
  if (n >= 1e6) return gon(n / 1e6, "tr");
  if (n >= 1e3) return gon(n / 1e3, "k");
  return String(n);
}
