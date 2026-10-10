import { db } from "/js/firebase-config.js";
import { formatCurrency, escapeHtml, layCache, luuCache } from "/js/utils.js";
import { swapContent } from "/js/motion.js";
import { KHOA_CACHE_TRANG_CHU } from "/js/home/home-cache.js";
import { chonCacNhom, chonDanhGiaNoiBat, bieuTuongDanhMuc, laMoi, nhanTon, catNoiDung } from "/js/home/home-rules.js";
import { khoiTaoBanner, khoiTaoHang, hienKhiCuonToi } from "/js/home/carousel.js";
import { veBoPc } from "/js/home/bundle-view.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const TTL_CACHE = 3 * 60 * 1000;
const SO_NHOM_DUNG_NGAY = 2;
const KHOA_GOI_Y_BO_PC = "ct113.boPc";

const elBoPc = document.getElementById("bo-pc");
const elNhom = document.getElementById("home-nhom");
const elDanhMuc = document.getElementById("home-danh-muc");
const elDanhGia = document.getElementById("home-danh-gia");
const elMucDanhMuc = elDanhMuc.closest("section");
const elFooterBoPc = document.querySelector('.site-footer a[href="/index.html#bo-pc"]');

const icon = (ma) => `<svg class="home-icon" aria-hidden="true"><use href="/images/home/icons.svg#${ma}"/></svg>`;

async function taiDuLieu() {
  const dem = layCache(KHOA_CACHE_TRANG_CHU);
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
  luuCache(KHOA_CACHE_TRANG_CHU, du, TTL_CACHE);
  return du;
}

