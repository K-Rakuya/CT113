// js/motion.js
// -----------------------------------------------------------------------------
// Tiện ích chuyển động dùng chung. KHÔNG phụ thuộc Firebase → import ở bất kỳ trang nào.
// Mọi hàm tự tôn trọng prefers-reduced-motion: bỏ animation nhưng vẫn đạt kết quả cuối.
// Class + keyframes tương ứng nằm ở mục 16 của css/style.css. Xem thêm docs/MOTION.md
// -----------------------------------------------------------------------------

const truyVanGiamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Người dùng có bật "giảm chuyển động" trong hệ điều hành không. */
export function prefersReducedMotion() {
  return truyVanGiamChuyenDong.matches;
}

const dangChay = new WeakMap(); // phần tử → id requestAnimationFrame đang chạy

/**
 * Đếm số từ giá trị đang hiển thị tới `to` (easeOutCubic). Dùng cho tổng tiền, thống kê.
 * - Lần gọi đầu (chưa có giá trị cũ) đặt thẳng, trừ khi truyền `from`.
 * - Gọi lại khi đang chạy: tiếp tục từ giá trị đang hiển thị, không giật.
 * @param {HTMLElement} el
 * @param {number} to
 * @param {{ from?: number, duration?: number, format?: (n:number)=>string }} [tuyChon]
 */
export function animateNumber(el, to, { from, duration = 600, format = (n) => String(Math.round(n)) } = {}) {
  if (!el) return;
  cancelAnimationFrame(dangChay.get(el));

  const dangHienThi = Number(el.dataset.giaTri);
  const tu = from ?? (el.dataset.giaTri === undefined ? NaN : dangHienThi);
  el.dataset.giaTri = String(to);

  if (prefersReducedMotion() || !Number.isFinite(tu) || tu === to) {
    el.textContent = format(to);
    return;
  }

  const batDau = performance.now();
  const buoc = (bay) => {
    const t = Math.min(1, (bay - batDau) / duration);
    const muot = 1 - Math.pow(1 - t, 4); // easeOutQuart: dừng êm hơn
    const giaTri = tu + (to - tu) * muot;
    el.textContent = format(t < 1 ? giaTri : to);
    // lưu giá trị đang hiển thị để lần gọi kế tiếp tiếp nối từ đây nếu bị ngắt giữa chừng
    el.dataset.giaTri = String(t < 1 ? giaTri : to);
    if (t < 1) dangChay.set(el, requestAnimationFrame(buoc));
  };
  dangChay.set(el, requestAnimationFrame(buoc));
}

/**
 * Thu gọn chiều cao + mờ dần rồi gỡ phần tử khỏi DOM (các phần tử bên dưới trượt lên).
 * Dùng Web Animations API nên không cần thêm CSS. Trả về Promise xong khi đã gỡ.
 * @param {HTMLElement} el
 */
export function collapseAndRemove(el, { duration = 280 } = {}) {
  if (!el || !el.isConnected) return Promise.resolve();
  if (prefersReducedMotion() || typeof el.animate !== "function") {
    el.remove();
    return Promise.resolve();
  }
  const cs = getComputedStyle(el);
  const cao = el.getBoundingClientRect().height;
  el.style.overflow = "hidden";
  el.style.pointerEvents = "none";
  const anim = el.animate(
    [
      {
        height: `${cao}px`, opacity: 1,
        paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
        borderBottomWidth: cs.borderBottomWidth, marginBottom: cs.marginBottom,
      },
      { opacity: 0, offset: 0.55 }, // nội dung mờ nhanh hơn chiều cao co lại
      {
        height: "0px", opacity: 0,
        paddingTop: "0px", paddingBottom: "0px",
        borderBottomWidth: "0px", marginBottom: "0px",
      },
    ],
    { duration, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" } // = --ease-move
  );
  return anim.finished.catch(() => {}).then(() => el.remove());
}

const nutDangDuocNhanTieuDiem = new WeakSet();

/**
 * Bật/tắt trạng thái "đang xử lý" cho nút: vòng quay + chặn bấm lặp + giữ nguyên độ rộng
 * (không giật khi đổi nhãn) + trả focus bàn phím khi xong. CSS: .btn[aria-busy="true"].
 * @param {HTMLButtonElement} nut
 * @param {boolean} dangBan
 */
export function setBusy(nut, dangBan) {
  if (!nut) return;
  if (dangBan) {
    if (nut.getAttribute("aria-busy") === "true") return;
    if (document.activeElement === nut) nutDangDuocNhanTieuDiem.add(nut);
    nut.style.minWidth = `${nut.offsetWidth}px`;
    nut.setAttribute("aria-busy", "true");
    nut.disabled = true;
  } else {
    nut.removeAttribute("aria-busy");
    nut.disabled = false;
    nut.style.minWidth = "";
    if (nutDangDuocNhanTieuDiem.delete(nut)) nut.focus({ preventScroll: true });
  }
}

const nhanGoc = new WeakMap();

/**
 * Nút hiện dấu ✓ + nhãn xác nhận (mặc định 1,6s) rồi tự về như cũ. Gọi lại khi đang hiện thì gia hạn.
 * CSS: .btn.is-success
 */
export function confirmButton(nut, nhan = "Đã thêm", ms = 1600) {
  if (!nut) return;
  clearTimeout(nut._hetXacNhan);
  if (!nut.classList.contains("is-success")) {
    nhanGoc.set(nut, nut.textContent);
    nut.style.minWidth = `${nut.offsetWidth}px`;
  }
  nut.classList.add("is-success");
  nut.textContent = nhan;
  nut._hetXacNhan = setTimeout(() => {
    nut.classList.remove("is-success");
    nut.textContent = nhanGoc.get(nut) ?? nut.textContent;
    nut.style.minWidth = "";
  }, ms);
}

/** Lắc ngang một lần (báo lỗi ở form). Bỏ qua khi người dùng giảm chuyển động. */
export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove("motion-shake");
  void el.offsetWidth; // buộc reflow để animation chạy lại được
  el.classList.add("motion-shake");
  el.addEventListener("animationend", () => el.classList.remove("motion-shake"), { once: true });
}

