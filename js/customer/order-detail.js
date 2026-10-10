// js/customer/order-detail.js
// Trang customer/order-detail.html: chi tiết 1 đơn. Collection: donhang, chitietdonhang.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDateTime, showToast, escapeHtml } from "/js/utils.js";
import { confirmDialog } from "/js/dialog.js";
import { muaLaiDon } from "/js/customer/reorder.js";
import { NHAN_TRANG_THAI_DON, buocTienTrinh, hanhDongCuaDon, maDon, tongSoLuong } from "/js/customer/order-rules.js";
import { veLoi } from "/js/customer/account-view.js";
import { swapContent, pulse, setBusy, confirmButton, prefersReducedMotion } from "/js/motion.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-chi-tiet-don");

function capNhatTienTrinh(trangThai) {
  const ol = document.getElementById("tien-trinh-don");
  if (!ol) return;
  const buoc = buocTienTrinh(trangThai);
  ol.classList.toggle("is-cancelled", buoc < 0);
  ol.style.setProperty("--buoc", Math.max(0, buoc));
  ol.querySelectorAll("li").forEach((li, i) => {
    li.classList.toggle("is-done", i <= buoc);
    if (i === buoc) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
}

function veHanhDong(don, chiTiet) {
  const el = document.getElementById("hanh-dong-don");
  if (!el) return;
  const { ghiChu, nut } = hanhDongCuaDon(don);
  const nutHtml = {
    "yeu-cau-huy": '<button type="button" class="btn btn--danger" data-hanh-dong="yeu-cau-huy">Yêu cầu huỷ đơn</button>',
    "mua-lai": '<button type="button" class="btn btn--primary" data-hanh-dong="mua-lai">Mua lại</button>',
  }[nut] ?? "";
  el.innerHTML = (ghiChu ? `<p class="tk-order-note" role="status">${ghiChu}</p>` : "") + nutHtml;
  el.onclick = async (e) => {
    const nutBam = e.target.closest("[data-hanh-dong]");
    if (!nutBam) return;
    if (nutBam.dataset.hanhDong === "yeu-cau-huy") await yeuCauHuy(don, chiTiet, nutBam);
    else await muaLai(chiTiet, nutBam);
  };
}

async function yeuCauHuy(don, chiTiet, nut) {
  const dongY = await confirmDialog({
    tieuDe: "Yêu cầu huỷ đơn?",
    noiDung: "Cửa hàng sẽ xem xét và xác nhận việc huỷ đơn. Bạn có thể theo dõi kết quả ngay tại trang này.",
    nhanXacNhan: "Gửi yêu cầu",
    nguyHiem: true,
  });
  if (!dongY) return;
  setBusy(nut, true);
  try {
    await updateDoc(doc(db, "donhang", don.id), { yeuCauHuy: { luc: serverTimestamp() } });
    don.yeuCauHuy = true;
    veHanhDong(don, chiTiet);
    showToast("Đã gửi yêu cầu huỷ đơn.", "success");
  } catch (err) {
    setBusy(nut, false);
    showToast("Không gửi được yêu cầu huỷ, vui lòng thử lại.", "error");
    console.error("Lỗi yêu cầu huỷ:", err);
  }
}

async function muaLai(chiTiet, nut) {
  setBusy(nut, true);
  try {
    const { daThem, boQua } = await muaLaiDon(chiTiet);
    setBusy(nut, false);
    if (!daThem) {
      showToast("Các sản phẩm trong đơn hiện đã hết hàng hoặc ngừng bán.", "error");
      return;
    }
    if (boQua) showToast(`${boQua} sản phẩm hết hàng hoặc ngừng bán đã được bỏ qua.`, "info");
    confirmButton(nut, "Đã thêm vào giỏ", 5000);
    await new Promise((xong) => setTimeout(xong, prefersReducedMotion() ? 0 : 600));
    window.location.href = "/cart.html";
  } catch (err) {
    setBusy(nut, false);
    showToast("Không thêm được vào giỏ hàng, vui lòng thử lại.", "error");
    console.error("Lỗi mua lại:", err);
  }
}

/** Theo dõi trạng thái đơn theo thời gian thực: nhân viên duyệt là thanh tiến trình tự chạy. */
function theoDoiTrangThai(donHangId, don, chiTiet) {
  let khoaHienTai = `${don.trangThai}|${Boolean(don.yeuCauHuy)}`;
  veHanhDong(don, chiTiet);
  const huyDangKy = onSnapshot(
    doc(db, "donhang", donHangId),
    (snap) => {
      const moi = snap.data();
      if (!moi) return;
      const khoa = `${moi.trangThai}|${Boolean(moi.yeuCauHuy)}`;
      if (khoa === khoaHienTai) return;
      const doiTrangThai = moi.trangThai !== don.trangThai;
      khoaHienTai = khoa;
      don.trangThai = moi.trangThai;
      don.yeuCauHuy = moi.yeuCauHuy ?? null;
      if (doiTrangThai) {
        const badge = elNoiDung.querySelector(".badge");
        if (badge) {
          badge.className = `badge badge--${moi.trangThai}`;
          badge.textContent = NHAN_TRANG_THAI_DON[moi.trangThai] || moi.trangThai;
          pulse(badge);
        }
        capNhatTienTrinh(moi.trangThai);
      }
      veHanhDong(don, chiTiet);
    },
    (err) => console.error("Không theo dõi được trạng thái đơn:", err)
  );
  window.addEventListener("pagehide", huyDangKy, { once: true });
}

export async function initChiTietDonHang() {
  const thamSo = new URLSearchParams(window.location.search);
  const donHangId = thamSo.get("id");
  const laDonMoi = thamSo.get("moi") === "1";
  if (!donHangId) {
    hienLoi("Thiếu mã đơn hàng.");
    return;
  }

  try {
    const donSnap = await getDoc(doc(db, "donhang", donHangId));
    if (!donSnap.exists() || donSnap.data().khachHangId !== auth.currentUser.uid) {
      // Thông báo thân thiện thay vì để lỗi permission-denied hiện ra.
      hienLoi("Không tìm thấy đơn hàng.");
      return;
    }
    const don = { id: donSnap.id, ...donSnap.data() };

    const ctdhSnap = await getDocs(
      query(
        collection(db, "chitietdonhang"),
        where("donHangId", "==", donHangId),
        where("khachHangId", "==", auth.currentUser.uid) // rules chỉ cho khách đọc dòng của chính mình
      )
    );
    const chiTiet = ctdhSnap.docs.map((d) => d.data());

    // Bổ sung tên và ảnh sản phẩm để hiển thị.
    const chiTietDayDu = await Promise.all(
      chiTiet.map(async (ct) => {
        const spSnap = await getDoc(doc(db, "sanpham", ct.sanPhamId));
        const sp = spSnap.exists() ? spSnap.data() : null;
        return { ...ct, tenSanPham: sp ? sp.tenSanPham : "(Sản phẩm đã bị xoá)", hinhAnh: sp?.hinhAnh ?? "", conSanPham: Boolean(sp) };
      })
    );

    swapContent(elNoiDung, () => render(don, chiTietDayDu, laDonMoi));
    elNoiDung.removeAttribute("aria-busy");
    capNhatTienTrinh(don.trangThai);
    theoDoiTrangThai(donHangId, don, chiTietDayDu);
    if (laDonMoi) history.replaceState(null, "", `${window.location.pathname}?id=${encodeURIComponent(donHangId)}`);
  } catch (err) {
    hienLoi("Không tải được đơn hàng.");
    showToast(err.message, "error");
  }
}

function hienLoi(thongDiep) {
  elNoiDung.innerHTML = veLoi(thongDiep);
  elNoiDung.removeAttribute("aria-busy");
}

function dongSanPham(ct) {
  const anh = ct.hinhAnh ? `<img src="${escapeHtml(ct.hinhAnh)}" alt="" loading="lazy" decoding="async">` : "";
  const ten = escapeHtml(ct.tenSanPham);
  const tenHtml = ct.conSanPham
    ? `<a class="tk-line__name" href="/product-detail.html?id=${encodeURIComponent(ct.sanPhamId)}">${ten}</a>`
    : `<span class="tk-line__name">${ten}</span>`;
  return `
    <li class="tk-line">
      <span class="tk-line__thumb">${anh}</span>
      <div class="tk-line__main">${tenHtml}<span class="tk-line__meta">${formatCurrency(ct.donGia)} × ${ct.soLuong}</span></div>
      <span class="tk-line__total">${formatCurrency(ct.thanhTien)}</span>
    </li>`;
}

function render(don, chiTiet, laDonMoi) {
  const ma = `Đơn ${maDon(don.id)}`;
  const elBreadcrumb = document.getElementById("breadcrumb-ma-don");
  if (elBreadcrumb) elBreadcrumb.textContent = ma;

  const thongBao = laDonMoi
    ? `<div class="tk-notice" role="status">
        <svg class="tk-notice__tick" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>
        <div><strong>Đặt hàng thành công</strong><div>Đơn hàng đang chờ cửa hàng duyệt.</div></div>
      </div>`
    : "";

  elNoiDung.innerHTML = `
    ${thongBao}
    <section class="card" aria-labelledby="h-ma-don">
      <div class="tk-order-top">
        <div>
          <h2 class="tk-order-top__code" id="h-ma-don">${ma}</h2>
          <p class="tk-order-top__date">Đặt lúc ${formatDateTime(don.ngayDat)}</p>
        </div>
        <span class="badge badge--${don.trangThai}">${NHAN_TRANG_THAI_DON[don.trangThai] || don.trangThai}</span>
      </div>
      <ol class="tk-steps" id="tien-trinh-don" aria-label="Tiến trình đơn hàng">
        <li><span class="tk-steps__dot"></span>${NHAN_TRANG_THAI_DON.cho_duyet}</li>
        <li><span class="tk-steps__dot"></span>${NHAN_TRANG_THAI_DON.dang_giao}</li>
        <li><span class="tk-steps__dot"></span>${NHAN_TRANG_THAI_DON.hoan_thanh}</li>
      </ol>
    </section>

    <div class="tk-order-grid">
      <section class="card" aria-labelledby="h-san-pham">
        <h2 class="tk-section__title" id="h-san-pham">Sản phẩm (${tongSoLuong(chiTiet)})</h2>
        <ul class="tk-lines">${chiTiet.map(dongSanPham).join("")}</ul>
      </section>

      <div class="tk-order-side">
        <section class="card" aria-labelledby="h-thanh-toan">
          <h2 class="tk-section__title" id="h-thanh-toan">Thanh toán</h2>
          <div class="tk-sum__row"><span>Phương thức</span><span>Khi nhận hàng</span></div>
          <div class="tk-sum__row tk-sum__total"><span>Tổng cộng</span><span>${formatCurrency(don.tongTien)}</span></div>
          <div class="tk-order-actions" id="hanh-dong-don"></div>
        </section>
        <section class="card" aria-labelledby="h-giao-hang">
          <h2 class="tk-section__title" id="h-giao-hang">Giao hàng</h2>
          <p class="tk-order-address">${escapeHtml(don.diaChiGiao)}</p>
        </section>
      </div>
    </div>
  `;

  elNoiDung.querySelectorAll(".tk-line__thumb img").forEach((img) => {
    img.addEventListener("error", () => img.remove(), { once: true });
  });
}
