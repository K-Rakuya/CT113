import { db } from "/js/firebase-config.js";
import { showToast } from "/js/utils.js";
import { animateNumber } from "/js/motion.js";
import { laNhanSu } from "/js/admin/users-rules.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export async function khoiTao() {
  try {
    const nguoiDung = (await getDocs(collection(db, "users"))).docs.map((d) => d.data());
    const nhanSu = nguoiDung.filter((u) => laNhanSu(u.vaiTro)).length;
    animateNumber(document.getElementById("stat-nguoi-dung"), nguoiDung.length, { from: 0 });
    animateNumber(document.getElementById("stat-bi-khoa"), nguoiDung.filter((u) => u.trangThai === "khoa").length, { from: 0 });
    animateNumber(document.getElementById("stat-nhan-su"), nhanSu, { from: 0 });
    animateNumber(document.getElementById("stat-khach-hang"), nguoiDung.length - nhanSu, { from: 0 });
  } catch (err) {
    showToast("Không tải được số liệu tổng quan.", "error");
    console.error("Lỗi dashboard quản trị:", err);
  }
}
