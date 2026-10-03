// js/customer/order-detail.js
// Trang customer/order-detail.html: chi tiết 1 đơn. Collection: donhang, chitietdonhang.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast, escapeHtml } from "/js/utils.js";
import { confirmDialog } from "/js/dialog.js";
import { muaLaiDon } from "/js/customer/reorder.js";
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

const NHAN_TRANG_THAI = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

const THU_TU_TRANG_THAI = ["cho_duyet", "dang_giao", "hoan_thanh"];

function capNhatTienTrinh(trangThai) {
  const ol = document.getElementById("tien-trinh-don");
  if (!ol) return;
  const buoc = THU_TU_TRANG_THAI.indexOf(trangThai);
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
  const nutMuaLai = '<button type="button" class="btn btn--secondary" data-hanh-dong="mua-lai">Mua lại</button>';
  let html = "";
  if (don.trangThai === "cho_duyet") {
    html = don.yeuCauHuy
      ? '<p class="kh-order-note" role="status">Đã gửi yêu cầu huỷ, đang chờ cửa hàng xác nhận.</p>'
      : '<button type="button" class="btn btn--danger" data-hanh-dong="yeu-cau-huy">Yêu cầu huỷ đơn</button>';
  } else if (don.trangThai === "dang_giao") {
    html = '<p class="kh-order-note">Đơn hàng đang được giao.</p>';
  } else {
    html = nutMuaLai;
    if (don.trangThai === "huy") html = '<p class="kh-order-note">Đơn hàng đã được huỷ.</p>' + html;
  }
  el.innerHTML = html;
  el.onclick = async (e) => {
    const nut = e.target.closest("[data-hanh-dong]");
    if (!nut) return;
    if (nut.dataset.hanhDong === "yeu-cau-huy") await yeuCauHuy(don, chiTiet, nut);
    else await muaLai(chiTiet, nut);
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
          badge.textContent = NHAN_TRANG_THAI[moi.trangThai] || moi.trangThai;
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

    swapContent(elNoiDung, () => render(don, chiTietDayDu, laDonMoi));
    capNhatTienTrinh(don.trangThai);
    theoDoiTrangThai(donHangId, don, chiTietDayDu);
    if (laDonMoi) history.replaceState(null, "", `${window.location.pathname}?id=${encodeURIComponent(donHangId)}`);
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được đơn hàng.</p>';
    showToast(err.message, "error");
  }
}

function render(don, chiTiet, laDonMoi) {
  const maDon = "Đơn #" + don.id.slice(0, 8).toUpperCase();
  const elBreadcrumb = document.getElementById("breadcrumb-ma-don");
  if (elBreadcrumb) elBreadcrumb.textContent = maDon;

  const bannerThanhCong = laDonMoi
    ? `<div class="kh-order-success" role="status">
        <svg class="kh-order-success__tick" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>
        <div><strong>Đặt hàng thành công</strong><div>Đơn hàng đang chờ cửa hàng duyệt.</div></div>
      </div>`
    : "";

  elNoiDung.innerHTML = `
    ${bannerThanhCong}
    <div class="card">
      <div class="flex-between">
        <h2 style="margin:0;">${maDon}</h2>
        <span class="badge badge--${don.trangThai}">${NHAN_TRANG_THAI[don.trangThai] || don.trangThai}</span>
      </div>
      <ol class="kh-progress" id="tien-trinh-don" aria-label="Tiến trình đơn hàng">
        <li><span class="kh-progress__dot"></span>${NHAN_TRANG_THAI.cho_duyet}</li>
        <li><span class="kh-progress__dot"></span>${NHAN_TRANG_THAI.dang_giao}</li>
        <li><span class="kh-progress__dot"></span>${NHAN_TRANG_THAI.hoan_thanh}</li>
      </ol>
      <p class="text-muted">Ngày đặt: ${formatDate(don.ngayDat)}</p>
      <p><strong>Địa chỉ giao hàng:</strong> ${escapeHtml(don.diaChiGiao)}</p>

      <div class="table-responsive" style="margin-top: var(--spacing-md);">
        <table class="table">
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>
            ${chiTiet
              .map(
                (ct) => `
              <tr>
                <td>${escapeHtml(ct.tenSanPham)}</td>
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
      <div class="kh-order-actions" id="hanh-dong-don"></div>
    </div>
  `;
}
