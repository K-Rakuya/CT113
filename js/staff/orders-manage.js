import { db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast, escapeHtml } from "/js/utils.js";
import { setBusy, pulse, collapseAndRemove } from "/js/motion.js";
import { confirmDialog } from "/js/dialog.js";
import { huyDonVaHoanKho, doiTrangThaiDon, tuChoiYeuCauHuy } from "/js/staff/order-actions.js";
import { collection, getDocs, getDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ordersListEl = document.getElementById("orders-list");
const elTimKiem = document.getElementById("tim-kiem-don");
const elTab = document.getElementById("tab-trang-thai");

const NHAN_TRANG_THAI = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

let donHang = [];
let khachHang = new Map();
let boLoc = "tat_ca";
const cacheChiTiet = new Map();

const coYeuCauHuy = (don) => Boolean(don.yeuCauHuy) && don.trangThai === "cho_duyet";

function khopBoLoc(don) {
  if (boLoc === "yeu_cau_huy") return coYeuCauHuy(don);
  return boLoc === "tat_ca" || don.trangThai === boLoc;
}

function khopTimKiem(don) {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  if (!tuKhoa) return true;
  const kh = khachHang.get(don.khachHangId);
  return `${don.id} ${kh?.hoTen ?? ""} ${kh?.soDienThoai ?? ""}`.toLowerCase().includes(tuKhoa);
}

function htmlHanhDong(don) {
  const nut = (hanhDong, lop, nhan) => `<button type="button" class="btn ${lop} btn--sm" data-hanh-dong="${hanhDong}">${nhan}</button>`;
  if (don.trangThai === "cho_duyet") {
    return coYeuCauHuy(don)
      ? nut("chap-nhan-huy", "btn--danger", "Chấp nhận huỷ") + nut("tu-choi-huy", "btn--secondary", "Từ chối")
      : nut("duyet", "btn--primary", "Duyệt đơn") + nut("huy", "btn--danger", "Hủy");
  }
  if (don.trangThai === "dang_giao") return nut("hoan-thanh", "btn--primary", "Hoàn thành") + nut("huy", "btn--danger", "Hủy");
  return "<span>-</span>";
}

function htmlDong(don) {
  const kh = khachHang.get(don.khachHangId);
  return `
    <td><button type="button" class="qt-lien-ket" data-hanh-dong="chi-tiet" aria-expanded="false"><code>${escapeHtml(don.id)}</code></button></td>
    <td>${escapeHtml(kh?.hoTen ?? "—")}${kh?.soDienThoai ? `<div class="qt-sub">${escapeHtml(kh.soDienThoai)}</div>` : ""}</td>
    <td>${formatDate(don.ngayDat)}</td>
    <td class="qt-num">${formatCurrency(don.tongTien)}</td>
    <td><span class="badge badge--${don.trangThai}">${NHAN_TRANG_THAI[don.trangThai] || escapeHtml(don.trangThai)}</span>${coYeuCauHuy(don) ? ' <span class="badge badge--cho_duyet">Khách yêu cầu huỷ</span>' : ""}</td>
    <td class="qt-actions">${htmlHanhDong(don)}</td>`;
}

function capNhatTab() {
  const dem = {
    tat_ca: donHang.length,
    cho_duyet: donHang.filter((d) => d.trangThai === "cho_duyet").length,
    dang_giao: donHang.filter((d) => d.trangThai === "dang_giao").length,
    hoan_thanh: donHang.filter((d) => d.trangThai === "hoan_thanh").length,
    huy: donHang.filter((d) => d.trangThai === "huy").length,
    yeu_cau_huy: donHang.filter(coYeuCauHuy).length,
  };
  elTab.querySelectorAll("[data-loc]").forEach((nut) => {
    nut.querySelector("strong").textContent = dem[nut.dataset.loc];
    nut.setAttribute("aria-pressed", String(nut.dataset.loc === boLoc));
  });
}

function render() {
  const ds = donHang.filter((d) => khopBoLoc(d) && khopTimKiem(d));
  ordersListEl.replaceChildren();
  if (!ds.length) {
    ordersListEl.innerHTML = '<tr><td colspan="6" class="qt-empty">Không có đơn hàng phù hợp.</td></tr>';
  } else {
    const frag = document.createDocumentFragment();
    ds.forEach((don, i) => {
      const tr = document.createElement("tr");
      tr.dataset.id = don.id;
      tr.className = "motion-enter";
      tr.style.setProperty("--i", Math.min(i, 8));
      tr.innerHTML = htmlDong(don);
      frag.append(tr);
    });
    ordersListEl.append(frag);
  }
  capNhatTab();
}

async function taiDuLieu() {
  try {
    const snap = await getDocs(collection(db, "donhang"));
    donHang = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ngayDat?.toMillis?.() ?? 0) - (a.ngayDat?.toMillis?.() ?? 0));
    const ids = [...new Set(donHang.map((d) => d.khachHangId).filter(Boolean))];
    const nguoi = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id)).catch(() => null)));
    nguoi.forEach((s, i) => s?.exists() && khachHang.set(ids[i], s.data()));
    const loc = new URLSearchParams(window.location.search).get("loc");
    if (loc && elTab.querySelector(`[data-loc="${CSS.escape(loc)}"]`)) boLoc = loc;
    render();
  } catch (err) {
    showToast("Lỗi khi tải danh sách đơn hàng!", "error");
    console.error("Lỗi loadOrders:", err);
  }
}

