// Trang product-detail.html: chi tiết sản phẩm, thêm vào giỏ, xem và gửi đánh giá.
// Dữ liệu dùng chung và quy tắc nằm trong js/catalog/.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { setBusy, confirmButton, swapContent, flyToCart, shake, animateNumber, prefersReducedMotion } from "/js/motion.js";
import { getCartCount, setCartCount } from "/js/cart-badge.js";
import { duongDanDangNhap } from "/js/redirect-rules.js";
import { chonSanPhamLienQuan } from "/js/product-rules.js";
import { hienKhiCuonToi } from "/js/home/carousel.js";
import { docCatalogCache, timSanPhamTrongCache } from "/js/catalog/catalog-cache.js";
import { rutGonSanPham } from "/js/catalog/catalog-data.js";
import { taoTheSanPham } from "/js/catalog/product-card.js";
import { veTrangThai } from "/js/catalog/filter-view.js";
import { apDungSeo } from "/js/catalog/product-seo.js";
import {
  SO_DANH_GIA_MOI_LAN,
  trangThaiBan,
  kepSoLuong,
  phanBoSao,
  sapXepDanhGia,
  cuaSoDanhGia,
  kiemTraDanhGia,
} from "/js/catalog/detail-rules.js";
import {
  dungChiTiet,
  dungThanhMua,
  dungDiemDanhGia,
  dungTomTatDanhGia,
  dungDanhGia,
  dungFormDanhGia,
  dungGhiChu,
} from "/js/catalog/detail-view.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const sanPhamId = new URLSearchParams(window.location.search).get("id");

const lay = (id) => document.getElementById(id);
const el = {
  duongDan: lay("breadcrumb-san-pham"),
  chiTiet: lay("noi-dung-chi-tiet"),
  tomTat: lay("tom-tat-danh-gia"),
  form: lay("khung-form-danh-gia"),
  danhSach: lay("danh-sach-danh-gia"),
  xemThem: lay("btn-xem-them-dg"),
  khungDanhGia: lay("danh-gia"),
  khungLienQuan: lay("khung-lien-quan"),
  dsLienQuan: lay("ds-lien-quan"),
  thanhMua: lay("sp-thanh-mua"),
};

let sanPham = null;
let tenDanhMuc = "";
let danhGia = [];
let soHien = 0;
let tomTat = phanBoSao([]);
let nguoiDung = null;
let quanSatMua = null;

const khongDoi = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function hienLoi({ tieuDe, moTa, nut }) {
  el.chiTiet.innerHTML = veTrangThai({ bieuTuong: "search", tieuDe, moTa, nut });
  el.chiTiet.removeAttribute("aria-busy");
  el.tomTat.removeAttribute("aria-busy");
  el.khungDanhGia.hidden = true;
  document.title = `${tieuDe} — Website bán linh kiện máy tính`;
}

const NUT_VE_DANH_SACH = { nhan: "Xem tất cả sản phẩm", href: "/product-list.html" };

if (!sanPhamId) {
  hienLoi({ tieuDe: "Thiếu mã sản phẩm", moTa: "Đường dẫn không có mã sản phẩm. Hãy chọn một sản phẩm trong danh sách.", nut: NUT_VE_DANH_SACH });
} else {
  taiSanPham();
  taiDanhGia();
}

onAuthStateChanged(auth, (user) => {
  nguoiDung = user;
  capNhatKhuVucDanhGia();
});

async function taiSanPham() {
  const dem = timSanPhamTrongCache(sanPhamId);
  if (dem) datSanPham(dem, { tuCache: true });
  try {
    const snap = await getDoc(doc(db, "sanpham", sanPhamId));
    if (!snap.exists()) {
      sanPham = null;
      hienLoi({ tieuDe: "Không tìm thấy sản phẩm", moTa: "Sản phẩm có thể đã được gỡ hoặc đường dẫn không đúng.", nut: NUT_VE_DANH_SACH });
      return;
    }
    datSanPham(rutGonSanPham(snap.id, snap.data()));
  } catch (loi) {
    console.error(loi);
    if (sanPham) return;
    hienLoi({ tieuDe: "Không tải được sản phẩm", moTa: "Vui lòng kiểm tra kết nối rồi thử lại.", nut: { nhan: "Tải lại trang", href: window.location.href } });
  }
}

