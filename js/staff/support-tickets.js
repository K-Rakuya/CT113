import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { pulse, collapseAndRemove } from "/js/motion.js";
import { collection, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const ticketsListEl = document.getElementById("tickets-list");
const NHAN_TRANG_THAI = {
  cho_xu_ly: "Chờ xử lý",
  dang_xu_ly: "Đang xử lý",
  da_xong: "Đã xong",
};
const cacThe = new Map();
let lanDau = true; // realtime: chỉ lần đầu có hiệu ứng vào
let uidToi = null;
let tenToi = "";

function htmlTicket(id, ticket) {
  return `
      <h3>${escapeHtml(ticket.tieuDe || "Yêu cầu hỗ trợ")}</h3>
      <p>${escapeHtml(ticket.noiDung)}</p>
      <p>Trạng thái: <span class="badge badge--${ticket.trangThai}">${NHAN_TRANG_THAI[ticket.trangThai] || ticket.trangThai}</span></p>
      ${phanHanhDong(id, ticket)}
    `;
}

function phanHanhDong(id, ticket) {
  if (ticket.trangThai === "da_xong") {
    return `<p style="margin-top: 10px; color: var(--color-primary);"><strong>Đã trả lời${ticket.nhanVienTen ? ` (${escapeHtml(ticket.nhanVienTen)})` : ""}:</strong> ${escapeHtml(ticket.phanHoi)}</p>`;
  }
  if (!ticket.nhanVienId) {
    return `<button class="btn btn--primary btn--sm btn-tiep-nhan" data-id="${id}">Tiếp nhận</button>`;
  }
  if (ticket.nhanVienId !== uidToi) {
    return `<p class="qt-sub">Đang được ${escapeHtml(ticket.nhanVienTen || "nhân viên khác")} xử lý</p>`;
  }
  return `<div class="nv-reply-box">
              <input type="text" id="reply-${id}" placeholder="Nhập câu trả lời...">
              <button class="btn btn--primary btn--sm btn-reply" data-id="${id}">Gửi phản hồi</button>
              <button class="btn btn--secondary btn--sm btn-tra-ve" data-id="${id}">Trả về</button>
             </div>`;
}

/**
 * Lắng nghe dữ liệu Realtime (onSnapshot) từ collection 'yeucauhotro'
 * Tác dụng: Tự động hiển thị các ticket hỗ trợ mới mà khách hàng vừa gửi mà không cần F5 trang.
 */
function batDauLangNghe() {
  return onSnapshot(collection(db, "yeucauhotro"), (snapshot) => {
    if (!ticketsListEl) return;

    const laLanDau = lanDau;
    lanDau = false;

    snapshot.docChanges().forEach((thayDoi) => {
      const id = thayDoi.doc.id;
      const ticket = thayDoi.doc.data();

      if (thayDoi.type === "added") {
        const the = document.createElement("div");
        the.className = "card nv-ticket-card" + (laLanDau ? " motion-enter" : " nv-ticket-card--moi");
        if (laLanDau) the.style.setProperty("--i", thayDoi.newIndex);
        the.innerHTML = htmlTicket(id, ticket);
        cacThe.set(id, the);
        ticketsListEl.insertBefore(the, ticketsListEl.children[thayDoi.newIndex] ?? null);
      } else if (thayDoi.type === "modified") {
        const the = cacThe.get(id);
        if (!the) return;
        the.innerHTML = htmlTicket(id, ticket);
        pulse(the.querySelector(".badge"));
      } else {
        const the = cacThe.get(id);
        cacThe.delete(id);
        if (the) collapseAndRemove(the);
      }
    });
  }, (err) => {
    console.error("Lỗi realtime support-tickets:", err);
  });
}

let unsubscribe = null;
onAuthStateChanged(auth, async (user) => {
  if (!user || unsubscribe) return;
  uidToi = user.uid;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    tenToi = snap.data()?.hoTen || user.email || "";
  } catch (err) {
    console.error("Không đọc được tên nhân viên:", err);
  }
  unsubscribe = batDauLangNghe();
});

/**
 * Bắt sự kiện bấm nút gửi phản hồi ticket
 */
async function doiNguoiXuLy(id, truong, hanhDong, thongBao) {
  try {
    await updateDoc(doc(db, "yeucauhotro", id), truong);
    await ghiNhatKy(`${hanhDong}: yeucauhotro/${id}`);
    showToast(thongBao, "success");
  } catch (err) {
    const daCoNguoiNhan = err?.code === "permission-denied";
    showToast(daCoNguoiNhan ? "Yêu cầu này đã có nhân viên khác tiếp nhận." : "Thao tác thất bại, vui lòng thử lại.", "error");
    console.error("Lỗi đổi người xử lý ticket:", err);
  }
}

ticketsListEl?.addEventListener("click", async (e) => {
  const nut = e.target.closest("[data-id]");
  if (nut?.classList.contains("btn-tiep-nhan")) {
    return doiNguoiXuLy(nut.dataset.id, { nhanVienId: uidToi, nhanVienTen: tenToi, ngayTiepNhan: serverTimestamp(), trangThai: "dang_xu_ly" }, "tiep_nhan_ho_tro", "Đã tiếp nhận yêu cầu.");
  }
  if (nut?.classList.contains("btn-tra-ve")) {
    return doiNguoiXuLy(nut.dataset.id, { nhanVienId: null, nhanVienTen: null, trangThai: "cho_xu_ly" }, "tra_ve_ho_tro", "Đã trả yêu cầu về danh sách chờ.");
  }
  if (!e.target.classList.contains("btn-reply")) return;

  const id = e.target.dataset.id;
  const replyInput = document.getElementById(`reply-${id}`);
  const phanHoi = replyInput ? replyInput.value.trim() : "";

  if (!phanHoi) {
    showToast("Vui lòng nhập nội dung phản hồi!", "error");
    return;
  }

  try {
    // Cập nhật câu trả lời và chuyển trạng thái ticket sang 'da_xong'
    await updateDoc(doc(db, "yeucauhotro", id), {
      phanHoi: phanHoi,
      trangThai: "da_xong",
      nhanVienXuLyId: uidToi
    });

    // Ghi nhật ký hệ thống
    await ghiNhatKy(`phan_hoi_ho_tro: yeucauhotro/${id}`);

    showToast("Đã phản hồi yêu cầu hỗ trợ thành công!", "success");
  } catch (err) {
    showToast("Gửi phản hồi thất bại!", "error");
    console.error("Lỗi khi phản hồi ticket:", err);
  }
});

// Ngắt kết nối lắng nghe realtime khi chuyển trang để giải phóng RAM
window.addEventListener("beforeunload", () => {
  if (unsubscribe) unsubscribe();
});