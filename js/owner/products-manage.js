import { db } from "/js/firebase-config.js";
import { formatCurrency, showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { collapseAndRemove, pulse, setBusy, shake } from "/js/motion.js";
import { openModal, closeModal, confirmDialog } from "/js/dialog.js";
import { NGUONG_SAP_HET } from "/js/dashboard-shell.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const NHAN_TRANG_THAI = { dang_ban: "Đang bán", ngung_ban: "Ngừng bán" };

const elDanhSach = document.getElementById("ds-san-pham");
const elTongKet = document.getElementById("tong-ket");
const elTimKiem = document.getElementById("tim-kiem");
const elLocDanhMuc = document.getElementById("loc-danh-muc");
const elLocTrangThai = document.getElementById("loc-trang-thai");
const elLocSapHet = document.getElementById("loc-sap-het");
const elDemSapHet = document.getElementById("dem-sap-het");
const modal = document.getElementById("modal-san-pham");
const form = document.getElementById("form-san-pham");
const truong = {
  ten: document.getElementById("f-ten"),
  danhMuc: document.getElementById("f-danh-muc"),
  trangThai: document.getElementById("f-trang-thai"),
  gia: document.getElementById("f-gia"),
  ton: document.getElementById("f-ton"),
  hinh: document.getElementById("f-hinh"),
  moTa: document.getElementById("f-mo-ta"),
};
const elXemTruoc = document.getElementById("f-xem-truoc");
const elLoi = document.getElementById("f-loi");

let sanPham = [];
let danhMuc = new Map();
let dangSua = null;
let lanDau = true;

const laSapHet = (sp) => (sp.soLuongTon ?? 0) <= NGUONG_SAP_HET;

function nhanTon(sp) {
  const n = sp.soLuongTon ?? 0;
  if (n === 0) return '<span class="badge badge--huy">Hết hàng</span>';
  if (n <= NGUONG_SAP_HET) return '<span class="badge badge--cho_duyet">Sắp hết</span>';
  return "";
}

function htmlDong(sp) {
  return `
    <td><div class="qt-cell-main">
      <img class="qt-thumb" src="${escapeHtml(sp.hinhAnh)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div><strong>${escapeHtml(sp.tenSanPham)}</strong><div class="qt-sub">${escapeHtml(sp.id)}</div></div>
    </div></td>
    <td>${escapeHtml(danhMuc.get(sp.danhMucId) ?? "—")}</td>
    <td class="qt-num">${formatCurrency(sp.gia)}</td>
    <td class="qt-num">${sp.soLuongTon ?? 0} ${nhanTon(sp)}</td>
    <td><button type="button" class="badge badge--${sp.trangThai} qt-status-btn" data-hanh-dong="doi-trang-thai" title="Bấm để đổi trạng thái">${NHAN_TRANG_THAI[sp.trangThai] ?? escapeHtml(sp.trangThai)}</button></td>
    <td class="qt-actions">
      <button type="button" class="btn btn--secondary btn--sm" data-hanh-dong="sua">Sửa</button>
      <button type="button" class="btn btn--danger btn--sm" data-hanh-dong="xoa">Xóa</button>
    </td>`;
}

function taoDong(sp, i = 0) {
  const tr = document.createElement("tr");
  tr.dataset.id = sp.id;
  if (lanDau) {
    tr.className = "motion-enter";
    tr.style.setProperty("--i", Math.min(i, 8));
  }
  tr.innerHTML = htmlDong(sp);
  return tr;
}

function locDanhSach() {
  const tuKhoa = elTimKiem.value.trim().toLowerCase();
  return sanPham
    .filter((sp) => {
      if (elLocDanhMuc.value && sp.danhMucId !== elLocDanhMuc.value) return false;
      if (elLocTrangThai.value && sp.trangThai !== elLocTrangThai.value) return false;
      if (elLocSapHet.getAttribute("aria-pressed") === "true" && !laSapHet(sp)) return false;
      if (tuKhoa && !`${sp.tenSanPham} ${sp.id}`.toLowerCase().includes(tuKhoa)) return false;
      return true;
    })
    .sort((a, b) => String(a.tenSanPham).localeCompare(String(b.tenSanPham), "vi"));
}

function render() {
  const ds = locDanhSach();
  elDanhSach.replaceChildren();
  if (ds.length === 0) {
    elDanhSach.innerHTML = '<tr><td colspan="6" class="qt-empty">Không có sản phẩm phù hợp.</td></tr>';
  } else {
    const frag = document.createDocumentFragment();
    ds.forEach((sp, i) => frag.append(taoDong(sp, i)));
    elDanhSach.append(frag);
  }
  elTongKet.textContent = `Hiển thị ${ds.length} / ${sanPham.length} sản phẩm`;
  elDemSapHet.textContent = sanPham.filter(laSapHet).length;
  lanDau = false;
}

async function taiDuLieu() {
  try {
    const [spSnap, dmSnap] = await Promise.all([getDocs(collection(db, "sanpham")), getDocs(collection(db, "danhmuc"))]);
    danhMuc = new Map(dmSnap.docs.map((d) => [d.id, d.data().tenDanhMuc]));
    sanPham = spSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const tuChon = [...danhMuc].map(([id, ten]) => `<option value="${escapeHtml(id)}">${escapeHtml(ten)}</option>`).join("");
    elLocDanhMuc.insertAdjacentHTML("beforeend", tuChon);
    truong.danhMuc.insertAdjacentHTML("beforeend", tuChon);
    if (new URLSearchParams(window.location.search).get("loc") === "sap-het") elLocSapHet.setAttribute("aria-pressed", "true");
    render();
  } catch (err) {
    showToast("Không tải được danh sách sản phẩm.", "error");
    console.error("Lỗi taiDuLieu:", err);
  }
}

function capNhatXemTruoc() {
  const url = truong.hinh.value.trim();
  elXemTruoc.hidden = !url;
  if (url) elXemTruoc.src = url;
}

function moForm(sp = null) {
  dangSua = sp;
  document.getElementById("tieu-de-form").textContent = sp ? "Sửa sản phẩm" : "Thêm sản phẩm";
  truong.ten.value = sp?.tenSanPham ?? "";
  truong.danhMuc.value = sp?.danhMucId ?? "";
  truong.trangThai.value = sp?.trangThai ?? "dang_ban";
  truong.gia.value = sp?.gia ?? "";
  truong.ton.value = sp?.soLuongTon ?? 0;
  truong.hinh.value = sp?.hinhAnh ?? "";
  truong.moTa.value = sp?.moTa ?? "";
  Object.values(truong).forEach((el) => el.classList.remove("is-invalid"));
  elLoi.hidden = true;
  capNhatXemTruoc();
  openModal(modal);
}

function baoLoi(el, thongBao) {
  el.classList.add("is-invalid");
  elLoi.textContent = thongBao;
  elLoi.hidden = false;
  shake(form);
  el.focus();
  return null;
}

function docForm() {
  Object.values(truong).forEach((el) => el.classList.remove("is-invalid"));
  elLoi.hidden = true;
  const ten = truong.ten.value.trim();
  if (ten.length < 2) return baoLoi(truong.ten, "Tên sản phẩm cần ít nhất 2 ký tự.");
  if (!truong.danhMuc.value) return baoLoi(truong.danhMuc, "Vui lòng chọn danh mục.");
  const gia = Number(truong.gia.value);
  if (truong.gia.value === "" || !Number.isInteger(gia) || gia < 0) return baoLoi(truong.gia, "Giá phải là số nguyên không âm.");
  const ton = Number(truong.ton.value);
  if (truong.ton.value === "" || !Number.isInteger(ton) || ton < 0) return baoLoi(truong.ton, "Tồn kho phải là số nguyên không âm.");
  const hinh = truong.hinh.value.trim();
  if (hinh && !/^(https?:\/\/|\/)/i.test(hinh)) return baoLoi(truong.hinh, "Ảnh phải là đường dẫn bắt đầu bằng http(s):// hoặc /.");
  return { tenSanPham: ten, danhMucId: truong.danhMuc.value, trangThai: truong.trangThai.value, gia, soLuongTon: ton, hinhAnh: hinh, moTa: truong.moTa.value.trim() };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const duLieu = docForm();
  if (!duLieu) return;
  const nutLuu = document.getElementById("btn-luu");
  setBusy(nutLuu, true);
  try {
    if (dangSua) {
      await updateDoc(doc(db, "sanpham", dangSua.id), duLieu);
      Object.assign(dangSua, duLieu);
      await ghiNhatKy(`sua_san_pham: sanpham/${dangSua.id}`);
      const tr = elDanhSach.querySelector(`tr[data-id="${CSS.escape(dangSua.id)}"]`);
      if (tr) {
        tr.innerHTML = htmlDong(dangSua);
        pulse(tr.querySelector(".qt-num"));
      }
      showToast("Đã cập nhật sản phẩm.", "success");
    } else {
      const ref = await addDoc(collection(db, "sanpham"), { ...duLieu, ngayTao: serverTimestamp() });
      sanPham.push({ id: ref.id, ...duLieu });
      await ghiNhatKy(`them_san_pham: sanpham/${ref.id}`);
      elTimKiem.value = "";
      render();
      const tr = elDanhSach.querySelector(`tr[data-id="${CSS.escape(ref.id)}"]`);
      tr?.classList.add("nv-ticket-card--moi");
      tr?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      showToast("Đã thêm sản phẩm.", "success");
    }
    elDemSapHet.textContent = sanPham.filter(laSapHet).length;
    closeModal(modal);
  } catch (err) {
    showToast("Lưu sản phẩm thất bại.", "error");
    console.error("Lỗi lưu sản phẩm:", err);
  } finally {
    setBusy(nutLuu, false);
  }
});

