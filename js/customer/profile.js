// js/customer/profile.js
// Trang customer/profile.html: xem/sửa thông tin cá nhân. Collection: users.
//
// CHỈ cho sửa hoTen, soDienThoai, diaChi.

import { auth, db } from "/js/firebase-config.js";
import { showToast } from "/js/utils.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-ho-so");

export async function initHoSo() {
  const uid = auth.currentUser.uid;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      elNoiDung.innerHTML = '<p class="empty-state">Không tìm thấy hồ sơ.</p>';
      return;
    }
    render(snap.data());
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được hồ sơ.</p>';
    showToast(err.message, "error");
  }
}

function render(ho_so) {
  elNoiDung.innerHTML = `
    <form id="form-ho-so">
      <div class="form-group">
        <label>Email</label>
        <input class="input" type="email" value="${ho_so.email || ''}" disabled>
        <span class="hint">Không thể đổi email tại đây.</span>
      </div>
      <div class="form-group">
        <label for="ho-ten">Họ tên</label>
        <input class="input" type="text" id="ho-ten" value="${ho_so.hoTen || ''}" required>
      </div>
      <div class="form-group">
        <label for="sdt">Số điện thoại</label>
        <input class="input" type="tel" id="sdt" value="${ho_so.soDienThoai || ''}" pattern="^[0-9]{9,11}$" required>
      </div>
      <div class="form-group">
        <label for="dia-chi">Địa chỉ</label>
        <textarea class="textarea" id="dia-chi">${ho_so.diaChi || ''}</textarea>
      </div>
      <button type="submit" class="btn btn--primary" id="btn-luu">Lưu thay đổi</button>
    </form>
  `;

  document.getElementById("form-ho-so").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-luu");
    btn.disabled = true;
    btn.textContent = "Đang lưu...";
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        hoTen: document.getElementById("ho-ten").value.trim(),
        soDienThoai: document.getElementById("sdt").value.trim(),
        diaChi: document.getElementById("dia-chi").value.trim(),
      });
      showToast("Đã lưu thông tin.", "success");
    } catch (err) {
      showToast("Lưu thất bại: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Lưu thay đổi";
    }
  });
}
