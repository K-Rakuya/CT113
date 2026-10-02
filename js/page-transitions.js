(function () {
  var TEN = "anh-chinh";
  var KHOA_ANH = "ct113.heroSrc";
  var TRANG_DANH_SACH = { "/": 1, "/index.html": 1, "/product-list.html": 1 };
  var TRANG_CHI_TIET = "/product-detail.html";
  var dangGan = null;

  function gan(el) {
    if (!el) return;
    el.style.viewTransitionName = TEN;
    dangGan = el;
  }

  function go() {
    if (dangGan) dangGan.style.viewTransitionName = "";
    dangGan = null;
  }

  function theTheoId(id) {
    var cacThe = document.querySelectorAll(".kh-product-card");
    for (var i = 0; i < cacThe.length; i++) {
      if (new URL(cacThe[i].href, location.href).searchParams.get("id") === id) return cacThe[i];
    }
    return null;
  }

  addEventListener("pageswap", function (e) {
    if (!e.viewTransition || !e.activation) return;
    var dich = new URL(e.activation.entry.url);

    if (dich.pathname === TRANG_CHI_TIET && TRANG_DANH_SACH[location.pathname]) {
      var id = dich.searchParams.get("id");
      var the = theTheoId(id);
      if (!the) return;
      gan(the.querySelector(".kh-product-card__media"));
      var anh = the.querySelector(".kh-product-card__img");
      try {
        if (anh && anh.currentSrc) sessionStorage.setItem(KHOA_ANH, JSON.stringify({ id: id, src: anh.currentSrc }));
      } catch (_) {}
    } else if (location.pathname === TRANG_CHI_TIET && TRANG_DANH_SACH[dich.pathname]) {
      gan(document.querySelector(".kh-detail__img, .kh-skeleton-detail__img"));
    }
    if (dangGan) e.viewTransition.finished.then(go, go);
  });

  addEventListener("pagereveal", function (e) {
    var kichHoat = window.navigation && navigation.activation;
    if (!kichHoat) return;
    document.documentElement.dataset.dieuHuong = kichHoat.navigationType;
    if (!e.viewTransition || !kichHoat.from) return;

    var nguon = new URL(kichHoat.from.url);
    var dich = new URL(kichHoat.entry.url);

    if (dich.pathname === TRANG_CHI_TIET && TRANG_DANH_SACH[nguon.pathname]) {
      var khung = document.querySelector(".kh-detail__img, .kh-skeleton-detail__img");
      if (!khung) return;
      try {
        var nho = JSON.parse(sessionStorage.getItem(KHOA_ANH));
        if (nho && nho.id === dich.searchParams.get("id") && khung.tagName !== "IMG") {
          khung.style.backgroundImage = 'url("' + nho.src.replace(/["\\]/g, "\\$&") + '")';
          khung.style.backgroundSize = "cover";
          khung.style.backgroundPosition = "center";
        }
      } catch (_) {}
      gan(khung);
    } else if (nguon.pathname === TRANG_CHI_TIET && TRANG_DANH_SACH[dich.pathname]) {
      var the = theTheoId(nguon.searchParams.get("id"));
      if (the) gan(the.querySelector(".kh-product-card__media"));
    }
    if (dangGan) e.viewTransition.finished.then(go, go);
  });

  addEventListener("pageshow", function (e) {
    if (e.persisted) go();
  });
})();
