import { escapeHtml } from "/js/utils.js";

const gio = (ms) => (ms == null ? "" : new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));

export function tenNguoiGui(tin, phien) {
  if (tin.vaiTro === "khach") return phien.hoTenKhach || "Khách hàng";
  if (tin.vaiTro === "chu") return "Chủ cửa hàng";
  return phien.nhanVienTen || "Nhân viên";
}

/** chỉ thêm tin mới vào cuối, đổi phiên thì dựng lại từ đầu */
export function veTinNhan(elDanhSach, dsTin, phien, uidToi) {
  if (elDanhSach.dataset.phien !== phien.id) {
    elDanhSach.dataset.phien = phien.id;
    elDanhSach.dataset.soTin = "0";
    elDanhSach.replaceChildren();
  }
  const daVe = Number(elDanhSach.dataset.soTin);
  const dangODuoi = elDanhSach.scrollHeight - elDanhSach.scrollTop - elDanhSach.clientHeight < 80;
  if (!dsTin.length) elDanhSach.innerHTML = '<p class="chat-trong">Chưa có tin nhắn nào.</p>';
  else if (!daVe) elDanhSach.replaceChildren();
  for (const tin of dsTin.slice(daVe)) {
    const el = document.createElement("div");
    el.className = `chat-tin ${tin.nguoiGuiId === uidToi ? "chat-tin--toi" : "chat-tin--doi"}`;
    el.innerHTML = `<div class="chat-tin__ten">${escapeHtml(tenNguoiGui(tin, phien))} · ${gio(tin.ngayGui)}</div>${escapeHtml(tin.noiDung)}`;
    elDanhSach.append(el);
  }
  elDanhSach.dataset.soTin = String(dsTin.length);
  if (dangODuoi || !daVe) elDanhSach.scrollTop = elDanhSach.scrollHeight;
}