function datSanPham(sp, { tuCache = false } = {}) {
  if (sanPham && khongDoi(sanPham, sp)) return;
  const laLanDau = !sanPham;
  sanPham = sp;
  if (tuCache && laLanDau) veChiTiet();
  else swapContent(el.chiTiet, veChiTiet);
  el.chiTiet.removeAttribute("aria-busy");
  veThanhMua();
  veDiemDanhGia();
  if (laLanDau) {
    taiTenDanhMuc();
    taiLienQuan();
  }
  dongBoDauTrang();
}

async function taiTenDanhMuc() {
  const id = sanPham.danhMucId;
  if (!id) return;
  const tuCache = docCatalogCache()?.danhMuc.find((dm) => dm.id === id);
  if (tuCache) {
    tenDanhMuc = tuCache.tenDanhMuc;
  } else {
    try {
      const snap = await getDoc(doc(db, "danhmuc", id));
      if (snap.exists()) tenDanhMuc = snap.data().tenDanhMuc;
    } catch (loi) {
      console.error(loi);
    }
  }
  dongBoDauTrang();
}

function dongBoDauTrang() {
  if (!sanPham) return;
  veDuongDan();
  const lienKet = lay("sp-danh-muc-lk");
  if (lienKet && tenDanhMuc) {
    lienKet.textContent = tenDanhMuc;
    lienKet.href = `/product-list.html?danhmuc=${encodeURIComponent(sanPham.danhMucId)}`;
    lienKet.hidden = false;
  }
  apDungSeo(sanPham, { tenDanhMuc, tomTat });
}

function veDuongDan() {
  const sep = '<span class="breadcrumb__sep">/</span>';
  const dm = tenDanhMuc ? `${sep}<a href="/product-list.html?danhmuc=${encodeURIComponent(sanPham.danhMucId)}">${escapeHtml(tenDanhMuc)}</a>` : "";
  el.duongDan.innerHTML = `<a href="/index.html">Trang chủ</a>${sep}<a href="/product-list.html">Sản phẩm</a>${dm}${sep}<span aria-current="page">${escapeHtml(sanPham.tenSanPham)}</span>`;
}

function veDiemDanhGia() {
  const lienKet = lay("diem-danh-gia");
  if (!lienKet) return;
  lienKet.hidden = tomTat.soLuot === 0;
  if (tomTat.soLuot) lienKet.innerHTML = dungDiemDanhGia(tomTat);
}

// ---------------------------- Chi tiết và mua hàng ---------------------------

function veChiTiet() {
  el.chiTiet.innerHTML = dungChiTiet(sanPham);
  veDiemDanhGia();
  batPhongTo();
  batMoRong();
  batSoLuong();
  theoDoiThanhMua();
}

