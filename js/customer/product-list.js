// js/customer/product-list.js
// Trang product-list.html: danh sách sp, tìm theo tên, lọc danh mục + khoảng
// giá, sắp xếp, phân trang. Collection dùng: sanpham, danhmuc.

import { db } from "/js/firebase-config.js";
import { formatCurrency, showToast, escapeHtml } from "/js/utils.js";
import { swapContent, prefersReducedMotion } from "/js/motion.js";
import { khopTuKhoa, sapXepSanPham, KIEU_SAP_XEP } from "/js/search-rules.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const SO_SP_MOI_TRANG = 12;

const elDanhSach = document.getElementById("danh-sach-san-pham");
const elDem = document.getElementById("ket-qua-dem");
const elPhanTrang = document.getElementById("phan-trang");
const elDanhMuc = document.getElementById("danh-muc");
const elTuKhoa = document.getElementById("tu-khoa");
const elGiaTu = document.getElementById("gia-tu");
const elGiaDen = document.getElementById("gia-den");
const elSapXep = document.getElementById("sap-xep");

let tatCaSanPham = []; // toàn bộ sp đang bán
let danhSachSauLoc = [];
let trangHienTai = 1;
let daTaiXong = false;
let daRenderLanDau = false;
let khoaLocCuoi = null;
let soLanChuyen = 0;
const cacheThe = new Map(); // giữ thẻ đã dựng để ảnh không tải lại và các thẻ còn lại trượt đúng chỗ khi lọc

// Bộ lọc nằm trên query string (tukhoa, danhmuc, giatu, giaden, sapxep, trang): trang chủ / breadcrumb lọc sẵn, bấm Back quay về đúng kết quả.
const thamSoUrl = new URLSearchParams(window.location.search);

function docBoLocTuUrl() {
  elTuKhoa.value = thamSoUrl.get("tukhoa") ?? "";
  elGiaTu.value = thamSoUrl.get("giatu") ?? "";
  elGiaDen.value = thamSoUrl.get("giaden") ?? "";
  elSapXep.value = thamSoUrl.get("sapxep") in KIEU_SAP_XEP ? thamSoUrl.get("sapxep") : "mac_dinh";
  trangHienTai = Math.max(1, parseInt(thamSoUrl.get("trang"), 10) || 1);
}

function dongBoUrl() {
  const tham = new URLSearchParams();
  if (elTuKhoa.value.trim()) tham.set("tukhoa", elTuKhoa.value.trim());
  if (elDanhMuc.value) tham.set("danhmuc", elDanhMuc.value);
  if (elGiaTu.value) tham.set("giatu", elGiaTu.value);
  if (elGiaDen.value) tham.set("giaden", elGiaDen.value);
  if (elSapXep.value !== "mac_dinh") tham.set("sapxep", elSapXep.value);
  if (trangHienTai > 1) tham.set("trang", trangHienTai);
  const chuoi = tham.toString();
  history.replaceState(null, "", window.location.pathname + (chuoi ? `?${chuoi}` : ""));
}

function coChuyenCanh() {
  return typeof document.startViewTransition === "function" && !prefersReducedMotion();
}

async function taiDanhMuc() {
  try {
    const snap = await getDocs(collection(db, "danhmuc"));
    snap.forEach((docSnap) => {
      const dm = docSnap.data();
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = dm.tenDanhMuc;
      elDanhMuc.appendChild(opt);
    });
    const dmTuUrl = thamSoUrl.get("danhmuc");
    if (dmTuUrl) elDanhMuc.value = dmTuUrl;
  } catch (err) {
    console.error("Không tải được danh mục:", err);
  }
}

async function taiSanPham() {
  // Khung chờ (skeleton) nằm sẵn trong product-list.html → hiện ngay từ khung hình đầu tiên.
  elDanhSach.setAttribute("aria-busy", "true");
  try {
    // Chỉ hiển thị sp đang bán.
    const q = query(collection(db, "sanpham"), where("trangThai", "==", "dang_ban"));
    const snap = await getDocs(q);
    tatCaSanPham = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    daTaiXong = true;
    apDungBoLoc({ giuTrang: true });
  } catch (err) {
    elDanhSach.innerHTML = '<p class="text-muted">Không tải được sản phẩm.</p>';
    elDanhSach.removeAttribute("aria-busy");
    showToast("Lỗi tải sản phẩm: " + err.message, "error");
  }
}

function apDungBoLoc({ giuTrang = false } = {}) {
  const tuKhoa = elTuKhoa.value.trim();
  const danhMucId = elDanhMuc.value;
  const giaTu = elGiaTu.value ? Number(elGiaTu.value) : null;
  const giaDen = elGiaDen.value ? Number(elGiaDen.value) : null;

  const kieuSapXep = elSapXep.value;

  const khoaLoc = JSON.stringify([tuKhoa, danhMucId, giaTu, giaDen, kieuSapXep]);
  if (!giuTrang && khoaLoc === khoaLocCuoi) return;
  khoaLocCuoi = khoaLoc;

  danhSachSauLoc = sapXepSanPham(tatCaSanPham, kieuSapXep).filter((sp) => {
    if (tuKhoa && !khopTuKhoa(sp.tenSanPham, tuKhoa)) return false;
    if (danhMucId && sp.danhMucId !== danhMucId) return false;
    if (giaTu !== null && sp.gia < giaTu) return false;
    if (giaDen !== null && sp.gia > giaDen) return false;
    return true;
  });

  if (!giuTrang) trangHienTai = 1;
  render();
}

