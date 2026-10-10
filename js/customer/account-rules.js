export const MUC_TAI_KHOAN = [
  { href: "/customer/profile.html", nhan: "Thông tin cá nhân", bieuTuong: "user", trang: ["/customer/profile.html"] },
  { href: "/customer/orders.html", nhan: "Đơn hàng của tôi", bieuTuong: "receipt", trang: ["/customer/orders.html", "/customer/order-detail.html"] },
  { href: "/customer/support.html", nhan: "Hỗ trợ kỹ thuật", bieuTuong: "wrench", trang: ["/customer/support.html"] },
  { href: "/customer/chat.html", nhan: "Tư vấn trực tuyến", bieuTuong: "chat", trang: ["/customer/chat.html"] },
];

export const laMucHienTai = (muc, duongDan) => muc.trang.includes(duongDan);

const bieuTuong = (id) => `<svg class="tk-ic" aria-hidden="true"><use href="/images/home/icons.svg#${id}"/></svg>`;

export function dungMenuTaiKhoan(duongDan) {
  return MUC_TAI_KHOAN.map((m) => {
    const dang = laMucHienTai(m, duongDan) ? ' aria-current="page"' : "";
    return `<a href="${m.href}"${dang}>${bieuTuong(m.bieuTuong)}<span>${m.nhan}</span></a>`;
  }).join("");
}
