// js/home/home-cache.js
// -----------------------------------------------------------------------------
// Khoá cache dữ liệu trang chủ (sessionStorage, xem layCache/luuCache trong utils.js).
// Trang nào làm thay đổi tồn kho hoặc danh mục trong cùng tab (vd. đặt hàng) gọi
// xoaCacheTrangChu() để trang chủ tải lại số liệu mới thay vì hiện bản cũ tới 3 phút.
// -----------------------------------------------------------------------------

import { xoaCache } from "/js/utils.js";

export const KHOA_CACHE_TRANG_CHU = "home:v2";

export const xoaCacheTrangChu = () => xoaCache(KHOA_CACHE_TRANG_CHU);
