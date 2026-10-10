export const NHAN_TRANG_THAI_HO_TRO = {
  cho_xu_ly: "Chờ xử lý",
  dang_xu_ly: "Đang xử lý",
  da_xong: "Đã xong",
};

export const GIOI_HAN_YEU_CAU = { tieuDe: 120, noiDung: 2000 };

export function kiemTraYeuCau({ tieuDe, noiDung }) {
  const giaTri = {
    tieuDe: String(tieuDe ?? "").trim().replace(/\s+/g, " "),
    noiDung: String(noiDung ?? "").trim(),
  };
  const loi = {};

  if (!giaTri.tieuDe) loi.tieuDe = "Vui lòng nhập tiêu đề.";
  else if (giaTri.tieuDe.length > GIOI_HAN_YEU_CAU.tieuDe) loi.tieuDe = `Tiêu đề tối đa ${GIOI_HAN_YEU_CAU.tieuDe} ký tự.`;

  if (!giaTri.noiDung) loi.noiDung = "Vui lòng mô tả vấn đề bạn đang gặp.";
  else if (giaTri.noiDung.length > GIOI_HAN_YEU_CAU.noiDung) loi.noiDung = `Nội dung tối đa ${GIOI_HAN_YEU_CAU.noiDung} ký tự.`;

  return { hopLe: Object.keys(loi).length === 0, loi, giaTri };
}
