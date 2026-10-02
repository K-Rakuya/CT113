import { formatCurrency, showToast, escapeHtml } from "/js/utils.js";
import { animateNumber } from "/js/motion.js";
import { taiDonHang, taiChiTiet, taiTenSanPham } from "/js/owner/revenue-data.js";
import * as tk from "/js/owner/revenue-metrics.js";
import { taoCsv, taiFileCsv } from "/js/csv.js";

const NHAN_TRANG_THAI = { cho_duyet: "Chờ duyệt", dang_giao: "Đang giao", hoan_thanh: "Hoàn thành", huy: "Đã huỷ" };
const THU_TU_TRANG_THAI = ["hoan_thanh", "dang_giao", "cho_duyet", "huy"];

const elNut = document.querySelectorAll("[data-kieu]");
const elTuyChon = document.getElementById("tuy-chon");
const elTuNgay = document.getElementById("tu-ngay");
const elDenNgay = document.getElementById("den-ngay");
const elMoTa = document.getElementById("mo-ta-khoang");
const elBieuDo = document.getElementById("bieu-do");
const elTieuDeBieuDo = document.getElementById("tieu-de-bieu-do");
const elChuGiai = document.getElementById("chu-giai");
const elTrangThai = document.getElementById("trang-thai");
const elTop = document.getElementById("top-san-pham");
const elBaoCao = document.getElementById("bao-cao");

let kieu = "30";
let luotTai = 0;
let donHangKyNay = [];
let khoangHienTai = null;
const kpiTruoc = {};

const dinhDangNgay = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const dinhDangNgayGio = (d) => `${dinhDangNgay(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const dinhDangSoThuc = (n) => (Math.round(n * 10) / 10).toLocaleString("vi-VN");
const dinhDangISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function hienKpi(ten, giaTri, dinhDang, thayDoi) {
  const el = document.querySelector(`[data-kpi="${ten}"]`);
  animateNumber(el, giaTri, { from: kpiTruoc[ten] ?? 0, format: dinhDang });
  kpiTruoc[ten] = giaTri;
  const elDelta = document.querySelector(`[data-delta="${ten}"]`);
  if (!elDelta) return;
  if (thayDoi === null || thayDoi === undefined) {
    elDelta.className = "qt-delta";
    elDelta.textContent = "Chưa có dữ liệu kỳ trước";
    return;
  }
  const tang = thayDoi >= 0;
  elDelta.className = `qt-delta ${tang ? "qt-delta--up" : "qt-delta--down"}`;
  elDelta.textContent = `${tang ? "▲" : "▼"} ${dinhDangSoThuc(Math.abs(thayDoi))}% so với kỳ trước`;
}

function veBieuDo(ky) {
  const { theoTuan, cacKy } = ky;
  elTieuDeBieuDo.textContent = theoTuan ? "Doanh thu theo tuần" : "Doanh thu theo ngày";
  const tongDoanhThu = cacKy.reduce((t, k) => t + k.doanhThu, 0);
  if (tongDoanhThu === 0) {
    elBieuDo.innerHTML = '<p class="qt-empty">Chưa có đơn hoàn thành trong khoảng thời gian này.</p>';
    return;
  }

  const W = 720, H = 280, L = 56, R = 12, T = 12, B = 32;
  const cao = H - T - B;
  const tran = tk.lamTronTran(Math.max(...cacKy.map((k) => k.doanhThu)));
  const rongCot = (W - L - R) / cacKy.length;
  const rongThanh = Math.max(2, rongCot * 0.62);
  const buocNhan = Math.ceil(cacKy.length / 10);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${theoTuan ? "Biểu đồ doanh thu theo tuần" : "Biểu đồ doanh thu theo ngày"}">`;
  for (let i = 0; i <= 4; i++) {
    const y = T + cao * (1 - i / 4);
    svg += `<line class="qt-luoi" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="qt-nhan-y" x="${L - 8}" y="${y + 4}" text-anchor="end">${tk.rutGonTien((tran * i) / 4)}</text>`;
  }
  cacKy.forEach((k, i) => {
    const h = (k.doanhThu / tran) * cao;
    const x = L + i * rongCot + (rongCot - rongThanh) / 2;
    svg += `<rect class="qt-thanh${k.doanhThu ? "" : " qt-thanh--rong"}" tabindex="${k.doanhThu ? 0 : -1}" data-i="${i}" style="--i:${i}" x="${x}" y="${H - B - h}" width="${rongThanh}" height="${Math.max(h, 1)}" rx="3" aria-label="${k.nhan}: ${formatCurrency(k.doanhThu)}, ${k.soDon} đơn"/>`;
    if (i % buocNhan === 0) svg += `<text class="qt-nhan-x" x="${x + rongThanh / 2}" y="${H - 10}" text-anchor="middle">${k.nhan}</text>`;
  });
  elBieuDo.innerHTML = svg + "</svg>";
  elBieuDo._cacKy = cacKy;
}

