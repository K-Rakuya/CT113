import { db } from "/js/firebase-config.js";
import { formatCurrency, escapeHtml, layCache, luuCache } from "/js/utils.js";
import { chonCacNhom, chonDanhGiaNoiBat, bieuTuongDanhMuc, laMoi, nhanTon, catNoiDung } from "/js/home/home-rules.js";
import { khoiTaoBanner, khoiTaoHang, hienKhiCuonToi } from "/js/home/carousel.js";
import { veBoPc } from "/js/home/bundle-view.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const KHOA_CACHE = "home:v2";
const TTL_CACHE = 3 * 60 * 1000;

const elBoPc = document.getElementById("bo-pc");
const elNhom = document.getElementById("home-nhom");
const elDanhMuc = document.getElementById("home-danh-muc");
const elDanhGia = document.getElementById("home-danh-gia");

const icon = (ma) => `<svg class="home-icon" aria-hidden="true"><use href="/images/home/icons.svg#${ma}"/></svg>`;

async function taiDuLieu() {
  const dem = layCache(KHOA_CACHE);
  if (dem) return dem;
  const [sp, dm, dg, bo] = await Promise.all([
    getDocs(query(collection(db, "sanpham"), where("trangThai", "==", "dang_ban"))),
    getDocs(collection(db, "danhmuc")),
    getDocs(query(collection(db, "danhgia"), orderBy("ngayDanhGia", "desc"), limit(30))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, "bopc"), where("hienThi", "==", true))).catch(() => ({ docs: [] })),
  ]);
  const du = {
    sanPham: sp.docs.map((d) => {
      const x = d.data();
      return { id: d.id, tenSanPham: x.tenSanPham, gia: x.gia, soLuongTon: x.soLuongTon ?? 0, hinhAnh: x.hinhAnh, danhMucId: x.danhMucId, trangThai: x.trangThai, ngayTao: x.ngayTao?.toMillis?.() ?? 0 };
    }),
    danhMuc: dm.docs.map((d) => ({ id: d.id, tenDanhMuc: d.data().tenDanhMuc })),
    boPc: bo.docs.map((d) => {
      const x = d.data();
      return { id: d.id, ten: x.ten, loai: x.loai, moTa: x.moTa, thuTu: x.thuTu ?? 0, linhKien: x.linhKien ?? [] };
    }),
    danhGia: dg.docs.map((d) => {
      const x = d.data();
      return { sanPhamId: x.sanPhamId, soSao: x.soSao, noiDung: x.noiDung, ngayDanhGia: x.ngayDanhGia?.toMillis?.() ?? 0 };
    }),
  };
  luuCache(KHOA_CACHE, du, TTL_CACHE);
  return du;
}

function htmlThe(sp, bayGio) {
  const ton = nhanTon(sp);
  const nhan = ton === "het" ? '<span class="home-badge home-badge--out">Hết hàng</span>'
    : ton === "sap_het" ? '<span class="home-badge home-badge--warn">Sắp hết</span>'
    : laMoi(sp, bayGio) ? '<span class="home-badge">Mới</span>' : "";
  return `<a class="card kh-product-card" href="/product-detail.html?id=${encodeURIComponent(sp.id)}">
    <span class="kh-product-card__media">${nhan}<img class="kh-product-card__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'"></span>
    <div class="kh-product-card__name">${escapeHtml(sp.tenSanPham)}</div>
    <div class="kh-product-card__price">${formatCurrency(sp.gia)}</div>
    <div class="kh-product-card__stock ${ton === "het" ? "kh-product-card__stock--out" : ""}">${ton === "het" ? "Tạm hết hàng" : `Còn ${sp.soLuongTon} sản phẩm`}</div>
  </a>`;
}

function htmlNhom(n, bayGio) {
  const ma = escapeHtml(n.ma);
  return `<section class="home-group home-group--${n.mau}" id="${ma}" aria-labelledby="g-${ma}">
    <header class="home-group__head">
      <div class="home-group__title">
        <span class="home-group__icon" aria-hidden="true">${icon(n.bieuTuong)}</span>
        <div><h2 class="home-group__name" id="g-${ma}">${escapeHtml(n.tieuDe)}</h2><p class="home-group__sub">${escapeHtml(n.phu)}</p></div>
      </div>
      <a class="home-group__more" href="${n.lienKet}">Xem tất cả ${icon("arrow")}</a>
    </header>
    <div class="home-row">
      <button class="home-row__nav home-row__nav--prev" type="button" data-huong="truoc" aria-label="Cuộn sang trái">${icon("chev-l")}</button>
      <div class="home-row__track" role="group" aria-label="${escapeHtml(n.tieuDe)}">${n.sanPham.map((sp) => htmlThe(sp, bayGio)).join("")}</div>
      <button class="home-row__nav home-row__nav--next" type="button" data-huong="sau" aria-label="Cuộn sang phải">${icon("chev-r")}</button>
    </div>
  </section>`;
}

