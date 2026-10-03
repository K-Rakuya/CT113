import { checkRole } from "/js/router-guard.js";
import { dangXuat } from "/js/auth.js";

const THONG_TIN = {
  chu_cua_hang: {
    ten: "Chủ Cửa Hàng",
    muc: [
      ["/owner/dashboard.html", "Tổng quan"],
      ["/owner/products-manage.html", "Sản phẩm"],
      ["/owner/revenue-report.html", "Báo cáo doanh thu"],
    ],
  },
  quan_tri: {
    ten: "Quản Trị Viên",
    muc: [
      ["/admin/dashboard.html", "Tổng quan"],
      ["/owner/products-manage.html", "Sản phẩm"],
      ["/admin/categories.html", "Danh mục"],
      ["/admin/users-manage.html", "Người dùng"],
      ["/admin/system-logs.html", "Nhật ký hệ thống"],
    ],
  },
};

/**
 * Dựng khung trang quản trị theo vai trò rồi chạy khoiTao(vaiTro).
 * @param {string[]} vaiTroChoPhep
 * @param {(vaiTro: string) => void} khoiTao
 */
export function khoiTaoTrangQuanTri(vaiTroChoPhep, khoiTao) {
  checkRole(vaiTroChoPhep, (vaiTro) => {
    const cauHinh = THONG_TIN[vaiTro];
    document.getElementById("ten-vai-tro").textContent = cauHinh.ten;
    document.getElementById("dieu-huong").innerHTML = cauHinh.muc
      .map(([href, ten]) => `<a href="${href}"${window.location.pathname === href ? ' class="active" aria-current="page"' : ""}>${ten}</a>`)
      .join("");
    document.getElementById("btn-dang-xuat").addEventListener("click", async () => {
      await dangXuat();
      window.location.href = "/login.html";
    });
    document.body.hidden = false;
    khoiTao(vaiTro);
  });
}

export const NGUONG_SAP_HET = 5;
