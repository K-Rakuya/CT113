import { db } from "/js/firebase-config.js";
import { showToast } from "/js/utils.js";
import { animateNumber } from "/js/motion.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export async function khoiTao() {
  try {
    const [dm, sp, nd] = await Promise.all([getDocs(collection(db, "danhmuc")), getDocs(collection(db, "sanpham")), getDocs(collection(db, "users"))]);
    animateNumber(document.getElementById("stat-nguoi-dung"), nd.size, { from: 0 });
    animateNumber(document.getElementById("stat-bi-khoa"), nd.docs.filter((d) => d.data().trangThai === "khoa").length, { from: 0 });
    animateNumber(document.getElementById("stat-danh-muc"), dm.size, { from: 0 });
    animateNumber(document.getElementById("stat-san-pham"), sp.size, { from: 0 });
  } catch (err) {
    showToast("Không tải được số liệu tổng quan.", "error");
    console.error("Lỗi dashboard quản trị:", err);
  }
}
