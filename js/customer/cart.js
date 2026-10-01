// js/customer/cart.js
// Trang cart.html: sửa số lượng / xoá sp, tính tổng tiền. Collection: giohang.
//
// Giao diện được cập nhật TẠI CHỖ (optimistic update): bấm là thấy đổi ngay, lệnh ghi Firestore
// chạy nền. . Giờ chỉ tải giỏ lúc vào trang, và tải lại từ server khi một lệnh ghi thất bại để giao diện về đúng trạng thái thật.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, showToast, escapeHtml } from "/js/utils.js";
import { animateNumber, collapseAndRemove, swapContent, shake } from "/js/motion.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-gio-hang");

let dongHienTai = []; // các dòng đang hiển thị: { id, soLuong, sanPham, el }
const ghiDangCho = new Set(); // các lệnh ghi Firestore chưa xong
let loiGhi = false; // có lệnh ghi nào thất bại kể từ lần bấm "Tiến hành đặt hàng" gần nhất

const dinhDangTien = (n) => formatCurrency(Math.round(n));

/**
 * Gọi từ callback onDaXacThuc của checkRole() trong cart.html — đảm bảo
 * auth.currentUser đã sẵn sàng trước khi truy vấn.
 */
export function initGioHang() {
  taiGioHang();
}

async function taiGioHang() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const q = query(collection(db, "giohang"), where("khachHangId", "==", uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      swapContent(elNoiDung, hienGioTrong);
      return;
    }

    // Nạp kèm thông tin sản phẩm cho từng dòng giỏ hàng.
    const dongGioHang = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const gh = { id: docSnap.id, ...docSnap.data() };
        const spSnap = await getDoc(doc(db, "sanpham", gh.sanPhamId));
        gh.sanPham = spSnap.exists() ? { id: spSnap.id, ...spSnap.data() } : null;
        return gh;
      })
    );

    dongHienTai = dongGioHang.filter((d) => d.sanPham); // bỏ qua sp đã bị xoá khỏi hệ thống
    if (dongHienTai.length === 0) {
      swapContent(elNoiDung, hienGioTrong);
      return;
    }
    swapContent(elNoiDung, renderGioHang);
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được giỏ hàng.</p>';
    showToast(err.message, "error");
  } finally {
    elNoiDung.removeAttribute("aria-busy"); // khung chờ tĩnh trong cart.html đã được thay
  }
}

function hienGioTrong() {
  dongHienTai = [];
  elNoiDung.innerHTML = `
    <div class="empty-state">
      Giỏ hàng của bạn đang trống.
      <div style="margin-top: var(--spacing-md);"><a href="/product-list.html" class="btn btn--primary">Mua sắm ngay</a></div>
    </div>`;
}

function renderGioHang() {
  elNoiDung.innerHTML = `
    <div class="kh-cart-layout">
      <div>
        <div id="danh-sach-gio-hang"></div>
      </div>
      <div class="card kh-summary">
        <h3>Tóm tắt đơn hàng</h3>
        <div class="kh-summary__row"><span>Tạm tính</span><span id="tam-tinh"></span></div>
        <div class="kh-summary__row kh-summary__total"><span>Tổng cộng</span><span id="tong-cong"></span></div>
        <a href="/checkout.html" id="btn-dat-hang" class="btn btn--primary" style="width:100%; margin-top: var(--spacing-md); text-align:center;">Tiến hành đặt hàng</a>
      </div>
    </div>
  `;

  const elDanhSach = document.getElementById("danh-sach-gio-hang");
  dongHienTai.forEach((d, i) => {
    d.el = taoDong(d);
    d.el.classList.add("motion-enter");
    d.el.style.setProperty("--i", i);
    elDanhSach.appendChild(d.el);
  });
  capNhatTong();

  // Nếu còn lệnh ghi đang chạy, đợi xong rồi mới sang trang đặt hàng (để checkout đọc đúng số lượng).
  document.getElementById("btn-dat-hang").addEventListener("click", async (e) => {
    if (ghiDangCho.size === 0) return;
    e.preventDefault();
    loiGhi = false;
    await Promise.allSettled([...ghiDangCho]);
    if (!loiGhi) window.location.href = "/checkout.html";
  });
}

