const laSaoHopLe = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

export const saoHopLe = (n) => (laSaoHopLe(n) ? n : 0);

/** @param {number[]} dsSoSao @returns {{soLuot: number, trungBinh: number}} bỏ qua giá trị ngoài 1 đến 5 */
export function tongHopDanhGia(dsSoSao) {
  const hopLe = dsSoSao.filter(laSaoHopLe);
  if (!hopLe.length) return { soLuot: 0, trungBinh: 0 };
  const tong = hopLe.reduce((a, b) => a + b, 0);
  return { soLuot: hopLe.length, trungBinh: Math.round((tong / hopLe.length) * 10) / 10 };
}

export const dinhDangDiem = (diem) => diem.toFixed(1).replace(".", ",");

export const veSao = (soSao) => `${"★".repeat(Math.round(soSao))}${"☆".repeat(5 - Math.round(soSao))}`;

/** cùng danh mục, còn hàng trước, rồi gần giá sản phẩm đang xem nhất */
export function chonSanPhamLienQuan(dsSanPham, hienTai, soLuong = 4) {
  const chenhGia = (sp) => Math.abs((sp.gia ?? 0) - (hienTai.gia ?? 0));
  const conHang = (sp) => ((sp.soLuongTon ?? 0) > 0 ? 0 : 1);
  return dsSanPham
    .filter((sp) => sp.id !== hienTai.id && sp.trangThai === "dang_ban" && sp.danhMucId === hienTai.danhMucId)
    .sort((a, b) => conHang(a) - conHang(b) || chenhGia(a) - chenhGia(b))
    .slice(0, soLuong);
}
