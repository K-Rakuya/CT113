const GOC = "https://x.invalid";
const KHU_VUC = { nhan_vien: "/staff/", chu_cua_hang: "/owner/", quan_tri: "/admin/" };
const TRANG_XAC_THUC = ["/login.html", "/register.html", "/forgot-password.html"];

/** chỉ nhận đường dẫn tương đối cùng trang web, từ chối mọi dạng dẫn ra ngoài */
export function laDuongDanNoiBo(duongDan) {
  if (typeof duongDan !== "string" || !duongDan.startsWith("/") || duongDan.startsWith("//")) return false;
  if (duongDan.includes("\\") || /[\u0000-\u001f\u007f]/.test(duongDan)) return false;
  try {
    const url = new URL(duongDan, GOC);
    return url.origin === GOC && !TRANG_XAC_THUC.includes(url.pathname);
  } catch {
    return false;
  }
}

/** khách quay lại mọi trang công khai, nhân sự chỉ quay lại đúng khu vực của vai trò mình */
export function diemDenSauDangNhap(vaiTro, next, macDinh) {
  if (!laDuongDanNoiBo(next)) return macDinh;
  const duongDan = new URL(next, GOC).pathname;
  const khuVuc = KHU_VUC[vaiTro];
  if (khuVuc) return duongDan.startsWith(khuVuc) ? next : macDinh;
  return /^\/(staff|owner|admin)\//.test(duongDan) ? macDinh : next;
}

export const duongDanDangNhap = (next) => `/login.html?next=${encodeURIComponent(next)}`;

export function giuNext(href, next) {
  return laDuongDanNoiBo(next) ? `${href}?next=${encodeURIComponent(next)}` : href;
}
