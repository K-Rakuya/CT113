import { auth, db } from "/js/firebase-config.js";
import { showToast, escapeHtml } from "/js/utils.js";
import { confirmDialog } from "/js/dialog.js";
import { kiemTraTinNhan, phanBe, conTiepNhanDuoc, thoiGianCho, SO_PHIEN_TOI_DA } from "/js/chat-rules.js";
import { veTinNhan } from "/js/chat-view.js";
import { ngheBePhien, ngheTinNhan, guiTinNhan, tiepNhanPhien, traVePhien, dongPhien } from "/js/chat-data.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const el = (id) => document.getElementById(id);
const elKhung = el("chat-khung");
const elChuaChon = el("chat-chua-chon");
const elDanhSach = el("chat-ds");
const elForm = el("chat-form");
const elNoiDung = el("chat-noi-dung");

let uid = null;
let tenToi = "";
let dsPhien = [];
let phienChon = null;
let huyNgheTin = null;

const phienHienTai = () => dsPhien.find((p) => p.id === phienChon) ?? null;

function htmlPhien(p, hanhDong) {
  return `<button type="button" class="chat-phien" data-id="${p.id}" ${p.id === phienChon ? 'aria-current="true"' : ""}>
    <span><strong>${escapeHtml(p.hoTenKhach || "Khách hàng")}</strong><span class="chat-phien__phu">${hanhDong(p)}</span></span>
  </button>`;
}

function veDanhSach() {
  const be = phanBe(dsPhien, uid);
  const duocNhan = conTiepNhanDuoc(dsPhien, uid);
  el("so-cho").textContent = `(${be.choTiepNhan.length})`;
  el("so-cua-toi").textContent = `(${be.cuaToi.length}/${SO_PHIEN_TOI_DA})`;
  el("so-nguoi-khac").textContent = `(${be.cuaNguoiKhac.length})`;
  el("ds-cho").innerHTML = be.choTiepNhan.length
    ? be.choTiepNhan.map((p) => `<div class="chat-phien"><span><strong>${escapeHtml(p.hoTenKhach || "Khách hàng")}</strong><span class="chat-phien__phu">đã chờ ${thoiGianCho(p.ngayTao)}</span></span>
        <button type="button" class="btn btn--primary btn--sm" data-tiep-nhan="${p.id}" ${duocNhan ? "" : `disabled title="Đã đủ ${SO_PHIEN_TOI_DA} phiên đang tư vấn"`}>Tiếp nhận</button></div>`).join("")
    : '<p class="qt-sub">Không có phiên nào đang chờ.</p>';
  el("ds-cua-toi").innerHTML = be.cuaToi.length ? be.cuaToi.map((p) => htmlPhien(p, () => `từ ${thoiGianCho(p.ngayTiepNhan)} trước`)).join("") : '<p class="qt-sub">Bạn chưa tiếp nhận phiên nào.</p>';
  el("ds-nguoi-khac").innerHTML = be.cuaNguoiKhac.map((p) => `<div class="chat-phien"><span><strong>${escapeHtml(p.hoTenKhach || "Khách hàng")}</strong><span class="chat-phien__phu">${escapeHtml(p.nhanVienTen || "nhân viên khác")}</span></span></div>`).join("");
}

function veKhung() {
  const p = phienHienTai();
  const cuaToi = p?.trangThai === "dang_chat" && p.nhanVienId === uid;
  elKhung.hidden = !cuaToi;
  elChuaChon.hidden = cuaToi;
  if (!cuaToi) return;
  el("chat-ten-khach").textContent = p.hoTenKhach || "Khách hàng";
  el("chat-phu").textContent = `Tiếp nhận ${thoiGianCho(p.ngayTiepNhan)} trước`;
}

function chonPhien(id) {
  if (id === phienChon) return;
  phienChon = id;
  huyNgheTin?.();
  huyNgheTin = null;
  const p = phienHienTai();
  if (p) huyNgheTin = ngheTinNhan(id, (ds) => veTinNhan(elDanhSach, ds, phienHienTai() ?? p, uid), (err) => console.error("Lỗi tải tin nhắn:", err));
}

function capNhat(ds) {
  dsPhien = ds;
  const cuaToi = phanBe(ds, uid).cuaToi;
  if (phienChon && !cuaToi.some((p) => p.id === phienChon)) {
    phienChon = null;
    huyNgheTin?.();
    huyNgheTin = null;
  }
  if (!phienChon && cuaToi.length) chonPhien(cuaToi[0].id);
  veDanhSach();
  veKhung();
}

el("ds-cho").addEventListener("click", async (e) => {
  const nut = e.target.closest("[data-tiep-nhan]");
  if (!nut) return;
  nut.disabled = true;
  try {
    await tiepNhanPhien(nut.dataset.tiepNhan, tenToi);
    chonPhien(nut.dataset.tiepNhan);
  } catch (err) {
    const daCoNguoiNhan = err?.code === "permission-denied";
    showToast(daCoNguoiNhan ? "Phiên này đã có nhân viên khác tiếp nhận." : "Không tiếp nhận được, vui lòng thử lại.", "error");
    console.error("Lỗi tiếp nhận phiên:", err);
    nut.disabled = false;
  }
});

el("ds-cua-toi").addEventListener("click", (e) => {
  const nut = e.target.closest("[data-id]");
  if (nut) {
    chonPhien(nut.dataset.id);
    veDanhSach();
    veKhung();
  }
});

elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ketQua = kiemTraTinNhan(elNoiDung.value);
  if (ketQua.loi) return showToast(ketQua.loi, "error");
  elNoiDung.value = "";
  try {
    await guiTinNhan(phienChon, "nhan_vien", ketQua.noiDung);
  } catch (err) {
    elNoiDung.value = ketQua.noiDung;
    showToast("Không gửi được tin nhắn, vui lòng thử lại.", "error");
    console.error("Lỗi gửi tin nhắn:", err);
  }
});

elNoiDung.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    elForm.requestSubmit();
  }
});

async function ketThucHoacTraVe(hanhDong, hoi, thongBaoLoi) {
  if (!(await confirmDialog(hoi))) return;
  try {
    await hanhDong(phienChon);
  } catch (err) {
    showToast(thongBaoLoi, "error");
    console.error("Lỗi đổi trạng thái phiên:", err);
  }
}

el("btn-ket-thuc").addEventListener("click", () =>
  ketThucHoacTraVe(dongPhien, { tieuDe: "Kết thúc tư vấn?", noiDung: "Phiên sẽ được đóng và khách không nhắn thêm được.", nhanXacNhan: "Kết thúc" }, "Không kết thúc được phiên, vui lòng thử lại.")
);

el("btn-tra-ve").addEventListener("click", () =>
  ketThucHoacTraVe(traVePhien, { tieuDe: "Trả phiên về danh sách chờ?", noiDung: "Nhân viên khác sẽ có thể tiếp nhận phiên này.", nhanXacNhan: "Trả về" }, "Không trả được phiên, vui lòng thử lại.")
);

let dangNghe = false;
onAuthStateChanged(auth, async (user) => {
  if (!user || dangNghe) return;
  dangNghe = true;
  uid = user.uid;
  try {
    tenToi = (await getDoc(doc(db, "users", uid))).data()?.hoTen || user.email || "";
  } catch (err) {
    console.error("Không đọc được tên nhân viên:", err);
  }
  ngheBePhien(capNhat, (err) => {
    showToast("Không tải được danh sách tư vấn.", "error");
    console.error("Lỗi nghe bể phiên:", err);
  });
  setInterval(() => {
    veDanhSach();
    veKhung();
  }, 30000);
});
