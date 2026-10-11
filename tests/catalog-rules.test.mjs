import { test } from "node:test";
import assert from "node:assert/strict";
import "./setup.mjs";

const {
  docBoLoc, ghiBoLoc, locSanPham, demTheoDanhMuc, phanTrang, cuaSoTrang, chiaMucGia, dinhDangGiaGon,
  chipBoLoc, boLocKhiGo, boLocKhiXoaHet, nhanSanPham, chuKyDanhSach, BO_LOC_MAC_DINH,
  chuanHoaKhoangGia, tieuDeTrang, mucGiaDangChon, khoangHienThi,
} = await import("../js/catalog/catalog-rules.js");

const NGAY = 86400000;
const sp = (id, ten, gia, ton, dm, ngayTao = 0) => ({ id, tenSanPham: ten, gia, soLuongTon: ton, danhMucId: dm, ngayTao, trangThai: "dang_ban" });
const MAU = [
  sp("a", "Chip Ryzen 5 5600", 3200000, 10, "cpu", 3),
  sp("b", "Card đồ hoạ RTX 4060", 8900000, 0, "vga", 2),
  sp("c", "RAM DDR5 16GB", 1500000, 4, "ram", 1),
  sp("d", "Chip Core i5 12400F", 3500000, 7, "cpu", 4),
];

test("docBoLoc: chuẩn hoá tham số và thay giá trị sai bằng mặc định", () => {
  assert.deepEqual(docBoLoc(""), BO_LOC_MAC_DINH);
  const b = docBoLoc("?tukhoa=%20ram%20&giatu=abc&giaden=-5&sapxep=toString&trang=0&conhang=1");
  assert.equal(b.tuKhoa, "ram");
  assert.equal(b.giaTu, null);
  assert.equal(b.giaDen, null);
  assert.equal(b.sapXep, "mac_dinh");
  assert.equal(b.trang, 1);
  assert.equal(b.conHang, true);
});

test("docBoLoc: đổi chỗ khi giá từ lớn hơn giá đến", () => {
  const b = docBoLoc("?giatu=5000000&giaden=1000000");
  assert.deepEqual([b.giaTu, b.giaDen], [1000000, 5000000]);
});

test("ghiBoLoc: bỏ giá trị mặc định và đọc lại được đúng như cũ", () => {
  assert.equal(ghiBoLoc(BO_LOC_MAC_DINH), "");
  const b = { tuKhoa: "chip", danhMuc: "cpu", giaTu: 0, giaDen: 4000000, sapXep: "gia_tang", conHang: true, trang: 3 };
  assert.deepEqual(docBoLoc(`?${ghiBoLoc(b)}`), b);
});

test("locSanPham: lọc theo từ khoá không dấu, danh mục, khoảng giá, còn hàng và sắp xếp", () => {
  const dung = (b) => locSanPham(MAU, { ...BO_LOC_MAC_DINH, ...b }).map((x) => x.id);
  assert.deepEqual(dung({ tuKhoa: "do hoa" }), ["b"]);
  assert.deepEqual(dung({ danhMuc: "cpu", sapXep: "gia_giam" }), ["d", "a"]);
  assert.deepEqual(dung({ giaTu: 3200000, giaDen: 3500000, sapXep: "gia_tang" }), ["a", "d"]);
  assert.deepEqual(dung({ conHang: true, sapXep: "ten_az" }), ["d", "a", "c"]);
  assert.deepEqual(dung({ sapXep: "moi_nhat" }), ["d", "a", "b", "c"]);
});

test("demTheoDanhMuc: bỏ qua tiêu chí danh mục nhưng giữ các tiêu chí khác", () => {
  const dem = demTheoDanhMuc(MAU, { ...BO_LOC_MAC_DINH, danhMuc: "ram", conHang: true });
  assert.deepEqual([...dem].sort(), [["cpu", 2], ["ram", 1]]);
});

test("phanTrang: kẹp trang vào khoảng hợp lệ", () => {
  const ds = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual(phanTrang(ds, 3, 10).muc, [20, 21, 22, 23, 24]);
  assert.equal(phanTrang(ds, 99, 10).trang, 3);
  assert.equal(phanTrang(ds, -4, 10).trang, 1);
  assert.deepEqual(phanTrang([], 1, 10), { muc: [], tong: 0, trang: 1, tongTrang: 1 });
});

