import { db } from "/js/firebase-config.js";
import { layCache, luuCache } from "/js/utils.js";
import { laEmailHopLe, laHotlineHopLe, lienKetBanDo, lienKetDienThoai } from "/js/store-rules.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const KHOA_CACHE = "cuahang:v1";
const TTL_CACHE = 10 * 60 * 1000;
const TRUONG = ["ten", "slogan", "diaChi", "hotline", "email", "gioMoCua"];

const chuoi = (v) => (typeof v === "string" ? v.trim() : "");

async function taiThongTin() {
  const dem = layCache(KHOA_CACHE);
  if (dem) return dem;
  try {
    const snap = await getDoc(doc(db, "cauhinh", "chung"));
    const x = snap.exists() ? snap.data() : {};
    const thongTin = Object.fromEntries(TRUONG.map((k) => [k, chuoi(x[k])]));
    if (!laHotlineHopLe(thongTin.hotline)) thongTin.hotline = "";
    if (!laEmailHopLe(thongTin.email)) thongTin.email = "";
    luuCache(KHOA_CACHE, thongTin, TTL_CACHE);
    return thongTin;
  } catch (err) {
    console.error("Không tải được thông tin cửa hàng:", err);
    return null;
  }
}

function ap(thongTin) {
  document.querySelectorAll("[data-cua-hang]").forEach((el) => {
    const v = thongTin[el.dataset.cuaHang];
    if (v) el.textContent = v;
  });
  const logo = document.querySelector(".site-header__logo");
  if (logo && thongTin.ten) logo.textContent = thongTin.ten;
  document.querySelectorAll("[data-cua-hang-khoi]").forEach((el) => (el.hidden = !thongTin[el.dataset.cuaHangKhoi]));
  const dienThoai = document.querySelector('[data-cua-hang="hotline"]');
  if (dienThoai?.tagName === "A" && thongTin.hotline) dienThoai.href = lienKetDienThoai(thongTin.hotline);
  const diaChi = document.querySelector('[data-cua-hang="diaChi"]');
  if (diaChi?.tagName === "A" && thongTin.diaChi) diaChi.href = lienKetBanDo(thongTin.diaChi);
  const thu = document.querySelector('[data-cua-hang="email"]');
  if (thu?.tagName === "A" && thongTin.email) thu.href = `mailto:${thongTin.email}`;
  const lienHe = document.querySelector(".site-footer__contact");
  if (lienHe) lienHe.hidden = ["diaChi", "hotline", "email", "gioMoCua"].every((k) => !thongTin[k]);
}

const thongTin = await taiThongTin();
if (thongTin) ap(thongTin);
