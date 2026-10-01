// js/customer/order-detail.js
// Trang customer/order-detail.html: chi tiết 1 đơn. Collection: donhang, chitietdonhang.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast } from "/js/utils.js";
import { swapContent } from "/js/motion.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-chi-tiet-don");

const NHAN_TRANG_THAI = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

export async function initChiTietDonHang() {
  const donHangId = new URLSearchParams(window.location.search).get("id");
  if (!donHangId) {
    elNoiDung.innerHTML = '<p class="empty-state">Thiếu mã đơn hàng.</p>';
    return;
  }

  try {
    const donSnap = await getDoc(doc(db, "donhang", donHangId));
    if (!donSnap.exists() || donSnap.data().khachHangId !== auth.currentUser.uid) {
      // thông báo thay vì để lỗi permission-denied thô hiện ra.
      elNoiDung.innerHTML = '<p class="empty-state">Không tìm thấy đơn hàng.</p>';
      return;
    }
    const don = { id: donSnap.id, ...donSnap.data() };

    const ctdhSnap = await getDocs(
      query(collection(db, "chitietdonhang"), where("donHangId", "==", donHangId))
    );
    const chiTiet = ctdhSnap.docs.map((d) => d.data());

    // Lấy thêm tên/ảnh sản phẩm để hiển thị đẹp hơn.
    const chiTietDayDu = await Promise.all(
      chiTiet.map(async (ct) => {
        const spSnap = await getDoc(doc(db, "sanpham", ct.sanPhamId));
        return { ...ct, tenSanPham: spSnap.exists() ? spSnap.data().tenSanPham : "(Sản phẩm đã bị xoá)" };
      })
    );

    swapContent(elNoiDung, () => render(don, chiTietDayDu));
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được đơn hàng.</p>';
    showToast(err.message, "error");
  }
}

function render(don, chiTiet) {
  const maDon = "Đơn #" + don.id.slice(0, 8).toUpperCase();
  const elBreadcrumb = document.getElementById("breadcrumb-ma-don");
  if (elBreadcrumb) elBreadcrumb.textContent = maDon;

  elNoiDung.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h2 style="margin:0;">${maDon}</h2>
        <span class="badge badge--${don.trangThai}">${NHAN_TRANG_THAI[don.trangThai] || don.trangThai}</span>
      </div>
      <p class="text-muted">Ngày đặt: ${formatDate(don.ngayDat)}</p>
      <p><strong>Địa chỉ giao hàng:</strong> ${don.diaChiGiao}</p>

      <div class="table-responsive" style="margin-top: var(--spacing-md);">
        <table class="table">
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>
            ${chiTiet
              .map(
                (ct) => `
              <tr>
                <td>${ct.tenSanPham}</td>
                <td>${ct.soLuong}</td>
                <td>${formatCurrency(ct.donGia)}</td>
                <td>${formatCurrency(ct.thanhTien)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="kh-summary__row kh-summary__total" style="margin-top: var(--spacing-md);">
        <span>Tổng cộng</span><span>${formatCurrency(don.tongTien)}</span>
      </div>
    </div>
  `;
}
