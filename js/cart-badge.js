// js/cart-badge.js
// -----------------------------------------------------------------------------
// Số lượng sản phẩm trên biểu tượng giỏ hàng ở header. Không phụ thuộc Firebase.
// Giá trị nhớ ở localStorage["ct113.cart"]; script trong <head> của từng trang đặt
// data-cart + --cart-n trước khung hình đầu, CSS (mục 3 của style.css) vẽ huy hiệu.
// -----------------------------------------------------------------------------

import { prefersReducedMotion } from "/js/motion.js";

const KHOA = "ct113.cart";
const KHOA_DONG_BO = "ct113.cartSync";
const goc = document.documentElement;

/** @returns {number} số sản phẩm đã nhớ trong giỏ (0 nếu chưa có) */
export function getCartCount() {
  try {
    return Math.max(0, parseInt(localStorage.getItem(KHOA), 10) || 0);
  } catch {
    return 0;
  }
}

function lienKetGio() {
  return document.querySelector('.site-header__nav a[href="/cart.html"]');
}

function phanAnh(n) {
  if (n > 0) {
    goc.dataset.cart = n > 99 ? "99+" : String(n);
    goc.style.setProperty("--cart-n", Math.min(n, 99));
  } else {
    delete goc.dataset.cart;
    goc.style.removeProperty("--cart-n");
  }
  const lienKet = lienKetGio();
  if (!lienKet) return;
  if (n > 0) lienKet.setAttribute("aria-label", `Giỏ hàng, ${n} sản phẩm`);
  else lienKet.removeAttribute("aria-label");
}

function nayHuyHieu(cu) {
  const lienKet = lienKetGio();
  if (!lienKet || prefersReducedMotion() || typeof lienKet.animate !== "function") return;
  const khung =
    cu === 0
      ? [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "scale(1)" }]
      : [{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: 0.4 }, { transform: "scale(1)" }];
  lienKet.animate(khung, { duration: 380, easing: "cubic-bezier(.34, 1.56, .64, 1)", pseudoElement: "::before" }); // = --ease-spring
}

let dangThoat = null; // animation thoát của huy hiệu (khi giỏ về 0) đang chạy

/** Thu nhỏ + mờ huy hiệu rồi mới gỡ (trả về null nếu không animate được → gỡ ngay). */
function thoatHuyHieu() {
  const lienKet = lienKetGio();
  if (!lienKet || prefersReducedMotion() || typeof lienKet.animate !== "function") return null;
  return lienKet.animate(
    [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.5)" }],
    { duration: 140, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards", pseudoElement: "::before" } // = --ease-in
  );
}

/** Đặt số lượng hiển thị; huy hiệu nảy khi giá trị đổi, thu nhỏ rồi mờ khi về 0. */
export function setCartCount(n) {
  const moi = Math.max(0, Math.trunc(Number(n)) || 0);
  const cu = getCartCount();
  try {
    if (moi > 0) localStorage.setItem(KHOA, String(moi));
    else localStorage.removeItem(KHOA);
  } catch {
    /* chế độ riêng tư có thể chặn localStorage */
  }
  dangThoat?.cancel(); // có số mới/đặt lại giữa chừng → huỷ lượt thoát cũ
  dangThoat = null;
  if (moi === 0 && cu > 0 && (dangThoat = thoatHuyHieu())) {
    const luot = dangThoat;
    luot.finished.then(
      () => {
        if (dangThoat === luot) dangThoat = null;
        if (getCartCount() === 0) phanAnh(0);
      },
      () => {} // bị huỷ bởi lần gọi sau
    );
    return;
  }
  phanAnh(moi);
  if (moi !== cu) nayHuyHieu(cu);
}

/** Xoá số lượng đã nhớ và dấu đã đối chiếu với server khi đăng xuất. */
export function resetGio() {
  try {
    sessionStorage.removeItem(KHOA_DONG_BO);
  } catch {
    /* bỏ qua */
  }
  setCartCount(0);
}

/** @returns {boolean} phiên này đã đối chiếu số lượng với server cho uid này chưa */
export function daDongBo(uid) {
  try {
    return sessionStorage.getItem(KHOA_DONG_BO) === uid;
  } catch {
    return false;
  }
}

export function danhDauDongBo(uid) {
  try {
    sessionStorage.setItem(KHOA_DONG_BO, uid);
  } catch {
    /* bỏ qua */
  }
}

phanAnh(getCartCount());
