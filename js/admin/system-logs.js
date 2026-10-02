import { db } from "/js/firebase-config.js";
import { showToast, escapeHtml, formatDateTime } from "/js/utils.js";
import { setBusy } from "/js/motion.js";
import { taoCsv, taiFileCsv } from "/js/csv.js";
import { NHOM_HANH_DONG, phanTichHanhDong } from "/js/admin/log-format.js";
import { NHAN_VAI_TRO } from "/js/admin/users-rules.js";
import { collection, getDocs, getDoc, doc, query, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const SO_DONG_MOI_LAN = 50;

const elDanhSach = document.getElementById("ds-nhat-ky");
const elTimKiem = document.getElementById("tim-kiem");
const elNhom = document.getElementById("loc-nhom");
const elTaiThem = document.getElementById("btn-tai-them");
const elTongKet = document.getElementById("tong-ket");

let nhatKy = [];
let conTiepTheo = null;
let heT = false;
const nguoiDung = new Map();

const tenNguoi = (id) => {
  const u = nguoiDung.get(id);
  return u ? `${u.hoTen || u.email || id}` : id;
};

function locDanhSach() {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  return nhatKy.filter((d) => {
    if (elNhom.value && d.hd.nhom !== elNhom.value) return false;
    return !tuKhoa || `${d.hd.nhan} ${d.hd.doiTuong} ${d.hd.chiTiet} ${tenNguoi(d.nguoiThucHienId)}`.toLowerCase().includes(tuKhoa);
  });
}

function render(soDongCu = 0) {
  const ds = locDanhSach();
  elDanhSach.replaceChildren();
  if (!ds.length) {
    elDanhSach.innerHTML = '<tr><td colspan="4" class="qt-empty">Không có bản ghi phù hợp.</td></tr>';
  } else {
    const frag = document.createDocumentFragment();
    ds.forEach((d, i) => {
      const tr = document.createElement("tr");
      if (i >= soDongCu) {
        tr.className = "motion-enter";
        tr.style.setProperty("--i", Math.min(i - soDongCu, 8));
      }
      const u = nguoiDung.get(d.nguoiThucHienId);
      tr.innerHTML = `
        <td>${formatDateTime(d.thoiGian)}</td>
        <td>${escapeHtml(tenNguoi(d.nguoiThucHienId))}${u?.vaiTro ? `<div class="qt-sub">${NHAN_VAI_TRO[u.vaiTro] ?? escapeHtml(u.vaiTro)}</div>` : ""}</td>
        <td><strong>${escapeHtml(d.hd.nhan)}</strong></td>
        <td><code>${escapeHtml(d.hd.doiTuong)}</code>${d.hd.chiTiet ? `<div class="qt-sub">${escapeHtml(d.hd.chiTiet)}</div>` : ""}</td>`;
      frag.append(tr);
    });
    elDanhSach.append(frag);
  }
  elTongKet.textContent = `Đã tải ${nhatKy.length} bản ghi${heT ? " (hết)" : ""} · hiển thị ${ds.length}`;
  elTaiThem.hidden = heT;
}

async function napNguoiDung(ids) {
  const moi = [...new Set(ids)].filter((id) => id && !nguoiDung.has(id));
  const ket = await Promise.all(moi.map((id) => getDoc(doc(db, "users", id)).catch(() => null)));
  ket.forEach((s, i) => nguoiDung.set(moi[i], s?.exists() ? s.data() : {}));
}

async function taiThem() {
  setBusy(elTaiThem, true);
  const soDongCu = locDanhSach().length;
  try {
    const rang = [orderBy("thoiGian", "desc")];
    if (conTiepTheo) rang.push(startAfter(conTiepTheo));
    const snap = await getDocs(query(collection(db, "nhatky"), ...rang, limit(SO_DONG_MOI_LAN)));
    await napNguoiDung(snap.docs.map((d) => d.data().nguoiThucHienId));
    nhatKy.push(...snap.docs.map((d) => ({ id: d.id, ...d.data(), hd: phanTichHanhDong(d.data().hanhDong) })));
    conTiepTheo = snap.docs.at(-1) ?? conTiepTheo;
    heT = snap.docs.length < SO_DONG_MOI_LAN;
    render(soDongCu);
  } catch (err) {
    showToast("Không tải được nhật ký hệ thống.", "error");
    console.error("Lỗi tải nhật ký:", err);
  } finally {
    setBusy(elTaiThem, false);
  }
}

function xuatCsv() {
  const ds = locDanhSach();
  if (!ds.length) {
    showToast("Không có bản ghi nào để xuất.", "info");
    return;
  }
  const dong = ds.map((d) => [formatDateTime(d.thoiGian), tenNguoi(d.nguoiThucHienId), d.hd.nhan, d.hd.doiTuong, d.hd.chiTiet]);
  taiFileCsv(`nhat-ky-he-thong_${new Date().toISOString().slice(0, 10)}.csv`, taoCsv(["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Chi tiết"], dong));
}

elTaiThem.addEventListener("click", taiThem);
document.getElementById("btn-xuat").addEventListener("click", xuatCsv);
elNhom.insertAdjacentHTML("beforeend", Object.entries(NHOM_HANH_DONG).map(([ma, ten]) => `<option value="${ma}">${ten}</option>`).join(""));
elNhom.addEventListener("change", () => render(0));
let henGio = 0;
elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(() => render(0), 200);
});

export function khoiTao() {
  taiThem();
}
