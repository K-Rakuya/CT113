import { layCache, luuCache, xoaCache } from "/js/utils.js";

export const KHOA_CACHE_CATALOG = "catalog:v1";

/** trong khoảng này dữ liệu được dùng thẳng, không gọi lại Firestore */
export const TUOI_TOI_DA_MS = 3 * 60 * 1000;

/** quá khoảng này cache bị bỏ; trước đó vẫn được vẽ tạm trong lúc tải bản mới */
export const HAN_DUNG_MS = 30 * 60 * 1000;

/** @returns {{luuLuc: number, sanPham: object[], danhMuc: object[]}|null} */
export const docCatalogCache = () => layCache(KHOA_CACHE_CATALOG);

export const luuCatalogCache = (du) => luuCache(KHOA_CACHE_CATALOG, { ...du, luuLuc: Date.now() }, HAN_DUNG_MS);

export const catalogConTuoi = (dem, bayGio = Date.now()) => Boolean(dem) && bayGio - dem.luuLuc < TUOI_TOI_DA_MS;

export const xoaCacheCatalog = () => xoaCache(KHOA_CACHE_CATALOG);

export const timSanPhamTrongCache = (id) => docCatalogCache()?.sanPham.find((sp) => sp.id === id) ?? null;
