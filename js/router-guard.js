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
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      vaiTro = snap.exists() ? snap.data().vaiTro : null;
    } catch {
      vaiTro = null;
    }

    if (!vaiTroChoPhep.includes(vaiTro)) {
      window.location.href = "/index.html";
      return;
    }

    onDaXacThuc?.(vaiTro);
  });
}
