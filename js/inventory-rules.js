export const NGUONG_SAP_HET = 5;

/** @returns {"het"|"sap_het"|"con"} */
export function phanLoaiTon(soLuong) {
  const n = Number(soLuong) || 0;
  if (n <= 0) return "het";
  return n <= NGUONG_SAP_HET ? "sap_het" : "con";
}

/** @returns {{loi: string}|{soLuongTon: number}} */
export function kiemTraTonMoi(giaTri) {
  const chuoi = String(giaTri ?? "").trim();
  const n = Number(chuoi);
  if (chuoi === "" || !Number.isInteger(n) || n < 0) return { loi: "Số lượng tồn phải là số nguyên không âm." };
  if (n > 100000) return { loi: "Số lượng tồn quá lớn." };
  return { soLuongTon: n };
}
