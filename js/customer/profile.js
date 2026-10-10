// Trang customer/profile.html: xem và sửa thông tin cá nhân (collection users).
// Quy tắc firestore chỉ cho phép sửa hoTen, soDienThoai, diaChi.

import { auth, db } from "/js/firebase-config.js";
import { showToast } from "/js/utils.js";
import { setBusy, swapContent } from "/js/motion.js";
import { chuanHoaHoSo, coThayDoi, kiemTraHoSo } from "/js/customer/profile-rules.js";
import { datLoiTruong } from "/js/customer/field-error.js";
import { veLoi } from "/js/customer/account-view.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-ho-so");

const KHUNG_FORM = `
  <form id="form-ho-so" class="tk-form" novalidate>
    <div class="form-group">
      <label for="email">Email</label>
      <input class="input" type="email" id="email" disabled>
      <span class="hint">Email dùng để đăng nhập nên không thể đổi tại đây.</span>
    </div>
    <div class="tk-form__row">
      <div class="form-group">
        <label for="ho-ten">Họ tên</label>
        <input class="input" type="text" id="ho-ten" maxlength="80" autocomplete="name" required data-loi="loi-ho-ten" aria-describedby="loi-ho-ten">
        <span class="error-text" id="loi-ho-ten" hidden></span>
      </div>
      <div class="form-group">
        <label for="sdt">Số điện thoại</label>
        <input class="input" type="tel" id="sdt" inputmode="tel" autocomplete="tel" required data-loi="loi-sdt" aria-describedby="loi-sdt">
        <span class="error-text" id="loi-sdt" hidden></span>
      </div>
    </div>
    <div class="form-group">
      <label for="dia-chi">Địa chỉ</label>
      <textarea class="textarea" id="dia-chi" rows="3" maxlength="300" autocomplete="street-address" data-loi="loi-dia-chi" aria-describedby="loi-dia-chi dia-chi-goi-y"></textarea>
      <span class="hint" id="dia-chi-goi-y">Được dùng làm địa chỉ giao hàng mặc định khi thanh toán.</span>
      <span class="error-text" id="loi-dia-chi" hidden></span>
    </div>
    <div class="tk-form__actions">
      <span class="tk-form__state" role="status"></span>
      <button type="submit" class="btn btn--primary" id="btn-luu">Lưu thay đổi</button>
    </div>
  </form>`;

export async function initHoSo() {
  try {
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (!snap.exists()) return hienLoi("Không tìm thấy hồ sơ.");
    swapContent(elNoiDung, () => render(snap.data()));
    elNoiDung.removeAttribute("aria-busy");
  } catch (err) {
    hienLoi("Không tải được hồ sơ.");
    showToast(err.message, "error");
  }
}

function hienLoi(thongDiep) {
  elNoiDung.innerHTML = veLoi(thongDiep);
  elNoiDung.removeAttribute("aria-busy");
}

function render(hoSo) {
  elNoiDung.innerHTML = KHUNG_FORM;

  const form = document.getElementById("form-ho-so");
  const oEmail = form.querySelector("#email");
  const oHoTen = form.querySelector("#ho-ten");
  const oSdt = form.querySelector("#sdt");
  const oDiaChi = form.querySelector("#dia-chi");
  const nutLuu = form.querySelector("#btn-luu");
  const dongTrangThai = form.querySelector(".tk-form__state");

  oEmail.value = hoSo.email ?? "";
  oHoTen.value = hoSo.hoTen ?? "";
  oSdt.value = hoSo.soDienThoai ?? "";
  oDiaChi.value = hoSo.diaChi ?? "";

  let daLuu = chuanHoaHoSo(hoSo);
  const docForm = () => ({ hoTen: oHoTen.value, soDienThoai: oSdt.value, diaChi: oDiaChi.value });
  const cacTruong = { hoTen: oHoTen, soDienThoai: oSdt, diaChi: oDiaChi };

  form.addEventListener("input", (e) => {
    dongTrangThai.textContent = coThayDoi(daLuu, docForm()) ? "Có thay đổi chưa lưu" : "";
    if (e.target.dataset.loi) datLoiTruong(e.target, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!coThayDoi(daLuu, docForm())) {
      dongTrangThai.textContent = "Chưa có thay đổi nào để lưu";
      return;
    }
    const kq = kiemTraHoSo(docForm());
    for (const [ten, o] of Object.entries(cacTruong)) datLoiTruong(o, kq.loi[ten]);
    if (!kq.hopLe) {
      Object.entries(cacTruong).find(([ten]) => kq.loi[ten])?.[1].focus();
      return;
    }

    setBusy(nutLuu, true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), kq.giaTri);
      daLuu = kq.giaTri;
      oHoTen.value = kq.giaTri.hoTen;
      oSdt.value = kq.giaTri.soDienThoai;
      oDiaChi.value = kq.giaTri.diaChi;
      setBusy(nutLuu, false);
      dongTrangThai.textContent = "Đã lưu thay đổi";
      showToast("Đã lưu thông tin.", "success");
    } catch (err) {
      setBusy(nutLuu, false);
      showToast("Lưu thất bại: " + err.message, "error");
    }
  });
}
