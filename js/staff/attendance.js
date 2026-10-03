import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, ngayHienTai } from "/js/utils.js";
import { pulse } from "/js/motion.js";
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const btnCheckin = document.getElementById("btn-checkin");
const btnCheckout = document.getElementById("btn-checkout");
const statusEl = document.getElementById("attendance-status");

// Biến lưu ID của bản ghi chấm công hiện tại
let currentChamCongId = null;

/**
 * Kiểm tra trạng thái chấm công hôm nay từ Firestore
 */
async function layTrangThaiCaLam(user) {
  if (!user) return;

  try {
    const homNay = ngayHienTai();
    
    // Truy vấn đơn giản hơn (không orderBy) để tránh lỗi thiếu Index của Firestore
    const q = query(
      collection(db, "chamcong"),
      where("nhanVienId", "==", user.uid),
      where("ngay", "==", homNay)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Sắp xếp các bản ghi theo thời gian tạo mới nhất ở JS
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.gioVao?.seconds || 0) - (a.gioVao?.seconds || 0));
      
      const lastDoc = docs[0];

      if (lastDoc.gioVao && !lastDoc.gioRa) {
        // Đã Vào ca nhưng Chưa Ra ca
        currentChamCongId = lastDoc.id;
        if (statusEl) statusEl.textContent = "Trạng thái: Đang trong ca làm";
        if (btnCheckin) btnCheckin.disabled = true;
        if (btnCheckout) btnCheckout.disabled = false;
        return;
      } else if (lastDoc.gioVao && lastDoc.gioRa) {
        // Đã hoàn thành ca làm trong ngày
        if (statusEl) statusEl.textContent = "Trạng thái: Đã kết thúc ca làm hôm nay";
        if (btnCheckin) btnCheckin.disabled = true;
        if (btnCheckout) btnCheckout.disabled = true;
        return;
      }
    }

    // Mặc định: Chưa vào ca
    if (statusEl) statusEl.textContent = "Trạng thái: Chưa vào ca";
    if (btnCheckin) btnCheckin.disabled = false;
    if (btnCheckout) btnCheckout.disabled = true;

  } catch (err) {
    console.error("Lỗi kiểm tra trạng thái ca làm:", err);
  }
}

// Lắng nghe trạng thái đăng nhập để lấy thông tin ca làm
onAuthStateChanged(auth, (user) => {
  if (user) {
    layTrangThaiCaLam(user);
  }
});

/**
 * Xử lý bấm nút "Vào Ca"
 */
btnCheckin?.addEventListener("click", async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      showToast("Vui lòng đăng nhập lại!", "error");
      return;
    }

    btnCheckin.disabled = true; // Chống spam click

    const docRef = await addDoc(collection(db, "chamcong"), {
      nhanVienId: user.uid,
      ngay: ngayHienTai(),
      gioVao: serverTimestamp(),
      gioRa: null
    });

    currentChamCongId = docRef.id;

    try {
      await ghiNhatKy("diem_danh_vao_ca");
    } catch (e) {
      console.warn("Không thể ghi nhật ký:", e);
    }

    showToast("Vào ca làm việc thành công!", "success");
    if (statusEl) statusEl.textContent = "Trạng thái: Đang trong ca làm";
    pulse(statusEl);
    btnCheckin.disabled = true;
    if (btnCheckout) btnCheckout.disabled = false;
  } catch (err) {
    btnCheckin.disabled = false;
    showToast("Vào ca thất bại!", "error");
    console.error("Lỗi điểm danh vào ca:", err);
  }
});

/**
 * Xử lý bấm nút "Ra Ca"
 */
btnCheckout?.addEventListener("click", async () => {
  try {
    if (!currentChamCongId) {
      showToast("Không tìm thấy lượt vào ca cần kết thúc!", "error");
      return;
    }

    btnCheckout.disabled = true; // Chống spam click

    // Cập nhật giờ ra vào Firestore
    const chamCongRef = doc(db, "chamcong", currentChamCongId);
    await updateDoc(chamCongRef, {
      gioRa: serverTimestamp()
    });

    try {
      await ghiNhatKy("diem_danh_ra_ca");
    } catch (e) {
      console.warn("Không thể ghi nhật ký:", e);
    }

    showToast("Ra ca làm việc thành công!", "success");
    if (statusEl) statusEl.textContent = "Trạng thái: Đã kết thúc ca làm hôm nay";
    pulse(statusEl);
    if (btnCheckout) btnCheckout.disabled = true;
    if (btnCheckin) btnCheckin.disabled = true;
  } catch (err) {
    btnCheckout.disabled = false;
    showToast("Ra ca thất bại!", "error");
    console.error("Lỗi điểm danh ra ca:", err);
  }
});