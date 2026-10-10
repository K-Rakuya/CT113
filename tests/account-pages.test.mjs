import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const THU_MUC = new URL("../customer/", import.meta.url);
const TRANG = ["profile", "orders", "order-detail", "support", "chat"];
const doc = (ten) => readFileSync(new URL(`${ten}.html`, THU_MUC), "utf8");
const dem = (html, mau) => (html.match(mau) ?? []).length;

for (const ten of TRANG) {
  test(`${ten}.html: dùng đúng khung tài khoản`, () => {
    const html = doc(ten);
    assert.equal(dem(html, /<h1[\s>]/g), 1, "đúng một h1");
    assert.equal(dem(html, /<nav class="tk-nav" aria-label="Tài khoản"><\/nav>/g), 1, "một chỗ chờ menu");
    assert.equal(dem(html, /id="user-info"/g), 1, "một vùng tên người dùng");
    assert.match(html, /href="\/css\/account\.css"/);
    assert.match(html, /src="\/js\/customer\/account-shell\.js"/);
  });

  test(`${ten}.html: không còn style nội tuyến hay phụ thuộc product.css`, () => {
    const html = doc(ten);
    assert.doesNotMatch(html, /\sstyle="/);
    assert.doesNotMatch(html, /product\.css/);
  });

  test(`${ten}.html: id không trùng nhau`, () => {
    const ids = [...doc(ten).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length);
  });
}

test("customer/: mọi trang HTML đều nằm trong danh sách kiểm tra", () => {
  const cacTrang = readdirSync(THU_MUC).filter((f) => f.endsWith(".html")).map((f) => f.replace(".html", ""));
  assert.deepEqual(cacTrang.sort(), [...TRANG].sort());
});
