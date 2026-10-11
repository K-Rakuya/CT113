import { formatCurrency } from "/js/utils.js";
import { thongTinMeta, dungJsonLd } from "/js/catalog/detail-rules.js";

const TEN_CUA_HANG = "Website bán linh kiện máy tính";

function thanhPhanDauTrang(selector, tao) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = tao();
    document.head.append(el);
  }
  return el;
}

function datMeta(thuocTinh, ten, noiDung) {
  const el = thanhPhanDauTrang(`meta[${thuocTinh}="${ten}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(thuocTinh, ten);
    return m;
  });
  el.setAttribute("content", noiDung);
}

const diaChiTrang = (id) => `${location.origin}${location.pathname}?id=${encodeURIComponent(id)}`;

/** Cập nhật tiêu đề, mô tả, thẻ Open Graph, địa chỉ chuẩn và dữ liệu có cấu trúc theo sản phẩm đang xem. */
export function apDungSeo(sp, { tenDanhMuc, tomTat } = {}) {
  const url = diaChiTrang(sp.id);
  const meta = thongTinMeta(sp, { giaChu: formatCurrency(sp.gia), tenCuaHang: TEN_CUA_HANG });

  document.title = meta.tieuDe;
  datMeta("name", "description", meta.moTa);
  datMeta("property", "og:title", meta.tieuDe);
  datMeta("property", "og:description", meta.moTa);
  datMeta("property", "og:url", url);
  datMeta("property", "og:type", "product");
  if (sp.hinhAnh) datMeta("property", "og:image", new URL(sp.hinhAnh, url).href);

  thanhPhanDauTrang('link[rel="canonical"]', () => {
    const l = document.createElement("link");
    l.rel = "canonical";
    return l;
  }).href = url;

  thanhPhanDauTrang("#sp-json-ld", () => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "sp-json-ld";
    return s;
  }).textContent = JSON.stringify(dungJsonLd(sp, { url, tenDanhMuc, tomTat }));
}
