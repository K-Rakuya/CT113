import { auth, db } from "/js/firebase-config.js";
import { setCartCount } from "/js/cart-badge.js";
import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/**
 * Thêm lại các sản phẩm của một đơn vào giỏ, giới hạn theo tồn kho hiện tại và bỏ qua sản phẩm đã ngừng bán.
 * @param {{sanPhamId: string, soLuong: number}[]} chiTiet
 * @returns {Promise<{daThem: number, boQua: number}>}
 */
export async function muaLaiDon(chiTiet) {
  const uid = auth.currentUser.uid;
  const gioSnap = await getDocs(query(collection(db, "giohang"), where("khachHangId", "==", uid)));
  const gio = new Map(gioSnap.docs.map((d) => [d.data().sanPhamId, { ref: d.ref, soLuong: d.data().soLuong || 0 }]));
  let tong = [...gio.values()].reduce((t, g) => t + g.soLuong, 0);
  let daThem = 0;
  let boQua = 0;

  for (const ct of chiTiet) {
    const sp = await getDoc(doc(db, "sanpham", ct.sanPhamId));
    const ton = sp.exists() && sp.data().trangThai === "dang_ban" ? sp.data().soLuongTon ?? 0 : 0;
    const hienCo = gio.get(ct.sanPhamId);
    const daCo = hienCo?.soLuong ?? 0;
    const moi = Math.min(ton, daCo + (Number(ct.soLuong) || 0));
    if (moi <= daCo) {
      boQua++;
      continue;
    }
    if (hienCo) await updateDoc(hienCo.ref, { soLuong: moi });
    else gio.set(ct.sanPhamId, { ref: (await addDoc(collection(db, "giohang"), { khachHangId: uid, sanPhamId: ct.sanPhamId, soLuong: moi })), soLuong: 0 });
    gio.get(ct.sanPhamId).soLuong = moi;
    tong += moi - daCo;
    daThem++;
  }
  setCartCount(tong);
  return { daThem, boQua };
}
