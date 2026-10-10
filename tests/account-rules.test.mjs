import { test } from "node:test";
import assert from "node:assert/strict";
import { MUC_TAI_KHOAN, dungMenuTaiKhoan, laMucHienTai } from "../js/customer/account-rules.js";

const soMucDangMo = (html) => (html.match(/aria-current="page"/g) ?? []).length;

test("dungMenuTaiKhoan: có đủ các mục và đúng một mục đang mở", () => {
  const html = dungMenuTaiKhoan("/customer/support.html");
  for (const m of MUC_TAI_KHOAN) assert.match(html, new RegExp(`href="${m.href}"`));
  assert.equal(soMucDangMo(html), 1);
  assert.match(html, /href="\/customer\/support\.html" aria-current="page"/);
});

test("dungMenuTaiKhoan: trang chi tiết đơn thuộc mục Đơn hàng", () => {
  const html = dungMenuTaiKhoan("/customer/order-detail.html");
  assert.match(html, /href="\/customer\/orders\.html" aria-current="page"/);
  assert.equal(soMucDangMo(html), 1);
});

test("dungMenuTaiKhoan: đường dẫn lạ không đánh dấu mục nào", () => {
  assert.equal(soMucDangMo(dungMenuTaiKhoan("/index.html")), 0);
});

test("laMucHienTai: mỗi trang chỉ thuộc một mục", () => {
  for (const m of MUC_TAI_KHOAN) {
    for (const t of m.trang) {
      assert.equal(MUC_TAI_KHOAN.filter((x) => laMucHienTai(x, t)).length, 1);
    }
  }
});
