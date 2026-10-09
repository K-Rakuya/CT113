import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml, formatCurrency } from "/js/utils.js";
import { pulse, setBusy, shake } from "/js/motion.js";
import { openModal, closeModal, confirmDialog } from "/js/dialog.js";
import { LOAI_BO_PC, tinhBoPc, kiemTraBoPc, goiYBoPc } from "/js/home/bundles.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("ds-bo-pc");
const elTongKet = document.getElementById("tong-ket");
const modal = document.getElementById("modal-bo");
const form = document.getElementById("form-bo");
const elLoi = document.getElementById("f-loi");
const elLinhKien = document.getElementById("lk-ds");
const elTong = document.getElementById("lk-tong");
const truong = {
  ten: document.getElementById("f-ten"),
  loai: document.getElementById("f-loai"),
  moTa: document.getElementById("f-mo-ta"),
  thuTu: document.getElementById("f-thu-tu"),
  hienThi: document.getElementById("f-hien-thi"),
};

let sanPham = [];
let danhMuc = [];
let dsBo = [];
let dangSua = null;

const theoId = () => new Map(sanPham.map((sp) => [sp.id, sp]));
const ms = (ts) => ts?.toMillis?.() ?? 0;

function tinhTrang(t) {
  if (!t.hopLe) return `<span class="badge badge--huy">Thiếu ${t.khongBan.length} linh kiện</span>`;
  return t.conHang ? `<span class="badge badge--hoan_thanh">Còn ${t.soBoCoThe} bộ</span>` : '<span class="badge badge--cho_duyet">Hết hàng</span>';
}

