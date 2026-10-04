import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { NHAN_TRANG_THAI_PHIEN, thoiGianCho } from "/js/chat-rules.js";
import { ngheBePhien, giaoLaiPhien, traVePhien } from "/js/chat-data.js";
import { collection, getDocs, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elPhien = document.getElementById("ds-phien");
const elHoTro = document.getElementById("ds-ho-tro");

const NHAN_HO_TRO = { cho_xu_ly: "Chờ xử lý", dang_xu_ly: "Đang xử lý" };

let nhanVien = [];
let dsPhien = [];
let dsHoTro = [];

const luaChon = (daChon) => `<option value="">Chọn nhân viên...</option>${nhanVien.map((u) => `<option value="${u.id}" ${u.id === daChon ? "selected" : ""}>${escapeHtml(u.hoTen || u.email)}</option>`).join("")}`;

function oGiaoLai(id, loai, p) {
  const dangCoNguoi = !!p.nhanVienId;
  return `<div class="qt-actions">
    <select class="select" data-chon="${id}" aria-label="Nhân viên nhận">${luaChon(p.nhanVienId)}</select>
    <button type="button" class="btn btn--secondary btn--sm" data-giao="${id}" data-loai="${loai}">Giao</button>
    ${dangCoNguoi ? `<button type="button" class="btn btn--secondary btn--sm" data-ve-be="${id}" data-loai="${loai}">Đưa về bể</button>` : ""}
  </div>`;
}

function veBang() {
  const phien = [...dsPhien].sort((a, b) => a.ngayTao - b.ngayTao);
  elPhien.innerHTML = phien.length
    ? phien.map((p) => `<tr>
        <td>${escapeHtml(p.hoTenKhach || "Khách hàng")}</td>
        <td><span class="badge badge--${p.trangThai === "cho" ? "cho_duyet" : "dang_giao"}">${NHAN_TRANG_THAI_PHIEN[p.trangThai]}</span></td>
        <td>${escapeHtml(p.nhanVienTen || "—")}</td>
        <td>${p.trangThai === "cho" ? `chờ ${thoiGianCho(p.ngayTao)}` : `tư vấn ${thoiGianCho(p.ngayTiepNhan ?? p.ngayTao)}`}</td>
        <td>${oGiaoLai(p.id, "tuvan", p)}</td></tr>`).join("")
    : '<tr><td colspan="5" class="qt-empty">Không có phiên tư vấn nào đang mở.</td></tr>';
  elHoTro.innerHTML = dsHoTro.length
    ? dsHoTro.map((t) => `<tr>
        <td>${escapeHtml(t.tieuDe || "Yêu cầu hỗ trợ")}</td>
        <td><span class="badge badge--${t.trangThai}">${NHAN_HO_TRO[t.trangThai] ?? escapeHtml(t.trangThai)}</span></td>
        <td>${escapeHtml(t.nhanVienTen || "—")}</td>
        <td>${oGiaoLai(t.id, "hotro", t)}</td></tr>`).join("")
    : '<tr><td colspan="4" class="qt-empty">Không có yêu cầu hỗ trợ nào đang chờ.</td></tr>';
}

const tenNhanVien = (id) => nhanVien.find((u) => u.id === id)?.hoTen || nhanVien.find((u) => u.id === id)?.email || "";

async function giaoHoTro(id, nhanVienId) {
  await updateDoc(doc(db, "yeucauhotro", id), { nhanVienId, nhanVienTen: tenNhanVien(nhanVienId), ngayTiepNhan: serverTimestamp(), trangThai: "dang_xu_ly" });
  await ghiNhatKy(`giao_lai_ho_tro: yeucauhotro/${id} -> ${nhanVienId}`);
}

async function veBeHoTro(id) {
  await updateDoc(doc(db, "yeucauhotro", id), { nhanVienId: null, nhanVienTen: null, trangThai: "cho_xu_ly" });
  await ghiNhatKy(`giao_lai_ho_tro: yeucauhotro/${id} -> be`);
}

async function thucHien(viec, thongBao) {
  try {
    await viec();
    showToast(thongBao, "success");
  } catch (err) {
    showToast("Thao tác thất bại, vui lòng thử lại.", "error");
    console.error("Lỗi giao lại yêu cầu:", err);
  }
}

document.addEventListener("click", (e) => {
  const giao = e.target.closest("[data-giao]");
  if (giao) {
    const nhanVienId = giao.closest("tr").querySelector("[data-chon]").value;
    if (!nhanVienId) return showToast("Vui lòng chọn nhân viên nhận.", "error");
    const { giao: id, loai } = giao.dataset;
    return thucHien(() => (loai === "tuvan" ? giaoLaiPhien(id, nhanVienId, tenNhanVien(nhanVienId)) : giaoHoTro(id, nhanVienId)), "Đã giao lại cho nhân viên.");
  }
  const veBe = e.target.closest("[data-ve-be]");
  if (veBe) {
    const { veBe: id, loai } = veBe.dataset;
    thucHien(() => (loai === "tuvan" ? traVePhien(id) : veBeHoTro(id)), "Đã đưa về danh sách chờ.");
  }
});

export async function khoiTao() {
  try {
    const snap = await getDocs(query(collection(db, "users"), where("vaiTro", "==", "nhan_vien")));
    nhanVien = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.hoTen ?? "").localeCompare(b.hoTen ?? "", "vi"));
  } catch (err) {
    showToast("Không tải được danh sách nhân viên.", "error");
    console.error("Lỗi tải nhân viên:", err);
  }
  ngheBePhien((ds) => { dsPhien = ds; veBang(); }, (err) => console.error("Lỗi nghe phiên tư vấn:", err));
  onSnapshot(
    query(collection(db, "yeucauhotro"), where("trangThai", "in", ["cho_xu_ly", "dang_xu_ly"])),
    (snap) => { dsHoTro = snap.docs.map((d) => ({ id: d.id, ...d.data() })); veBang(); },
    (err) => console.error("Lỗi nghe yêu cầu hỗ trợ:", err)
  );
  setInterval(veBang, 30000);
}
