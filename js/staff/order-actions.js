import { db } from "/js/firebase-config.js";
import { ghiNhatKy } from "/js/utils.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/** Huỷ đơn đang chờ duyệt hoặc đang giao và trả số lượng từng sản phẩm về kho trong một giao dịch. */
export async function huyDonVaHoanKho(donHangId) {
  const chiTiet = await getDocs(query(collection(db, "chitietdonhang"), where("donHangId", "==", donHangId)));
  const canHoan = new Map();
  chiTiet.docs.forEach((d) => {
    const { sanPhamId, soLuong } = d.data();
    canHoan.set(sanPhamId, (canHoan.get(sanPhamId) ?? 0) + (Number(soLuong) || 0));
  });

  await runTransaction(db, async (tx) => {
    const donRef = doc(db, "donhang", donHangId);
    const donSnap = await tx.get(donRef);
    if (!donSnap.exists() || !["cho_duyet", "dang_giao"].includes(donSnap.data().trangThai)) {
      throw new Error("Đơn hàng đã đổi trạng thái, vui lòng tải lại trang.");
    }
    const spSnaps = await Promise.all([...canHoan.keys()].map((id) => tx.get(doc(db, "sanpham", id))));
    spSnaps.forEach((sp) => {
      if (sp.exists()) tx.update(sp.ref, { soLuongTon: (sp.data().soLuongTon ?? 0) + canHoan.get(sp.id) });
    });
    tx.update(donRef, { trangThai: "huy", ngayHuy: serverTimestamp(), yeuCauHuy: deleteField() });
  });
  await ghiNhatKy(`huy_don_hang: donhang/${donHangId}`);
}

export async function doiTrangThaiDon(donHangId, trangThai) {
  const truong = { trangThai };
  if (trangThai === "hoan_thanh") truong.ngayHoanThanh = serverTimestamp();
  await updateDoc(doc(db, "donhang", donHangId), truong);
  await ghiNhatKy(`cap_nhat_don_hang: donhang/${donHangId} -> ${trangThai}`);
}

export async function tuChoiYeuCauHuy(donHangId) {
  await updateDoc(doc(db, "donhang", donHangId), { yeuCauHuy: deleteField() });
  await ghiNhatKy(`tu_choi_yeu_cau_huy: donhang/${donHangId}`);
}
