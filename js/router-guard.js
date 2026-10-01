// js/router-guard.js
// -----------------------------------------------------------------------------
// Chặn truy cập trang theo vai trò. Đặt ngay đầu <body>
// -----------------------------------------------------------------------------

import { auth, db } from "/js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/**
 * @param {string[]} vaiTroChoPhep - vd. ["nhan_vien"], ["quan_tri"],
 *   ["chu_cua_hang"], ["khach_hang"]
 * @param {(vaiTro:string)=>void} [onDaXacThuc] - (bổ sung, tuỳ chọn) callback
 *   chạy đúng 1 lần khi vai trò hợp lệ đã xác nhận xong. Dùng để giải quyết
 *   trang lộ khung giao diện trong tích tắc trước khi checkRole
 *   chạy xong: ẩn <body hidden> trong HTML, rồi trong callback này mới bỏ
 *   thuộc tính hidden. Hoàn toàn tương thích ngược — không truyền tham số
 *   này thì checkRole hoạt động y như trước.
 * @returns {void}
 */
export function checkRole(vaiTroChoPhep, onDaXacThuc) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    let vaiTro = null;
    let userData = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        userData = snap.data();
        vaiTro = userData.vaiTro;
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin vai trò:", err);
      vaiTro = null;
    }

    if (!vaiTroChoPhep.includes(vaiTro)) {
      window.location.href = "/index.html";
      return;
    }

    // Gán tên hiển thị thay cho chữ "Đang tải..."
    const userInfoEl = document.getElementById("user-info");
    if (userInfoEl) {
      userInfoEl.textContent = userData?.hoTen || user.email || "Nhân viên";
    }

    onDaXacThuc?.(vaiTro);
  });
}

// =============================================================================
// CODE BỔ SUNG: Cập nhật tên hiển thị & Xử lý sự kiện Đăng xuất
// =============================================================================

import { signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Tự động thay thế chữ "Đang tải..." bằng tên người dùng
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  let displayName = user.email ? user.email.split("@")[0] : "Người dùng";

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().hoTen) {
      displayName = snap.data().hoTen;
    }
  } catch (err) {
    console.error("Lỗi lấy thông tin tên người dùng:", err);
  }

  // Cập nhật tên vào các thẻ hiển thị tên user
  const nameElements = document.querySelectorAll("#user-name, .topbar__user-name, .user-badge, span[class*='user']");
  nameElements.forEach((el) => {
    el.textContent = displayName;
  });

  // Tắt chữ "Đang tải..." trên giao diện
  document.querySelectorAll("span, button, div").forEach((el) => {
    if (el.children.length === 0 && el.textContent.trim() === "Đang tải...") {
      el.textContent = displayName;
    }
  });
});

// Xử lý sự kiện click nút Đăng xuất (Logout)
document.addEventListener("click", async (e) => {
  const logoutBtn = e.target.closest("#logout-btn, .btn-logout, [id*='logout'], [class*='logout']");
  if (logoutBtn) {
    e.preventDefault();
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login.html";
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
      alert("Đăng xuất thất bại. Vui lòng thử lại!");
    }
  }
});