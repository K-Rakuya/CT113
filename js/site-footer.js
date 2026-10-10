// Footer dùng chung. Trang khai báo <footer class="site-footer"></footer> (data-variant="compact" cho
// trang đăng nhập/thanh toán) và nạp module này TRƯỚC js/store-info.js. Bản deploy đã có sẵn HTML từ
// scripts/build.mjs; khi chạy thẳng mã nguồn, module tự dựng.

import { dungFooter, dangMo } from "/js/footer-rules.js";

const footer = document.querySelector("footer.site-footer");

if (footer) {
  if (!footer.firstElementChild) footer.innerHTML = dungFooter(footer.dataset.variant);

  footer.querySelector(".site-footer__year").textContent = new Date().getFullYear();

  footer.querySelectorAll("a[href]").forEach((a) => {
    if (dangMo(a.getAttribute("href"), location)) a.setAttribute("aria-current", "page");
  });

  const dienThoai = matchMedia("(max-width: 560px)");
  const cacNhom = footer.querySelectorAll(".site-footer__group details");
  const dongBo = () =>
    cacNhom.forEach((d) => {
      d.open = !dienThoai.matches;
      d.querySelector("summary").tabIndex = dienThoai.matches ? 0 : -1;
    });
  dongBo();
  dienThoai.addEventListener("change", dongBo);
  footer.addEventListener("click", (e) => {
    if (!dienThoai.matches && e.target.closest("summary")) e.preventDefault();
  });

  const nutLen = footer.querySelector(".site-footer__top");
  if (nutLen) {
    const capNhat = () => (nutLen.hidden = document.documentElement.scrollHeight <= innerHeight * 1.5);
    new ResizeObserver(capNhat).observe(document.body);
    capNhat();
    nutLen.addEventListener("click", () => {
      const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollTo({ top: 0, behavior: giam ? "auto" : "smooth" });
    });
  }
}
