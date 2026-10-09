import { chiSoGanNhat, chiSoVong, trangThaiNutCuon, vuotNguongKeo, buocCuon } from "/js/home/scroll-rules.js";

const giamChuyenDong = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** kéo chuột để cuộn ngang, cảm ứng dùng cuộn gốc của trình duyệt */
export function choPhepKeoChuot(track, { khiThaKeo } = {}) {
  let dang = false;
  let daKeo = false;
  let chanClick = false;
  let x0 = 0;
  let s0 = 0;

  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dang = true;
    daKeo = false;
    x0 = e.clientX;
    s0 = track.scrollLeft;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dang) return;
    const dx = e.clientX - x0;
    if (!daKeo && vuotNguongKeo(dx)) {
      daKeo = true;
      track.classList.add("is-dragging");
    }
    if (daKeo) track.scrollLeft = s0 - dx;
  });
  const ket = () => {
    if (!dang) return;
    dang = false;
    track.classList.remove("is-dragging");
    if (!daKeo) return;
    chanClick = true;
    setTimeout(() => (chanClick = false), 0);
    khiThaKeo?.();
  };
  window.addEventListener("pointerup", ket);
  window.addEventListener("pointercancel", ket);
  track.addEventListener("click", (e) => {
    if (!chanClick) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  track.addEventListener("dragstart", (e) => e.preventDefault());
}

export function khoiTaoBanner(goc, { tuDongMs = 6000 } = {}) {
  const track = goc.querySelector(".home-banner__track");
  const slides = [...track.children];
  const dots = [...goc.querySelectorAll(".home-banner__dot")];
  const nutTamDung = goc.querySelector(".home-banner__toggle");
  const giam = giamChuyenDong();
  let chiSo = 0;
  let hen = 0;
  let nguoiDungTamDung = giam;
  let dangTuongTac = false;
  let trongTamNhin = true;
  let rafId = 0;

  const be = () => track.clientWidth;
  const dangChay = () => !nguoiDungTamDung && !dangTuongTac && trongTamNhin && !document.hidden;

  function dung() {
    clearTimeout(hen);
    goc.classList.remove("is-auto");
  }

  function batDau() {
    dung();
    if (!dangChay()) return;
    goc.classList.add("is-auto");
    hen = setTimeout(() => diDen(chiSo + 1), tuDongMs);
  }

  function diDen(i) {
    track.scrollTo({ left: chiSoVong(i, slides.length) * be(), behavior: giam ? "auto" : "smooth" });
  }

  function datChiSo(i) {
    chiSo = i;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
    dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === i)));
    batDau();
  }

  function capNhatNutTamDung() {
    if (!nutTamDung) return;
    nutTamDung.setAttribute("aria-pressed", String(nguoiDungTamDung));
    nutTamDung.setAttribute("aria-label", nguoiDungTamDung ? "Bật tự động chuyển slide" : "Tạm dừng tự động chuyển slide");
    nutTamDung.querySelector("use")?.setAttribute("href", `/images/home/icons.svg#${nguoiDungTamDung ? "play" : "pause"}`);
  }

  track.addEventListener("scroll", () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const i = chiSoGanNhat(track.scrollLeft, be(), slides.length);
      if (i !== chiSo) datChiSo(i);
    });
  }, { passive: true });

  goc.querySelector(".home-banner__nav--prev")?.addEventListener("click", () => diDen(chiSo - 1));
  goc.querySelector(".home-banner__nav--next")?.addEventListener("click", () => diDen(chiSo + 1));
  dots.forEach((d, k) => d.addEventListener("click", () => diDen(k)));
  nutTamDung?.addEventListener("click", () => {
    nguoiDungTamDung = !nguoiDungTamDung;
    capNhatNutTamDung();
    batDau();
  });

  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") diDen(chiSo - 1);
    else if (e.key === "ArrowRight") diDen(chiSo + 1);
    else return;
    e.preventDefault();
  });

  const tamDungTamThoi = (tuongTac) => () => {
    dangTuongTac = tuongTac;
    batDau();
  };
  goc.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && tamDungTamThoi(true)());
  goc.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && tamDungTamThoi(false)());
  goc.addEventListener("pointerdown", (e) => e.pointerType !== "mouse" && tamDungTamThoi(true)());
  goc.addEventListener("pointerup", (e) => e.pointerType !== "mouse" && tamDungTamThoi(false)());
  goc.addEventListener("pointercancel", tamDungTamThoi(false));
  goc.addEventListener("focusin", tamDungTamThoi(true));
  goc.addEventListener("focusout", tamDungTamThoi(false));
  document.addEventListener("visibilitychange", batDau);
  new IntersectionObserver(([m]) => {
    trongTamNhin = m.isIntersecting;
    batDau();
  }, { threshold: 0.3 }).observe(goc);
  new ResizeObserver(() => track.scrollTo({ left: chiSo * be(), behavior: "auto" })).observe(track);

  choPhepKeoChuot(track, { khiThaKeo: () => diDen(chiSoGanNhat(track.scrollLeft, be(), slides.length)) });
  capNhatNutTamDung();
  datChiSo(0);
}

export function khoiTaoHang(hang) {
  const track = hang.querySelector(".home-row__track");
  const truoc = hang.querySelector('[data-huong="truoc"]');
  const sau = hang.querySelector('[data-huong="sau"]');
  let rafId = 0;

  function capNhatNut() {
    const t = trangThaiNutCuon(track.scrollLeft, track.clientWidth, track.scrollWidth);
    hang.classList.toggle("co-cuon", t.coCuon);
    hang.classList.toggle("co-truoc", t.coCuon && !t.dauTrang);
    hang.classList.toggle("co-sau", t.coCuon && !t.cuoiTrang);
    if (truoc) truoc.disabled = t.dauTrang;
    if (sau) sau.disabled = t.cuoiTrang;
  }

  const cuon = (huong) => () => track.scrollBy({ left: huong * buocCuon(track.clientWidth), behavior: giamChuyenDong() ? "auto" : "smooth" });
  truoc?.addEventListener("click", cuon(-1));
  sau?.addEventListener("click", cuon(1));
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(capNhatNut);
  }, { passive: true });
  new ResizeObserver(capNhatNut).observe(track);
  choPhepKeoChuot(track);
  capNhatNut();
}

let quanSat = null;

/** thêm lớp is-in khi phần tử cuộn tới, chỉ một lần */
export function hienKhiCuonToi(el) {
  if (giamChuyenDong() || !("IntersectionObserver" in window)) return el.classList.add("is-in");
  quanSat ??= new IntersectionObserver((ds) => {
    for (const m of ds) {
      if (!m.isIntersecting) continue;
      m.target.classList.add("is-in");
      quanSat.unobserve(m.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  el.classList.add("home-reveal");
  quanSat.observe(el);
}
