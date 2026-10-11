import { formatCurrency, formatDate, escapeHtml } from "/js/utils.js";
import { dinhDangDiem } from "/js/product-rules.js";
import { nhanSanPham } from "/js/catalog/catalog-rules.js";
import { bieuTuong } from "/js/catalog/filter-view.js";
import { trangThaiBan, GIOI_HAN_NHAN_XET } from "/js/catalog/detail-rules.js";

const NHAN_ANH = {
  het: { chu: "Hết hàng", kieu: "out" },
  sap_het: { chu: "Sắp hết", kieu: "warn" },
  moi: { chu: "Mới", kieu: "new" },
};

const DO_DAI_MO_TA_GON = 320;

export const saoTheoDiem = (diem) =>
  `<span class="sp-stars" style="--p:${Math.round((diem / 5) * 100)}%" role="img" aria-label="${dinhDangDiem(diem)} trên 5 sao"></span>`;

/** @returns {string} khối ảnh, thông tin và mua hàng; danh mục và điểm đánh giá được điền sau khi có dữ liệu */
export function dungChiTiet(sp, bayGio = Date.now()) {
  const ban = trangThaiBan(sp);
  const nhan = ban.ma === "ngung" ? { chu: "Ngừng bán", kieu: "out" } : NHAN_ANH[nhanSanPham(sp, bayGio)];
  const moTa = String(sp.moTa ?? "").trim();
  const dai = moTa.length > DO_DAI_MO_TA_GON;
  const gia = formatCurrency(sp.gia);

  return `
    <article class="sp-detail">
      <div class="sp-gallery">
        <div class="sp-gallery__frame kh-detail__img${ban.banDuoc ? "" : " is-soldout"}" data-zoom>
          ${nhan ? `<span class="sp-badge sp-badge--${nhan.kieu}">${nhan.chu}</span>` : ""}
          <img class="sp-gallery__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" width="800" height="800" fetchpriority="high" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.hidden=true;this.parentNode.classList.add('is-error')">
        </div>
      </div>
      <div class="sp-info">
        <a class="sp-info__cat" id="sp-danh-muc-lk" hidden></a>
        <h1 class="sp-info__title">${escapeHtml(sp.tenSanPham)}</h1>
        <a class="sp-info__rating" id="diem-danh-gia" href="#danh-gia" hidden></a>
        <p class="sp-info__price">${gia}</p>
        <p class="sp-stock sp-stock--${ban.muc}">
          <span class="sp-stock__nhan"><span class="sp-stock__dot" aria-hidden="true"></span>${ban.nhan}</span>
          <span class="sp-stock__chi-tiet">${escapeHtml(ban.chiTiet)}</span>
        </p>
        ${moTa ? `<div class="sp-info__mo-ta">
          <p class="sp-desc${dai ? " is-gon" : ""}" id="sp-mo-ta">${escapeHtml(moTa)}</p>
          ${dai ? '<button type="button" class="sp-link" id="btn-mo-rong" aria-expanded="false" aria-controls="sp-mo-ta">Xem thêm</button>' : ""}
        </div>` : ""}
        ${ban.banDuoc ? dungKhoiMua(sp) : dungKhoiHetHang(ban)}
      </div>
    </article>`;
}

function dungKhoiMua(sp) {
  return `
    <div class="sp-buy" id="sp-mua">
      <div class="sp-buy__row">
        <div class="sp-qty" role="group" aria-label="Số lượng">
          <button type="button" id="btn-giam" aria-label="Giảm số lượng">${bieuTuong("minus")}</button>
          <input type="number" id="so-luong" value="1" min="1" max="${Number(sp.soLuongTon)}" inputmode="numeric" aria-label="Số lượng">
          <button type="button" id="btn-tang" aria-label="Tăng số lượng">${bieuTuong("plus")}</button>
        </div>
        <p class="sp-buy__total"><span>Tạm tính</span><strong data-tam-tinh>${formatCurrency(sp.gia)}</strong></p>
      </div>
      <button type="button" class="btn btn--primary sp-buy__cta" id="btn-them-gio" data-them-gio>${bieuTuong("cart")}<span>Thêm vào giỏ</span></button>
      ${dungLienKetTuVan()}
    </div>`;
}

