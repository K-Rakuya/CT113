// js/customer/product-list.js
// Trang product-list.html: danh sách sp, tìm theo tên, lọc danh mục + khoảng
// giá, phân trang. Collection dùng: sanpham, danhmuc.

import { db } from "/js/firebase-config.js";
import { formatCurrency, showToast } from "/js/utils.js";
import { swapContent, prefersReducedMotion } from "/js/motion.js";
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

let tatCaSanPham = []; // toàn bộ sp đang bán
let danhSachSauLoc = [];
let trangHienTai = 1;

// Đọc query string ?danhmuc=xxx từ trang chủ / breadcrumb để lọc sẵn.
const thamSoUrl = new URLSearchParams(window.location.search);

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
    apDungBoLoc();
  } catch (err) {
    elDanhSach.innerHTML = '<p class="text-muted">Không tải được sản phẩm.</p>';
    elDanhSach.removeAttribute("aria-busy");
    showToast("Lỗi tải sản phẩm: " + err.message, "error");
  }
}

function apDungBoLoc() {
  const tuKhoa = elTuKhoa.value.trim().toLowerCase();
  const danhMucId = elDanhMuc.value;
  const giaTu = elGiaTu.value ? Number(elGiaTu.value) : null;
  const giaDen = elGiaDen.value ? Number(elGiaDen.value) : null;

  danhSachSauLoc = tatCaSanPham.filter((sp) => {
    if (tuKhoa && !sp.tenSanPham?.toLowerCase().includes(tuKhoa)) return false;
    if (danhMucId && sp.danhMucId !== danhMucId) return false;
    if (giaTu !== null && sp.gia < giaTu) return false;
    if (giaDen !== null && sp.gia > giaDen) return false;
    return true;
  });

  trangHienTai = 1;
  render();
}

function render() {
  swapContent(elDanhSach, renderNoiDung); // cross-fade + co giãn chiều cao khi lọc / phân trang
}

function renderNoiDung() {
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
      const a = document.createElement("a");
      a.href = `/product-detail.html?id=${sp.id}`;
      // motion-enter + --i: các thẻ hiện lần lượt (xếp lớp 32ms) mỗi khi kết quả đổi do người dùng lọc/chuyển trang
      a.className = "card kh-product-card motion-enter";
      a.style.setProperty("--i", i);
      const conHang = (sp.soLuongTon ?? 0) > 0;
      a.innerHTML = `
        <span class="kh-product-card__media"><img class="kh-product-card__img img-fade" src="${sp.hinhAnh || ''}" alt="${sp.tenSanPham}" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'"></span>
        <div class="kh-product-card__name">${sp.tenSanPham}</div>
        <div class="kh-product-card__price">${formatCurrency(sp.gia)}</div>
        <div class="kh-product-card__stock ${conHang ? '' : 'kh-product-card__stock--out'}">
          ${conHang ? `Còn ${sp.soLuongTon} sản phẩm` : 'Tạm hết hàng'}
        </div>
      `;
      elDanhSach.appendChild(a);
    });
  }

  renderPhanTrang(tongSoTrang);
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
      trangHienTai = trang;
      render();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    return btn;
  };

  elPhanTrang.appendChild(taoNut("‹", trangHienTai - 1, trangHienTai === 1));
  for (let i = 1; i <= tongSoTrang; i++) {
    elPhanTrang.appendChild(taoNut(String(i), i, false, i === trangHienTai));
  }
  elPhanTrang.appendChild(taoNut("›", trangHienTai + 1, trangHienTai === tongSoTrang));
}

document.getElementById("form-loc").addEventListener("submit", (e) => {
  e.preventDefault();
  apDungBoLoc();
});
elDanhMuc.addEventListener("change", apDungBoLoc);

await taiDanhMuc();
await taiSanPham();
