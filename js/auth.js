import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Đăng ký khách hàng mới — luôn tạo vaiTro="khach_hang".
// Tài khoản nhân viên/quản trị/chủ cửa hàng do quản trị viên tạo tại admin/users-manage.html
export async function dangKy({ hoTen, email, matKhau, soDienThoai }) {
  const cred = await createUserWithEmailAndPassword(auth, email, matKhau);
  await setDoc(doc(db, "users", cred.user.uid), {
    hoTen, email, soDienThoai, diaChi: "",
    ngayTao: serverTimestamp(), trangThai: "hoat_dong", vaiTro: "khach_hang"
  });
  return cred.user;
}

// Đăng nhập — ném lỗi nếu tài khoản đã bị khoá (trangThai = "khoa")
export async function dangNhap({ email, matKhau }) {
  const cred = await signInWithEmailAndPassword(auth, email, matKhau);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (snap.exists() && snap.data().trangThai === "khoa") {
    await signOut(auth);
    throw new Error("Tài khoản đã bị khoá. Liên hệ quản trị viên.");
  }
  return cred.user;
}

export async function dangXuat() {
  await signOut(auth);
}

// Trả về "khach_hang" | "nhan_vien" | "quan_tri" | "chu_cua_hang" | null
export async function layVaiTroHienTai() {
  if (!auth.currentUser) return null;
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  return snap.exists() ? snap.data().vaiTro : null;
}