// js/customer/orders.js
// Trang customer/orders.html: lịch sử đơn hàng, lọc theo trạng thái. Collection: donhang.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast } from "/js/utils.js";
import { swapContent } from "/js/motion.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("danh-sach-don-hang");
const elLoc = document.getElementById("loc-trang-thai");

let tatCaDonHang = [];

const NHAN_TRANG_THAI = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

export async function initDonHang() {
  try {
    const q = query(collection(db, "donhang"), where("khachHangId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    tatCaDonHang = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.ngayDat?.toMillis?.() ?? 0) - (a.ngayDat?.toMillis?.() ?? 0));
    render();
  } catch (err) {
    elDanhSach.innerHTML = '<p class="empty-state">Không tải được đơn hàng.</p>';
    showToast(err.message, "error");
  }
}

elLoc.addEventListener("change", render);

function render() {
  swapContent(elDanhSach, renderNoiDung);
}

function renderNoiDung() {
  const locTheo = elLoc.value;
  const danhSach = locTheo ? tatCaDonHang.filter((d) => d.trangThai === locTheo) : tatCaDonHang;

  if (danhSach.length === 0) {
    elDanhSach.innerHTML = '<p class="empty-state">Không có đơn hàng nào.</p>';
    return;
  }

  elDanhSach.innerHTML = danhSach
    .map(
      (d, i) => `
    <a href="/customer/order-detail.html?id=${d.id}" class="card kh-order-card motion-enter" style="--i:${i}">
      <div>
        <div class="kh-order-card__code">Đơn #${d.id.slice(0, 8).toUpperCase()}</div>
        <div class="kh-order-card__meta">
          <span>${formatDate(d.ngayDat)}</span>
          <span>${formatCurrency(d.tongTien)}</span>
        </div>
      </div>
      <span class="badge badge--${d.trangThai}">${NHAN_TRANG_THAI[d.trangThai] || d.trangThai}</span>
    </a>`
    )
    .join("");
}
