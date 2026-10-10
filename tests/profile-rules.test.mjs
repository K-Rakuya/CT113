import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaHoSo, kiemTraHoSo, coThayDoi, GIOI_HAN_HO_SO } from "../js/customer/profile-rules.js";

const hopLe = { hoTen: "Nguyễn Văn An", soDienThoai: "0901234567", diaChi: "Cần Thơ" };

test("chuanHoaHoSo: gọn khoảng trắng và bỏ khoảng trắng trong số điện thoại", () => {
  assert.deepEqual(chuanHoaHoSo({ hoTen: "  An   Nguyễn ", soDienThoai: "0901 234 567", diaChi: " Cần Thơ " }), {
    hoTen: "An Nguyễn",
    soDienThoai: "0901234567",
    diaChi: "Cần Thơ",
  });
  assert.deepEqual(chuanHoaHoSo(null), { hoTen: "", soDienThoai: "", diaChi: "" });
});

test("kiemTraHoSo: hồ sơ hợp lệ", () => {
  const kq = kiemTraHoSo(hopLe);
  assert.equal(kq.hopLe, true);
  assert.deepEqual(kq.loi, {});
});

test("kiemTraHoSo: thiếu họ tên và số điện thoại sai", () => {
  const kq = kiemTraHoSo({ ...hopLe, hoTen: "   ", soDienThoai: "12ab" });
  assert.equal(kq.hopLe, false);
  assert.ok(kq.loi.hoTen);
  assert.ok(kq.loi.soDienThoai);
  assert.equal(kq.loi.diaChi, undefined);
});

test("kiemTraHoSo: chấp nhận số điện thoại có khoảng trắng và địa chỉ để trống", () => {
  assert.equal(kiemTraHoSo({ ...hopLe, soDienThoai: "0901 234 567", diaChi: "" }).hopLe, true);
});

test("kiemTraHoSo: vượt giới hạn độ dài", () => {
  const kq = kiemTraHoSo({ ...hopLe, hoTen: "a".repeat(GIOI_HAN_HO_SO.hoTen + 1), diaChi: "b".repeat(GIOI_HAN_HO_SO.diaChi + 1) });
  assert.ok(kq.loi.hoTen);
  assert.ok(kq.loi.diaChi);
});

test("coThayDoi: bỏ qua khác biệt chỉ do khoảng trắng", () => {
  assert.equal(coThayDoi(hopLe, { ...hopLe, hoTen: "  Nguyễn  Văn An " }), false);
  assert.equal(coThayDoi(hopLe, { ...hopLe, diaChi: "Hà Nội" }), true);
});
