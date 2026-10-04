import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml, formatCurrency, formatDate, ngayHienTai } from "/js/utils.js";
import { pulse, setBusy, shake } from "/js/motion.js";
import { openModal, closeModal } from "/js/dialog.js";
import { NHAN_TRANG_THAI_CA, thangHienTai, khoangThang, thoiLuongPhut, dinhDangThoiLuong, trangThaiCa, tongHopThang, kiemTraHoSo } from "/js/owner/staff-rules.js";
import { collection, getDocs, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("ds-nhan-vien");
const elTimKiem = document.getElementById("tim-kiem");
const elThang = document.getElementById("chon-thang");
const elTongKet = document.getElementById("tong-ket");
const modalHoSo = document.getElementById("modal-ho-so");
const formHoSo = document.getElementById("form-ho-so");
const elLoi = document.getElementById("f-loi");
const truong = { chucVu: document.getElementById("f-chuc-vu"), luong: document.getElementById("f-luong") };
const modalChamCong = document.getElementById("modal-cham-cong");

let nhanVien = [];
let chamCongThang = [];
let chamCongHomNay = [];
let dangSua = null;
let henGio = 0;

const gio = (ms) => (ms == null ? "—" : new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
const mocMs = (ts) => ts?.toMillis?.() ?? null;
const chuDau = (u) => (u.hoTen || u.email || "?").trim().charAt(0).toUpperCase();

function docBanGhi(snap) {
  return snap.docs.map((d) => {
    const x = d.data();
    return { nhanVienId: x.nhanVienId, ngay: x.ngay, gioVao: mocMs(x.gioVao), gioRa: mocMs(x.gioRa) };
  });
}

function htmlDong(u, tongThang) {
  const [nhanCa, lopCa] = NHAN_TRANG_THAI_CA[trangThaiCa(chamCongHomNay.filter((b) => b.nhanVienId === u.id))];
  const cong = tongThang.get(u.id) ?? { soNgay: 0, tongPhut: 0 };
  return `
    <td><div class="qt-cell-main"><span class="qt-avatar" aria-hidden="true">${escapeHtml(chuDau(u))}</span>
      <div><strong>${escapeHtml(u.hoTen || "(chưa đặt tên)")}</strong><div class="qt-sub">${escapeHtml(u.email ?? "")}</div></div></div></td>
    <td>${escapeHtml(u.chucVu || "—")}</td>
    <td>${u.luongCoBan ? formatCurrency(u.luongCoBan) : "—"}</td>
    <td><span class="badge badge--${lopCa}">${nhanCa}</span></td>
    <td>${cong.soNgay} ngày<div class="qt-sub">${dinhDangThoiLuong(cong.tongPhut || null)}</div></td>
    <td class="qt-actions">
      <button type="button" class="btn btn--secondary btn--sm" data-hanh-dong="ho-so">Hồ sơ</button>
      <button type="button" class="btn btn--secondary btn--sm" data-hanh-dong="cham-cong">Chấm công</button>
    </td>`;
}

function render() {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  const ds = nhanVien.filter((u) => !tuKhoa || `${u.hoTen ?? ""} ${u.email ?? ""}`.toLowerCase().includes(tuKhoa));
  const tongThang = tongHopThang(chamCongThang);
  elDanhSach.replaceChildren();
  if (!ds.length) {
    elDanhSach.innerHTML = '<tr><td colspan="6" class="qt-empty">Không có nhân viên phù hợp.</td></tr>';
  }
  for (const u of ds) {
    const tr = document.createElement("tr");
    tr.dataset.id = u.id;
    tr.innerHTML = htmlDong(u, tongThang);
    elDanhSach.append(tr);
  }
  elTongKet.textContent = `${ds.length} nhân viên · ${chamCongHomNay.filter((b) => b.gioRa == null).length} đang trong ca`;
}

async function taiChamCongThang() {
  const { tu, den } = khoangThang(elThang.value);
  chamCongThang = docBanGhi(await getDocs(query(collection(db, "chamcong"), where("ngay", ">=", tu), where("ngay", "<=", den))));
}

async function taiDuLieu() {
  try {
    const [nv, homNay] = await Promise.all([
      getDocs(query(collection(db, "users"), where("vaiTro", "==", "nhan_vien"))),
      getDocs(query(collection(db, "chamcong"), where("ngay", "==", ngayHienTai()))),
      taiChamCongThang(),
    ]);
    nhanVien = nv.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.hoTen ?? "").localeCompare(b.hoTen ?? "", "vi"));
    chamCongHomNay = docBanGhi(homNay);
    render();
  } catch (err) {
    showToast("Không tải được dữ liệu nhân sự.", "error");
    console.error("Lỗi tải nhân sự:", err);
  }
}

