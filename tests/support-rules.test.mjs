import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemTraYeuCau, GIOI_HAN_YEU_CAU, NHAN_TRANG_THAI_HO_TRO } from "../js/customer/support-rules.js";
import { veTrong, veLoi } from "../js/customer/account-view.js";

test("kiemTraYeuCau: yêu cầu hợp lệ được chuẩn hoá", () => {
  const kq = kiemTraYeuCau({ tieuDe: "  Máy   không lên nguồn ", noiDung: " Bật máy không có tín hiệu. " });
  assert.equal(kq.hopLe, true);
  assert.deepEqual(kq.giaTri, { tieuDe: "Máy không lên nguồn", noiDung: "Bật máy không có tín hiệu." });
});

test("kiemTraYeuCau: thiếu tiêu đề hoặc nội dung", () => {
  const kq = kiemTraYeuCau({ tieuDe: " ", noiDung: "" });
  assert.equal(kq.hopLe, false);
  assert.ok(kq.loi.tieuDe && kq.loi.noiDung);
});

test("kiemTraYeuCau: vượt giới hạn độ dài", () => {
  const kq = kiemTraYeuCau({ tieuDe: "a".repeat(GIOI_HAN_YEU_CAU.tieuDe + 1), noiDung: "b".repeat(GIOI_HAN_YEU_CAU.noiDung + 1) });
  assert.ok(kq.loi.tieuDe && kq.loi.noiDung);
});

test("NHAN_TRANG_THAI_HO_TRO: đủ ba trạng thái", () => {
  assert.deepEqual(Object.keys(NHAN_TRANG_THAI_HO_TRO), ["cho_xu_ly", "dang_xu_ly", "da_xong"]);
});

test("veTrong: chỉ có đoạn mô tả khi được truyền vào", () => {
  assert.doesNotMatch(veTrong({ bieuTuong: "box", tieuDe: "Trống" }), /tk-empty__text/);
  assert.match(veTrong({ bieuTuong: "box", tieuDe: "Trống", moTa: "Thử lại" }), /tk-empty__text">Thử lại/);
});

test("veLoi: dùng chung bố cục trạng thái rỗng", () => {
  assert.match(veLoi("Không tải được."), /tk-empty__title">Không tải được\./);
});