function hienChuGiai(thanh) {
  const k = elBieuDo._cacKy?.[Number(thanh.dataset.i)];
  if (!k) return;
  elChuGiai.innerHTML = `<strong>${escapeHtml(k.nhan)}</strong><br>${formatCurrency(k.doanhThu)} · ${k.soDon} đơn`;
  const goc = elBieuDo.getBoundingClientRect();
  const o = thanh.getBoundingClientRect();
  elChuGiai.style.left = `${o.left - goc.left + o.width / 2}px`;
  elChuGiai.style.top = `${o.top - goc.top - 8}px`;
  elChuGiai.hidden = false;
}

function veTrangThai(thongKe) {
  const tong = thongKe.tong;
  if (!tong) {
    elTrangThai.innerHTML = '<p class="qt-empty">Chưa có đơn hàng trong khoảng này.</p>';
    return;
  }
  const thanh = THU_TU_TRANG_THAI.filter((t) => thongKe.theoTrangThai[t] > 0)
    .map((t) => `<span class="qt-phan qt-phan--${t}" style="flex:${thongKe.theoTrangThai[t]}" title="${NHAN_TRANG_THAI[t]}: ${thongKe.theoTrangThai[t]}"></span>`)
    .join("");
  const chuGiai = THU_TU_TRANG_THAI.map(
    (t) => `<li><span class="qt-cham qt-phan--${t}"></span>${NHAN_TRANG_THAI[t]}<strong>${thongKe.theoTrangThai[t]}</strong></li>`
  ).join("");
  elTrangThai.innerHTML = `<div class="qt-thanh-chong">${thanh}</div><ul class="qt-chu-giai">${chuGiai}</ul>`;
}

function veTop(top) {
  if (!top.length) {
    elTop.innerHTML = '<p class="qt-empty">Chưa có sản phẩm bán ra trong khoảng này.</p>';
    return;
  }
  const lon = top[0].doanhThu || 1;
  elTop.innerHTML = top
    .map(
      (sp, i) => `<div class="qt-top-dong" style="--i:${i}">
        <div class="qt-top-dong__ten"><span>${i + 1}. ${escapeHtml(sp.ten)}</span><span class="qt-sub">${sp.soLuong} sản phẩm · ${formatCurrency(sp.doanhThu)}</span></div>
        <div class="qt-top-dong__rail"><div class="qt-top-dong__bar" style="width:${(sp.doanhThu / lon) * 100}%"></div></div>
      </div>`
    )
    .join("");
}