function dungKhoiHetHang(ban) {
  return `
    <div class="sp-buy" id="sp-mua">
      <button type="button" class="btn btn--primary sp-buy__cta" disabled>${ban.ma === "ngung" ? "Ngừng bán" : "Tạm hết hàng"}</button>
      <a class="btn btn--secondary sp-buy__cta" href="/customer/chat.html">${bieuTuong("chat")}<span>Hỏi nhân viên</span></a>
    </div>`;
}

function dungLienKetTuVan() {
  return `<a class="sp-buy__help" href="/customer/chat.html">${bieuTuong("chat")}<span>Cần tư vấn trước khi mua? Trò chuyện với nhân viên</span></a>`;
}

/** @returns {string} nội dung thanh mua hàng cố định ở màn hình hẹp */
export function dungThanhMua(sp) {
  return `
    <div class="sp-sticky__info">
      <span class="sp-sticky__ten">${escapeHtml(sp.tenSanPham)}</span>
      <strong class="sp-sticky__gia" data-tam-tinh>${formatCurrency(sp.gia)}</strong>
    </div>
    <button type="button" class="btn btn--primary" data-them-gio>Thêm vào giỏ</button>`;
}

/** @returns {string} dòng điểm trung bình cạnh tên sản phẩm */
export const dungDiemDanhGia = ({ trungBinh, soLuot }) =>
  `${saoTheoDiem(trungBinh)}<span class="sp-info__diem">${dinhDangDiem(trungBinh)}</span><span>${soLuot} đánh giá</span>`;

/** @returns {string} điểm trung bình và phân bố theo số sao */
export function dungTomTatDanhGia({ soLuot, trungBinh, theoSao }) {
  if (!soLuot) return '<p class="sp-note">Chưa có đánh giá nào cho sản phẩm này.</p>';
  const dong = theoSao
    .map((m) => `<li class="sp-bar"><span>${m.sao} ★</span><span class="sp-bar__track"><span class="sp-bar__fill" style="--w:${m.tyLe.toFixed(3)}"></span></span><span>${m.so}</span></li>`)
    .join("");
  return `
    <div class="sp-score">
      <div class="sp-score__top">
        <span class="sp-score__num">${dinhDangDiem(trungBinh)}</span>
        <span class="sp-score__meta">${saoTheoDiem(trungBinh)}<span>${soLuot} đánh giá</span></span>
      </div>
      <ul class="sp-bars" aria-label="Phân bố số sao">${dong}</ul>
    </div>`;
}

export const dungDanhGia = (dg, i = 0) => `
  <article class="sp-review motion-enter" style="--i:${i}" tabindex="-1">
    <div class="sp-review__head">${saoTheoDiem(dg.soSao)}<time class="sp-review__date">${escapeHtml(formatDate(dg.ngayDanhGia))}</time></div>
    <p class="sp-review__text">${escapeHtml(dg.noiDung)}</p>
  </article>`;

/** @returns {string} biểu mẫu gửi đánh giá; mỗi trường có vùng báo lỗi riêng */
export function dungFormDanhGia() {
  const sao = [5, 4, 3, 2, 1]
    .map((n) => `<input type="radio" name="so-sao" id="sao-${n}" value="${n}"><label for="sao-${n}" title="${n} sao"><span class="sr-only">${n} sao</span>★</label>`)
    .join("");
  return `
    <form class="sp-form motion-fade" id="form-danh-gia" novalidate>
      <h3 class="sp-form__title">Viết đánh giá</h3>
      <fieldset class="sp-rate">
        <legend>Chất lượng sản phẩm</legend>
        <div class="sp-rate__row">${sao}</div>
        <p class="sp-field-err" data-loi="soSao" role="alert"></p>
      </fieldset>
      <div class="sp-field">
        <label for="noi-dung-danh-gia">Nhận xét</label>
        <textarea class="textarea" id="noi-dung-danh-gia" name="noi-dung" maxlength="${GIOI_HAN_NHAN_XET}" rows="4" placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm này"></textarea>
        <div class="sp-field__foot">
          <p class="sp-field-err" data-loi="noiDung" role="alert"></p>
          <span class="sp-form__count" id="dem-ky-tu">0/${GIOI_HAN_NHAN_XET}</span>
        </div>
      </div>
      <button type="submit" class="btn btn--primary">Gửi đánh giá</button>
    </form>`;
}

export const dungGhiChu = (html) => `<p class="sp-note motion-fade">${html}</p>`;
