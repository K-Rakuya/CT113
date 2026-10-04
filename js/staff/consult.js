import { db, auth } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, escapeHtml } from "/js/utils.js";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const consultListEl = document.getElementById("consult-list");

if (consultListEl) {
  // Lắng nghe danh sách các yêu cầu tư vấn từ collection yeucauhotro
  const q = query(
    collection(db, "yeucauhotro"),
    where("trangThai", "==", "cho_xu_ly")
  );

  onSnapshot(q, (snapshot) => {
    consultListEl.innerHTML = "";

    if (snapshot.empty) {
      consultListEl.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666; background: #f9f9f9; border-radius: 8px;">
          <p>Hiện chưa có khách hàng nào yêu cầu tư vấn trực tuyến.</p>
        </div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement("div");
      item.style.cssText = "padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; background: #fff;";
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>Khách hàng: ${escapeHtml(data.hoTenKhach || data.khachHangId || "Khách vãng lai")}</strong>
          <small style="color: #888;">${data.ngayTao ? new Date(data.ngayTao.toDate()).toLocaleTimeString("vi-VN") : "Vừa xong"}</small>
        </div>
        <p style="margin-bottom: 10px; color: #444;">${escapeHtml(data.noiDung || "Cần hỗ trợ thông tin sản phẩm")}</p>
        <button class="btn btn--primary btn-reply" data-id="${docSnap.id}" style="padding: 6px 12px; background: #0d6efd; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
          Tiếp nhận tư vấn
        </button>
      `;
      consultListEl.appendChild(item);
    });

    // Sự kiện nút tiếp nhận
    document.querySelectorAll(".btn-reply").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const ticketId = e.target.dataset.id;
        try {
          await updateDoc(doc(db, "yeucauhotro", ticketId), {
            trangThai: "dang_tu_van",
            nhanVienXuLyId: auth.currentUser?.uid || ""
          });
          await ghiNhatKy("tiep_nhan_tu_van");
          showToast("Đã tiếp nhận yêu cầu tư vấn!", "success");
        } catch (err) {
          showToast("Xử lý thất bại!", "error");
        }
      });
    });
  }, (error) => {
    console.error("Lỗi snapshot tư vấn:", error);
    consultListEl.innerHTML = `<p style="color: red;">Không thể tải dữ liệu tư vấn (${error.message})</p>`;
  });
}