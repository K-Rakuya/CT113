import { escapeHtml } from "/js/utils.js";
import { mucGiaDangChon } from "/js/catalog/catalog-rules.js";

export const bieuTuong = (ma) => `<svg class="sp-ic" aria-hidden="true"><use href="/images/home/icons.svg#${ma}"/></svg>`;

export function dungDanhMuc(el, dsDanhMuc) {
  const muc = [{ id: "", tenDanhMuc: "Tất cả" }, ...dsDanhMuc];
  el.innerHTML = muc
    .map((dm) => `<label class="sp-opt"><input type="radio" name="danh-muc" value="${escapeHtml(dm.id)}"><span class="sp-opt__dot" aria-hidden="true"></span><span class="sp-opt__name">${escapeHtml(dm.tenDanhMuc)}</span><span class="sp-opt__count"></span></label>`)
    .join("");
  el.removeAttribute("aria-busy");
}

export function capNhatDanhMuc(el, dem, tong, daChon) {
  for (const nhan of el.children) {
    const o = nhan.querySelector("input");
    const n = o.value === "" ? tong : dem.get(o.value) ?? 0;
    o.checked = o.value === daChon;
    o.disabled = n === 0 && !o.checked;
    nhan.querySelector(".sp-opt__count").textContent = n;
  }
}

export function dungMucGia(el, dsMuc) {
  el.innerHTML = dsMuc.map((m, i) => `<button type="button" class="sp-pill" data-muc="${i}" aria-pressed="false">${escapeHtml(m.nhan)}</button>`).join("");
  el.hidden = !dsMuc.length;
}

export function capNhatMucGia(el, dsMuc, boLoc) {
  for (const nut of el.children) nut.setAttribute("aria-pressed", String(mucGiaDangChon(dsMuc[nut.dataset.muc], boLoc)));
}

export function veChip(el, dsChip) {
  const goBo = dsChip.map((c) => `<button type="button" class="sp-chip" data-go="${c.khoa}" aria-label="Bỏ lọc ${escapeHtml(c.nhan)}"><span>${escapeHtml(c.nhan)}</span>${bieuTuong("close")}</button>`);
  if (dsChip.length > 1) goBo.push('<button type="button" class="sp-chip-clear" data-xoa-het>Xoá tất cả</button>');
  el.innerHTML = goBo.join("");
  el.hidden = !dsChip.length;
}

export function veTrangThai({ bieuTuong: ma, tieuDe, moTa, nut }) {
  return `<div class="sp-empty" role="status">
    <span class="sp-empty__icon">${bieuTuong(ma)}</span>
    <p class="sp-empty__title">${escapeHtml(tieuDe)}</p>
    <p class="sp-empty__text">${escapeHtml(moTa)}</p>
    ${nut ? `<button type="button" class="btn btn--primary" ${nut.thuocTinh}>${escapeHtml(nut.nhan)}</button>` : ""}
  </div>`;
}
