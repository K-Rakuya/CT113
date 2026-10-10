// Trang product-list.html: tìm theo tên, lọc theo danh mục, mức giá và tình trạng còn hàng, sắp xếp, phân trang.
// Dữ liệu và quy tắc lọc nằm trong js/catalog/.

import { showToast } from "/js/utils.js";
import { swapContent, prefersReducedMotion } from "/js/motion.js";
import { taiCatalog } from "/js/catalog/catalog-data.js";
import { taoTheSanPham } from "/js/catalog/product-card.js";
import {
  SO_SP_MOI_TRANG,
  docBoLoc,
  ghiBoLoc,
  locSanPham,
  phanTrang,
  cuaSoTrang,
  chuKyDanhSach,
  demTheoDanhMuc,
  chiaMucGia,
  chipBoLoc,
  boLocKhiGo,
  boLocKhiXoaHet,
  chuanHoaKhoangGia,
  tieuDeTrang,
  khoangHienThi,
} from "/js/catalog/catalog-rules.js";
import { dungDanhMuc, capNhatDanhMuc, dungMucGia, capNhatMucGia, veChip, veTrangThai } from "/js/catalog/filter-view.js";

const SO_THE_UU_TIEN = 4;
const TEN_CUA_HANG = "Website bán linh kiện máy tính";

const lay = (id) => document.getElementById(id);
const el = {
  luoi: lay("danh-sach-san-pham"),
  dem: lay("ket-qua-dem"),
  phanTrang: lay("phan-trang"),
  tieuDe: lay("sp-tieu-de"),
  duongDan: lay("sp-breadcrumb"),
  chip: lay("sp-chips"),
  loc: lay("sp-loc"),
  moLoc: lay("btn-mo-loc"),
  soLoc: lay("sp-so-loc"),
  xoaLoc: lay("btn-xoa-loc"),
  tuKhoa: lay("tu-khoa"),
  danhMuc: lay("sp-danh-muc"),
  mucGia: lay("sp-muc-gia"),
  giaTu: lay("gia-tu"),
  giaDen: lay("gia-den"),
  conHang: lay("con-hang"),
  sapXep: lay("sap-xep"),
  oTimTrenDau: document.querySelector(".site-search input"),
};

let boLoc = docBoLoc(window.location.search);
let tatCa = [];
let tenDanhMuc = new Map();
let mucGia = [];
let ketQua = [];
let daTai = false;
let daVe = false;
let chuKyDaVe = null;
let soLanChuyen = 0;
const cacheThe = new Map();

const coChuyenCanh = () => typeof document.startViewTransition === "function" && !prefersReducedMotion();

function dongBoUrl() {
  const chuoi = ghiBoLoc(boLoc);
  history.replaceState(null, "", window.location.pathname + (chuoi ? `?${chuoi}` : ""));
}

function veDuongDan(ten) {
  const dm = ten ? `<a href="/product-list.html">Sản phẩm</a><span class="breadcrumb__sep">/</span><span aria-current="page"></span>` : '<span aria-current="page">Sản phẩm</span>';
  el.duongDan.innerHTML = `<a href="/index.html">Trang chủ</a><span class="breadcrumb__sep">/</span>${dm}`;
  if (ten) el.duongDan.lastElementChild.textContent = ten;
}

function dongBoDieuKhien() {
  const dem = demTheoDanhMuc(tatCa, boLoc);
  const tong = [...dem.values()].reduce((a, b) => a + b, 0);
  capNhatDanhMuc(el.danhMuc, dem, tong, boLoc.danhMuc);
  capNhatMucGia(el.mucGia, mucGia, boLoc);

  const dangNhap = document.activeElement;
  if (dangNhap !== el.tuKhoa) el.tuKhoa.value = boLoc.tuKhoa;
  if (dangNhap !== el.giaTu) el.giaTu.value = boLoc.giaTu ?? "";
  if (dangNhap !== el.giaDen) el.giaDen.value = boLoc.giaDen ?? "";
  if (el.oTimTrenDau && dangNhap !== el.oTimTrenDau) el.oTimTrenDau.value = boLoc.tuKhoa;
  el.conHang.checked = boLoc.conHang;
  el.sapXep.value = boLoc.sapXep;

  const tenDm = tenDanhMuc.get(boLoc.danhMuc);
  const dsChip = chipBoLoc(boLoc, tenDm);
  veChip(el.chip, dsChip);
  el.soLoc.textContent = dsChip.length;
  el.soLoc.hidden = !dsChip.length;
  el.xoaLoc.disabled = !dsChip.length;

  const tieuDe = tieuDeTrang(boLoc, tenDm);
  el.tieuDe.textContent = tieuDe;
  document.title = `${tieuDe} — ${TEN_CUA_HANG}`;
  veDuongDan(boLoc.danhMuc && !boLoc.tuKhoa ? tenDm : "");
}