function taoDong(d) {
  const dong = document.createElement("div");
  dong.className = "kh-cart-item";
  dong.innerHTML = `
    <img class="kh-cart-item__img img-fade" src="${escapeHtml(d.sanPham.hinhAnh)}" alt="${escapeHtml(d.sanPham.tenSanPham)}" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'">
    <div class="kh-cart-item__info">
      <div class="kh-cart-item__name">${escapeHtml(d.sanPham.tenSanPham)}</div>
      <div class="text-muted">${formatCurrency(d.sanPham.gia)} / sản phẩm</div>
      <div class="kh-qty-stepper" style="margin-top:6px;">
        <button type="button" class="btn-giam">−</button>
        <input type="number" class="input-so-luong" value="${d.soLuong}" min="1" max="${d.sanPham.soLuongTon}">
        <button type="button" class="btn-tang">+</button>
      </div>
    </div>
    <div class="text-center">
      <div class="kh-cart-item__total" style="font-weight:700;" data-gia-tri="${d.sanPham.gia * d.soLuong}">${formatCurrency(d.sanPham.gia * d.soLuong)}</div>
      <button class="kh-cart-item__remove">Xoá</button>
    </div>
  `;

  const elInput = dong.querySelector(".input-so-luong");
  dong.querySelector(".btn-giam").addEventListener("click", () => datSoLuong(d, Number(elInput.value) - 1));
  dong.querySelector(".btn-tang").addEventListener("click", () => datSoLuong(d, Number(elInput.value) + 1));
  elInput.addEventListener("change", () => datSoLuong(d, Number(elInput.value)));
  dong.querySelector(".kh-cart-item__remove").addEventListener("click", () => xoaDong(d));
  capNhatBoTang(dong, d);
  return dong;
}

function gioiHanTon(d) {
  return Number.isFinite(d.sanPham.soLuongTon) ? d.sanPham.soLuongTon : Infinity;
}

function capNhatBoTang(el, d) {
  el.querySelector(".btn-giam").disabled = d.soLuong <= 1;
  el.querySelector(".btn-tang").disabled = d.soLuong >= gioiHanTon(d);
}

/** Đổi số lượng: cập nhật ô nhập, thành tiền dòng và tổng ngay; ghi Firestore chạy nền. */
function datSoLuong(d, yeuCau) {
  const toiDa = gioiHanTon(d);
  const soLuongMoi = Math.max(1, Math.min(toiDa, Math.trunc(yeuCau) || 1));
  d.el.querySelector(".input-so-luong").value = soLuongMoi;
  if (yeuCau > toiDa) {
    shake(d.el.querySelector(".kh-qty-stepper"));
    showToast(`Chỉ còn ${toiDa} sản phẩm trong kho.`, "info");
  }
  if (soLuongMoi === d.soLuong) {
    capNhatBoTang(d.el, d);
    return;
  }

  d.soLuong = soLuongMoi;
  capNhatBoTang(d.el, d);
  animateNumber(d.el.querySelector(".kh-cart-item__total"), d.sanPham.gia * soLuongMoi, { format: dinhDangTien });
  capNhatTong();
  ghiNen(updateDoc(doc(db, "giohang", d.id), { soLuong: soLuongMoi }), "Không cập nhật được số lượng: ");
}

/** Xoá dòng: thu gọn mượt, các dòng bên dưới trượt lên; xoá trên Firestore chạy nền. */
function xoaDong(d) {
  if (d.dangXoa) return;
  d.dangXoa = true;

  // Giữ focus bàn phím trong trang thay vì rơi về <body> khi nút "Xoá" biến mất
  if (d.el.contains(document.activeElement)) {
    const ke = d.el.nextElementSibling || d.el.previousElementSibling;
    (ke?.querySelector(".kh-cart-item__remove") ?? document.getElementById("btn-dat-hang"))?.focus({ preventScroll: true });
  }

  dongHienTai = dongHienTai.filter((x) => x !== d);
  ghiNen(deleteDoc(doc(db, "giohang", d.id)), "Không xoá được sản phẩm: ");
  capNhatTong();
  collapseAndRemove(d.el).then(() => {
    if (dongHienTai.length === 0) swapContent(elNoiDung, hienGioTrong);
  });
}

function capNhatTong() {
  const tong = dongHienTai.reduce((t, d) => t + d.sanPham.gia * d.soLuong, 0);
  animateNumber(document.getElementById("tam-tinh"), tong, { format: dinhDangTien });
  animateNumber(document.getElementById("tong-cong"), tong, { format: dinhDangTien });
}

/** Theo dõi một lệnh ghi chạy nền; thất bại thì báo lỗi và tải lại giỏ từ server. */
function ghiNen(lenh, tienToLoi) {
  const theoDoi = lenh
    .catch((err) => {
      loiGhi = true;
      showToast(tienToLoi + err.message, "error");
      return taiGioHang();
    })
    .finally(() => ghiDangCho.delete(theoDoi));
  ghiDangCho.add(theoDoi);
}
