const bieuTuong = (id) => `<svg class="tk-ic" aria-hidden="true"><use href="/images/home/icons.svg#${id}"/></svg>`;

export function veTrong({ bieuTuong: id, tieuDe, moTa = "", hanhDong = null }) {
  return `<div class="tk-empty">
    <span class="tk-empty__icon">${bieuTuong(id)}</span>
    <p class="tk-empty__title">${tieuDe}</p>
    ${moTa ? `<p class="tk-empty__text">${moTa}</p>` : ""}
    ${hanhDong ? `<a class="btn btn--primary tk-empty__action" href="${hanhDong.href}">${hanhDong.nhan}</a>` : ""}
  </div>`;
}

export const veLoi = (thongDiep) => veTrong({ bieuTuong: "shield", tieuDe: thongDiep, moTa: "Vui lòng tải lại trang hoặc thử lại sau." });
