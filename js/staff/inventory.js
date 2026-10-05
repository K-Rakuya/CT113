import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml, formatCurrency } from "/js/utils.js";
import { pulse, setBusy } from "/js/motion.js";
import { phanLoaiTon, kiemTraTonMoi } from "/js/inventory-rules.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("ds-san-pham");
const elTimKiem = document.getElementById("tim-kiem");
const elLoc = document.getElementById("loc-ton");
const elTongKet = document.getElementById("tong-ket");

const NHAN_TON = {
  het: '<span class="badge badge--huy">Hết hàng</span>',
  sap_het: '<span class="badge badge--cho_duyet">Sắp hết</span>',
  con: "",
};

let sanPham = [];
let danhMuc = new Map();
let henGio = 0;

function htmlDong(sp) {
  return `
    <td><div class="qt-cell-main">
      <img class="qt-thumb" src="${escapeHtml(sp.hinhAnh)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div><strong>${escapeHtml(sp.tenSanPham)}</strong>${sp.trangThai === "ngung_ban" ? '<div class="qt-sub">Ngừng bán</div>' : ""}</div>
    </div></td>
    <td>${escapeHtml(danhMuc.get(sp.danhMucId) ?? "—")}</td>
    <td>${formatCurrency(sp.gia)}</td>
    <td><input class="input" type="number" min="0" step="1" inputmode="numeric" value="${sp.soLuongTon ?? 0}" data-ton aria-label="Tồn kho ${escapeHtml(sp.tenSanPham)}" style="width: 96px"> ${NHAN_TON[phanLoaiTon(sp.soLuongTon)]}</td>
    <td class="qt-actions"><button type="button" class="btn btn--primary btn--sm" data-luu disabled>Lưu</button></td>`;
}

function render() {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  const ds = sanPham.filter((sp) => (!tuKhoa || (sp.tenSanPham ?? "").toLowerCase().includes(tuKhoa)) && (!elLoc.value || phanLoaiTon(sp.soLuongTon) === elLoc.value));
  elDanhSach.replaceChildren();
  if (!ds.length) elDanhSach.innerHTML = '<tr><td colspan="5" class="qt-empty">Không có sản phẩm phù hợp.</td></tr>';
  for (const sp of ds) {
    const tr = document.createElement("tr");
    tr.dataset.id = sp.id;
    tr.innerHTML = htmlDong(sp);
    elDanhSach.append(tr);
  }
  const sapHet = sanPham.filter((sp) => phanLoaiTon(sp.soLuongTon) !== "con").length;
  elTongKet.textContent = `${ds.length} sản phẩm · ${sapHet} sắp hết hoặc hết hàng`;
}

async function taiDuLieu() {
  try {
    const [sp, dm] = await Promise.all([getDocs(collection(db, "sanpham")), getDocs(collection(db, "danhmuc"))]);
    danhMuc = new Map(dm.docs.map((d) => [d.id, d.data().tenDanhMuc]));
    sanPham = sp.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.soLuongTon ?? 0) - (b.soLuongTon ?? 0));
    render();
  } catch (err) {
    showToast("Không tải được kho hàng.", "error");
    console.error("Lỗi tải kho hàng:", err);
  }
}

async function luuTon(sp, tr) {
  const ketQua = kiemTraTonMoi(tr.querySelector("[data-ton]").value);
  if (ketQua.loi) return showToast(ketQua.loi, "error");
  const nut = tr.querySelector("[data-luu]");
  setBusy(nut, true);
  try {
    await updateDoc(doc(db, "sanpham", sp.id), ketQua);
    await ghiNhatKy(`cap_nhat_ton_kho: sanpham/${sp.id} -> ton ${sp.soLuongTon ?? 0} thanh ${ketQua.soLuongTon}`);
    sp.soLuongTon = ketQua.soLuongTon;
    tr.innerHTML = htmlDong(sp);
    pulse(tr);
    showToast("Đã cập nhật tồn kho.", "success");
  } catch (err) {
    showToast("Không lưu được tồn kho, vui lòng thử lại.", "error");
    console.error("Lỗi cập nhật tồn kho:", err);
    setBusy(nut, false);
  }
}

elDanhSach.addEventListener("input", (e) => {
  const o = e.target.closest("[data-ton]");
  const tr = o?.closest("tr");
  const sp = sanPham.find((x) => x.id === tr?.dataset.id);
  if (sp) tr.querySelector("[data-luu]").disabled = Number(o.value) === (sp.soLuongTon ?? 0);
});

elDanhSach.addEventListener("click", (e) => {
  const tr = e.target.closest("[data-luu]")?.closest("tr");
  const sp = sanPham.find((x) => x.id === tr?.dataset.id);
  if (sp) luuTon(sp, tr);
});

elLoc.addEventListener("change", render);
elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(render, 200);
});

taiDuLieu();
