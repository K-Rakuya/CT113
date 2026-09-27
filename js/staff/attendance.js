import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import { 
  collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const btnCheckin = document.getElementById("btn-checkin");
const btnCheckout = document.getElementById("btn-checkout");
const statusEl = document.getElementById("attendance-status");
let currentAttendanceId = null;

// Lắng nghe trạng thái đăng nhập & phục hồi dữ liệu chấm công từ Firestore
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await checkTodayAttendance(user.uid);
  }
});

async function checkTodayAttendance(uid) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "chamcong"),
      where("nhanVienId", "==", uid),
      where("ngay", "==", todayStr)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0].data();
      currentAttendanceId = snap.docs[0].id;

      if (docData.gioRa) {
        if (statusEl) statusEl.textContent = "Trạng thái: Đã kết thúc ca làm";
        if (btnCheckin) btnCheckin.disabled = true;
        if (btnCheckout) btnCheckout.disabled = true;
      } else {
        if (statusEl) statusEl.textContent = "Trạng thái: Đang trong ca làm";
        if (btnCheckin) btnCheckin.disabled = true;
        if (btnCheckout) btnCheckout.disabled = false;
      }
    } else {
      if (statusEl) statusEl.textContent = "Trạng thái: Chưa điểm danh";
      if (btnCheckin) btnCheckin.disabled = false;
      if (btnCheckout) btnCheckout.disabled = true;
    }
  } catch (err) {
    console.error("Lỗi kiểm tra chấm công:", err);
  }
}

// Xử lý "Vào Ca"
btnCheckin?.addEventListener("click", async () => {
  if (!auth.currentUser) return;
  try {
    const docRef = await addDoc(collection(db, "chamcong"), {
      nhanVienId: auth.currentUser.uid,
      ngay: new Date().toISOString().split("T")[0],
      gioVao: serverTimestamp(),
      gioRa: null
    });
    currentAttendanceId = docRef.id;

    await ghiNhatKy("diem_danh_vao_ca");
    showToast("Vào ca làm việc thành công!", "success");
    checkTodayAttendance(auth.currentUser.uid);
  } catch (err) {
    showToast("Vào ca thất bại!", "error");
    console.error(err);
  }
});

// Xử lý "Ra Ca"
btnCheckout?.addEventListener("click", async () => {
  if (!currentAttendanceId) return;
  try {
    await updateDoc(doc(db, "chamcong", currentAttendanceId), {
      gioRa: serverTimestamp()
    });

    await ghiNhatKy("diem_danh_ra_ca");
    showToast("Ra ca làm việc thành công!", "success");
    checkTodayAttendance(auth.currentUser.uid);
  } catch (err) {
    showToast("Ra ca thất bại!", "error");
    console.error(err);
  }
});