import { test } from "node:test";
import assert from "node:assert/strict";
import { dangMo, dungFooter, mucMang, NHOM_LIEN_KET, MANG_XA_HOI } from "../js/footer-rules.js";
import { lienKetBanDo } from "../js/store-rules.js";

const vitri = (pathname, search = "") => ({ pathname, search });

test("dangMo: khớp đường dẫn và query, bỏ qua liên kết có #", () => {
  assert.equal(dangMo("/product-list.html", vitri("/product-list.html")), true);
  assert.equal(dangMo("/product-list.html", vitri("/product-list.html", "?sapxep=moi_nhat")), false);
  assert.equal(dangMo("/product-list.html?sapxep=moi_nhat", vitri("/product-list.html", "?sapxep=moi_nhat")), true);
  assert.equal(dangMo("/index.html#bo-pc", vitri("/index.html")), false);
  assert.equal(dangMo("/index.html", vitri("/")), true);
  assert.equal(dangMo(null, vitri("/")), false);
});

test("dungFooter: bản đầy đủ có đủ nhóm, mục chưa có trang không phải liên kết", () => {
  const html = dungFooter("day-du", 2026);
  for (const n of NHOM_LIEN_KET) assert.match(html, new RegExp(`aria-label="${n.tieuDe}"`));
  assert.match(html, /<span class="site-footer__soon">Chính sách đổi trả<\/span>/);
  assert.match(html, /site-footer__top/);
  assert.match(html, /site-footer__year">2026</);
});

test("dungFooter: mục chỉ hiện khi chưa đăng nhập mang data-auth=out", () => {
  assert.match(dungFooter(), /<li data-auth="out"><a href="\/forgot-password\.html">/);
});

test("dungFooter: bản compact gọn, không có lưới và nút lên đầu trang", () => {
  const html = dungFooter("compact");
  assert.match(html, /site-footer__row/);
  assert.doesNotMatch(html, /site-footer__grid|site-footer__top/);
});

test("mạng xã hội: href null thì không tạo thẻ a", () => {
  const html = dungFooter();
  for (const m of MANG_XA_HOI.filter((x) => !x.href)) assert.doesNotMatch(html, new RegExp(`<a[^>]*>${m.nhan}</a>`));
});

test("mucMang: có href thì là liên kết có tên truy cập, chưa có thì ẩn khỏi trình đọc màn hình", () => {
  const co = mucMang({ nhan: "Zalo", href: "https://example.com", logo: "/images/social/zalo.svg" });
  assert.match(co, /<a [^>]*href="https:\/\/example\.com"[^>]*aria-label="Zalo"/);
  const chua = mucMang({ nhan: "Zalo", href: null, logo: "/images/social/zalo.svg" });
  assert.match(chua, /aria-hidden="true"/);
  assert.doesNotMatch(chua, /<a /);
  assert.match(chua, /<img src="\/images\/social\/zalo\.svg"/);
});

test("lienKetBanDo mã hoá địa chỉ", () => {
  assert.equal(lienKetBanDo("12 Đường 3/2"), "https://www.google.com/maps/search/?api=1&query=12%20%C4%90%C6%B0%E1%BB%9Dng%203%2F2");
});
