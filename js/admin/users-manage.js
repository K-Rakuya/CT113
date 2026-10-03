import { auth, db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml, formatDate } from "/js/utils.js";
import { pulse, setBusy, shake } from "/js/motion.js";
import { openModal, closeModal, confirmDialog } from "/js/dialog.js";
import { NHAN_VAI_TRO, laNhanSu, kiemTraThayDoi } from "/js/admin/users-rules.js";
import { taoTaiKhoanNhanSu, thongBaoLoi } from "/js/admin/account-create.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const NHAN_TRANG_THAI = { hoat_dong: "Hoạt động", khoa: "Đã khoá" };
const LOP_TRANG_THAI = { hoat_dong: "hoan_thanh", khoa: "huy" };

const elDanhSach = document.getElementById("ds-nguoi-dung");
const elTimKiem = document.getElementById("tim-kiem");
const elTab = document.getElementById("tab-vai-tro");
const elTongKet = document.getElementById("tong-ket");
const modal = document.getElementById("modal-nguoi-dung");
const form = document.getElementById("form-nguoi-dung");
const truong = {
  vaiTro: document.getElementById("f-vai-tro"),
  trangThai: document.getElementById("f-trang-thai"),
  chucVu: document.getElementById("f-chuc-vu"),
  luong: document.getElementById("f-luong"),
};
const elNhomNhanSu = document.getElementById("nhom-nhan-su");
const elLoi = document.getElementById("f-loi");

let nguoiDung = [];
let boLoc = "tat_ca";
let dangSua = null;
let lanDau = true;
let uidHienTai = "";

function htmlDong(u) {
  const laToi = u.id === uidHienTai;
  const chu = (u.hoTen || u.email || "?").trim().charAt(0).toUpperCase();
  return `
    <td><div class="qt-cell-main"><span class="qt-avatar" aria-hidden="true">${escapeHtml(chu)}</span>
      <div><strong>${escapeHtml(u.hoTen || "(chưa đặt tên)")}${laToi ? ' <span class="qt-sub">(bạn)</span>' : ""}</strong><div class="qt-sub">${escapeHtml(u.email ?? "")}</div></div></div></td>
    <td>${escapeHtml(u.soDienThoai ?? "—")}</td>
    <td><span class="qt-vai-tro">${NHAN_VAI_TRO[u.vaiTro] ?? escapeHtml(u.vaiTro)}</span>${u.chucVu ? `<div class="qt-sub">${escapeHtml(u.chucVu)}</div>` : ""}</td>
    <td><span class="badge badge--${LOP_TRANG_THAI[u.trangThai] ?? "cho_duyet"}">${NHAN_TRANG_THAI[u.trangThai] ?? escapeHtml(u.trangThai)}</span></td>
    <td>${formatDate(u.ngayTao)}</td>
    <td class="qt-actions">
      <button type="button" class="btn btn--secondary btn--sm" data-hanh-dong="sua">Sửa</button>
      <button type="button" class="btn ${u.trangThai === "khoa" ? "btn--primary" : "btn--danger"} btn--sm" data-hanh-dong="khoa"${laToi ? ' disabled title="Không thể khoá chính bạn"' : ""}>${u.trangThai === "khoa" ? "Mở khoá" : "Khoá"}</button>
    </td>`;
}

function capNhatTab() {
  elTab.querySelectorAll("[data-loc]").forEach((nut) => {
    const loc = nut.dataset.loc;
    nut.querySelector("strong").textContent = loc === "tat_ca" ? nguoiDung.length : nguoiDung.filter((u) => u.vaiTro === loc).length;
    nut.setAttribute("aria-pressed", String(loc === boLoc));
  });
}