async function doiTrangThai(sp, tr, nut) {
  const moi = sp.trangThai === "dang_ban" ? "ngung_ban" : "dang_ban";
  nut.disabled = true;
  try {
    await updateDoc(doc(db, "sanpham", sp.id), { trangThai: moi });
    sp.trangThai = moi;
    await ghiNhatKy(`doi_trang_thai_san_pham: sanpham/${sp.id} -> ${moi}`);
    nut.className = `badge badge--${moi} qt-status-btn`;
    nut.textContent = NHAN_TRANG_THAI[moi];
    pulse(nut);
  } catch (err) {
    showToast("Không đổi được trạng thái.", "error");
    console.error("Lỗi doiTrangThai:", err);
  } finally {
    nut.disabled = false;
  }
}

async function xoa(sp, tr) {
  const dongY = await confirmDialog({
    tieuDe: "Xóa sản phẩm?",
    noiDung: `"${sp.tenSanPham}" sẽ bị xóa vĩnh viễn. Nếu chỉ muốn ngừng bán, hãy đổi trạng thái thay vì xóa.`,
    nhanXacNhan: "Xóa",
    nguyHiem: true,
  });
  if (!dongY) return;
  try {
    await deleteDoc(doc(db, "sanpham", sp.id));
    sanPham = sanPham.filter((x) => x !== sp);
    await ghiNhatKy(`xoa_san_pham: sanpham/${sp.id}`);
    await collapseAndRemove(tr);
    render();
    showToast("Đã xóa sản phẩm.", "success");
  } catch (err) {
    showToast("Xóa sản phẩm thất bại.", "error");
    console.error("Lỗi xóa sản phẩm:", err);
  }
}

elDanhSach.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-hanh-dong]");
  if (!nut) return;
  const tr = nut.closest("tr");
  const sp = sanPham.find((x) => x.id === tr.dataset.id);
  if (!sp) return;
  if (nut.dataset.hanhDong === "sua") moForm(sp);
  else if (nut.dataset.hanhDong === "xoa") xoa(sp, tr);
  else doiTrangThai(sp, tr, nut);
});

document.getElementById("btn-them").addEventListener("click", () => moForm());
truong.hinh.addEventListener("input", capNhatXemTruoc);
let henGio = 0;
elTimKiem.addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(render, 200);
});
elLocDanhMuc.addEventListener("change", render);
elLocTrangThai.addEventListener("change", render);
elLocSapHet.addEventListener("click", () => {
  elLocSapHet.setAttribute("aria-pressed", String(elLocSapHet.getAttribute("aria-pressed") !== "true"));
  render();
});

export function khoiTao() {
  taiDuLieu();
}
