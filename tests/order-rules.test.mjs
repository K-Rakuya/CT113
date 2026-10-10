import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BO_LOC_DON,
  buocTienTrinh,
  demTheoTrangThai,
  hanhDongCuaDon,
  laMaLocHopLe,
  locDon,
  maDon,
  tongSoLuong,
} from "../js/customer/order-rules.js";

const dsDon = [
  { id: "a", trangThai: "cho_duyet" },
  { id: "b", trangThai: "hoan_thanh" },
  { id: "c", trangThai: "hoan_thanh" },
  { id: "d", trangThai: "la" },
];

test("maDon: lấy 8 ký tự đầu và viết hoa", () => {
  assert.equal(maDon("abcdef123456"), "#ABCDEF12");
});

test("bộ lọc: Tất cả đứng đầu và mã hợp lệ", () => {
  assert.equal(BO_LOC_DON[0].ma, "");
  assert.equal(laMaLocHopLe("huy"), true);
  assert.equal(laMaLocHopLe("khong_co"), false);
});

test("locDon: lọc theo trạng thái, rỗng thì giữ nguyên", () => {
  assert.equal(locDon(dsDon, "hoan_thanh").length, 2);
  assert.equal(locDon(dsDon, "").length, 4);
});

test("demTheoTrangThai: đếm từng trạng thái, bỏ qua trạng thái lạ", () => {
  assert.deepEqual(demTheoTrangThai(dsDon), { "": 4, cho_duyet: 1, dang_giao: 0, hoan_thanh: 2, huy: 0 });
});

test("buocTienTrinh: đơn huỷ nằm ngoài tiến trình", () => {
  assert.equal(buocTienTrinh("cho_duyet"), 0);
  assert.equal(buocTienTrinh("hoan_thanh"), 2);
  assert.equal(buocTienTrinh("huy"), -1);
});

test("tongSoLuong: cộng số lượng, bỏ qua giá trị không hợp lệ", () => {
  assert.equal(tongSoLuong([{ soLuong: 2 }, { soLuong: "3" }, { soLuong: "x" }, {}]), 5);
});

test("hanhDongCuaDon: theo từng trạng thái", () => {
  assert.deepEqual(hanhDongCuaDon({ trangThai: "cho_duyet" }), { ghiChu: null, nut: "yeu-cau-huy" });
  assert.equal(hanhDongCuaDon({ trangThai: "cho_duyet", yeuCauHuy: true }).nut, null);
  assert.equal(hanhDongCuaDon({ trangThai: "dang_giao" }).nut, null);
  assert.equal(hanhDongCuaDon({ trangThai: "hoan_thanh" }).nut, "mua-lai");
  const huy = hanhDongCuaDon({ trangThai: "huy" });
  assert.equal(huy.nut, "mua-lai");
  assert.ok(huy.ghiChu);
});
