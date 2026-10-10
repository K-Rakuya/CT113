import { formatCurrency, escapeHtml } from "/js/utils.js";

/** @returns {HTMLAnchorElement} thẻ sản phẩm; ảnh đầu danh sách được ưu tiên tải */
export function taoTheSanPham(sp, { uuTien = false } = {}) {
  const the = document.createElement("a");
  the.href = `/product-detail.html?id=${encodeURIComponent(sp.id)}`;
  the.className = "card kh-product-card";
  const conHang = (sp.soLuongTon ?? 0) > 0;
  const tai = uuTien ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  the.innerHTML = `
    <span class="kh-product-card__media"><img class="kh-product-card__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" ${tai} decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'"></span>
    <div class="kh-product-card__name">${escapeHtml(sp.tenSanPham)}</div>
    <div class="kh-product-card__price">${formatCurrency(sp.gia)}</div>
    <div class="kh-product-card__stock ${conHang ? "" : "kh-product-card__stock--out"}">${conHang ? `Còn ${sp.soLuongTon} sản phẩm` : "Tạm hết hàng"}</div>`;
  return the;
}
