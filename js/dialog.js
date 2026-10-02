import { escapeHtml } from "/js/utils.js";

const trangThaiModal = new WeakMap();

const CAN_FOCUS = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function openModal(modal) {
  if (!modal.hidden) return;
  const dialog = modal.querySelector(".modal__dialog");
  const truocDo = document.activeElement;

  const onKeydown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal(modal);
      return;
    }
    if (e.key !== "Tab") return;
    const nut = [...dialog.querySelectorAll(CAN_FOCUS)].filter((el) => el.getClientRects().length);
    if (!nut.length) return;
    const dau = nut[0];
    const cuoi = nut[nut.length - 1];
    if (e.shiftKey && document.activeElement === dau) {
      e.preventDefault();
      cuoi.focus();
    } else if (!e.shiftKey && document.activeElement === cuoi) {
      e.preventDefault();
      dau.focus();
    }
  };
  const onClick = (e) => {
    if (e.target.closest("[data-dong-modal]")) closeModal(modal);
  };

  modal.addEventListener("keydown", onKeydown);
  modal.addEventListener("click", onClick);
  trangThaiModal.set(modal, { truocDo, onKeydown, onClick });
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  (dialog.querySelector("[data-focus-dau]") || dialog.querySelector("input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") || dialog.querySelector(".modal__close"))?.focus();
  if (!dialog.contains(document.activeElement)) {
    dialog.tabIndex = -1;
    dialog.focus();
  }
}

export function closeModal(modal) {
  const tt = trangThaiModal.get(modal);
  if (!tt || modal.hidden) return;
  modal.removeEventListener("keydown", tt.onKeydown);
  modal.removeEventListener("click", tt.onClick);
  trangThaiModal.delete(modal);
  modal.hidden = true;
  document.body.style.overflow = "";
  tt.truocDo?.focus?.();
  modal.dispatchEvent(new CustomEvent("dong"));
}

/**
 * Hộp thoại xác nhận thay cho confirm() của trình duyệt.
 * @returns {Promise<boolean>} true nếu người dùng bấm nút xác nhận
 */
export function confirmDialog({ tieuDe, noiDung, nhanXacNhan = "Xác nhận", nguyHiem = false }) {
  return new Promise((xong) => {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal__backdrop" data-dong-modal></div>
      <div class="modal__dialog" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(tieuDe)}">
        <div class="modal__header"><h3>${escapeHtml(tieuDe)}</h3><button type="button" class="modal__close" data-dong-modal aria-label="Đóng">&times;</button></div>
        <div class="modal__body"><p>${escapeHtml(noiDung)}</p></div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" data-dong-modal>Hủy</button>
          <button type="button" class="btn ${nguyHiem ? "btn--danger" : "btn--primary"}" data-xac-nhan data-focus-dau>${escapeHtml(nhanXacNhan)}</button>
        </div>
      </div>`;
    document.body.append(modal);

    let dongY = false;
    modal.querySelector("[data-xac-nhan]").addEventListener("click", () => {
      dongY = true;
      closeModal(modal);
    });
    modal.addEventListener(
      "dong",
      () => {
        setTimeout(() => modal.remove(), 300);
        xong(dongY);
      },
      { once: true }
    );
    requestAnimationFrame(() => openModal(modal));
  });
}