function htmlThe(sp, bayGio) {
  const ton = nhanTon(sp);
  const nhan = ton === "het" ? '<span class="home-badge home-badge--out">Hết hàng</span>'
    : ton === "sap_het" ? '<span class="home-badge home-badge--warn">Sắp hết</span>'
    : laMoi(sp, bayGio) ? '<span class="home-badge">Mới</span>' : "";
  return `<a class="card kh-product-card" href="/product-detail.html?id=${encodeURIComponent(sp.id)}">
    <span class="kh-product-card__media">${nhan}<img class="kh-product-card__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.hidden=true;this.parentNode.classList.add('is-error')"></span>
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

const nhomCho = new Map();
let bayGioTai = Date.now();

const quanSatCho = "IntersectionObserver" in window
  ? new IntersectionObserver((ds) => ds.forEach((m) => m.isIntersecting && dungNhomCho(m.target)), { rootMargin: "600px 0px" })
  : null;

/** Nhóm ngoài tầm nhìn chỉ giữ một khung chờ; nội dung được dựng khi người dùng cuộn gần tới. */
function htmlCho(n) {
  return `<div class="home-group-slot" id="${escapeHtml(n.ma)}" aria-hidden="true"></div>`;
}

function dungNhomCho(cho) {
  const n = nhomCho.get(cho);
  if (!n) return cho;
  nhomCho.delete(cho);
  quanSatCho?.unobserve(cho);
  cho.insertAdjacentHTML("afterend", htmlNhom(n, bayGioTai));
  const nhom = cho.nextElementSibling;
  cho.remove();
  hienKhiCuonToi(nhom);
  khoiTaoHang(nhom.querySelector(".home-row"));
  return nhom;
}

function veNhom(cacNhom) {
  elNhom.innerHTML = cacNhom.map((n, i) => (i < SO_NHOM_DUNG_NGAY || !quanSatCho ? htmlNhom(n, bayGioTai) : htmlCho(n))).join("");
  const cacCho = [...elNhom.querySelectorAll(":scope > .home-group-slot")];
  cacCho.forEach((cho, k) => {
    nhomCho.set(cho, cacNhom[SO_NHOM_DUNG_NGAY + k]);
    quanSatCho.observe(cho);
  });
}

function veDanhMuc(du) {
  const coHang = new Set(du.sanPham.map((sp) => sp.danhMucId));
  const o = du.danhMuc.filter((dm) => coHang.has(dm.id)).map((dm) => `<a class="home-cat" href="/product-list.html?danhmuc=${encodeURIComponent(dm.id)}"><span class="home-cat__icon">${icon(bieuTuongDanhMuc(dm.tenDanhMuc))}</span>${escapeHtml(dm.tenDanhMuc)}</a>`);
  if (!o.length) return void (elMucDanhMuc.hidden = true);
  elMucDanhMuc.hidden = false;
  swapContent(elDanhMuc, () => {
    elDanhMuc.innerHTML = `<a class="home-cat" href="/product-list.html"><span class="home-cat__icon">${icon("box")}</span>Tất cả sản phẩm</a>${o.join("")}`;
  });
  elDanhMuc.removeAttribute("aria-busy");
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
  elMucDanhMuc.hidden = true;
  elBoPc.hidden = true;
  elBoPc.classList.remove("home-bopc--skel");
  swapContent(elNhom, () => {
    elNhom.innerHTML = '<div class="home-group"><p class="home-empty" role="alert">Không tải được sản phẩm. <button type="button" class="home-btn home-btn--solid" id="home-thu-lai">Thử lại</button></p></div>';
  });
  document.getElementById("home-thu-lai").addEventListener("click", taiVaVe);
}

let nguoiDungDaCuon = false;
["wheel", "touchstart", "keydown"].forEach((ten) => addEventListener(ten, () => (nguoiDungDaCuon = true), { once: true, passive: true }));

/** #bo-pc và các nhóm sản phẩm chỉ có sau khi tải dữ liệu nên trình duyệt chưa tự cuộn tới được neo */
function cuonToiNeo() {
  if (nguoiDungDaCuon || !location.hash) return;
  let id = "";
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  let dich = document.getElementById(id);
  if (!dich || dich.hidden || !(dich === elBoPc || elNhom.contains(dich))) return;
  if (nhomCho.has(dich)) dich = dungNhomCho(dich);
  // Chiều cao các vùng còn đang co giãn nên phải chờ xong, nếu không trang chưa đủ dài để cuộn tới đúng chỗ.
  const dangChay = [elDanhMuc, elBoPc, elNhom].flatMap((el) => el.getAnimations()).map((a) => a.finished);
  Promise.allSettled(dangChay).then(() => requestAnimationFrame(() => !nguoiDungDaCuon && dich.scrollIntoView({ block: "start" })));
}

async function taiVaVe() {
  elNhom.setAttribute("aria-busy", "true");
  try {
    const du = await taiDuLieu();
    bayGioTai = Date.now();
    const cacNhom = chonCacNhom(du.sanPham, du.danhMuc);
    veDanhMuc(du);
    const soBo = veBoPc(elBoPc, du);
    try {
      localStorage.setItem(KHOA_GOI_Y_BO_PC, soBo ? "1" : "0");
    } catch {
      /* chế độ riêng tư có thể chặn localStorage */
    }
    if (!soBo) {
      elFooterBoPc?.closest("li")?.setAttribute("hidden", "");
      document.querySelectorAll("[data-bo-pc]").forEach((a) => {
        a.setAttribute("href", "/product-list.html");
        a.firstChild.textContent = "Xem sản phẩm";
      });
    }
    if (!cacNhom.length) {
      swapContent(elNhom, () => {
        elNhom.innerHTML = '<div class="home-group"><p class="home-empty">Cửa hàng chưa có sản phẩm nào.</p></div>';
      });
    } else {
      swapContent(elNhom, () => veNhom(cacNhom));
      elNhom.querySelectorAll(":scope > .home-group").forEach(hienKhiCuonToi);
      elNhom.querySelectorAll(":scope > .home-group .home-row").forEach(khoiTaoHang);
    }
    veDanhGia(du);
    cuonToiNeo();
  } catch (err) {
    console.error("Không tải được dữ liệu trang chủ:", err);
    veLoi();
  } finally {
    elNhom.removeAttribute("aria-busy");
  }
}

khoiTaoBanner(document.querySelector(".home-banner"));
document.querySelectorAll(".home-trust, .home-cta").forEach(hienKhiCuonToi);
taiVaVe();