async function taiBaoCao() {
  const luot = ++luotTai;
  const khoang = khoangHienTai;
  elBaoCao.setAttribute("aria-busy", "true");
  try {
    const donHang = await taiDonHang(khoang.truocTu, khoang.den);
    const hoanThanh = donHang.filter((d) => d.trangThai === "hoan_thanh" && d.ngay >= khoang.tu && d.ngay <= khoang.den);
    const [chiTiet, tenSanPham] = await Promise.all([taiChiTiet(hoanThanh.map((d) => d.id)), taiTenSanPham()]);
    if (luot !== luotTai) return;

    const hienTai = tk.thongKeDon(donHang, khoang.tu, khoang.den);
    const truoc = tk.thongKeDon(donHang, khoang.truocTu, khoang.truocDen);
    donHangKyNay = donHang.filter((d) => d.ngay >= khoang.tu && d.ngay <= khoang.den);

    elMoTa.textContent = `${dinhDangNgay(khoang.tu)} – ${dinhDangNgay(khoang.den)} · so với ${dinhDangNgay(khoang.truocTu)} – ${dinhDangNgay(khoang.truocDen)}`;
    hienKpi("doanh-thu", hienTai.doanhThu, formatCurrency, tk.phanTramThayDoi(hienTai.doanhThu, truoc.doanhThu));
    hienKpi("don-hoan-thanh", hienTai.soDonHoanThanh, (n) => String(Math.round(n)), tk.phanTramThayDoi(hienTai.soDonHoanThanh, truoc.soDonHoanThanh));
    hienKpi("gia-tri-tb", hienTai.giaTriTB, formatCurrency, tk.phanTramThayDoi(hienTai.giaTriTB, truoc.giaTriTB));
    hienKpi("ty-le-huy", hienTai.tyLeHuy * 100, (n) => `${dinhDangSoThuc(n)}%`, null);

    veBieuDo(tk.doanhThuTheoKy(donHang, khoang.tu, khoang.den));
    veTrangThai(hienTai);
    veTop(tk.topSanPham(chiTiet, tenSanPham, 5));
  } catch (err) {
    if (luot === luotTai) showToast("Không tải được báo cáo doanh thu.", "error");
    console.error("Lỗi taiBaoCao:", err);
  } finally {
    if (luot === luotTai) elBaoCao.removeAttribute("aria-busy");
  }
}

function chonKhoang(kieuMoi) {
  kieu = kieuMoi;
  elNut.forEach((nut) => nut.setAttribute("aria-pressed", String(nut.dataset.kieu === kieu)));
  elTuyChon.hidden = kieu !== "tuy_chon";
  if (kieu === "tuy_chon") {
    if (!elTuNgay.value || !elDenNgay.value) return;
    const tu = new Date(`${elTuNgay.value}T00:00:00`);
    const den = new Date(`${elDenNgay.value}T00:00:00`);
    if (tu > den) {
      showToast("Ngày bắt đầu phải trước ngày kết thúc.", "error");
      return;
    }
    if ((den - tu) / tk.MOT_NGAY > 366) {
      showToast("Chỉ xem được tối đa 1 năm mỗi lần.", "error");
      return;
    }
    khoangHienTai = tk.taoKhoang("tuy_chon", { tu, den });
  } else {
    khoangHienTai = tk.taoKhoang(kieu);
  }
  taiBaoCao();
}

function xuatCsv() {
  if (!khoangHienTai || !donHangKyNay.length) {
    showToast("Không có đơn hàng nào để xuất.", "info");
    return;
  }
  const dong = [...donHangKyNay].sort((a, b) => a.ngay - b.ngay).map((d) => [d.id, dinhDangNgayGio(d.ngay), NHAN_TRANG_THAI[d.trangThai] ?? d.trangThai, d.tongTien]);
  taiFileCsv(
    `don-hang_${dinhDangISO(khoangHienTai.tu)}_${dinhDangISO(khoangHienTai.den)}.csv`,
    taoCsv(["Mã đơn", "Ngày đặt", "Trạng thái", "Tổng tiền (VNĐ)"], dong)
  );
}

elNut.forEach((nut) => nut.addEventListener("click", () => chonKhoang(nut.dataset.kieu)));
document.getElementById("btn-ap-dung").addEventListener("click", () => chonKhoang("tuy_chon"));
document.getElementById("btn-xuat").addEventListener("click", xuatCsv);
elBieuDo.addEventListener("pointerover", (e) => {
  const thanh = e.target.closest(".qt-thanh");
  if (thanh && !thanh.classList.contains("qt-thanh--rong")) hienChuGiai(thanh);
});
elBieuDo.addEventListener("focusin", (e) => e.target.matches?.(".qt-thanh") && hienChuGiai(e.target));
elBieuDo.addEventListener("pointerout", (e) => e.target.closest(".qt-thanh") && (elChuGiai.hidden = true));
elBieuDo.addEventListener("focusout", () => (elChuGiai.hidden = true));

export function khoiTao() {
  const homNay = new Date();
  elDenNgay.value = dinhDangISO(homNay);
  elTuNgay.value = dinhDangISO(new Date(homNay.getFullYear(), homNay.getMonth(), homNay.getDate() - 29));
  chonKhoang("30");
}
