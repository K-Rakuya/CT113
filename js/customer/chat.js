import { auth, db } from "/js/firebase-config.js";
import { showToast, escapeHtml } from "/js/utils.js";
import { setBusy } from "/js/motion.js";
import { confirmDialog } from "/js/dialog.js";
import { kiemTraTinNhan, phienDangMo, thoiGianCho } from "/js/chat-rules.js";
import { veTinNhan } from "/js/chat-view.js";
import { veLoi } from "/js/customer/account-view.js";
import { ngheCacPhienCuaKhach, ngheTinNhan, moPhienMoi, guiTinNhan, dongPhien } from "/js/chat-data.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elTai = document.getElementById("chat-tai");
const elBatDau = document.getElementById("chat-bat-dau");
const elKhung = document.getElementById("chat-khung");
const elTrangThai = document.getElementById("chat-trang-thai");
const elDanhSach = document.getElementById("chat-ds");
const elForm = document.getElementById("chat-form");
const elNoiDung = document.getElementById("chat-noi-dung");
const elDaDong = document.getElementById("chat-da-dong");
const nutKetThuc = document.getElementById("btn-ket-thuc");
const nutBatDau = document.getElementById("btn-bat-dau");

let phien = null;
let huyNgheTin = null;
let hoTen = "";

function veTrangThai() {
  if (!phien) return;
  const dong = phien.trangThai === "da_dong";
  elTrangThai.innerHTML = dong
    ? "Đã kết thúc"
    : phien.trangThai === "cho"
      ? `Đang chờ nhân viên tiếp nhận · đã chờ ${thoiGianCho(phien.ngayTao ?? Date.now())}`
      : `${escapeHtml(phien.nhanVienTen || "Nhân viên")} đang tư vấn cho bạn`;
  elKhung.dataset.trangThai = phien.trangThai;
  elForm.hidden = dong;
  nutKetThuc.hidden = dong;
  elDaDong.hidden = !dong;
}

function ngheTinCuaPhien() {
  huyNgheTin?.();
  huyNgheTin = ngheTinNhan(phien.id, (ds) => veTinNhan(elDanhSach, ds, phien, auth.currentUser.uid), (err) => console.error("Lỗi tải tin nhắn:", err));
}

function capNhatPhien(dsPhien) {
  elTai.hidden = true;
  const dangMo = phienDangMo(dsPhien);
  const moiNhat = dangMo ?? dsPhien.sort((a, b) => b.ngayTao - a.ngayTao)[0] ?? null;
  const doiPhien = moiNhat?.id !== phien?.id;
  phien = moiNhat;
  elBatDau.hidden = !!dangMo;
  elKhung.hidden = !phien;
  if (!phien) return;
  veTrangThai();
  if (doiPhien) ngheTinCuaPhien();
}

nutBatDau.addEventListener("click", async () => {
  setBusy(nutBatDau, true);
  try {
    await moPhienMoi(hoTen);
  } catch (err) {
    showToast("Không bắt đầu được phiên tư vấn, vui lòng thử lại.", "error");
    console.error("Lỗi mở phiên tư vấn:", err);
  } finally {
    setBusy(nutBatDau, false);
  }
});

function canhChieuCaoOSoan() {
  elNoiDung.style.height = "auto";
  elNoiDung.style.height = `${Math.min(elNoiDung.scrollHeight, 120)}px`;
}

elNoiDung.addEventListener("input", canhChieuCaoOSoan);

elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ketQua = kiemTraTinNhan(elNoiDung.value);
  if (ketQua.loi) return showToast(ketQua.loi, "error");
  elNoiDung.value = "";
  canhChieuCaoOSoan();
  try {
    await guiTinNhan(phien.id, "khach", ketQua.noiDung);
  } catch (err) {
    elNoiDung.value = ketQua.noiDung;
    canhChieuCaoOSoan();
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

nutKetThuc.addEventListener("click", async () => {
  const dongY = await confirmDialog({ tieuDe: "Kết thúc tư vấn?", noiDung: "Phiên trao đổi sẽ được đóng, bạn có thể bắt đầu phiên mới bất cứ lúc nào.", nhanXacNhan: "Kết thúc" });
  if (!dongY) return;
  try {
    await dongPhien(phien.id);
  } catch (err) {
    showToast("Không kết thúc được phiên, vui lòng thử lại.", "error");
    console.error("Lỗi kết thúc phiên:", err);
  }
});

export async function khoiTaoChat() {
  const user = auth.currentUser;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    hoTen = snap.data()?.hoTen || user.email || "";
  } catch (err) {
    console.error("Không đọc được tên khách hàng:", err);
  }
  ngheCacPhienCuaKhach(user.uid, capNhatPhien, (err) => {
    elTai.hidden = false;
    elTai.className = "";
    elTai.innerHTML = veLoi("Không tải được dữ liệu tư vấn.");
    showToast("Không tải được dữ liệu tư vấn.", "error");
    console.error("Lỗi nghe phiên tư vấn:", err);
  });
  setInterval(veTrangThai, 30000);
}
