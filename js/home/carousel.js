import { chiSoGanNhat, chiSoVong, trangThaiNutCuon, vuotNguongKeo, buocCuon } from "/js/home/scroll-rules.js";

const giamChuyenDong = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * kéo chuột để cuộn ngang, cảm ứng dùng cuộn gốc của trình duyệt.
 * khiThaKeo(vanToc) được gọi khi thả (vanToc: px/ms theo chiều scrollLeft); nếu có, lớp is-dragging
 * (tắt scroll-snap) được giữ đến khi cuộn xong để snap của trình duyệt không giành với cuộn mượt.
 * khiKeo(huong) được gọi khi bắt đầu kéo và mỗi lần đổi chiều (huong: 1 là sang phải/slide sau, -1 là slide trước).
 */
export function choPhepKeoChuot(track, { khiThaKeo, khiKeo } = {}) {
  let dang = false;
  let daKeo = false;
  let chanClick = false;
  let x0 = 0;
  let s0 = 0;
  let xTruoc = 0;
  let tTruoc = 0;
  let vanToc = 0;
  let huong = 0;
  let henNha = 0;
  let nhaXong = null;

  const nhaSnap = () => {
    clearTimeout(henNha);
    if (nhaXong) track.removeEventListener("scrollend", nhaXong);
    nhaXong = null;
    track.classList.remove("is-dragging");
  };

  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    clearTimeout(henNha);
    if (nhaXong) track.removeEventListener("scrollend", nhaXong);
    nhaXong = null;
    dang = true;
    daKeo = false;
    x0 = xTruoc = e.clientX;
    tTruoc = e.timeStamp;
    vanToc = 0;
    huong = 0;
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
    const h = Math.sign(-dx);
    if (daKeo && h && h !== huong) {
      huong = h;
      khiKeo?.(h);
    }
    const dt = e.timeStamp - tTruoc;
    if (dt > 0) vanToc = 0.7 * vanToc + 0.3 * ((xTruoc - e.clientX) / dt);
    xTruoc = e.clientX;
    tTruoc = e.timeStamp;
  });
  const ket = () => {
    if (!dang) return;
    dang = false;
    if (!daKeo) return;
    chanClick = true;
    setTimeout(() => (chanClick = false), 0);
    if (!khiThaKeo) return nhaSnap();
    if (performance.now() - tTruoc > 80) vanToc = 0; // dừng tay trước khi thả thì không có đà
    khiThaKeo(vanToc);
    nhaXong = nhaSnap;
    track.addEventListener("scrollend", nhaXong, { once: true });
    henNha = setTimeout(nhaSnap, 700);
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

  function diDen(i, { vao = true } = {}) {
    const dich = chiSoVong(i, slides.length);
    const left = dich * be();
    // chữ của slide đích ẩn sẵn rồi hiện dần khi slide tới; nếu để hiện sẵn rồi mới chạy hiệu ứng thì chữ sẽ biến mất giữa chừng
    if (vao && !giam && dich !== chiSo) slides[dich].classList.add("is-pre");
    const quayVong = i < 0 || i >= slides.length;
    if (quayVong && !giam) {
      // Vòng từ slide cuối về đầu: nhảy thẳng kèm hiệu ứng hiện dần thay vì cuộn ngược qua mọi slide.
      track.scrollTo({ left, behavior: "auto" });
      track.animate({ opacity: [0, 1] }, { duration: 360, easing: "cubic-bezier(.22, 1, .36, 1)" }); // = --ease-out
      return;
    }
    track.scrollTo({ left, behavior: giam ? "auto" : "smooth" });
  }

  function datChiSo(i) {
    chiSo = i;
    slides.forEach((s, k) => {
      s.classList.toggle("is-active", k === i);
      if (k !== i) s.classList.remove("is-enter");
    });
    if (slides[i].classList.contains("is-pre")) slides[i].classList.replace("is-pre", "is-enter");
    dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === i)));
    batDau();
  }

  function capNhatNutTamDung() {
    if (!nutTamDung) return;
    nutTamDung.setAttribute("aria-pressed", String(nguoiDungTamDung));
    nutTamDung.setAttribute("aria-label", nguoiDungTamDung ? "Bật tự động chuyển slide" : "Tạm dừng tự động chuyển slide");
    nutTamDung.querySelector("use")?.setAttribute("href", `/images/home/icons.svg#${nguoiDungTamDung ? "play" : "pause"}`);
  }

  const hienHetChu = () => slides.forEach((s) => s.classList.remove("is-pre"));
  // đang kéo thì trình duyệt vẫn bắn scrollend mỗi lần tay dừng; lúc đó không được hiện chữ slide sắp tới
  track.addEventListener("scrollend", () => !track.classList.contains("is-dragging") && hienHetChu());
  track.addEventListener("pointerdown", hienHetChu);

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

  let chiSoLucKeo = 0;
  track.addEventListener("pointerdown", () => (chiSoLucKeo = chiSo));
  choPhepKeoChuot(track, {
    khiKeo: (huong) => {
      // chữ slide sắp tới ẩn sẵn, rồi hiện dần khi vượt nửa slide: không có cảnh chữ hiện đủ rồi biến mất
      hienHetChu();
      const dich = chiSoLucKeo + huong;
      if (!giam && dich >= 0 && dich < slides.length) slides[dich].classList.add("is-pre");
    },
    khiThaKeo: (vanToc) => {
      const vi = track.scrollLeft / be();
      const nhanh = Math.abs(vanToc) > 0.4; // vuốt nhanh thì sang slide kế tiếp dù kéo chưa tới nửa
      const i = nhanh ? (vanToc > 0 ? Math.ceil(vi) : Math.floor(vi)) : Math.round(vi);
      diDen(Math.max(0, Math.min(slides.length - 1, i)), { vao: false });
    },
  });
  capNhatNutTamDung();
  slides[0].classList.add("is-enter");
  datChiSo(0);

  // ảnh các slide sau được nạp và giải mã sẵn lúc rảnh, tránh khựng ở lần chuyển đầu tiên
  const anhSau = [...goc.querySelectorAll(".home-slide__art")].slice(1);
  const khoiDong = () => anhSau.forEach((a) => {
    a.loading = "eager";
    a.decode?.().catch(() => {});
  });
  const roi = () => ("requestIdleCallback" in window ? requestIdleCallback(khoiDong, { timeout: 4000 }) : setTimeout(khoiDong, 2000));
  document.readyState === "complete" ? roi() : window.addEventListener("load", roi, { once: true });
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

/** thêm lớp is-in khi phần tử cuộn tới, chỉ một lần; phần tử đã nằm trong khung nhìn thì giữ nguyên, không mờ đi rồi hiện lại */
export function hienKhiCuonToi(el) {
  if (giamChuyenDong() || !("IntersectionObserver" in window)) return el.classList.add("is-in");
  if (el.getBoundingClientRect().top < innerHeight) return;
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
