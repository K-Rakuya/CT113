import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { collapseAndRemove, pulse, setBusy, shake } from "/js/motion.js";
import { openModal, closeModal, confirmDialog } from "/js/dialog.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("ds-danh-muc");
const modal = document.getElementById("modal-danh-muc");
const form = document.getElementById("form-danh-muc");
const elTen = document.getElementById("f-ten");
const elLoi = document.getElementById("f-loi");

let danhMuc = [];
let soSanPham = new Map();
let dangSua = null;
let lanDau = true;

function htmlDong(dm) {
  const n = soSanPham.get(dm.id) ?? 0;
  return `
    <td><strong>${escapeHtml(dm.tenDanhMuc)}</strong><div class="qt-sub">${escapeHtml(dm.id)}</div></td>
    <td class="qt-num">${n}</td>
    <td class="qt-actions">
      <button type="button" class="btn btn--secondary btn--sm" data-hanh-dong="sua">Sửa</button>
      <button type="button" class="btn btn--danger btn--sm" data-hanh-dong="xoa"${n > 0 ? ' disabled title="Danh mục còn sản phẩm, không thể xóa"' : ""}>Xóa</button>
    </td>`;
}

function render() {
  elDanhSach.replaceChildren();
  if (danhMuc.length === 0) {
    elDanhSach.innerHTML = '<tr><td colspan="3" class="qt-empty">Chưa có danh mục nào.</td></tr>';
    return;
  }
  danhMuc.forEach((dm, i) => {
    const tr = document.createElement("tr");
    tr.dataset.id = dm.id;
    if (lanDau) {
      tr.className = "motion-enter";
      tr.style.setProperty("--i", Math.min(i, 8));
    }
    tr.innerHTML = htmlDong(dm);
    elDanhSach.append(tr);
  });
  lanDau = false;
}

async function taiDuLieu() {
  try {
    const [dmSnap, spSnap] = await Promise.all([getDocs(collection(db, "danhmuc")), getDocs(collection(db, "sanpham"))]);
    danhMuc = dmSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.tenDanhMuc).localeCompare(String(b.tenDanhMuc), "vi"));
    soSanPham = new Map();
    spSnap.docs.forEach((d) => soSanPham.set(d.data().danhMucId, (soSanPham.get(d.data().danhMucId) ?? 0) + 1));
    render();
  } catch (err) {
    showToast("Không tải được danh mục.", "error");
    console.error("Lỗi taiDuLieu:", err);
  }
}

function moForm(dm = null) {
  dangSua = dm;
  document.getElementById("tieu-de-form").textContent = dm ? "Sửa danh mục" : "Thêm danh mục";
  elTen.value = dm?.tenDanhMuc ?? "";
  elTen.classList.remove("is-invalid");
  elLoi.hidden = true;
  openModal(modal);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ten = elTen.value.trim();
  const trung = danhMuc.some((dm) => dm !== dangSua && dm.tenDanhMuc.trim().toLowerCase() === ten.toLowerCase());
  if (ten.length < 2 || trung) {
    elTen.classList.add("is-invalid");
    elLoi.textContent = trung ? "Tên danh mục đã tồn tại." : "Tên danh mục cần ít nhất 2 ký tự.";
    elLoi.hidden = false;
    shake(form);
    elTen.focus();
    return;
  }
  const nutLuu = document.getElementById("btn-luu");
  setBusy(nutLuu, true);
  try {
    if (dangSua) {
      await updateDoc(doc(db, "danhmuc", dangSua.id), { tenDanhMuc: ten });
      dangSua.tenDanhMuc = ten;
      await ghiNhatKy(`sua_danh_muc: danhmuc/${dangSua.id}`);
      const tr = elDanhSach.querySelector(`tr[data-id="${CSS.escape(dangSua.id)}"]`);
      tr.innerHTML = htmlDong(dangSua);
      pulse(tr.querySelector("strong"));
    } else {
      const ref = await addDoc(collection(db, "danhmuc"), { tenDanhMuc: ten });
      danhMuc.push({ id: ref.id, tenDanhMuc: ten });
      await ghiNhatKy(`them_danh_muc: danhmuc/${ref.id}`);
      render();
      elDanhSach.querySelector(`tr[data-id="${CSS.escape(ref.id)}"]`)?.classList.add("nv-ticket-card--moi");
    }
    showToast("Đã lưu danh mục.", "success");
    closeModal(modal);
  } catch (err) {
    showToast("Lưu danh mục thất bại.", "error");
    console.error("Lỗi lưu danh mục:", err);
  } finally {
    setBusy(nutLuu, false);
  }
});

async function xoa(dm, tr) {
  const dongY = await confirmDialog({
    tieuDe: "Xóa danh mục?",
    noiDung: `Danh mục "${dm.tenDanhMuc}" sẽ bị xóa vĩnh viễn.`,
    nhanXacNhan: "Xóa",
    nguyHiem: true,
  });
  if (!dongY) return;
  try {
    await deleteDoc(doc(db, "danhmuc", dm.id));
    danhMuc = danhMuc.filter((x) => x !== dm);
    await ghiNhatKy(`xoa_danh_muc: danhmuc/${dm.id}`);
    await collapseAndRemove(tr);
    if (danhMuc.length === 0) render();
    showToast("Đã xóa danh mục.", "success");
  } catch (err) {
    showToast("Xóa danh mục thất bại.", "error");
    console.error("Lỗi xóa danh mục:", err);
  }
}

elDanhSach.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-hanh-dong]");
  if (!nut || nut.disabled) return;
  const tr = nut.closest("tr");
  const dm = danhMuc.find((x) => x.id === tr.dataset.id);
  if (!dm) return;
  if (nut.dataset.hanhDong === "sua") moForm(dm);
  else xoa(dm, tr);
});
document.getElementById("btn-them").addEventListener("click", () => moForm());

export function khoiTao() {
  taiDuLieu();
}