function capNhat() {
  ketQua = locSanPham(tatCa, boLoc);
  dongBoDieuKhien();
  render();
}

function datBoLoc(moi) {
  if (ghiBoLoc(moi) === ghiBoLoc(boLoc)) return;
  boLoc = moi;
  if (daTai) capNhat();
}

const doiLoc = (phan) => datBoLoc({ ...boLoc, ...phan, trang: 1 });

function render() {
  if (!daVe || !coChuyenCanh()) {
    daVe = true;
    swapContent(el.luoi, renderNoiDung);
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

function veTrangThaiLuoi() {
  if (!tatCa.length) {
    return veTrangThai({ bieuTuong: "box", tieuDe: "Cửa hàng chưa có sản phẩm nào", moTa: "Vui lòng quay lại sau." });
  }
  return veTrangThai({
    bieuTuong: "search",
    tieuDe: "Không tìm thấy sản phẩm phù hợp",
    moTa: "Thử bỏ bớt bộ lọc hoặc dùng từ khoá ngắn hơn.",
    nut: { nhan: "Xoá bộ lọc", thuocTinh: "data-xoa-het" },
  });
}

function renderNoiDung(dungChuyenCanh = false) {
  const trang = phanTrang(ketQua, boLoc.trang);
  boLoc = { ...boLoc, trang: trang.trang };

  if (!trang.tong) {
    el.dem.textContent = "Không có sản phẩm phù hợp";
  } else if (trang.tongTrang > 1) {
    const { tu, den } = khoangHienThi(trang.trang, SO_SP_MOI_TRANG, trang.tong);
    el.dem.textContent = `Hiển thị ${tu}–${den} trên ${trang.tong} sản phẩm`;
  } else {
    el.dem.textContent = `${trang.tong} sản phẩm`;
  }

  el.luoi.removeAttribute("aria-busy");
  if (!trang.muc.length) {
    el.luoi.innerHTML = veTrangThaiLuoi();
  } else {
    el.luoi.replaceChildren();
    const bayGio = Date.now();
    trang.muc.forEach((sp, i) => {
      let the = cacheThe.get(sp.id);
      if (!the) {
        the = taoTheSanPham(sp, { uuTien: i < SO_THE_UU_TIEN, bayGio });
        cacheThe.set(sp.id, the);
      }
      the.classList.toggle("motion-enter", !dungChuyenCanh);
      the.style.setProperty("--i", i);
      the.style.viewTransitionName = dungChuyenCanh ? `sp-${sp.id.replace(/[^\w-]/g, "_")}` : "";
      el.luoi.append(the);
    });
  }

  renderPhanTrang(trang.tongTrang);
  dongBoUrl();
}

function cuonToiKetQua(hanhVi) {
  document.querySelector(".sp-layout").scrollIntoView({ block: "start", behavior: hanhVi });
}

function datTrang(so) {
  const dungChuyenCanh = coChuyenCanh();
  boLoc = { ...boLoc, trang: so };
  if (dungChuyenCanh) cuonToiKetQua("auto");
  render();
  if (!dungChuyenCanh) cuonToiKetQua(prefersReducedMotion() ? "auto" : "smooth");
  el.tieuDe.focus({ preventScroll: true });
}

function renderPhanTrang(tongTrang) {
  el.phanTrang.replaceChildren();
  if (tongTrang <= 1) return;

  const taoNut = (nhan, so, { voHieu = false, hienTai = false, tenDayDu } = {}) => {
    const nut = document.createElement("button");
    nut.type = "button";
    nut.textContent = nhan;
    nut.disabled = voHieu;
    if (tenDayDu) nut.setAttribute("aria-label", tenDayDu);
    if (hienTai) {
      nut.classList.add("is-active");
      nut.setAttribute("aria-current", "page");
    }
    nut.addEventListener("click", () => datTrang(so));
    return nut;
  };

  el.phanTrang.append(taoNut("‹", boLoc.trang - 1, { voHieu: boLoc.trang === 1, tenDayDu: "Trang trước" }));
  for (const muc of cuaSoTrang(boLoc.trang, tongTrang)) {
    if (muc === "…") {
      const dau = document.createElement("span");
      dau.className = "pagination__gap";
      dau.textContent = "…";
      dau.setAttribute("aria-hidden", "true");
      el.phanTrang.append(dau);
    } else {
      el.phanTrang.append(taoNut(String(muc), muc, { hienTai: muc === boLoc.trang, tenDayDu: `Trang ${muc}` }));
    }
  }
  el.phanTrang.append(taoNut("›", boLoc.trang + 1, { voHieu: boLoc.trang === tongTrang, tenDayDu: "Trang sau" }));
}

function nhanDuLieu(du) {
  const chuKy = chuKyDanhSach(du.sanPham);
  if (daTai && chuKy === chuKyDaVe) return;
  chuKyDaVe = chuKy;
  tatCa = du.sanPham;
  tenDanhMuc = new Map(du.danhMuc.map((dm) => [dm.id, dm.tenDanhMuc]));
  const coHang = new Set(tatCa.map((sp) => sp.danhMucId));
  const dsDanhMuc = du.danhMuc.filter((dm) => coHang.has(dm.id)).sort((a, b) => String(a.tenDanhMuc).localeCompare(String(b.tenDanhMuc), "vi"));
  dungDanhMuc(el.danhMuc, dsDanhMuc);
  mucGia = chiaMucGia(tatCa.map((sp) => sp.gia));
  dungMucGia(el.mucGia, mucGia);
  cacheThe.clear();
  daTai = true;
  capNhat();
}

async function taiDuLieu() {
  el.luoi.setAttribute("aria-busy", "true");
  try {
    nhanDuLieu(await taiCatalog({ khiCoBanCu: nhanDuLieu }));
  } catch (loi) {
    console.error("Không tải được sản phẩm:", loi);
    el.luoi.innerHTML = veTrangThai({
      bieuTuong: "shield",
      tieuDe: "Không tải được sản phẩm",
      moTa: "Kiểm tra kết nối mạng rồi thử lại.",
      nut: { nhan: "Thử lại", thuocTinh: "data-thu-lai" },
    });
    el.luoi.removeAttribute("aria-busy");
    showToast("Không tải được sản phẩm.", "error");
  }
}

const kieuMobile = window.matchMedia("(max-width: 900px)");

function dongBoKieuLoc() {
  if (kieuMobile.matches) return;
  if (el.loc.matches(":modal")) el.loc.close();
  el.loc.setAttribute("open", "");
}

function moNganKeoLoc() {
  el.loc.removeAttribute("open");
  el.loc.showModal();
  el.loc.querySelector("[data-dong]").focus();
}

let henGio = 0;
el.tuKhoa.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(() => doiLoc({ tuKhoa: el.tuKhoa.value.trim() }), 250);
});
el.danhMuc.addEventListener("change", (e) => doiLoc({ danhMuc: e.target.value }));
el.mucGia.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-muc]");
  if (!nut) return;
  const muc = mucGia[nut.dataset.muc];
  const dangChon = nut.getAttribute("aria-pressed") === "true";
  doiLoc(dangChon ? { giaTu: null, giaDen: null } : { giaTu: muc.tu, giaDen: muc.den });
});
const doiKhoangGia = () => doiLoc(chuanHoaKhoangGia(el.giaTu.value, el.giaDen.value));
el.giaTu.addEventListener("change", doiKhoangGia);
el.giaDen.addEventListener("change", doiKhoangGia);
el.conHang.addEventListener("change", () => doiLoc({ conHang: el.conHang.checked }));
el.sapXep.addEventListener("change", () => doiLoc({ sapXep: el.sapXep.value }));
lay("form-loc").addEventListener("submit", (e) => e.preventDefault());
el.xoaLoc.addEventListener("click", () => datBoLoc(boLocKhiXoaHet(boLoc)));

