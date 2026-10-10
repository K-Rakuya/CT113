// Trang customer/support.html: gửi yêu cầu hỗ trợ và theo dõi phản hồi theo thời gian thực
// bằng onSnapshot (collection yeucauhotro).

import { auth, db } from "/js/firebase-config.js";
import { formatDate, showToast, escapeHtml } from "/js/utils.js";
import { setBusy, swapContent } from "/js/motion.js";
import { GIOI_HAN_YEU_CAU, NHAN_TRANG_THAI_HO_TRO, kiemTraYeuCau } from "/js/customer/support-rules.js";
import { datLoiTruong } from "/js/customer/field-error.js";
import { veTrong, veLoi } from "/js/customer/account-view.js";
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("danh-sach-yeu-cau");
const elForm = document.getElementById("form-gui-yeu-cau");
const oTieuDe = document.getElementById("tieu-de");
const oNoiDung = document.getElementById("noi-dung");
const elDem = document.getElementById("dem-noi-dung");
const nutGui = document.getElementById("btn-gui");

let huyDangKy = null;
let daCoDuLieu = false;

export function initHoTro() {
  const q = query(collection(db, "yeucauhotro"), where("khachHangId", "==", auth.currentUser.uid));

  huyDangKy = onSnapshot(
    q,
    (snap) => {
      const danhSach = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.ngayTao?.toMillis?.() ?? 0) - (a.ngayTao?.toMillis?.() ?? 0));
      render(danhSach);
    },
    (err) => {
      elDanhSach.innerHTML = veLoi("Không tải được yêu cầu hỗ trợ.");
      elDanhSach.removeAttribute("aria-busy");
      console.error(err);
    }
  );

  window.addEventListener("pagehide", () => huyDangKy?.(), { once: true });
}

function render(danhSach) {
  if (daCoDuLieu) return renderNoiDung(danhSach, false);
  daCoDuLieu = true;
  swapContent(elDanhSach, () => renderNoiDung(danhSach, true));
  elDanhSach.removeAttribute("aria-busy");
}

function renderNoiDung(danhSach, hieuUng) {
  if (danhSach.length === 0) {
    elDanhSach.innerHTML = veTrong({
      bieuTuong: "wrench",
      tieuDe: "Bạn chưa gửi yêu cầu hỗ trợ nào",
      moTa: "Mô tả vấn đề ở biểu mẫu phía trên, nhân viên sẽ phản hồi tại đây.",
    });
    return;
  }

  elDanhSach.innerHTML = danhSach
    .map(
      (yc, i) => `
    <article class="tk-ticket${hieuUng ? " motion-enter" : ""}" style="--i:${i}">
      <div class="tk-ticket__head">
        <h3 class="tk-ticket__title">${escapeHtml(yc.tieuDe)}</h3>
        <span class="badge badge--${escapeHtml(yc.trangThai)}">${escapeHtml(NHAN_TRANG_THAI_HO_TRO[yc.trangThai] || yc.trangThai)}</span>
      </div>
      <p class="tk-ticket__time">${formatDate(yc.ngayTao)}</p>
      <p class="tk-ticket__body">${escapeHtml(yc.noiDung)}</p>
      ${yc.phanHoi ? `<div class="tk-ticket__reply"><strong>Phản hồi từ nhân viên</strong><p>${escapeHtml(yc.phanHoi)}</p></div>` : ""}
    </article>`
    )
    .join("");
}

oNoiDung.addEventListener("input", () => {
  elDem.textContent = `${oNoiDung.value.length}/${GIOI_HAN_YEU_CAU.noiDung}`;
});

elForm.addEventListener("input", (e) => {
  if (e.target.dataset.loi) datLoiTruong(e.target, "");
});

elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kq = kiemTraYeuCau({ tieuDe: oTieuDe.value, noiDung: oNoiDung.value });
  datLoiTruong(oTieuDe, kq.loi.tieuDe);
  datLoiTruong(oNoiDung, kq.loi.noiDung);
  if (!kq.hopLe) {
    (kq.loi.tieuDe ? oTieuDe : oNoiDung).focus();
    return;
  }

  setBusy(nutGui, true);
  try {
    await addDoc(collection(db, "yeucauhotro"), {
      khachHangId: auth.currentUser.uid,
      tieuDe: kq.giaTri.tieuDe,
      noiDung: kq.giaTri.noiDung,
      trangThai: "cho_xu_ly",
      ngayTao: serverTimestamp(),
      nhanVienXuLyId: null,
      phanHoi: "",
    });
    showToast("Đã gửi yêu cầu hỗ trợ.", "success");
    elForm.reset();
    elDem.textContent = `0/${GIOI_HAN_YEU_CAU.noiDung}`;
  } catch (err) {
    showToast("Gửi yêu cầu thất bại: " + err.message, "error");
  } finally {
    setBusy(nutGui, false);
  }
});
