import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ticketsListEl = document.getElementById("tickets-list");
let lanDau = true; // realtime: chỉ lần đầu có hiệu ứng vào

/**
 * Lắng nghe dữ liệu Realtime (onSnapshot) từ collection 'yeucauhotro'
 * Tác dụng: Tự động hiển thị các ticket hỗ trợ mới mà khách hàng vừa gửi mà không cần F5 trang.
 */
const unsubscribe = onSnapshot(collection(db, "yeucauhotro"), (snapshot) => {
  if (!ticketsListEl) return;
  ticketsListEl.innerHTML = "";

  let i = 0;
  snapshot.forEach((docSnap) => {
    const ticket = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.className = "card nv-ticket-card" + (lanDau ? " motion-enter" : "");
    if (lanDau) div.style.setProperty("--i", i++);
    div.innerHTML = `
      <h3>${ticket.tieuDe || "Yêu cầu hỗ trợ"}</h3>
      <p>${ticket.noiDung || ""}</p>
      <p>Trạng thái: <span class="badge badge--${ticket.trangThai}">${ticket.trangThai}</span></p>
      ${
        ticket.trangThai !== "da_xong"
          ? `<div class="nv-reply-box">
              <input type="text" id="reply-${id}" placeholder="Nhập câu trả lời...">
              <button class="btn btn--primary btn--sm btn-reply" data-id="${id}">Gửi phản hồi</button>
             </div>`
          : `<p style="margin-top: 10px; color: var(--color-primary);"><strong>Đã trả lời:</strong> ${ticket.phanHoi || ""}</p>`
      }
    `;
    ticketsListEl.appendChild(div);
  });
  lanDau = false;
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