import { checkRole } from "/js/router-guard.js";
import { dangXuat } from "/js/auth.js";

/**
 * Mở trang quản trị sau khi xác thực vai trò, rồi chạy khoiTao(vaiTro).
 * @param {string[]} vaiTroChoPhep
 * @param {(vaiTro: string) => void} khoiTao
 */
export function khoiTaoTrangQuanTri(vaiTroChoPhep, khoiTao) {
  checkRole(vaiTroChoPhep, (vaiTro) => {
    document.getElementById("btn-dang-xuat").addEventListener("click", async () => {
      await dangXuat();
      window.location.href = "/login.html";
    });
    document.body.hidden = false;
    khoiTao(vaiTro);
  });
}
