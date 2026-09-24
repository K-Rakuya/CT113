import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export function formatCurrency(soTien) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(soTien);
}

export function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString("vi-VN");
}

// type: "success" | "error" | "info"
export function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);
}

// Gọi ở MỌI hành động quan trọng: duyệt đơn, đổi giá, phân quyền, tính lương...
export async function ghiNhatKy(hanhDong) {
  if (!auth.currentUser) return;
  await addDoc(collection(db, "nhatky"), {
    nguoiThucHienId: auth.currentUser.uid, hanhDong, thoiGian: serverTimestamp()
  });
}