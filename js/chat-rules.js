export const NHAN_TRANG_THAI_PHIEN = {
  cho: "Chờ tiếp nhận",
  dang_chat: "Đang tư vấn",
  da_dong: "Đã kết thúc",
};

export const SO_PHIEN_TOI_DA = 3;
export const DO_DAI_TOI_DA = 1000;

/** @returns {{loi: string}|{noiDung: string}} */
export function kiemTraTinNhan(noiDung) {
  const chuoi = String(noiDung ?? "").trim();
  if (!chuoi) return { loi: "Vui lòng nhập nội dung tin nhắn." };
  if (chuoi.length > DO_DAI_TOI_DA) return { loi: `Tin nhắn tối đa ${DO_DAI_TOI_DA} ký tự.` };
  return { noiDung: chuoi };
}

/** @param {{trangThai: string, ngayTao: number}[]} dsPhien @returns phiên chưa đóng mới nhất, hoặc null */
export function phienDangMo(dsPhien) {
  return dsPhien.filter((p) => p.trangThai !== "da_dong").sort((a, b) => b.ngayTao - a.ngayTao)[0] ?? null;
}

/** @returns {{choTiepNhan: object[], cuaToi: object[], cuaNguoiKhac: object[]}} bể chờ xếp phiên cũ nhất lên đầu */
export function phanBe(dsPhien, uid) {
  const dangMo = dsPhien.filter((p) => p.trangThai !== "da_dong");
  return {
    choTiepNhan: dangMo.filter((p) => p.trangThai === "cho").sort((a, b) => a.ngayTao - b.ngayTao),
    cuaToi: dangMo.filter((p) => p.trangThai === "dang_chat" && p.nhanVienId === uid).sort((a, b) => a.ngayTiepNhan - b.ngayTiepNhan),
    cuaNguoiKhac: dangMo.filter((p) => p.trangThai === "dang_chat" && p.nhanVienId !== uid),
  };
}

export function conTiepNhanDuoc(dsPhien, uid) {
  return phanBe(dsPhien, uid).cuaToi.length < SO_PHIEN_TOI_DA;
}

export function thoiGianCho(tuMs, denMs = Date.now()) {
  const phut = Math.max(0, Math.floor((denMs - tuMs) / 60000));
  if (phut < 1) return "vừa xong";
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  return gio < 24 ? `${gio} giờ ${phut % 60} phút` : `${Math.floor(gio / 24)} ngày`;
}
