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
export function animateNumber(el, to, { from, duration = 420, format = (n) => String(Math.round(n)) } = {}) {
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
    const muot = 1 - Math.pow(1 - t, 3);
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
export function collapseAndRemove(el, { duration = 240 } = {}) {
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
