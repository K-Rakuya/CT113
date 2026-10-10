// Nội dung và bộ dựng HTML của footer. Thuần chuỗi, không đụng DOM: js/site-footer.js dùng khi chạy,
// scripts/build.mjs dùng để chèn sẵn HTML vào từng trang lúc deploy.
// href: null = trang chưa có, hiển thị mờ và không bấm được; điền đường dẫn khi trang sẵn sàng.

export const NHOM_LIEN_KET = [
  {
    tieuDe: "Mua sắm",
    muc: [
      { nhan: "Tất cả sản phẩm", href: "/product-list.html" },
      { nhan: "Hàng mới về", href: "/product-list.html?sapxep=moi_nhat" },
      { nhan: "Bộ PC dựng sẵn", href: "/index.html#bo-pc" },
    ],
  },
  {
    tieuDe: "Hỗ trợ",
    muc: [
      { nhan: "Tư vấn trực tuyến", href: "/customer/chat.html" },
      { nhan: "Hỗ trợ kỹ thuật", href: "/customer/support.html" },
      { nhan: "Đơn hàng của tôi", href: "/customer/orders.html" },
      { nhan: "Quên mật khẩu", href: "/forgot-password.html", auth: "out" },
    ],
  },
  {
    tieuDe: "Chính sách",
    muc: [
      { nhan: "Chính sách đổi trả", href: null },
      { nhan: "Chính sách bảo hành", href: null },
      { nhan: "Chính sách vận chuyển", href: null },
      { nhan: "Chính sách bảo mật", href: null },
    ],
  },
];

export const MANG_XA_HOI = [
  { nhan: "Facebook", href: null, logo: "/images/social/facebook.svg" },
  { nhan: "Zalo", href: null, logo: "/images/social/zalo.svg" },
  { nhan: "YouTube", href: null, logo: "/images/social/youtube.svg" },
];

export const THANH_TOAN = ["Thanh toán khi nhận hàng (COD)"];

export const LIEN_KET_GON = [
  { nhan: "Tư vấn trực tuyến", href: "/customer/chat.html" },
  { nhan: "Hỗ trợ kỹ thuật", href: "/customer/support.html" },
  { nhan: "Trang chủ", href: "/index.html" },
];

const chuanHoa = (p) => (p === "/" ? "/index.html" : p);

export function dangMo(href, vitri) {
  if (!href) return false;
  const u = new URL(href, "https://x.invalid");
  return !u.hash && chuanHoa(u.pathname) === chuanHoa(vitri.pathname) && u.search === vitri.search;
}

const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="/images/home/icons.svg#${id}"/></svg>`;
const auth = (m) => (m.auth ? ` data-auth="${m.auth}"` : "");

const muc = (m) =>
  `<li${auth(m)}>${m.href ? `<a href="${m.href}">${m.nhan}</a>` : `<span class="site-footer__soon">${m.nhan}</span>`}</li>`;

export const mucMang = (m) => {
  const logo = `<img src="${m.logo}" alt="" width="20" height="20" loading="lazy" decoding="async">`;
  return m.href
    ? `<li><a class="site-footer__icon" href="${m.href}" target="_blank" rel="noopener" aria-label="${m.nhan}">${logo}</a></li>`
    : `<li><span class="site-footer__icon site-footer__icon--soon" aria-hidden="true">${logo}</span></li>`;
};

const nhom = (n) =>
  `<nav class="site-footer__group" aria-label="${n.tieuDe}"><details open><summary><h3>${n.tieuDe}</h3>${ic("chev-r")}</summary><ul>${n.muc.map(muc).join("")}</ul></details></nav>`;

const banQuyen = (nam) =>
  `© <span class="site-footer__year">${nam}</span> <span data-cua-hang="ten">Tên cửa hàng</span> — Đồ án CT113`;

const lienHe = () => `
  <div class="site-footer__contact" hidden>
    <h3>Liên hệ</h3>
    <ul>
      <li data-cua-hang-khoi="diaChi" hidden>${ic("pin")}<a data-cua-hang="diaChi" href="#" target="_blank" rel="noopener"></a></li>
      <li data-cua-hang-khoi="hotline" hidden>${ic("phone")}<a data-cua-hang="hotline" href="#"></a></li>
      <li data-cua-hang-khoi="email" hidden>${ic("mail")}<a data-cua-hang="email" href="#"></a></li>
      <li data-cua-hang-khoi="gioMoCua" hidden>${ic("clock")}<span data-cua-hang="gioMoCua"></span></li>
    </ul>
  </div>`;

export function dungFooter(bienThe = "day-du", nam = new Date().getFullYear()) {
  if (bienThe === "compact") {
    return `
  <div class="site-footer__container site-footer__row">
    <p>${banQuyen(nam)}</p>
    <nav aria-label="Hỗ trợ"><ul class="site-footer__links">${LIEN_KET_GON.map(muc).join("")}</ul></nav>
  </div>`;
  }
  return `
  <div class="site-footer__container site-footer__grid">
    <div class="site-footer__brand">
      <a class="site-footer__name" href="/index.html" data-cua-hang="ten">Tên cửa hàng</a>
      <p data-cua-hang="slogan">Cửa hàng linh kiện và máy tính.</p>
      <ul class="site-footer__social" aria-label="Mạng xã hội">${MANG_XA_HOI.map(mucMang).join("")}</ul>
    </div>
    ${NHOM_LIEN_KET.map(nhom).join("")}
    ${lienHe()}
  </div>
  <div class="site-footer__container site-footer__bottom">
    <p>${banQuyen(nam)}</p>
    <div class="site-footer__end">
      ${THANH_TOAN.map((t) => `<span class="site-footer__pay">${ic("receipt")}${t}</span>`).join("")}
      <button class="site-footer__top" type="button" aria-label="Lên đầu trang">${ic("arrow")}</button>
    </div>
  </div>`;
}
