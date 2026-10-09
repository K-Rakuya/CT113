import { bieuTuongDanhMuc } from "/js/home/home-rules.js";

export const LOAI_BO_PC = {
  van_phong: "Văn phòng",
  gaming: "Gaming",
  do_hoa: "Đồ hoạ",
  khac: "Khác",
};

const SO_LINH_KIEN_TOI_DA = 20;
const SO_LUONG_TOI_DA = 10;

const soNguyen = (n, macDinh) => (Number.isInteger(Number(n)) && n !== "" && n !== null ? Number(n) : macDinh);

/** @returns tổng giá theo giá hiện tại, số bộ còn bán được và các linh kiện không còn bán */
export function tinhBoPc(bo, sanPhamTheoId) {
  const dong = (bo.linhKien ?? []).map(({ sanPhamId, soLuong }) => {
    const sp = sanPhamTheoId.get(sanPhamId) ?? null;
    const sl = Math.max(1, soNguyen(soLuong, 1));
    return { sanPhamId, soLuong: sl, sanPham: sp, thanhTien: sp ? (sp.gia ?? 0) * sl : 0, soBoToiDa: sp ? Math.floor((sp.soLuongTon ?? 0) / sl) : 0 };
  });
  const khongBan = dong.filter((d) => !d.sanPham || d.sanPham.trangThai !== "dang_ban");
  const hopLe = dong.length > 0 && khongBan.length === 0;
  const soBoCoThe = hopLe ? Math.min(...dong.map((d) => d.soBoToiDa)) : 0;
  return { dong, tong: dong.reduce((t, d) => t + d.thanhTien, 0), hopLe, khongBan, soBoCoThe, conHang: soBoCoThe > 0 };
}

/**
 * @param gioHang Map sanPhamId -> {id, soLuong}
 * @returns {{viec: {sanPhamId: string, docId: string|null, soLuongMoi: number, them: number}[], tongThem: number, duDu: boolean}}
 */
export function keHoachThemGio(tinh, gioHang) {
  if (!tinh.conHang) return { viec: [], tongThem: 0, duDu: false };
  const viec = [];
  let duDu = true;
  for (const d of tinh.dong) {
    const hienCo = gioHang.get(d.sanPhamId);
    const dangCo = hienCo?.soLuong ?? 0;
    const soLuongMoi = Math.min(d.sanPham.soLuongTon ?? 0, dangCo + d.soLuong);
    const them = Math.max(0, soLuongMoi - dangCo);
    if (them < d.soLuong) duDu = false;
    if (them > 0) viec.push({ sanPhamId: d.sanPhamId, docId: hienCo?.id ?? null, soLuongMoi, them });
  }
  return { viec, tongThem: viec.reduce((t, v) => t + v.them, 0), duDu };
}

/** @returns {{loi: string}|{du: object}} */
export function kiemTraBoPc({ ten, loai, moTa, thuTu, linhKien }) {
  const tenSach = String(ten ?? "").trim();
  if (!tenSach) return { loi: "Vui lòng nhập tên bộ PC." };
  if (tenSach.length > 80) return { loi: "Tên bộ PC tối đa 80 ký tự." };
  if (!(loai in LOAI_BO_PC)) return { loi: "Loại bộ PC không hợp lệ." };
  if (String(moTa ?? "").length > 300) return { loi: "Mô tả tối đa 300 ký tự." };
  const thuTuSo = soNguyen(thuTu ?? 0, NaN);
  if (!Number.isInteger(thuTuSo) || thuTuSo < 0) return { loi: "Thứ tự phải là số nguyên không âm." };
  if (!Array.isArray(linhKien) || linhKien.length < 2) return { loi: "Một bộ PC cần ít nhất 2 linh kiện." };
  if (linhKien.length > SO_LINH_KIEN_TOI_DA) return { loi: `Một bộ PC tối đa ${SO_LINH_KIEN_TOI_DA} linh kiện.` };
  const daCo = new Set();
  const dsLinhKien = [];
  for (const { sanPhamId, soLuong } of linhKien) {
    if (!sanPhamId) return { loi: "Có linh kiện chưa chọn sản phẩm." };
    if (daCo.has(sanPhamId)) return { loi: "Mỗi sản phẩm chỉ xuất hiện một lần, hãy tăng số lượng thay vì thêm dòng." };
    daCo.add(sanPhamId);
    const sl = soNguyen(soLuong, NaN);
    if (!Number.isInteger(sl) || sl < 1 || sl > SO_LUONG_TOI_DA) return { loi: `Số lượng mỗi linh kiện từ 1 đến ${SO_LUONG_TOI_DA}.` };
    dsLinhKien.push({ sanPhamId, soLuong: sl });
  }
  return { du: { ten: tenSach, loai, moTa: String(moTa ?? "").trim(), thuTu: thuTuSo, linhKien: dsLinhKien } };
}

const KHE = ["cpu", "mainboard", "ram", "ssd", "psu", "case"];
const MAU = [
  { loai: "van_phong", ten: "PC Văn phòng", moTa: "Cấu hình tiết kiệm cho làm việc, học tập và giải trí nhẹ.", muc: 0, khe: KHE },
  { loai: "gaming", ten: "PC Gaming", moTa: "Cấu hình cân bằng giữa hiệu năng và giá cho chơi game.", muc: 0.6, khe: [...KHE, "vga"] },
  { loai: "do_hoa", ten: "PC Đồ hoạ", moTa: "Cấu hình mạnh cho dựng hình, thiết kế và xử lý nặng.", muc: 1, khe: [...KHE, "vga"] },
];

/**
 * gợi ý bản nháp từ kho: mỗi khe lấy sản phẩm còn hàng theo mức giá, chưa kiểm tra tương thích
 * @returns {{ten: string, loai: string, moTa: string, thuTu: number, hienThi: false, linhKien: {sanPhamId: string, soLuong: number}[]}[]}
 */
export function goiYBoPc(sanPham, danhMuc) {
  const theoKhe = new Map();
  for (const dm of danhMuc) {
    const khe = bieuTuongDanhMuc(dm.tenDanhMuc);
    if (KHE.includes(khe) || khe === "vga") {
      const ds = sanPham.filter((sp) => sp.danhMucId === dm.id && sp.trangThai === "dang_ban" && sp.soLuongTon > 0).sort((a, b) => a.gia - b.gia);
      if (ds.length) theoKhe.set(khe, [...(theoKhe.get(khe) ?? []), ...ds].sort((a, b) => a.gia - b.gia));
    }
  }
  return MAU.filter((m) => m.khe.every((k) => theoKhe.has(k))).map((m, i) => ({
    ten: m.ten,
    loai: m.loai,
    moTa: m.moTa,
    thuTu: i,
    hienThi: false,
    linhKien: m.khe.map((k) => {
      const ds = theoKhe.get(k);
      return { sanPhamId: ds[Math.round(m.muc * (ds.length - 1))].id, soLuong: 1 };
    }),
  }));
}
