import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { pulse, collapseAndRemove } from "/js/motion.js";
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ticketsListEl = document.getElementById("tickets-list");
const NHAN_TRANG_THAI = {
  cho_xu_ly: "Chờ xử lý",
  dang_xu_ly: "Đang xử lý",
  da_xong: "Đã xong",
};
const cacThe = new Map();
let lanDau = true; // realtime: chỉ lần đầu có hiệu ứng vào

function htmlTicket(id, ticket) {
  return `
      <h3>${escapeHtml(ticket.tieuDe || "Yêu cầu hỗ trợ")}</h3>
      <p>${escapeHtml(ticket.noiDung)}</p>
      <p>Trạng thái: <span class="badge badge--${ticket.trangThai}">${NHAN_TRANG_THAI[ticket.trangThai] || ticket.trangThai}</span></p>
      ${
        ticket.trangThai !== "da_xong"
          ? `<div class="nv-reply-box">
              <input type="text" id="reply-${id}" placeholder="Nhập câu trả lời...">
              <button class="btn btn--primary btn--sm btn-reply" data-id="${id}">Gửi phản hồi</button>
             </div>`
          : `<p style="margin-top: 10px; color: var(--color-primary);"><strong>Đã trả lời:</strong> ${escapeHtml(ticket.phanHoi)}</p>`
      }
    `;
}

/**
 * Lắng nghe dữ liệu Realtime (onSnapshot) từ collection 'yeucauhotro'
 * Tác dụng: Tự động hiển thị các ticket hỗ trợ mới mà khách hàng vừa gửi mà không cần F5 trang.
 */
const unsubscribe = onSnapshot(collection(db, "yeucauhotro"), (snapshot) => {
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

/**
 * Bắt sự kiện bấm nút gửi phản hồi ticket
 */
ticketsListEl?.addEventListener("click", async (e) => {
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
      nhanVienXuLyId: auth.currentUser?.uid || ""
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