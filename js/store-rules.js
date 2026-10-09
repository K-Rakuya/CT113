const GIOI_HAN = { ten: 60, slogan: 120, diaChi: 200, gioMoCua: 80, email: 100 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sach = (v) => String(v ?? "").trim().replace(/\s+/g, " ");

export const laEmailHopLe = (email) => EMAIL.test(email) && email.length <= GIOI_HAN.email;

export function laHotlineHopLe(hotline) {
  const so = hotline.replace(/\D/g, "");
  return /^\+?[0-9][0-9 .\-]*[0-9]$/.test(hotline) && so.length >= 8 && so.length <= 15;
}

/** @returns {{loi: string}|{du: {ten: string, slogan: string, diaChi: string, hotline: string, email: string, gioMoCua: string}}} */
export function kiemTraThongTinCuaHang(f) {
  const du = { ten: sach(f.ten), slogan: sach(f.slogan), diaChi: sach(f.diaChi), hotline: sach(f.hotline), email: sach(f.email), gioMoCua: sach(f.gioMoCua) };
  if (!du.ten) return { loi: "Vui lòng nhập tên cửa hàng." };
  for (const [truong, toiDa] of Object.entries(GIOI_HAN)) {
    if (du[truong].length > toiDa) return { loi: `${{ ten: "Tên cửa hàng", slogan: "Giới thiệu ngắn", diaChi: "Địa chỉ", gioMoCua: "Giờ mở cửa", email: "Email" }[truong]} tối đa ${toiDa} ký tự.` };
  }
  if (du.hotline && !laHotlineHopLe(du.hotline)) return { loi: "Hotline không hợp lệ, chỉ gồm chữ số, dấu cách, chấm, gạch ngang (8 đến 15 chữ số)." };
  if (du.email && !laEmailHopLe(du.email)) return { loi: "Email không đúng định dạng." };
  return { du };
}

export const lienKetDienThoai = (hotline) => `tel:${hotline.replace(/[^\d+]/g, "")}`;
