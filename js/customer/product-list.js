// js/customer/product-list.js
// Trang product-list.html: danh sách sản phẩm, tìm theo tên, lọc danh mục và khoảng giá, sắp xếp, phân trang.
// Dữ liệu và quy tắc lọc nằm trong js/catalog/.

import { showToast } from "/js/utils.js";
import { swapContent, prefersReducedMotion } from "/js/motion.js";
import { taiCatalog } from "/js/catalog/catalog-data.js";
import { taoTheSanPham } from "/js/catalog/product-card.js";
import { docBoLoc, ghiBoLoc, locSanPham, phanTrang, cuaSoTrang, chuKyDanhSach } from "/js/catalog/catalog-rules.js";

const SO_THE_UU_TIEN = 4;

const elDanhSach = document.getElementById("danh-sach-san-pham");
const elDem = document.getElementById("ket-qua-dem");
const elPhanTrang = document.getElementById("phan-trang");
const elDanhMuc = document.getElementById("danh-muc");
const elTuKhoa = document.getElementById("tu-khoa");
const elGiaTu = document.getElementById("gia-tu");
const elGiaDen = document.getElementById("gia-den");
const elSapXep = document.getElementById("sap-xep");

let tatCaSanPham = [];
let danhSachSauLoc = [];
let trangHienTai = 1;
let daTaiXong = false;
let daRenderLanDau = false;
let khoaLocCuoi = null;
let chuKyDaVe = null;
let soLanChuyen = 0;
const cacheThe = new Map();

const boLocBanDau = docBoLoc(window.location.search);

function ghiBoLocLenForm(boLoc) {
  elTuKhoa.value = boLoc.tuKhoa;
  elGiaTu.value = boLoc.giaTu ?? "";
  elGiaDen.value = boLoc.giaDen ?? "";
  elSapXep.value = boLoc.sapXep;
  trangHienTai = boLoc.trang;
}

function docBoLocTuForm() {
  const boLoc = docBoLoc(`?${new URLSearchParams({ tukhoa: elTuKhoa.value, danhmuc: elDanhMuc.value, giatu: elGiaTu.value, giaden: elGiaDen.value, sapxep: elSapXep.value })}`);
  return { ...boLoc, trang: trangHienTai };
}

function dongBoUrl() {
  const chuoi = ghiBoLoc({ ...docBoLocTuForm(), trang: trangHienTai });
  history.replaceState(null, "", window.location.pathname + (chuoi ? `?${chuoi}` : ""));
}

const coChuyenCanh = () => typeof document.startViewTransition === "function" && !prefersReducedMotion();

function veDanhMuc(dsDanhMuc) {
  const daChon = elDanhMuc.value || boLocBanDau.danhMuc;
  elDanhMuc.querySelectorAll("option:not([value=''])").forEach((o) => o.remove());
  for (const dm of dsDanhMuc) {
    const opt = document.createElement("option");
    opt.value = dm.id;
    opt.textContent = dm.tenDanhMuc;
    elDanhMuc.appendChild(opt);
  }
  elDanhMuc.value = daChon;
}

function nhanDuLieu(du) {
  const chuKy = chuKyDanhSach(du.sanPham);
  if (chuKy === chuKyDaVe && daTaiXong) return;
  chuKyDaVe = chuKy;
  tatCaSanPham = du.sanPham;
  cacheThe.clear();
  veDanhMuc(du.danhMuc);
  daTaiXong = true;
  apDungBoLoc({ giuTrang: true });
}

async function taiDuLieu() {
  elDanhSach.setAttribute("aria-busy", "true");
  try {
    nhanDuLieu(await taiCatalog({ khiCoBanCu: nhanDuLieu }));
  } catch (err) {
    elDanhSach.innerHTML = '<p class="text-muted">Không tải được sản phẩm.</p>';
    elDanhSach.removeAttribute("aria-busy");
    showToast("Lỗi tải sản phẩm: " + err.message, "error");
  }
}

function apDungBoLoc({ giuTrang = false } = {}) {
  const boLoc = docBoLocTuForm();
  const khoaLoc = ghiBoLoc({ ...boLoc, trang: 1 });
  if (!giuTrang && khoaLoc === khoaLocCuoi) return;
  khoaLocCuoi = khoaLoc;

  danhSachSauLoc = locSanPham(tatCaSanPham, boLoc);
  if (!giuTrang) trangHienTai = 1;
  render();
}