function moHoSo(u) {
  dangSua = u;
  document.getElementById("tieu-de-ho-so").textContent = u.hoTen || u.email || "Hồ sơ nhân viên";
  truong.chucVu.value = u.chucVu ?? "";
  truong.luong.value = u.luongCoBan ?? "";
  elLoi.hidden = true;
  openModal(modalHoSo);
}

function moChamCong(u) {
  const [nam, thang] = elThang.value.split("-");
  document.getElementById("tieu-de-cham-cong").textContent = `${u.hoTen || u.email} · tháng ${thang}/${nam}`;
  const ds = chamCongThang.filter((b) => b.nhanVienId === u.id).sort((a, b) => b.ngay.localeCompare(a.ngay) || b.gioVao - a.gioVao);
  document.getElementById("ds-cham-cong").innerHTML = ds.length
    ? ds.map((b) => `<tr><td>${formatDate(new Date(`${b.ngay}T00:00:00`))}</td><td>${gio(b.gioVao)}</td><td>${b.gioRa == null ? "đang làm" : gio(b.gioRa)}</td><td>${dinhDangThoiLuong(thoiLuongPhut(b.gioVao, b.gioRa))}</td></tr>`).join("")
    : '<tr><td colspan="4" class="qt-empty">Chưa có ngày công trong tháng này.</td></tr>';
  openModal(modalChamCong);
}

formHoSo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ketQua = kiemTraHoSo({ chucVu: truong.chucVu.value, luongCoBan: truong.luong.value });
  if (ketQua.loi) {
    elLoi.textContent = ketQua.loi;
    elLoi.hidden = false;
    shake(formHoSo);
    return;
  }
  const nut = document.getElementById("btn-luu");
  setBusy(nut, true);
  try {
    await updateDoc(doc(db, "users", dangSua.id), ketQua);
    await ghiNhatKy(`sua_nhan_su: users/${dangSua.id} -> luong ${dangSua.luongCoBan ?? 0} thanh ${ketQua.luongCoBan}`);
    Object.assign(dangSua, ketQua);
    closeModal(modalHoSo);
    render();
    pulse(elDanhSach.querySelector(`tr[data-id="${CSS.escape(dangSua.id)}"]`));
    showToast("Đã cập nhật hồ sơ nhân viên.", "success");
  } catch (err) {
    console.error("Lỗi cập nhật hồ sơ nhân viên:", err);
    elLoi.textContent = "Không lưu được, vui lòng thử lại.";
    elLoi.hidden = false;
    shake(formHoSo);
  } finally {
    setBusy(nut, false);
  }
});

elDanhSach.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-hanh-dong]");
  const u = nhanVien.find((x) => x.id === nut?.closest("tr")?.dataset.id);
  if (!u) return;
  if (nut.dataset.hanhDong === "ho-so") moHoSo(u);
  else moChamCong(u);
});

elThang.addEventListener("change", async () => {
  if (!elThang.value) return;
  try {
    await taiChamCongThang();
    render();
  } catch (err) {
    showToast("Không tải được chấm công của tháng này.", "error");
    console.error("Lỗi tải chấm công:", err);
  }
});

elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(render, 200);
});

export function khoiTao() {
  elThang.value = thangHienTai();
  elThang.max = thangHienTai();
  taiDuLieu();
}