el.chip.addEventListener("click", (e) => {
  if (e.target.closest("[data-xoa-het]")) return datBoLoc(boLocKhiXoaHet(boLoc));
  const nut = e.target.closest("[data-go]");
  if (!nut) return;
  datBoLoc(boLocKhiGo(boLoc, nut.dataset.go));
  (el.chip.querySelector(".sp-chip") ?? el.tieuDe).focus({ preventScroll: true });
});

el.luoi.addEventListener("click", (e) => {
  if (e.target.closest("[data-xoa-het]")) datBoLoc(boLocKhiXoaHet(boLoc));
  else if (e.target.closest("[data-thu-lai]")) taiDuLieu();
});

el.moLoc.addEventListener("click", moNganKeoLoc);
el.loc.addEventListener("click", (e) => {
  if (e.target === el.loc || e.target.closest("[data-dong]")) el.loc.close();
});
kieuMobile.addEventListener("change", dongBoKieuLoc);

el.oTimTrenDau?.closest("form").addEventListener("submit", (e) => {
  e.preventDefault();
  doiLoc({ tuKhoa: el.oTimTrenDau.value.trim() });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || kieuMobile.matches) return;
  e.preventDefault();
  el.tuKhoa.focus();
});

dongBoKieuLoc();
await taiDuLieu();
