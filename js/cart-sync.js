// js/cart-sync.js
// -----------------------------------------------------------------------------
// Đối chiếu số lượng giỏ hàng với Firestore một lần mỗi phiên tab, để huy hiệu đúng
// kể cả khi giỏ được sửa từ thiết bị khác. Nạp động từ js/firebase-config.js.
// -----------------------------------------------------------------------------

import { db } from "/js/firebase-config.js";
import { setCartCount, daDongBo, danhDauDongBo } from "/js/cart-badge.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export async function dongBoSoLuongGio(uid) {
  if (daDongBo(uid)) return;
  try {
    const snap = await getDocs(query(collection(db, "giohang"), where("khachHangId", "==", uid)));
    setCartCount(snap.docs.reduce((tong, d) => tong + (Number(d.data().soLuong) || 0), 0));
    danhDauDongBo(uid);
  } catch {
    /* không đọc được giỏ thì giữ số đã nhớ */
  }
}
