import { db } from "/js/firebase-config.js";
import { ngayCuaDon } from "/js/owner/revenue-metrics.js";
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/** @returns {Promise<{id: string, ngay: Date, trangThai: string, tongTien: number}[]>} */
export async function taiDonHang(tu, den) {
  const [tuTs, denTs] = [Timestamp.fromDate(tu), Timestamp.fromDate(den)];
  const theoKhoang = (truong) => getDocs(query(collection(db, "donhang"), where(truong, ">=", tuTs), where(truong, "<=", denTs)));
  const [theoNgayDat, theoNgayHoanThanh] = await Promise.all([theoKhoang("ngayDat"), theoKhoang("ngayHoanThanh")]);
  const donHang = new Map();
  for (const d of [...theoNgayDat.docs, ...theoNgayHoanThanh.docs]) {
    const x = d.data();
    if (!donHang.has(d.id)) donHang.set(d.id, { id: d.id, ngay: ngayCuaDon(x), trangThai: x.trangThai, tongTien: x.tongTien });
  }
  return [...donHang.values()];
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
