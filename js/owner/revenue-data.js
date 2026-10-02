import { db } from "/js/firebase-config.js";
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/** @returns {Promise<{id: string, ngay: Date, trangThai: string, tongTien: number}[]>} */
export async function taiDonHang(tu, den) {
  const snap = await getDocs(
    query(collection(db, "donhang"), where("ngayDat", ">=", Timestamp.fromDate(tu)), where("ngayDat", "<=", Timestamp.fromDate(den)))
  );
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ngay: x.ngayDat?.toDate?.() ?? new Date(0), trangThai: x.trangThai, tongTien: x.tongTien };
  });
}

export async function taiChiTiet(donHangIds) {
  const nhom = [];
  for (let i = 0; i < donHangIds.length; i += 30) nhom.push(donHangIds.slice(i, i + 30));
  const kq = await Promise.all(nhom.map((ids) => getDocs(query(collection(db, "chitietdonhang"), where("donHangId", "in", ids)))));
  return kq.flatMap((snap) => snap.docs.map((d) => d.data()));
}

export async function taiTenSanPham() {
  const snap = await getDocs(collection(db, "sanpham"));
  return new Map(snap.docs.map((d) => [d.id, d.data().tenSanPham]));
}