async function taiChiTiet(don) {
  if (cacheChiTiet.has(don.id)) return cacheChiTiet.get(don.id);
  const snap = await getDocs(query(collection(db, "chitietdonhang"), where("donHangId", "==", don.id)));
  const dong = await Promise.all(
    snap.docs.map(async (d) => {
      const ct = d.data();
      const sp = await getDoc(doc(db, "sanpham", ct.sanPhamId)).catch(() => null);
      return { ...ct, ten: sp?.exists() ? sp.data().tenSanPham : "(Sản phẩm đã bị xoá)" };
    })
  );
  cacheChiTiet.set(don.id, dong);
  return dong;
}

function htmlChiTiet(don, dong) {
  const kh = khachHang.get(don.khachHangId);
  return `
    <div class="qt-chi-tiet__noi-dung">
      <p><strong>Khách hàng:</strong> ${escapeHtml(kh?.hoTen ?? "—")}${kh?.soDienThoai ? ` · ${escapeHtml(kh.soDienThoai)}` : ""}</p>
      <p><strong>Địa chỉ giao:</strong> ${escapeHtml(don.diaChiGiao)}</p>
      <table class="nv-table">
        <thead><tr><th>Sản phẩm</th><th class="qt-num">SL</th><th class="qt-num">Đơn giá</th><th class="qt-num">Thành tiền</th></tr></thead>
        <tbody>${dong.map((ct) => `<tr><td>${escapeHtml(ct.ten)}</td><td class="qt-num">${ct.soLuong}</td><td class="qt-num">${formatCurrency(ct.donGia)}</td><td class="qt-num">${formatCurrency(ct.thanhTien)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
}

async function boChiTiet(tr, don) {
  const nut = tr.querySelector('[data-hanh-dong="chi-tiet"]');
  const dangMo = tr.nextElementSibling?.classList.contains("qt-chi-tiet");
  if (dangMo) {
    const hang = tr.nextElementSibling;
    nut.setAttribute("aria-expanded", "false");
    hang.querySelector(".qt-chi-tiet__khung").classList.remove("is-open");
    setTimeout(() => hang.remove(), 260);
    return;
  }
  const hang = document.createElement("tr");
  hang.className = "qt-chi-tiet";
  hang.innerHTML = '<td colspan="6"><div class="qt-chi-tiet__khung"><div class="qt-chi-tiet__trong"><p class="qt-sub">Đang tải chi tiết...</p></div></div></td>';
  tr.after(hang);
  nut.setAttribute("aria-expanded", "true");
  const khung = hang.querySelector(".qt-chi-tiet__khung");
  requestAnimationFrame(() => khung.classList.add("is-open"));
  try {
    hang.querySelector(".qt-chi-tiet__trong").innerHTML = htmlChiTiet(don, await taiChiTiet(don));
  } catch (err) {
    hang.querySelector(".qt-chi-tiet__trong").innerHTML = '<p class="qt-sub">Không tải được chi tiết đơn hàng.</p>';
    console.error("Lỗi tải chi tiết đơn:", err);
  }
}

async function thucHien(hanhDong, don) {
  if (hanhDong === "duyet") return doiTrangThaiDon(don.id, "dang_giao").then(() => ({ trangThai: "dang_giao" }));
  if (hanhDong === "hoan-thanh") return doiTrangThaiDon(don.id, "hoan_thanh").then(() => ({ trangThai: "hoan_thanh" }));
  if (hanhDong === "tu-choi-huy") return tuChoiYeuCauHuy(don.id).then(() => ({ yeuCauHuy: null }));
  const dongY = await confirmDialog({
    tieuDe: "Huỷ đơn hàng?",
    noiDung: "Đơn sẽ chuyển sang trạng thái đã huỷ và số lượng sản phẩm trong đơn được hoàn lại kho.",
    nhanXacNhan: "Huỷ đơn",
    nguyHiem: true,
  });
  if (!dongY) return null;
  await huyDonVaHoanKho(don.id);
  return { trangThai: "huy", yeuCauHuy: null };
}

ordersListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-hanh-dong]");
  if (!btn) return;
  const tr = btn.closest("tr");
  const don = donHang.find((d) => d.id === tr.dataset.id);
  if (!don) return;
  if (btn.dataset.hanhDong === "chi-tiet") return boChiTiet(tr, don);

  const nutCungDong = tr.querySelectorAll(".qt-actions button");
  nutCungDong.forEach((n) => (n.disabled = true));
  setBusy(btn, true);
  try {
    const thayDoi = await thucHien(btn.dataset.hanhDong, don);
    if (!thayDoi) {
      nutCungDong.forEach((n) => (n.disabled = false));
      setBusy(btn, false);
      return;
    }
    Object.assign(don, thayDoi);
    cacheChiTiet.delete(don.id);
    showToast("Đã cập nhật đơn hàng thành công!", "success");
    capNhatTab();
    if (!khopBoLoc(don)) {
      const chiTiet = tr.nextElementSibling?.classList.contains("qt-chi-tiet") ? tr.nextElementSibling : null;
      chiTiet?.remove();
      await collapseAndRemove(tr);
      if (!ordersListEl.querySelector("tr[data-id]")) render();
      return;
    }
    tr.innerHTML = htmlDong(don);
    pulse(tr.querySelector(".badge"));
  } catch (err) {
    nutCungDong.forEach((n) => (n.disabled = false));
    setBusy(btn, false);
    showToast(err.message?.startsWith("Đơn hàng") ? err.message : "Thao tác thất bại!", "error");
    console.error("Lỗi cập nhật đơn hàng:", err);
  }
});

elTab.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-loc]");
  if (!nut) return;
  boLoc = nut.dataset.loc;
  render();
});

let henGio = 0;
elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(render, 200);
});

document.addEventListener("DOMContentLoaded", taiDuLieu);
