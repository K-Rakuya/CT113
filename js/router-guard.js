import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { layVaiTroHienTai } from "./auth.js";

// Chèn ĐẦU mỗi trang staff/admin/owner, TRƯỚC khi trang render nội dung
export function checkRole(vaiTroChoPhep) {
  onAuthStateChanged(auth, async function (user) {
    if (!user) { window.location.href = "/login.html"; return; }
    const vaiTro = await layVaiTroHienTai();
    if (!vaiTroChoPhep.includes(vaiTro)) window.location.href = "/index.html";
  });
}