test("cuaSoTrang: rút gọn bằng dấu … và không để dấu … thay cho đúng một trang", () => {
  assert.deepEqual(cuaSoTrang(1, 1), [1]);
  assert.deepEqual(cuaSoTrang(1, 5), [1, 2, "…", 5]);
  assert.deepEqual(cuaSoTrang(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(cuaSoTrang(10, 20), [1, "…", 9, 10, 11, "…", 20]);
  assert.deepEqual(cuaSoTrang(20, 20), [1, "…", 19, 20]);
  assert.deepEqual(cuaSoTrang(1, 0), []);
});

test("dinhDangGiaGon: rút gọn theo triệu và nghìn", () => {
  assert.equal(dinhDangGiaGon(1500000), "1,5 triệu");
  assert.equal(dinhDangGiaGon(3000000), "3 triệu");
  assert.equal(dinhDangGiaGon(450000), "450 nghìn");
  assert.equal(dinhDangGiaGon(900), "900 ₫");
});

test("chiaMucGia: chia theo tứ phân vị với mốc tăng dần và bao phủ hai đầu", () => {
  const gia = [300, 500, 700, 900, 1500, 2500, 3200, 3500, 6000, 9000, 12000, 20000].map((x) => x * 1000);
  const muc = chiaMucGia(gia);
  assert.ok(muc.length >= 3);
  assert.equal(muc[0].tu, null);
  assert.equal(muc.at(-1).den, null);
  for (let i = 1; i < muc.length; i++) assert.equal(muc[i].tu, muc[i - 1].den);
  const moc = muc.slice(0, -1).map((m) => m.den);
  assert.deepEqual(moc, [...moc].sort((a, b) => a - b));
  assert.match(muc[0].nhan, /^Dưới /);
  assert.match(muc.at(-1).nhan, /^Trên /);
});

test("chiaMucGia: quá ít sản phẩm thì không chia", () => {
  assert.deepEqual(chiaMucGia([1000000, 2000000, 3000000]), []);
  assert.deepEqual(chiaMucGia([]), []);
});

test("chipBoLoc và boLocKhiGo: mỗi chip gỡ đúng một tiêu chí và về trang 1", () => {
  const b = { ...BO_LOC_MAC_DINH, tuKhoa: "chip", danhMuc: "cpu", giaTu: 1000000, giaDen: null, conHang: true, trang: 4 };
  const chip = chipBoLoc(b, "CPU");
  assert.deepEqual(chip.map((c) => c.khoa), ["tuKhoa", "danhMuc", "gia", "conHang"]);
  assert.equal(chip[2].nhan, "Từ 1 triệu");
  const sau = boLocKhiGo(b, "gia");
  assert.deepEqual([sau.giaTu, sau.giaDen, sau.trang, sau.danhMuc], [null, null, 1, "cpu"]);
  assert.equal(boLocKhiGo(b, "conHang").conHang, false);
  assert.deepEqual(chipBoLoc(BO_LOC_MAC_DINH, ""), []);
});

test("boLocKhiXoaHet: giữ kiểu sắp xếp", () => {
  const b = { ...BO_LOC_MAC_DINH, tuKhoa: "x", sapXep: "gia_tang", trang: 2 };
  assert.deepEqual(boLocKhiXoaHet(b), { ...BO_LOC_MAC_DINH, sapXep: "gia_tang" });
});

test("nhanSanPham: tồn kho được ưu tiên hơn nhãn mới", () => {
  const bayGio = 100 * NGAY;
  assert.equal(nhanSanPham({ soLuongTon: 0, ngayTao: bayGio }, bayGio), "het");
  assert.equal(nhanSanPham({ soLuongTon: 3, ngayTao: bayGio }, bayGio), "sap_het");
  assert.equal(nhanSanPham({ soLuongTon: 30, ngayTao: bayGio - 2 * NGAY }, bayGio), "moi");
  assert.equal(nhanSanPham({ soLuongTon: 30, ngayTao: bayGio - 60 * NGAY }, bayGio), null);
});

test("chuKyDanhSach: đổi khi giá hoặc tồn kho đổi", () => {
  const a = chuKyDanhSach(MAU);
  assert.equal(a, chuKyDanhSach([...MAU]));
  assert.notEqual(a, chuKyDanhSach(MAU.map((x) => (x.id === "a" ? { ...x, soLuongTon: 9 } : x))));
});

test("chuanHoaKhoangGia: bỏ giá sai, đổi chỗ hai đầu ngược nhau", () => {
  assert.deepEqual(chuanHoaKhoangGia("", "abc"), { giaTu: null, giaDen: null });
  assert.deepEqual(chuanHoaKhoangGia("0", "2500.9"), { giaTu: 0, giaDen: 2500 });
  assert.deepEqual(chuanHoaKhoangGia("9", "3"), { giaTu: 3, giaDen: 9 });
});

test("tieuDeTrang: từ khoá thắng danh mục, mặc định là Sản phẩm", () => {
  assert.equal(tieuDeTrang({ ...BO_LOC_MAC_DINH, tuKhoa: "ram", danhMuc: "ram" }, "RAM"), "Kết quả cho “ram”");
  assert.equal(tieuDeTrang({ ...BO_LOC_MAC_DINH, danhMuc: "ram" }, "RAM"), "RAM");
  assert.equal(tieuDeTrang({ ...BO_LOC_MAC_DINH, danhMuc: "xoa" }, undefined), "Sản phẩm");
  assert.equal(tieuDeTrang(BO_LOC_MAC_DINH, undefined), "Sản phẩm");
});

test("mucGiaDangChon: khớp đúng cả hai đầu", () => {
  const muc = { tu: 1000000, den: 3000000, nhan: "" };
  assert.equal(mucGiaDangChon(muc, { ...BO_LOC_MAC_DINH, giaTu: 1000000, giaDen: 3000000 }), true);
  assert.equal(mucGiaDangChon(muc, { ...BO_LOC_MAC_DINH, giaTu: 1000000, giaDen: null }), false);
  assert.equal(mucGiaDangChon({ tu: null, den: 5, nhan: "" }, BO_LOC_MAC_DINH), false);
});

test("khoangHienThi: trang cuối chỉ đếm tới tổng", () => {
  assert.deepEqual(khoangHienThi(1, 12, 30), { tu: 1, den: 12 });
  assert.deepEqual(khoangHienThi(3, 12, 30), { tu: 25, den: 30 });
});