function batPhongTo() {
  const khung = el.chiTiet.querySelector("[data-zoom]");
  if (!khung || prefersReducedMotion() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const datDiem = (e) => {
    const o = khung.getBoundingClientRect();
    khung.style.setProperty("--zx", `${(((e.clientX - o.left) / o.width) * 100).toFixed(1)}%`);
    khung.style.setProperty("--zy", `${(((e.clientY - o.top) / o.height) * 100).toFixed(1)}%`);
  };
  khung.addEventListener("pointerenter", (e) => {
    datDiem(e);
    khung.classList.add("is-zoom");
  });
  khung.addEventListener("pointermove", datDiem);
  khung.addEventListener("pointerleave", () => khung.classList.remove("is-zoom"));
}

function batMoRong() {
  const nut = lay("btn-mo-rong");
  if (!nut) return;
  nut.addEventListener("click", () => {
    const dangGon = lay("sp-mo-ta").classList.toggle("is-gon");
    nut.textContent = dangGon ? "Xem thêm" : "Thu gọn";
    nut.setAttribute("aria-expanded", String(!dangGon));
  });
}

function batSoLuong() {
  const oSoLuong = lay("so-luong");
  if (!oSoLuong) return;
  const nutGiam = lay("btn-giam");
  const nutTang = lay("btn-tang");
  const bo = oSoLuong.closest(".sp-qty");
  const ton = sanPham.soLuongTon;

  const datSoLuong = (yeuCau) => {
    const { soLuong, vuotTon } = kepSoLuong(yeuCau, ton);
    if (vuotTon) {
      shake(bo);
      showToast(`Chỉ còn ${ton} sản phẩm trong kho.`, "info");
    }
    oSoLuong.value = soLuong;
    nutGiam.disabled = soLuong <= 1;
    nutTang.disabled = soLuong >= ton;
    document.querySelectorAll("[data-tam-tinh]").forEach((o) => animateNumber(o, soLuong * sanPham.gia, { duration: 320, format: formatCurrency }));
  };

  nutGiam.addEventListener("click", () => datSoLuong(Number(oSoLuong.value) - 1));
  nutTang.addEventListener("click", () => datSoLuong(Number(oSoLuong.value) + 1));
  oSoLuong.addEventListener("change", () => datSoLuong(Number(oSoLuong.value)));
  datSoLuong(1);
}

function veThanhMua() {
  const ban = trangThaiBan(sanPham);
  el.thanhMua.innerHTML = ban.banDuoc ? dungThanhMua(sanPham) : "";
  if (!ban.banDuoc) el.thanhMua.classList.remove("is-in");
}

function theoDoiThanhMua() {
  quanSatMua?.disconnect();
  const khungMua = lay("sp-mua");
  if (!khungMua || !trangThaiBan(sanPham).banDuoc || !("IntersectionObserver" in window)) return;
  let thayMua = true;
  let thayChan = false;
  const capNhat = () => {
    const hien = !thayMua && !thayChan;
    el.thanhMua.classList.toggle("is-in", hien);
    el.thanhMua.inert = !hien;
  };
  quanSatMua = new IntersectionObserver((ds) => {
    for (const m of ds) {
      if (m.target === khungMua) thayMua = m.isIntersecting;
      else thayChan = m.isIntersecting;
    }
    capNhat();
  });
  quanSatMua.observe(khungMua);
  const chan = document.querySelector(".site-footer");
  if (chan) quanSatMua.observe(chan);
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-them-gio]")) themVaoGio(Number(lay("so-luong")?.value) || 1);
});

async function themVaoGio(soLuong) {
  if (!auth.currentUser) {
    showToast("Vui lòng đăng nhập để thêm vào giỏ hàng.", "info");
    setTimeout(() => (window.location.href = duongDanDangNhap(window.location.pathname + window.location.search)), 1200);
    return;
  }
  const cacNut = [...document.querySelectorAll("[data-them-gio]")];
  cacNut.forEach((nut) => setBusy(nut, true));
  let daThem = 0;
  try {
    const snap = await getDocs(query(
      collection(db, "giohang"),
      where("khachHangId", "==", auth.currentUser.uid),
      where("sanPhamId", "==", sanPhamId),
    ));
    if (snap.empty) {
      await addDoc(collection(db, "giohang"), { khachHangId: auth.currentUser.uid, sanPhamId, soLuong });
      daThem = soLuong;
    } else {
      const hienCo = snap.docs[0];
      const soLuongCu = hienCo.data().soLuong || 0;
      const soLuongMoi = Math.min(sanPham.soLuongTon, soLuongCu + soLuong);
      daThem = soLuongMoi - soLuongCu;
      if (daThem > 0) await updateDoc(hienCo.ref, { soLuong: soLuongMoi });
    }
    if (daThem > 0) showToast("Đã thêm vào giỏ hàng.", "success");
    else showToast("Giỏ hàng đã có số lượng tối đa còn trong kho.", "info");
  } catch (loi) {
    showToast("Không thêm được vào giỏ: " + loi.message, "error");
  } finally {
    cacNut.forEach((nut) => setBusy(nut, false));
    if (daThem > 0) {
      cacNut.forEach((nut) => confirmButton(nut, "Đã thêm"));
      flyToCart(document.querySelector(".sp-gallery__img")).then(() => setCartCount(getCartCount() + daThem));
    }
  }
}