function render() {
  const map = theoId();
  elDanhSach.innerHTML = dsBo.length
    ? dsBo.map((bo) => {
        const t = tinhBoPc(bo, map);
        return `<tr data-id="${bo.id}">
          <td><strong>${escapeHtml(bo.ten)}</strong>${bo.moTa ? `<div class="qt-sub">${escapeHtml(bo.moTa)}</div>` : ""}</td>
          <td>${LOAI_BO_PC[bo.loai] ?? escapeHtml(bo.loai)}</td>
          <td>${t.dong.length}</td>
          <td>${formatCurrency(t.tong)}</td>
          <td>${tinhTrang(t)}</td>
          <td><label class="qt-check"><input type="checkbox" data-hien-thi ${bo.hienThi ? "checked" : ""} aria-label="Hiển thị ${escapeHtml(bo.ten)}"></label></td>
          <td class="qt-actions"><button type="button" class="btn btn--secondary btn--sm" data-sua>Sửa</button> <button type="button" class="btn btn--danger btn--sm" data-xoa>Xoá</button></td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="7" class="qt-empty">Chưa có bộ PC nào. Bấm "Thêm bộ PC" hoặc "Gợi ý bộ mẫu từ kho".</td></tr>';
  elTongKet.textContent = `${dsBo.length} bộ · ${dsBo.filter((b) => b.hienThi).length} đang hiển thị`;
}

async function taiDuLieu() {
  try {
    const [sp, dm, bo] = await Promise.all([getDocs(collection(db, "sanpham")), getDocs(collection(db, "danhmuc")), getDocs(collection(db, "bopc"))]);
    sanPham = sp.docs.map((d) => ({ id: d.id, ...d.data() }));
    danhMuc = dm.docs.map((d) => ({ id: d.id, tenDanhMuc: d.data().tenDanhMuc }));
    dsBo = bo.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0) || ms(a.ngayTao) - ms(b.ngayTao));
    render();
  } catch (err) {
    showToast("Không tải được dữ liệu bộ PC.", "error");
    console.error("Lỗi tải bộ PC:", err);
  }
}

function luaChonSanPham(daChon) {
  const theoDm = new Map();
  for (const sp of sanPham) if (sp.trangThai === "dang_ban" || sp.id === daChon) theoDm.set(sp.danhMucId, [...(theoDm.get(sp.danhMucId) ?? []), sp]);
  const nhom = danhMuc.filter((dm) => theoDm.has(dm.id)).map((dm) => `<optgroup label="${escapeHtml(dm.tenDanhMuc)}">${theoDm.get(dm.id).sort((a, b) => String(a.tenSanPham).localeCompare(String(b.tenSanPham), "vi")).map((sp) => `<option value="${sp.id}" ${sp.id === daChon ? "selected" : ""}>${escapeHtml(sp.tenSanPham)} — ${formatCurrency(sp.gia)}${sp.trangThai !== "dang_ban" ? " (ngừng bán)" : sp.soLuongTon > 0 ? "" : " (hết hàng)"}</option>`).join("")}</optgroup>`);
  return `<option value="">Chọn sản phẩm...</option>${nhom.join("")}`;
}

function themDongLinhKien(sanPhamId = "", soLuong = 1) {
  const dong = document.createElement("div");
  dong.className = "lk-dong";
  dong.innerHTML = `<select class="select" data-sp aria-label="Sản phẩm">${luaChonSanPham(sanPhamId)}</select>
    <input class="input" type="number" min="1" max="10" step="1" value="${soLuong}" data-sl aria-label="Số lượng">
    <button type="button" class="btn btn--secondary btn--sm" data-bo-dong>Xoá</button>`;
  elLinhKien.append(dong);
}

function docLinhKien() {
  return [...elLinhKien.querySelectorAll(".lk-dong")].map((d) => ({ sanPhamId: d.querySelector("[data-sp]").value, soLuong: d.querySelector("[data-sl]").value }));
}

function capNhatTong() {
  const map = theoId();
  const tong = docLinhKien().reduce((t, l) => t + (map.get(l.sanPhamId)?.gia ?? 0) * (Number(l.soLuong) || 0), 0);
  elTong.textContent = `Tổng giá linh kiện: ${formatCurrency(tong)}`;
}

function moForm(bo) {
  dangSua = bo;
  document.getElementById("tieu-de-bo").textContent = bo ? "Sửa bộ PC" : "Thêm bộ PC";
  truong.loai.innerHTML = Object.entries(LOAI_BO_PC).map(([ma, ten]) => `<option value="${ma}">${ten}</option>`).join("");
  truong.ten.value = bo?.ten ?? "";
  truong.loai.value = bo?.loai ?? "gaming";
  truong.moTa.value = bo?.moTa ?? "";
  truong.thuTu.value = bo?.thuTu ?? dsBo.length;
  truong.hienThi.checked = bo?.hienThi ?? false;
  elLinhKien.replaceChildren();
  for (const l of bo?.linhKien ?? [{}, {}]) themDongLinhKien(l.sanPhamId, l.soLuong ?? 1);
  capNhatTong();
  elLoi.hidden = true;
  openModal(modal);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kq = kiemTraBoPc({ ten: truong.ten.value, loai: truong.loai.value, moTa: truong.moTa.value, thuTu: truong.thuTu.value, linhKien: docLinhKien() });
  const loi = kq.loi ?? (truong.hienThi.checked && !tinhBoPc(kq.du, theoId()).hopLe ? "Bộ còn linh kiện không bán nên chưa thể hiển thị." : null);
  if (loi) {
    elLoi.textContent = loi;
    elLoi.hidden = false;
    shake(form);
    return;
  }
  const nut = document.getElementById("btn-luu");
  setBusy(nut, true);
  try {
    const du = { ...kq.du, hienThi: truong.hienThi.checked };
    if (dangSua) {
      await updateDoc(doc(db, "bopc", dangSua.id), du);
      await ghiNhatKy(`sua_bo_pc: bopc/${dangSua.id}`);
    } else {
      const ref = await addDoc(collection(db, "bopc"), { ...du, ngayTao: serverTimestamp() });
      await ghiNhatKy(`them_bo_pc: bopc/${ref.id}`);
    }
    closeModal(modal);
    showToast("Đã lưu bộ PC.", "success");
    await taiDuLieu();
  } catch (err) {
    console.error("Lỗi lưu bộ PC:", err);
    elLoi.textContent = "Không lưu được, vui lòng thử lại.";
    elLoi.hidden = false;
    shake(form);
  } finally {
    setBusy(nut, false);
  }
});

elLinhKien.addEventListener("click", (e) => {
  e.target.closest("[data-bo-dong]")?.closest(".lk-dong").remove();
  capNhatTong();
});
elLinhKien.addEventListener("input", capNhatTong);
document.getElementById("btn-them-lk").addEventListener("click", () => themDongLinhKien());
document.getElementById("btn-them-bo").addEventListener("click", () => moForm(null));

elDanhSach.addEventListener("click", async (e) => {
  const tr = e.target.closest("tr[data-id]");
  const bo = dsBo.find((b) => b.id === tr?.dataset.id);
  if (!bo) return;
  if (e.target.closest("[data-sua]")) return moForm(bo);
  if (!e.target.closest("[data-xoa]")) return;
  if (!(await confirmDialog({ tieuDe: "Xoá bộ PC?", noiDung: `Bộ "${bo.ten}" sẽ bị xoá, các sản phẩm trong bộ không bị ảnh hưởng.`, nhanXacNhan: "Xoá", nguyHiem: true }))) return;
  try {
    await deleteDoc(doc(db, "bopc", bo.id));
    await ghiNhatKy(`xoa_bo_pc: bopc/${bo.id}`);
    showToast("Đã xoá bộ PC.", "success");
    await taiDuLieu();
  } catch (err) {
    showToast("Không xoá được, vui lòng thử lại.", "error");
    console.error("Lỗi xoá bộ PC:", err);
  }
});

elDanhSach.addEventListener("change", async (e) => {
  const o = e.target.closest("[data-hien-thi]");
  const bo = dsBo.find((b) => b.id === o?.closest("tr").dataset.id);
  if (!bo) return;
  if (o.checked && !tinhBoPc(bo, theoId()).hopLe) {
    o.checked = false;
    return showToast("Bộ còn linh kiện không bán nên chưa thể hiển thị.", "error");
  }
  try {
    await updateDoc(doc(db, "bopc", bo.id), { hienThi: o.checked });
    bo.hienThi = o.checked;
    await ghiNhatKy(`sua_bo_pc: bopc/${bo.id}`);
    render();
    pulse(elDanhSach.querySelector(`tr[data-id="${CSS.escape(bo.id)}"]`));
  } catch (err) {
    o.checked = !o.checked;
    showToast("Không đổi được trạng thái hiển thị.", "error");
    console.error("Lỗi đổi hiển thị bộ PC:", err);
  }
});

document.getElementById("btn-goi-y").addEventListener("click", async () => {
  const goiY = goiYBoPc(sanPham, danhMuc);
  if (!goiY.length) return showToast("Kho chưa đủ các loại CPU, mainboard, RAM, SSD, nguồn và vỏ case để gợi ý.", "error");
  const dongY = await confirmDialog({
    tieuDe: `Tạo ${goiY.length} bộ PC mẫu?`,
    noiDung: "Các bộ chọn theo mức giá từ kho và được tạo ở dạng nháp (chưa hiển thị). Hệ thống chưa kiểm tra tương thích socket hay loại RAM, hãy kiểm tra trước khi bật hiển thị.",
    nhanXacNhan: "Tạo bản nháp",
  });
  if (!dongY) return;
  try {
    for (const bo of goiY) await addDoc(collection(db, "bopc"), { ...bo, thuTu: dsBo.length + bo.thuTu, ngayTao: serverTimestamp() });
    await ghiNhatKy(`goi_y_bo_pc: ${goiY.length} bo`);
    showToast(`Đã tạo ${goiY.length} bộ nháp, hãy kiểm tra rồi bật hiển thị.`, "success");
    await taiDuLieu();
  } catch (err) {
    showToast("Không tạo được bộ mẫu, vui lòng thử lại.", "error");
    console.error("Lỗi tạo bộ PC mẫu:", err);
  }
});

export function khoiTao() {
  taiDuLieu();
}
