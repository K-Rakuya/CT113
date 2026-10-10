import { db } from "/js/firebase-config.js";
import { docCatalogCache, luuCatalogCache, catalogConTuoi } from "/js/catalog/catalog-cache.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

async function taiTuMang() {
  const [sp, dm] = await Promise.all([
    getDocs(query(collection(db, "sanpham"), where("trangThai", "==", "dang_ban"))),
    getDocs(collection(db, "danhmuc")),
  ]);
  const du = {
    sanPham: sp.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        tenSanPham: x.tenSanPham,
        gia: x.gia,
        soLuongTon: x.soLuongTon ?? 0,
        hinhAnh: x.hinhAnh,
        moTa: x.moTa,
        danhMucId: x.danhMucId,
        trangThai: x.trangThai,
        ngayTao: x.ngayTao?.toMillis?.() ?? 0,
      };
    }),
    danhMuc: dm.docs.map((d) => ({ id: d.id, tenDanhMuc: d.data().tenDanhMuc })),
  };
  luuCatalogCache(du);
  return du;
}

/**
 * Tải sản phẩm đang bán và danh mục theo kiểu stale-while-revalidate.
 * Cache còn tươi được trả ngay; cache cũ được trao cho `khiCoBanCu` để vẽ trước, rồi trả bản mới từ mạng.
 * Nếu mạng lỗi mà có cache cũ thì dùng cache cũ.
 * @param {{khiCoBanCu?: (du: {sanPham: object[], danhMuc: object[]}) => void}} [tuyChon]
 * @returns {Promise<{sanPham: object[], danhMuc: object[]}>}
 */
export async function taiCatalog({ khiCoBanCu } = {}) {
  const dem = docCatalogCache();
  if (catalogConTuoi(dem)) return dem;
  if (dem) khiCoBanCu?.(dem);
  try {
    return await taiTuMang();
  } catch (loi) {
    if (dem) return dem;
    throw loi;
  }
}
