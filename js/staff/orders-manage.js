import { db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast, ghiNhatKy } from "/js/utils.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ordersListEl = document.getElementById("orders-list");

/**
 * Hàm: loadOrders
 * Tác dụng: Truy vấn danh sách đơn hàng từ Firestore (collection 'donhang')
 *           và đổ dữ liệu lên bảng HTML.
 */
async function loadOrders() {
  try {
    const snap = await getDocs(collection(db, "donhang"));
    if (!ordersListEl) return;
    ordersListEl.innerHTML = "";

    snap.forEach((docSnap) => {
      const don = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><code>${id}</code></td>
        <td>${formatDate(don.ngayDat)}</td>
        <td>${formatCurrency(don.tongTien)}</td>
        <td><span class="badge badge--${don.trangThai}">${don.trangThai}</span></td>
        <td>
          ${
            don.trangThai === "cho_duyet"
              ? `<button class="btn btn--primary btn--sm" data-id="${id}" data-action="dang_giao">Duyệt đơn</button>
                 <button class="btn btn--danger btn--sm" data-id="${id}" data-action="huy">Hủy</button>`
              : `<span>-</span>`
          }
        </td>
      `;
      ordersListEl.appendChild(tr);
    });
  } catch (err) {
    showToast("Lỗi khi tải danh sách đơn hàng!", "error");
    console.error("Lỗi loadOrders:", err);
  }
}

/**
 * Lắng nghe sự kiện click trên bảng đơn hàng để xử lý nút 'Duyệt đơn' hoặc 'Hủy'
 */
ordersListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const orderId = btn.dataset.id;
  const newStatus = btn.dataset.action;

  try {
    // Cập nhật trạng thái đơn hàng trên Firestore
    await updateDoc(doc(db, "donhang", orderId), { trangThai: newStatus });
    
    // Ghi lại nhật ký hệ thống
    await ghiNhatKy(`duyet_don_hang: donhang/${orderId} -> ${newStatus}`);
    
    showToast("Đã cập nhật trạng thái đơn hàng thành công!", "success");
    loadOrders();
  } catch (err) {
    showToast("Thao tác thất bại!", "error");
    console.error("Lỗi cập nhật đơn hàng:", err);
  }
});

// Tự động chạy khi tải xong trang
document.addEventListener("DOMContentLoaded", loadOrders);