function render() {
  if (!daRenderLanDau || !coChuyenCanh()) {
    daRenderLanDau = true;
    swapContent(elDanhSach, renderNoiDung); // cross-fade + co giãn chiều cao: khung chờ → dữ liệu, hoặc khi trình duyệt không có View Transitions
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

function taoThe(sp, i) {
  const a = document.createElement("a");
  a.href = `/product-detail.html?id=${sp.id}`;
  a.className = "card kh-product-card";
  const conHang = (sp.soLuongTon ?? 0) > 0;
  const uuTien = i < 4 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  a.innerHTML = `
        <span class="kh-product-card__media"><img class="kh-product-card__img img-fade" src="${escapeHtml(sp.hinhAnh)}" alt="${escapeHtml(sp.tenSanPham)}" ${uuTien} decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'"></span>
        <div class="kh-product-card__name">${escapeHtml(sp.tenSanPham)}</div>
        <div class="kh-product-card__price">${formatCurrency(sp.gia)}</div>
        <div class="kh-product-card__stock ${conHang ? '' : 'kh-product-card__stock--out'}">
          ${conHang ? `Còn ${sp.soLuongTon} sản phẩm` : 'Tạm hết hàng'}
        </div>
      `;
  return a;
}

function renderNoiDung(dungChuyenCanh = false) {
  const tongSo = danhSachSauLoc.length;
  elDem.textContent = tongSo > 0 ? `Tìm thấy ${tongSo} sản phẩm` : "Không có sản phẩm phù hợp";

  const tongSoTrang = Math.max(1, Math.ceil(tongSo / SO_SP_MOI_TRANG));
  if (trangHienTai > tongSoTrang) trangHienTai = tongSoTrang;

  const batDau = (trangHienTai - 1) * SO_SP_MOI_TRANG;
  const trang = danhSachSauLoc.slice(batDau, batDau + SO_SP_MOI_TRANG);

  elDanhSach.removeAttribute("aria-busy");
  if (trang.length === 0) {
    elDanhSach.innerHTML = '<p class="empty-state">Không tìm thấy sản phẩm nào phù hợp bộ lọc.</p>';
  } else {
    elDanhSach.innerHTML = "";
    trang.forEach((sp, i) => {
      let a = cacheThe.get(sp.id);
      if (!a) {
        a = taoThe(sp, i);
        cacheThe.set(sp.id, a);
      }
      // Chuyển cảnh: mỗi thẻ có tên riêng để tự trượt về chỗ mới. Không chuyển cảnh: thẻ hiện lần lượt (motion-enter + --i, xếp lớp 32ms).
      a.classList.toggle("motion-enter", !dungChuyenCanh);
      a.style.setProperty("--i", i);
      a.style.viewTransitionName = dungChuyenCanh ? `sp-${sp.id.replace(/[^\w-]/g, "_")}` : "";
      elDanhSach.appendChild(a);
    });
  }

  renderPhanTrang(tongSoTrang);
  dongBoUrl();
}

function renderPhanTrang(tongSoTrang) {
  elPhanTrang.innerHTML = "";
  if (tongSoTrang <= 1) return;

  const taoNut = (nhan, trang, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.textContent = nhan;
    btn.disabled = disabled;
    if (active) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      const dungChuyenCanh = coChuyenCanh();
      trangHienTai = trang;
      if (dungChuyenCanh) window.scrollTo(0, 0);
      render();
      if (!dungChuyenCanh) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    return btn;
  };

  elPhanTrang.appendChild(taoNut("‹", trangHienTai - 1, trangHienTai === 1));
  for (let i = 1; i <= tongSoTrang; i++) {
    elPhanTrang.appendChild(taoNut(String(i), i, false, i === trangHienTai));
  }
  elPhanTrang.appendChild(taoNut("›", trangHienTai + 1, trangHienTai === tongSoTrang));
}

const locTheoNguoiDung = () => {
  if (daTaiXong) apDungBoLoc();
};
let henGio = 0;
document.getElementById("form-loc").addEventListener("submit", (e) => {
  e.preventDefault();
  locTheoNguoiDung();
});
elDanhMuc.addEventListener("change", locTheoNguoiDung);
elGiaTu.addEventListener("change", locTheoNguoiDung);
elGiaDen.addEventListener("change", locTheoNguoiDung);
elSapXep.addEventListener("change", locTheoNguoiDung);
elTuKhoa.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(locTheoNguoiDung, 250);
});

docBoLocTuUrl();
await taiDanhMuc();
await taiSanPham();