function render() {
  if (!daRenderLanDau || !coChuyenCanh()) {
    daRenderLanDau = true;
    swapContent(elDanhSach, renderNoiDung);
    return;
  }

  const lanNay = ++soLanChuyen;
  const goc = document.documentElement;
  goc.classList.add("vt-loc");
  const chuyen = document.startViewTransition(() => renderNoiDung(true));
  chuyen.ready.catch(() => {});
  chuyen.finished
    .catch(() => {})
    .finally(() => {
      if (lanNay !== soLanChuyen) return;
      goc.classList.remove("vt-loc");
      cacheThe.forEach((the) => (the.style.viewTransitionName = ""));
    });
}

function renderNoiDung(dungChuyenCanh = false) {
  const trang = phanTrang(danhSachSauLoc, trangHienTai);
  trangHienTai = trang.trang;
  elDem.textContent = trang.tong > 0 ? `Tìm thấy ${trang.tong} sản phẩm` : "Không có sản phẩm phù hợp";

  elDanhSach.removeAttribute("aria-busy");
  if (!trang.muc.length) {
    elDanhSach.innerHTML = '<p class="empty-state">Không tìm thấy sản phẩm nào phù hợp bộ lọc.</p>';
  } else {
    elDanhSach.innerHTML = "";
    trang.muc.forEach((sp, i) => {
      let the = cacheThe.get(sp.id);
      if (!the) {
        the = taoTheSanPham(sp, { uuTien: i < SO_THE_UU_TIEN });
        cacheThe.set(sp.id, the);
      }
      the.classList.toggle("motion-enter", !dungChuyenCanh);
      the.style.setProperty("--i", i);
      the.style.viewTransitionName = dungChuyenCanh ? `sp-${sp.id.replace(/[^\w-]/g, "_")}` : "";
      elDanhSach.appendChild(the);
    });
  }

  renderPhanTrang(trang.tongTrang);
  dongBoUrl();
}

function renderPhanTrang(tongTrang) {
  elPhanTrang.replaceChildren();
  if (tongTrang <= 1) return;

  const taoNut = (nhan, trang, { voHieu = false, hienTai = false, tenDayDu } = {}) => {
    const nut = document.createElement("button");
    nut.type = "button";
    nut.textContent = nhan;
    nut.disabled = voHieu;
    if (tenDayDu) nut.setAttribute("aria-label", tenDayDu);
    if (hienTai) {
      nut.classList.add("is-active");
      nut.setAttribute("aria-current", "page");
    }
    nut.addEventListener("click", () => {
      const dungChuyenCanh = coChuyenCanh();
      trangHienTai = trang;
      if (dungChuyenCanh) window.scrollTo(0, 0);
      render();
      if (!dungChuyenCanh) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    return nut;
  };

  elPhanTrang.append(taoNut("‹", trangHienTai - 1, { voHieu: trangHienTai === 1, tenDayDu: "Trang trước" }));
  for (const muc of cuaSoTrang(trangHienTai, tongTrang)) {
    if (muc === "…") {
      const dau = document.createElement("span");
      dau.className = "pagination__gap";
      dau.textContent = "…";
      dau.setAttribute("aria-hidden", "true");
      elPhanTrang.append(dau);
    } else {
      elPhanTrang.append(taoNut(String(muc), muc, { hienTai: muc === trangHienTai, tenDayDu: `Trang ${muc}` }));
    }
  }
  elPhanTrang.append(taoNut("›", trangHienTai + 1, { voHieu: trangHienTai === tongTrang, tenDayDu: "Trang sau" }));
}

const locTheoNguoiDung = () => {
  if (daTaiXong) apDungBoLoc();
};
let henGio = 0;
document.getElementById("form-loc").addEventListener("submit", (e) => {
  e.preventDefault();
  locTheoNguoiDung();
});
[elDanhMuc, elGiaTu, elGiaDen, elSapXep].forEach((el) => el.addEventListener("change", locTheoNguoiDung));
elTuKhoa.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(locTheoNguoiDung, 250);
});

ghiBoLocLenForm(boLocBanDau);
await taiDuLieu();
