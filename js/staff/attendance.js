import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import { pulse } from "/js/motion.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const btnCheckin = document.getElementById("btn-checkin");
const btnCheckout = document.getElementById("btn-checkout");
const statusEl = document.getElementById("attendance-status");

/**
 * Xử lý bấm nút "Vào Ca"
 * Tác dụng: Tạo 1 bản ghi vào ca trên Firestore collection 'chamcong'
 */
btnCheckin?.addEventListener("click", async () => {
  try {
    await addDoc(collection(db, "chamcong"), {
      nhanVienId: auth.currentUser?.uid || "",
      ngay: new Date().toISOString().split("T")[0],
      gioVao: serverTimestamp(),
      gioRa: null
    });

    // Ghi nhật ký điểm danh
    await ghiNhatKy("diem_danh_vao_ca");

    showToast("Vào ca làm việc thành công!", "success");
    if (statusEl) statusEl.textContent = "Trạng thái: Đang trong ca làm";
    pulse(statusEl);
    btnCheckin.disabled = true;
    if (btnCheckout) btnCheckout.disabled = false;
  } catch (err) {
    showToast("Vào ca thất bại!", "error");
    console.error("Lỗi điểm danh vào ca:", err);
  }
});

/**
 * Xử lý bấm nút "Ra Ca"
 * Tác dụng: Ghi nhận kết thúc ca làm việc
 */
btnCheckout?.addEventListener("click", async () => {
  try {
    // Ghi nhật ký hệ thống
    await ghiNhatKy("diem_danh_ra_ca");

    showToast("Ra ca làm việc thành công!", "success");
    if (statusEl) statusEl.textContent = "Trạng thái: Đã kết thúc ca làm";
    pulse(statusEl);
    btnCheckout.disabled = true;
  } catch (err) {
    showToast("Ra ca thất bại!", "error");
    console.error("Lỗi điểm danh ra ca:", err);
  }
});