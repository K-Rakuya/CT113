export const GIOI_HAN_HO_SO = { hoTen: 80, diaChi: 300 };

const MAU_SO_DIEN_THOAI = /^[0-9]{9,11}$/;
const CAC_TRUONG = ["hoTen", "soDienThoai", "diaChi"];

export function chuanHoaHoSo(hoSo) {
  return {
    hoTen: String(hoSo?.hoTen ?? "").trim().replace(/\s+/g, " "),
    soDienThoai: String(hoSo?.soDienThoai ?? "").replace(/\s+/g, ""),
    diaChi: String(hoSo?.diaChi ?? "").trim(),
  };
}

export function kiemTraHoSo(hoSo) {
  const giaTri = chuanHoaHoSo(hoSo);
  const loi = {};

  if (!giaTri.hoTen) loi.hoTen = "Vui lòng nhập họ tên.";
  else if (giaTri.hoTen.length > GIOI_HAN_HO_SO.hoTen) loi.hoTen = `Họ tên tối đa ${GIOI_HAN_HO_SO.hoTen} ký tự.`;

  if (!giaTri.soDienThoai) loi.soDienThoai = "Vui lòng nhập số điện thoại.";
  else if (!MAU_SO_DIEN_THOAI.test(giaTri.soDienThoai)) loi.soDienThoai = "Số điện thoại gồm 9 đến 11 chữ số.";

  if (giaTri.diaChi.length > GIOI_HAN_HO_SO.diaChi) loi.diaChi = `Địa chỉ tối đa ${GIOI_HAN_HO_SO.diaChi} ký tự.`;

  return { hopLe: Object.keys(loi).length === 0, loi, giaTri };
}

export function coThayDoi(goc, moi) {
  const a = chuanHoaHoSo(goc);
  const b = chuanHoaHoSo(moi);
  return CAC_TRUONG.some((k) => a[k] !== b[k]);
}
