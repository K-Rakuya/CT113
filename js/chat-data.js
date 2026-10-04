import { db, auth } from "/js/firebase-config.js";
import { ghiNhatKy } from "/js/utils.js";
import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const THAM_SO_DOC = { serverTimestamps: "estimate" };
const ms = (ts) => ts?.toMillis?.() ?? null;
const phienRef = (id) => doc(db, "tuvan", id);

function docPhien(d) {
  const x = d.data(THAM_SO_DOC);
  return { id: d.id, ...x, ngayTao: ms(x.ngayTao), ngayTiepNhan: ms(x.ngayTiepNhan), ngayDong: ms(x.ngayDong) };
}

export function ngheCacPhienCuaKhach(uid, khiCoDuLieu, khiLoi) {
  return onSnapshot(query(collection(db, "tuvan"), where("khachHangId", "==", uid)), (snap) => khiCoDuLieu(snap.docs.map(docPhien)), khiLoi);
}

export function ngheBePhien(khiCoDuLieu, khiLoi) {
  return onSnapshot(query(collection(db, "tuvan"), where("trangThai", "in", ["cho", "dang_chat"])), (snap) => khiCoDuLieu(snap.docs.map(docPhien)), khiLoi);
}

export function ngheTinNhan(phienId, khiCoDuLieu, khiLoi) {
  return onSnapshot(
    query(collection(db, "tuvan", phienId, "tinnhan"), orderBy("ngayGui")),
    (snap) => khiCoDuLieu(snap.docs.map((d) => ({ id: d.id, ...d.data(THAM_SO_DOC), ngayGui: ms(d.data(THAM_SO_DOC).ngayGui) }))),
    khiLoi
  );
}

export function moPhienMoi(hoTenKhach) {
  return addDoc(collection(db, "tuvan"), {
    khachHangId: auth.currentUser.uid,
    hoTenKhach,
    trangThai: "cho",
    nhanVienId: null,
    nhanVienTen: null,
    ngayTao: serverTimestamp(),
  });
}

export function guiTinNhan(phienId, vaiTro, noiDung) {
  return addDoc(collection(db, "tuvan", phienId, "tinnhan"), { nguoiGuiId: auth.currentUser.uid, vaiTro, noiDung, ngayGui: serverTimestamp() });
}

export async function tiepNhanPhien(phienId, tenNhanVien) {
  await updateDoc(phienRef(phienId), { trangThai: "dang_chat", nhanVienId: auth.currentUser.uid, nhanVienTen: tenNhanVien, ngayTiepNhan: serverTimestamp() });
  await ghiNhatKy(`tiep_nhan_tu_van: tuvan/${phienId}`);
}

export async function traVePhien(phienId) {
  await updateDoc(phienRef(phienId), { trangThai: "cho", nhanVienId: null, nhanVienTen: null });
  await ghiNhatKy(`tra_ve_tu_van: tuvan/${phienId}`);
}

export async function dongPhien(phienId) {
  await updateDoc(phienRef(phienId), { trangThai: "da_dong", ngayDong: serverTimestamp() });
  await ghiNhatKy(`dong_tu_van: tuvan/${phienId}`);
}

export async function giaoLaiPhien(phienId, nhanVienId, tenNhanVien) {
  await updateDoc(phienRef(phienId), { trangThai: "dang_chat", nhanVienId, nhanVienTen: tenNhanVien, ngayTiepNhan: serverTimestamp() });
  await ghiNhatKy(`giao_lai_tu_van: tuvan/${phienId} -> ${nhanVienId}`);
}