// ------------------------------ Sản phẩm liên quan ---------------------------

async function taiLienQuan() {
  if (!sanPham.danhMucId) return;
  try {
    let dsSanPham = docCatalogCache()?.sanPham;
    if (!dsSanPham) {
      const snap = await getDocs(query(collection(db, "sanpham"), where("danhMucId", "==", sanPham.danhMucId), where("trangThai", "==", "dang_ban")));
      dsSanPham = snap.docs.map((d) => rutGonSanPham(d.id, d.data()));
    }
    const dsLienQuan = chonSanPhamLienQuan(dsSanPham, sanPham);
    if (!dsLienQuan.length) return;
    el.dsLienQuan.replaceChildren(...dsLienQuan.map((sp) => taoTheSanPham(sp)));
    el.khungLienQuan.hidden = false;
    hienKhiCuonToi(el.khungLienQuan, "sp-reveal");
  } catch (loi) {
    console.error("Không tải được sản phẩm liên quan:", loi);
  }
}

// ----------------------------------- Đánh giá --------------------------------

async function taiDanhGia() {
  try {
    const snap = await getDocs(query(collection(db, "danhgia"), where("sanPhamId", "==", sanPhamId)));
    danhGia = sapXepDanhGia(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (loi) {
    console.error(loi);
    el.tomTat.removeAttribute("aria-busy");
    el.tomTat.innerHTML = dungGhiChu("Không tải được đánh giá.");
    return;
  }
  tomTat = phanBoSao(danhGia.map((dg) => dg.soSao));
  soHien = Math.min(SO_DANH_GIA_MOI_LAN, danhGia.length);
  veDanhGia();
  veDiemDanhGia();
  dongBoDauTrang();
}

function veDanhGia() {
  swapContent(el.tomTat, () => {
    el.tomTat.innerHTML = dungTomTatDanhGia(tomTat);
  });
  el.tomTat.removeAttribute("aria-busy");
  const { muc } = cuaSoDanhGia(danhGia, soHien);
  swapContent(el.danhSach, () => {
    el.danhSach.innerHTML = muc.map((dg, i) => dungDanhGia(dg, i)).join("");
  });
  capNhatNutXemThem();
}

function capNhatNutXemThem() {
  const { conLai } = cuaSoDanhGia(danhGia, soHien);
  el.xemThem.hidden = conLai === 0;
  el.xemThem.textContent = `Xem thêm ${Math.min(SO_DANH_GIA_MOI_LAN, conLai)} đánh giá`;
}

el.xemThem.addEventListener("click", () => {
  const truoc = soHien;
  soHien = Math.min(danhGia.length, soHien + SO_DANH_GIA_MOI_LAN);
  const { muc } = cuaSoDanhGia(danhGia, soHien);
  el.danhSach.insertAdjacentHTML("beforeend", muc.slice(truoc).map((dg, i) => dungDanhGia(dg, i)).join(""));
  el.danhSach.children[truoc]?.focus({ preventScroll: true });
  capNhatNutXemThem();
});

/**
 * Khách chỉ được đánh giá nếu có ít nhất một đơn "hoan_thanh" chứa sản phẩm này.
 * chitietdonhang có sẵn khachHangId nên truy vấn một bước, sau đó xác minh đơn cha đã hoàn thành.
 */
async function duocPhepDanhGia(uid) {
  const snapCT = await getDocs(query(collection(db, "chitietdonhang"), where("sanPhamId", "==", sanPhamId), where("khachHangId", "==", uid)));
  const daXet = new Set();
  for (const d of snapCT.docs) {
    const donHangId = d.data().donHangId;
    if (daXet.has(donHangId)) continue;
    daXet.add(donHangId);
    const don = await getDoc(doc(db, "donhang", donHangId));
    if (don.exists() && don.data().trangThai === "hoan_thanh") return true;
  }
  return false;
}

async function daDanhGiaChua(uid) {
  const snap = await getDocs(query(collection(db, "danhgia"), where("sanPhamId", "==", sanPhamId), where("khachHangId", "==", uid)));
  return !snap.empty;
}

async function capNhatKhuVucDanhGia() {
  if (!sanPhamId) return;
  if (!nguoiDung) {
    el.form.innerHTML = dungGhiChu(`<a href="${duongDanDangNhap(window.location.pathname + window.location.search)}">Đăng nhập</a> và mua sản phẩm này để có thể đánh giá.`);
    return;
  }
  const uid = nguoiDung.uid;
  el.form.innerHTML = dungGhiChu("Đang kiểm tra quyền đánh giá…");
  try {
    const [duocPhep, daDanhGia] = await Promise.all([duocPhepDanhGia(uid), daDanhGiaChua(uid)]);
    if (nguoiDung?.uid !== uid) return;
    if (daDanhGia) el.form.innerHTML = dungGhiChu("Bạn đã đánh giá sản phẩm này. Cảm ơn bạn!");
    else if (!duocPhep) el.form.innerHTML = dungGhiChu("Bạn cần mua và nhận sản phẩm này (đơn hàng đã hoàn thành) trước khi đánh giá.");
    else veFormDanhGia();
  } catch (loi) {
    el.form.innerHTML = "";
    console.error(loi);
  }
}

function hienLoiForm(form, loi) {
  form.querySelectorAll("[data-loi]").forEach((o) => {
    o.textContent = loi[o.dataset.loi] ?? "";
  });
  form.elements["noi-dung"].setAttribute("aria-invalid", String(Boolean(loi.noiDung)));
  const dau = form.querySelector(loi.soSao ? ".sp-rate" : "textarea");
  if (Object.keys(loi).length) shake(dau);
}

function veFormDanhGia() {
  el.form.innerHTML = dungFormDanhGia();
  const form = lay("form-danh-gia");
  const dem = lay("dem-ky-tu");
  const oNoiDung = form.elements["noi-dung"];
  const xoaLoi = (khoa) => {
    form.querySelector(`[data-loi="${khoa}"]`).textContent = "";
    if (khoa === "noiDung") oNoiDung.setAttribute("aria-invalid", "false");
  };
  oNoiDung.addEventListener("input", () => {
    dem.textContent = `${oNoiDung.value.length}/${oNoiDung.maxLength}`;
    xoaLoi("noiDung");
  });
  form.querySelectorAll('[name="so-sao"]').forEach((o) => o.addEventListener("change", () => xoaLoi("soSao")));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const kq = kiemTraDanhGia({ soSao: new FormData(form).get("so-sao"), noiDung: oNoiDung.value });
    hienLoiForm(form, kq.loi);
    if (!kq.hopLe) return;

    const nut = form.querySelector('[type="submit"]');
    setBusy(nut, true);
    try {
      await addDoc(collection(db, "danhgia"), {
        sanPhamId,
        khachHangId: nguoiDung.uid,
        soSao: kq.giaTri.soSao,
        noiDung: kq.giaTri.noiDung,
        ngayDanhGia: serverTimestamp(),
      });
      showToast("Cảm ơn bạn đã đánh giá!", "success");
      await ghiNhatKy(`them_danh_gia: sanpham/${sanPhamId}`);
      await taiDanhGia();
      await capNhatKhuVucDanhGia();
    } catch (loi) {
      showToast("Gửi đánh giá thất bại: " + loi.message, "error");
    } finally {
      setBusy(nut, false);
    }
  });
}
