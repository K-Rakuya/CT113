export function datLoiTruong(oNhap, thongDiep) {
  const vung = document.getElementById(oNhap.dataset.loi);
  oNhap.classList.toggle("is-invalid", Boolean(thongDiep));
  if (thongDiep) oNhap.setAttribute("aria-invalid", "true");
  else oNhap.removeAttribute("aria-invalid");
  if (vung) {
    vung.textContent = thongDiep ?? "";
    vung.hidden = !thongDiep;
  }
}
