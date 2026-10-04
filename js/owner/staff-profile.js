/** @returns {{loi: string}|{chucVu: string, luongCoBan: number}} */
export function kiemTraHoSo({ chucVu, luongCoBan }) {
  const luong = String(luongCoBan ?? "").trim() === "" ? 0 : Number(luongCoBan);
  if (!Number.isFinite(luong) || luong < 0) return { loi: "Lương cơ bản phải là số không âm." };
  const chuc = String(chucVu ?? "").trim();
  if (chuc.length > 60) return { loi: "Chức vụ tối đa 60 ký tự." };
  return { chucVu: chuc, luongCoBan: luong };
}
