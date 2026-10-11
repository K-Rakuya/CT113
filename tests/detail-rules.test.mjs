import { test } from "node:test";
import assert from "node:assert/strict";
import "./setup.mjs";

const {
  trangThaiBan, kepSoLuong, phanBoSao, sapXepDanhGia, cuaSoDanhGia, kiemTraDanhGia, thongTinMeta, dungJsonLd, GIOI_HAN_NHAN_XET,
} = await import("../js/catalog/detail-rules.js");

const sp = { id: "p1", tenSanPham: "RAM DDR5 16GB", gia: 1500000, soLuongTon: 12, hinhAnh: "/images/ram.jpg", moTa: "Bộ nhớ DDR5 tốc độ cao.", trangThai: "dang_ban" };

test("trangThaiBan: phân loại theo tồn kho và trạng thái bán", () => {
  assert.deepEqual(
    [trangThaiBan(sp), trangThaiBan({ ...sp, soLuongTon: 3 }), trangThaiBan({ ...sp, soLuongTon: 0 })].map((t) => [t.ma, t.muc, t.banDuoc]),
    [["con", "ok", true], ["sap_het", "warn", true], ["het", "out", false]],
  );
  assert.equal(trangThaiBan({ ...sp, trangThai: "ngung_ban" }).banDuoc, false);
  assert.equal(trangThaiBan({ ...sp, trangThai: "ngung_ban" }).ma, "ngung");
  assert.equal(trangThaiBan({ ...sp, trangThai: undefined }).banDuoc, true);
  assert.equal(trangThaiBan(sp).chiTiet, "Còn 12 sản phẩm");
  assert.equal(trangThaiBan({ ...sp, soLuongTon: 3 }).chiTiet, "Chỉ còn 3 sản phẩm");
});

test("kepSoLuong: kẹp vào khoảng 1 đến tồn kho và báo khi vượt tồn", () => {
  assert.deepEqual(kepSoLuong(2, 5), { soLuong: 2, vuotTon: false });
  assert.deepEqual(kepSoLuong(9, 5), { soLuong: 5, vuotTon: true });
  assert.deepEqual(kepSoLuong(0, 5), { soLuong: 1, vuotTon: false });
  assert.deepEqual(kepSoLuong("abc", 5), { soLuong: 1, vuotTon: false });
  assert.deepEqual(kepSoLuong(3.9, 5), { soLuong: 3, vuotTon: false });
  assert.deepEqual(kepSoLuong(2, 0), { soLuong: 0, vuotTon: false });
});

test("phanBoSao: đếm theo từng mức, bỏ giá trị ngoài 1 đến 5", () => {
  const kq = phanBoSao([5, 5, 4, 1, 9, 0, 2.5]);
  assert.equal(kq.soLuot, 4);
  assert.equal(kq.trungBinh, 3.8);
  assert.deepEqual(kq.theoSao.map((m) => [m.sao, m.so]), [[5, 2], [4, 1], [3, 0], [2, 0], [1, 1]]);
  assert.equal(kq.theoSao[0].tyLe, 0.5);
});

test("phanBoSao: chưa có đánh giá thì mọi tỷ lệ bằng 0", () => {
  const kq = phanBoSao([]);
  assert.equal(kq.soLuot, 0);
  assert.ok(kq.theoSao.every((m) => m.so === 0 && m.tyLe === 0));
});

test("sapXepDanhGia và cuaSoDanhGia: mới nhất trước, hiện từng đợt", () => {
  const ds = [{ id: "a", ngayDanhGia: 1 }, { id: "b", ngayDanhGia: { toMillis: () => 3 } }, { id: "c" }, { id: "d", ngayDanhGia: 2 }];
  const dung = sapXepDanhGia(ds);
  assert.deepEqual(dung.map((d) => d.id), ["b", "d", "a", "c"]);
  assert.deepEqual(ds.map((d) => d.id), ["a", "b", "c", "d"]);
  const cua = cuaSoDanhGia(dung, 3);
  assert.deepEqual([cua.muc.length, cua.conLai], [3, 1]);
  assert.deepEqual(cuaSoDanhGia(dung, 10), { muc: dung, conLai: 0 });
});

test("kiemTraDanhGia: chuẩn hoá và báo lỗi từng trường", () => {
  const tot = kiemTraDanhGia({ soSao: "4", noiDung: "  Chạy ổn định.  " });
  assert.equal(tot.hopLe, true);
  assert.deepEqual(tot.giaTri, { soSao: 4, noiDung: "Chạy ổn định." });

  const thieu = kiemTraDanhGia({ soSao: "", noiDung: "   " });
  assert.equal(thieu.hopLe, false);
  assert.ok(thieu.loi.soSao && thieu.loi.noiDung);

  assert.ok(kiemTraDanhGia({ soSao: 6, noiDung: "ok" }).loi.soSao);
  assert.ok(kiemTraDanhGia({ soSao: 5, noiDung: "a".repeat(GIOI_HAN_NHAN_XET + 1) }).loi.noiDung);
  assert.equal(kiemTraDanhGia({ soSao: 5, noiDung: "a".repeat(GIOI_HAN_NHAN_XET) }).hopLe, true);
});

test("thongTinMeta: tiêu đề, giá, tình trạng và đoạn mô tả được cắt gọn", () => {
  const m = thongTinMeta(sp, { giaChu: "1.500.000 ₫", tenCuaHang: "Cửa hàng" });
  assert.equal(m.tieuDe, "RAM DDR5 16GB — Cửa hàng");
  assert.equal(m.moTa, "RAM DDR5 16GB, giá 1.500.000 ₫. Còn hàng. Bộ nhớ DDR5 tốc độ cao.");
  const dai = thongTinMeta({ ...sp, moTa: "từ ".repeat(100) }, { giaChu: "1 ₫", tenCuaHang: "X" });
  assert.ok(dai.moTa.length < 200);
  assert.doesNotMatch(thongTinMeta({ ...sp, moTa: "" }, { giaChu: "1 ₫", tenCuaHang: "X" }).moTa, /\s$/);
});

test("dungJsonLd: có giá, tình trạng, ảnh tuyệt đối và chỉ có xếp hạng khi đã có đánh giá", () => {
  const url = "https://shop.example/product-detail.html?id=p1";
  const ld = dungJsonLd(sp, { url, tenDanhMuc: "RAM" });
  assert.equal(ld["@type"], "Product");
  assert.equal(ld.offers.price, 1500000);
  assert.equal(ld.offers.priceCurrency, "VND");
  assert.equal(ld.offers.availability, "https://schema.org/InStock");
  assert.deepEqual(ld.image, ["https://shop.example/images/ram.jpg"]);
  assert.equal(ld.category, "RAM");
  assert.equal(ld.aggregateRating, undefined);

  const co = dungJsonLd(sp, { url, tomTat: { soLuot: 3, trungBinh: 4.3 } });
  assert.deepEqual(co.aggregateRating, { "@type": "AggregateRating", ratingValue: 4.3, reviewCount: 3, bestRating: 5, worstRating: 1 });

  assert.equal(dungJsonLd({ ...sp, soLuongTon: 0 }, { url }).offers.availability, "https://schema.org/OutOfStock");
  assert.equal(dungJsonLd({ ...sp, trangThai: "ngung_ban" }, { url }).offers.availability, "https://schema.org/Discontinued");
  assert.equal(dungJsonLd({ ...sp, hinhAnh: "" }, { url }).image, undefined);
});
