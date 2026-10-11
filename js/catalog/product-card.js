import { formatCurrency, escapeHtml } from "/js/utils.js";
import { nhanSanPham } from "/js/catalog/catalog-rules.js";

const NHAN_HIEN_THI = {
  het: { chu: "Hết hàng", kieu: "out" },
  sap_het: { chu: "Sắp hết", kieu: "warn" },
  moi: { chu: "Mới", kieu: "new" },
};

/** @returns {HTMLAnchorElement} thẻ sản phẩm; ảnh đầu danh sách được ưu tiên tải */
export function taoTheSanPham(sp, { uuTien = false, bayGio = Date.now() } = {}) {
  const the = document.createElement("a");
  the.href = `/product-detail.html?id=${encodeURIComponent(sp.id)}`;
  the.className = "card kh-product-card sp-card";
  const conHang = (sp.soLuongTon ?? 0) > 0;
  const nhan = NHAN_HIEN_THI[nhanSanPham(sp, bayGio)];
  const tai = uuTien ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  the.innerHTML = `
    <span class="kh-product-card__media${conHang ? "" : " is-soldout"}">${nhan ? `<span class="sp-badge sp-badge--${nhan.kieu}">${nhan.chu}</span>` : ""}<img class="kh-product-card__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" width="400" height="400" ${tai} decoding="async" onload="this.classList.add('is-loaded')" onerror="this.hidden=true;this.parentNode.classList.add('is-error')"></span>
    <span class="sp-card__body">
      <span class="kh-product-card__name">${escapeHtml(sp.tenSanPham)}</span>
      <span class="sp-card__foot">
        <span class="kh-product-card__price">${formatCurrency(sp.gia)}</span>
        <span class="kh-product-card__stock ${conHang ? "" : "kh-product-card__stock--out"}">${conHang ? `Còn ${sp.soLuongTon}` : "Hết hàng"}</span>
      </span>
    </span>`;
  return the;
}
