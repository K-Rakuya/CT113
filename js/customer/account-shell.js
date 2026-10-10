import { dungMenuTaiKhoan } from "/js/customer/account-rules.js";

const menu = document.querySelector(".tk-nav");

if (menu) {
  if (!menu.firstElementChild) menu.innerHTML = dungMenuTaiKhoan(location.pathname);

  const hienTai = menu.querySelector('[aria-current="page"]');
  if (hienTai && menu.scrollWidth > menu.clientWidth) {
    menu.scrollLeft = hienTai.offsetLeft - (menu.clientWidth - hienTai.offsetWidth) / 2;
  }
}

const ten = document.getElementById("user-info");
const anhDaiDien = document.querySelector(".tk-user__avatar");

if (ten && anhDaiDien) {
  const capNhat = () => {
    anhDaiDien.textContent = (ten.textContent.trim()[0] ?? "").toLocaleUpperCase("vi");
  };
  new MutationObserver(capNhat).observe(ten, { childList: true, characterData: true, subtree: true });
  capNhat();
}