/**
 * Thay nội dung của một vùng bằng cross-fade + co giãn chiều cao (skeleton → dữ liệu, đổi bộ lọc, phân trang).
 * Nội dung cũ được chuyển sang lớp "bóng" phủ lên và mờ dần, nội dung mới (đã dựng sẵn bên dưới) hiện ra
 * cùng lúc → không có khung hình trống, không nhảy bố cục. `render` phải đồng bộ và tự ghi vào `el`.
 * @param {HTMLElement} el
 * @param {() => void} render
 */
export function swapContent(el, render) {
  if (!el || prefersReducedMotion() || typeof el.animate !== "function" || !el.firstChild) {
    render();
    return;
  }
  const cao0 = el.offsetHeight;
  const viTriCu = el.style.position;
  const bong = document.createElement("div");
  bong.className = el.className;
  bong.setAttribute("aria-hidden", "true");
  bong.inert = true;
  bong.style.cssText = "position:absolute;inset:0;margin:0;overflow:hidden;pointer-events:none;";
  bong.append(...el.childNodes);
  if (getComputedStyle(el).position === "static") el.style.position = "relative";

  render();
  el.append(bong);

  const cao1 = el.offsetHeight;
  bong
    .animate({ opacity: [1, 0] }, { duration: 200, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" })
    .finished.catch(() => {})
    .then(() => {
      bong.remove();
      el.style.position = viTriCu;
    });

  if (Math.abs(cao1 - cao0) > 2) {
    el.style.overflow = "clip";
    el.animate(
      { height: [`${cao0}px`, `${cao1}px`] },
      { duration: 320, easing: "cubic-bezier(.4, 0, .2, 1)" } // = --ease-move
    ).finished.catch(() => {}).then(() => { el.style.overflow = ""; });
  }
}

/**
 * Cho các phần tử hiện lần lượt, lệch nhau một nhịp ngắn (đổi tab, lọc danh sách).
 * Tối đa 8 phần tử đầu được lệch nhịp để tổng thời gian không kéo dài.
 * @param {Iterable<HTMLElement>} dsPhanTu
 */
export function staggerIn(dsPhanTu, { delay = 40, duration = 280 } = {}) {
  if (prefersReducedMotion()) return;
  [...dsPhanTu].forEach((el, i) => {
    el.animate?.(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
      { duration, delay: Math.min(i, 8) * delay, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" } // = --ease-out
    );
  });
}

/** Nhịp nhỏ khi một dòng trạng thái đổi chữ (co nhẹ rồi về chỗ cũ). */
export function pulse(el) {
  if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;
  el.animate(
    [{ opacity: 0.35, transform: "scale(.96)" }, { opacity: 1, transform: "none" }],
    { duration: 300, easing: "cubic-bezier(.22, 1, .36, 1)" }
  );
}

/**
 * Ảnh sản phẩm "bay" vào biểu tượng giỏ hàng trên header theo quỹ đạo cong rồi giỏ hàng nảy nhẹ.
 * Chạy hoàn toàn bằng transform/opacity trên một bản sao cố định; không đụng tới bố cục.
 * @param {HTMLImageElement} nguon ảnh đã tải xong
 * @returns {Promise<void>} xong khi ảnh chạm giỏ (xong ngay nếu không có hiệu ứng)
 */
export function flyToCart(nguon) {
  const dich = document.querySelector('.site-header__nav a[href="/cart.html"]');
  if (!nguon || !dich || prefersReducedMotion() || typeof nguon.animate !== "function") return Promise.resolve();
  if (!nguon.complete || !nguon.naturalWidth) return Promise.resolve();
  const a = nguon.getBoundingClientRect();
  const b = dich.getBoundingClientRect();
  if (!a.width || !b.width) return Promise.resolve();

  const co = Math.min(a.width, a.height, 160);
  const bay = document.createElement("img");
  bay.src = nguon.currentSrc || nguon.src;
  bay.alt = "";
  bay.setAttribute("aria-hidden", "true");
  Object.assign(bay.style, {
    position: "fixed", zIndex: "3000", pointerEvents: "none", objectFit: "cover",
    width: `${co}px`, height: `${co}px`, borderRadius: "12px", boxShadow: "0 12px 28px rgba(28,27,25,.25)",
    left: `${a.left + a.width / 2 - co / 2}px`, top: `${a.top + a.height / 2 - co / 2}px`,
    willChange: "transform, opacity",
  });
  document.body.append(bay);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const chay = bay.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(.5)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.1)`, opacity: 0.35 },
    ],
    { duration: 680, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" } // = --ease-move
  );
  return chay.finished.catch(() => {}).then(() => {
    bay.remove();
    dich.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.2)", offset: 0.4 }, { transform: "scale(1)" }],
      { duration: 380, easing: "cubic-bezier(.34, 1.56, .64, 1)" } // = --ease-spring
    );
  });
}
