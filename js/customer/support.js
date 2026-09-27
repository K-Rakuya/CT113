// js/customer/support.js
// Trang customer/support.html: gửi yêu cầu hỗ trợ, theo dõi realtime bằng
// onSnapshot. Collection: yeucauhotro.

import { auth, db } from "/js/firebase-config.js";
import { formatDate, showToast } from "/js/utils.js";
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("danh-sach-yeu-cau");
const elForm = document.getElementById("form-gui-yeu-cau");

const NHAN_TRANG_THAI = {
  cho_xu_ly: "Chờ xử lý",
  dang_xu_ly: "Đang xử lý",
  da_xong: "Đã xong",
};

let huyDangKy = null; // hàm unsubscribe của onSnapshot hiện tại

export function initHoTro() {
  const q = query(collection(db, "yeucauhotro"), where("khachHangId", "==", auth.currentUser.uid));

  // lưu hàm huỷ đăng ký onSnapshot và gọi khirời trang, tránh rò rỉ listener khi người dùng chuyển trang liên tục.
  huyDangKy = onSnapshot(
    q,
    (snap) => {
      const danhSach = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.ngayTao?.toMillis?.() ?? 0) - (a.ngayTao?.toMillis?.() ?? 0));
      render(danhSach);
    },
    (err) => {
      elDanhSach.innerHTML = '<p class="empty-state">Không tải được yêu cầu hỗ trợ.</p>';
      console.error(err);
    }
  );

  window.addEventListener("beforeunload", huyKhiRoiTrang);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") huyKhiRoiTrang();
  });
}

function huyKhiRoiTrang() {
  huyDangKy?.();
  huyDangKy = null;
}

function render(danhSach) {
  if (danhSach.length === 0) {
    elDanhSach.innerHTML = '<p class="empty-state">Bạn chưa gửi yêu cầu hỗ trợ nào.</p>';
    return;
  }

  elDanhSach.innerHTML = danhSach
    .map(
      (yc) => `
    <div class="kh-ticket kh-ticket--${yc.trangThai}">
      <div class="flex-between">
        <strong>${yc.tieuDe}</strong>
        <span class="badge badge--${yc.trangThai}">${NHAN_TRANG_THAI[yc.trangThai] || yc.trangThai}</span>
      </div>
      <p class="text-muted" style="font-size:.85em; margin: 2px 0;">${formatDate(yc.ngayTao)}</p>
      <p>${yc.noiDung}</p>
      ${yc.phanHoi ? `<div class="kh-ticket__phanhoi"><strong>Phản hồi từ nhân viên:</strong> ${yc.phanHoi}</div>` : ""}
    </div>`
    )
    .join("");
}

elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-gui");
  const tieuDe = document.getElementById("tieu-de").value.trim();
  const noiDung = document.getElementById("noi-dung").value.trim();
  if (!tieuDe || !noiDung) return;

  btn.disabled = true;
  btn.textContent = "Đang gửi...";
  try {
    await addDoc(collection(db, "yeucauhotro"), {
      khachHangId: auth.currentUser.uid,
      tieuDe,
      noiDung,
      trangThai: "cho_xu_ly",
      ngayTao: serverTimestamp(),
      nhanVienXuLyId: null,
      phanHoi: "",
    });
    showToast("Đã gửi yêu cầu hỗ trợ.", "success");
    elForm.reset();
  } catch (err) {
    showToast("Gửi yêu cầu thất bại: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Gửi yêu cầu";
  }
});