function render() {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  const ds = nguoiDung
    .filter((u) => (boLoc === "tat_ca" || u.vaiTro === boLoc) && (!tuKhoa || `${u.hoTen} ${u.email} ${u.soDienThoai}`.toLowerCase().includes(tuKhoa)))
    .sort((a, b) => String(a.hoTen).localeCompare(String(b.hoTen), "vi"));
  elDanhSach.replaceChildren();
  if (!ds.length) {
    elDanhSach.innerHTML = '<tr><td colspan="6" class="qt-empty">Không có người dùng phù hợp.</td></tr>';
  } else {
    const frag = document.createDocumentFragment();
    ds.forEach((u, i) => {
      const tr = document.createElement("tr");
      tr.dataset.id = u.id;
      if (lanDau) {
        tr.className = "motion-enter";
        tr.style.setProperty("--i", Math.min(i, 8));
      }
      tr.innerHTML = htmlDong(u);
      frag.append(tr);
    });
    elDanhSach.append(frag);
  }
  elTongKet.textContent = `Hiển thị ${ds.length} / ${nguoiDung.length} người dùng`;
  capNhatTab();
  lanDau = false;
}

async function taiDuLieu() {
  try {
    const snap = await getDocs(collection(db, "users"));
    nguoiDung = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  } catch (err) {
    showToast("Không tải được danh sách người dùng.", "error");
    console.error("Lỗi taiDuLieu:", err);
  }
}

function hienNhomNhanSu() {
  elNhomNhanSu.hidden = !laNhanSu(truong.vaiTro.value);
}

function moForm(u) {
  dangSua = u;
  document.getElementById("tieu-de-form").textContent = u.hoTen || u.email || "Người dùng";
  document.getElementById("f-email").textContent = u.email ?? "";
  truong.vaiTro.value = u.vaiTro;
  truong.trangThai.value = u.trangThai;
  truong.chucVu.value = u.chucVu ?? "";
  truong.luong.value = u.luongCoBan ?? "";
  const laToi = u.id === uidHienTai;
  truong.vaiTro.disabled = laToi;
  truong.trangThai.disabled = laToi;
  document.getElementById("ghi-chu-ban-than").hidden = !laToi;
  elLoi.hidden = true;
  hienNhomNhanSu();
  openModal(modal);
}

function baoLoi(thongBao, el) {
  elLoi.textContent = thongBao;
  elLoi.hidden = false;
  shake(form);
  el?.focus();
}

async function luu(truongMoi) {
  await updateDoc(doc(db, "users", dangSua.id), truongMoi);
  const nhatKy = [];
  if (truongMoi.vaiTro !== dangSua.vaiTro) nhatKy.push(`sua_nguoi_dung: users/${dangSua.id} -> vai_tro ${dangSua.vaiTro} thanh ${truongMoi.vaiTro}`);
  if (truongMoi.trangThai !== dangSua.trangThai) nhatKy.push(`${truongMoi.trangThai === "khoa" ? "khoa" : "mo_khoa"}_nguoi_dung: users/${dangSua.id}`);
  if (!nhatKy.length) nhatKy.push(`sua_nguoi_dung: users/${dangSua.id}`);
  for (const hanhDong of nhatKy) await ghiNhatKy(hanhDong);
  Object.assign(dangSua, truongMoi);
  const tr = elDanhSach.querySelector(`tr[data-id="${CSS.escape(dangSua.id)}"]`);
  if (tr) {
    tr.innerHTML = htmlDong(dangSua);
    pulse(tr.querySelector(".qt-vai-tro"));
  }
  capNhatTab();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const moi = { vaiTro: truong.vaiTro.value, trangThai: truong.trangThai.value };
  const loi = kiemTraThayDoi(dangSua, moi, nguoiDung, uidHienTai);
  if (loi) return baoLoi(loi);

  const truongMoi = { ...moi };
  if (laNhanSu(moi.vaiTro)) {
    const luong = truong.luong.value === "" ? 0 : Number(truong.luong.value);
    if (!Number.isFinite(luong) || luong < 0) return baoLoi("Lương cơ bản phải là số không âm.", truong.luong);
    truongMoi.chucVu = truong.chucVu.value.trim();
    truongMoi.luongCoBan = luong;
  }
  if (moi.vaiTro !== dangSua.vaiTro) {
    const dongY = await confirmDialog({
      tieuDe: "Đổi vai trò?",
      noiDung: `${dangSua.hoTen || dangSua.email} sẽ chuyển từ "${NHAN_VAI_TRO[dangSua.vaiTro]}" sang "${NHAN_VAI_TRO[moi.vaiTro]}" và có quyền tương ứng ngay lập tức.`,
      nhanXacNhan: "Đổi vai trò",
      nguyHiem: moi.vaiTro === "quan_tri",
    });
    if (!dongY) return;
  }

  const nutLuu = document.getElementById("btn-luu");
  setBusy(nutLuu, true);
  try {
    await luu(truongMoi);
    showToast("Đã cập nhật người dùng.", "success");
    closeModal(modal);
  } catch (err) {
    showToast("Cập nhật người dùng thất bại.", "error");
    console.error("Lỗi cập nhật người dùng:", err);
  } finally {
    setBusy(nutLuu, false);
  }
});