function veDanhMuc(du) {
  const coHang = new Set(du.sanPham.map((sp) => sp.danhMucId));
  const o = du.danhMuc.filter((dm) => coHang.has(dm.id)).map((dm) => `<a class="home-cat" href="/product-list.html?danhmuc=${encodeURIComponent(dm.id)}"><span class="home-cat__icon">${icon(bieuTuongDanhMuc(dm.tenDanhMuc))}</span>${escapeHtml(dm.tenDanhMuc)}</a>`);
  if (!o.length) return elDanhMuc.closest("section").remove();
  elDanhMuc.innerHTML = `<a class="home-cat" href="/product-list.html"><span class="home-cat__icon">${icon("box")}</span>Tất cả sản phẩm</a>${o.join("")}`;
}

function veDanhGia(du) {
  const theoId = new Map(du.sanPham.map((sp) => [sp.id, sp]));
  const ds = chonDanhGiaNoiBat(du.danhGia, theoId, 3);
  if (ds.length < 3) return elDanhGia.remove();
  elDanhGia.querySelector(".home-reviews").innerHTML = ds.map((dg) => {
    const sp = theoId.get(dg.sanPhamId);
    const sao = [1, 2, 3, 4, 5].map((k) => `<svg class="home-icon${k > dg.soSao ? " is-off" : ""}" aria-hidden="true"><use href="/images/home/icons.svg#star"/></svg>`).join("");
    return `<article class="home-review">
      <span class="home-review__quote" aria-hidden="true">${icon("quote")}</span>
      <div class="home-review__stars" role="img" aria-label="${dg.soSao} trên 5 sao">${sao}</div>
      <p class="home-review__text">${escapeHtml(catNoiDung(dg.noiDung, 180))}</p>
      <div class="home-review__who">${icon("box")}<div><a href="/product-detail.html?id=${encodeURIComponent(sp.id)}">${escapeHtml(sp.tenSanPham)}</a><small>Khách hàng đã mua</small></div></div>
    </article>`;
  }).join("");
  elDanhGia.hidden = false;
  hienKhiCuonToi(elDanhGia);
}

function veLoi() {
  elNhom.innerHTML = '<div class="home-group"><p class="home-empty">Không tải được sản phẩm. <button type="button" class="home-btn home-btn--light" id="home-thu-lai">Thử lại</button></p></div>';
  document.getElementById("home-thu-lai").addEventListener("click", () => window.location.reload());
}

async function khoiTao() {
  khoiTaoBanner(document.querySelector(".home-banner"));
  document.querySelectorAll(".home-trust, .home-cta").forEach(hienKhiCuonToi);
  try {
    const du = await taiDuLieu();
    const bayGio = Date.now();
    const cacNhom = chonCacNhom(du.sanPham, du.danhMuc);
    veDanhMuc(du);
    const soBo = veBoPc(elBoPc, du);
    document.querySelectorAll("[data-bo-pc]").forEach((a) => {
      if (soBo) return;
      a.setAttribute("href", "/product-list.html");
      a.firstChild.textContent = "Xem sản phẩm";
    });
    if (!cacNhom.length) {
      elNhom.innerHTML = '<div class="home-group"><p class="home-empty">Cửa hàng chưa có sản phẩm nào.</p></div>';
    } else {
      elNhom.innerHTML = cacNhom.map((n) => htmlNhom(n, bayGio)).join("");
      elNhom.querySelectorAll(".home-group").forEach(hienKhiCuonToi);
      elNhom.querySelectorAll(".home-row").forEach(khoiTaoHang);
    }
    veDanhGia(du);
  } catch (err) {
    console.error("Không tải được dữ liệu trang chủ:", err);
    veLoi();
  } finally {
    elNhom.removeAttribute("aria-busy");
  }
}

khoiTao();
