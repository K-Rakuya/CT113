import { db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast, ghiNhatKy } from "/js/utils.js";
import { setBusy, pulse } from "/js/motion.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ordersListEl = document.getElementById("orders-list");

const NHAN_TRANG_THAI = {
  cho_duyet: "Chờ duyệt",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

function htmlHanhDong(id, trangThai) {
  if (trangThai !== "cho_duyet") return "<span>-</span>";
  return `<button class="btn btn--primary btn--sm" data-id="${id}" data-action="dang_giao">Duyệt đơn</button>
          <button class="btn btn--danger btn--sm" data-id="${id}" data-action="huy">Hủy</button>`;
}

/** Tải danh sách đơn hàng từ collection 'donhang' và đổ lên bảng. */
async function loadOrders() {
  try {
    const snap = await getDocs(collection(db, "donhang"));
    if (!ordersListEl) return;
    ordersListEl.innerHTML = "";

    snap.docs.forEach((docSnap, i) => {
      const don = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");
      tr.dataset.id = id;
      tr.className = "motion-enter";
      tr.style.setProperty("--i", i);
      tr.innerHTML = `
        <td><code>${id}</code></td>
        <td>${formatDate(don.ngayDat)}</td>
        <td>${formatCurrency(don.tongTien)}</td>
        <td><span class="badge badge--${don.trangThai}">${NHAN_TRANG_THAI[don.trangThai] || don.trangThai}</span></td>
        <td>${htmlHanhDong(id, don.trangThai)}</td>
      `;
      ordersListEl.appendChild(tr);
    });
  } catch (err) {
    showToast("Lỗi khi tải danh sách đơn hàng!", "error");
    console.error("Lỗi loadOrders:", err);
  }
}

/** Cập nhật đúng một dòng sau khi đổi trạng thái, không dựng lại cả bảng. */
function capNhatDong(tr, trangThai) {
  const badge = tr.querySelector(".badge");
  badge.className = `badge badge--${trangThai}`;
  badge.textContent = NHAN_TRANG_THAI[trangThai] || trangThai;
  tr.lastElementChild.innerHTML = htmlHanhDong(tr.dataset.id, trangThai);
  pulse(badge);
}

ordersListEl?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const tr = btn.closest("tr");
  const nutCungDong = tr.querySelectorAll("button");
  const { id: orderId, action: newStatus } = btn.dataset;

  nutCungDong.forEach((n) => (n.disabled = true));
  setBusy(btn, true);

  try {
    await updateDoc(doc(db, "donhang", orderId), { trangThai: newStatus });
    await ghiNhatKy(`duyet_don_hang: donhang/${orderId} -> ${newStatus}`);
    capNhatDong(tr, newStatus);
    showToast("Đã cập nhật trạng thái đơn hàng thành công!", "success");
  } catch (err) {
    nutCungDong.forEach((n) => (n.disabled = false));
    setBusy(btn, false);
    showToast("Thao tác thất bại!", "error");
    console.error("Lỗi cập nhật đơn hàng:", err);
  }
});

document.addEventListener("DOMContentLoaded", loadOrders);