async function doiKhoa(u, nut) {
  const khoa = u.trangThai !== "khoa";
  const moi = { vaiTro: u.vaiTro, trangThai: khoa ? "khoa" : "hoat_dong" };
  const loi = kiemTraThayDoi(u, moi, nguoiDung, uidHienTai);
  if (loi) {
    showToast(loi, "error");
    return;
  }
  if (khoa) {
    const dongY = await confirmDialog({
      tieuDe: "Khoá tài khoản?",
      noiDung: `${u.hoTen || u.email} sẽ không thể đăng nhập và các phiên đang mở sẽ bị đăng xuất ở lần tải trang tiếp theo.`,
      nhanXacNhan: "Khoá",
      nguyHiem: true,
    });
    if (!dongY) return;
  }
  dangSua = u;
  nut.disabled = true;
  try {
    await luu({ trangThai: moi.trangThai, vaiTro: u.vaiTro });
    showToast(khoa ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.", "success");
  } catch (err) {
    nut.disabled = false;
    showToast("Thao tác thất bại.", "error");
    console.error("Lỗi khoá/mở khoá:", err);
  }
}

elDanhSach.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-hanh-dong]");
  if (!nut || nut.disabled) return;
  const u = nguoiDung.find((x) => x.id === nut.closest("tr").dataset.id);
  if (!u) return;
  if (nut.dataset.hanhDong === "sua") moForm(u);
  else doiKhoa(u, nut);
});
elTab.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-loc]");
  if (!nut) return;
  boLoc = nut.dataset.loc;
  render();
});
truong.vaiTro.addEventListener("change", hienNhomNhanSu);
let henGio = 0;
elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(render, 200);
});

// ---- Tạo tài khoản nhân sự (admin tạo; khách tự đăng ký) ----
const modalTao = document.getElementById("modal-tao-tai-khoan");
const formTao = document.getElementById("form-tao-tai-khoan");
const elLoiTao = document.getElementById("t-loi");

document.getElementById("btn-tao-tai-khoan").addEventListener("click", () => {
  formTao.reset();
  elLoiTao.hidden = true;
  openModal(modalTao);
});

formTao.addEventListener("submit", async (e) => {
  e.preventDefault();
  elLoiTao.hidden = true;
  const nut = document.getElementById("btn-tao");
  const hoTen = document.getElementById("t-ho-ten").value;
  const email = document.getElementById("t-email").value;
  setBusy(nut, true);
  try {
    await taoTaiKhoanNhanSu({
      hoTen,
      email,
      matKhau: document.getElementById("t-mat-khau").value,
      vaiTro: document.getElementById("t-vai-tro").value,
    });
    closeModal(modalTao);
    showToast(`Đã tạo tài khoản cho ${hoTen.trim()}.`, "success");
    await taiDuLieu();
  } catch (err) {
    console.error("Lỗi tạo tài khoản:", err);
    elLoiTao.textContent = thongBaoLoi(err);
    elLoiTao.hidden = false;
    shake(formTao);
  } finally {
    setBusy(nut, false);
  }
});

export function khoiTao() {
  uidHienTai = auth.currentUser?.uid ?? "";
  taiDuLieu();
}
