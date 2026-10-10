const header = document.querySelector(".site-header");

if (header) {
  // aria-current của nav được đặt sớm (trước khung hình đầu) trong js/page-transitions.js.

  const form = header.querySelector(".site-search");
  const o = form?.querySelector("input");

  if (o) {
    const oLoc = location.pathname === "/product-list.html" ? document.getElementById("tu-khoa") : null;

    if (oLoc) {
      o.value = new URLSearchParams(location.search).get("tukhoa") ?? "";
      o.addEventListener("input", () => {
        oLoc.value = o.value;
        oLoc.dispatchEvent(new Event("input", { bubbles: true }));
      });
      oLoc.addEventListener("input", () => {
        if (o.value !== oLoc.value) o.value = oLoc.value;
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        o.blur();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      o.focus();
      o.select();
    });
  }
}
