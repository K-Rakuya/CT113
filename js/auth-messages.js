const SAI_THONG_TIN = "Email hoặc mật khẩu không đúng.";

const THONG_BAO = {
  "auth/invalid-credential": SAI_THONG_TIN,
  "auth/wrong-password": SAI_THONG_TIN,
  "auth/user-not-found": SAI_THONG_TIN,
  "auth/invalid-email": "Email không đúng định dạng.",
  "auth/missing-email": "Vui lòng nhập email.",
  "auth/missing-password": "Vui lòng nhập mật khẩu.",
  "auth/email-already-in-use": "Email này đã được đăng ký.",
  "auth/weak-password": "Mật khẩu quá yếu, cần tối thiểu 6 ký tự.",
  "auth/user-disabled": "Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ cửa hàng.",
  "auth/too-many-requests": "Bạn thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.",
  "auth/network-request-failed": "Mất kết nối mạng, vui lòng thử lại.",
};

/** lỗi có mã Firebase thì dịch, lỗi do chính ứng dụng ném ra thì giữ nguyên câu */
export function thongBaoLoiXacThuc(err, macDinh) {
  if (err?.code) return THONG_BAO[err.code] ?? macDinh;
  const noiDung = err?.message;
  return noiDung && !noiDung.startsWith("Firebase:") ? noiDung : macDinh;
}
