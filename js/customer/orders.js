// Trang customer/orders.html: lịch sử đơn hàng, lọc theo trạng thái (collection donhang).

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast } from "/js/utils.js";
import { swapContent } from "/js/motion.js";
import { BO_LOC_DON, NHAN_TRANG_THAI_DON, demTheoTrangThai, laMaLocHopLe, locDon, maDon } from "/js/customer/order-rules.js";
import { veTrong, veLoi } from "/js/customer/account-view.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elDanhSach = document.getElementById("danh-sach-don-hang");
const elBoLoc = document.getElementById("bo-loc-don");

let tatCaDonHang = [];
let dangLoc = "";

export async function initDonHang() {
  try {
    const q = query(collection(db, "donhang"), where("khachHangId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    tatCaDonHang = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.ngayDat?.toMillis?.() ?? 0) - (a.ngayDat?.toMillis?.() ?? 0));

    const tuUrl = new URLSearchParams(location.search).get("trangthai") ?? "";
    dangLoc = laMaLocHopLe(tuUrl) ? tuUrl : "";

    veBoLoc();
    swapContent(elDanhSach, renderNoiDung);
    elDanhSach.removeAttribute("aria-busy");
  } catch (err) {
    elBoLoc.hidden = true;
    elDanhSach.innerHTML = veLoi("Không tải được đơn hàng.");
    elDanhSach.removeAttribute("aria-busy");
    showToast(err.message, "error");
  }
}

function veBoLoc() {
  elBoLoc.hidden = tatCaDonHang.length === 0;
  const dem = demTheoTrangThai(tatCaDonHang);
  elBoLoc.innerHTML = BO_LOC_DON.map(
    (m) =>
      `<button type="button" class="tk-chip" data-loc="${m.ma}" aria-pressed="${m.ma === dangLoc}">${m.nhan}<span class="tk-chip__n">${dem[m.ma]}</span></button>`
  ).join("");
  elBoLoc.removeAttribute("aria-busy");
}

elBoLoc.addEventListener("click", (e) => {
  const nut = e.target.closest("[data-loc]");
  if (!nut || nut.dataset.loc === dangLoc) return;
  dangLoc = nut.dataset.loc;
  elBoLoc.querySelectorAll("[data-loc]").forEach((n) => n.setAttribute("aria-pressed", String(n.dataset.loc === dangLoc)));

  const url = new URL(location.href);
  if (dangLoc) url.searchParams.set("trangthai", dangLoc);
  else url.searchParams.delete("trangthai");
  history.replaceState(null, "", url);

  swapContent(elDanhSach, renderNoiDung);
});

function renderNoiDung() {
  if (tatCaDonHang.length === 0) {
    elDanhSach.innerHTML = veTrong({
      bieuTuong: "receipt",
      tieuDe: "Bạn chưa có đơn hàng nào",
      moTa: "Khi đặt hàng, đơn sẽ xuất hiện tại đây để bạn theo dõi.",
      hanhDong: { href: "/product-list.html", nhan: "Mua sắm ngay" },
    });
    return;
  }

  const danhSach = locDon(tatCaDonHang, dangLoc);
  if (danhSach.length === 0) {
    elDanhSach.innerHTML = veTrong({ bieuTuong: "receipt", tieuDe: "Không có đơn hàng ở trạng thái này" });
    return;
  }

  elDanhSach.innerHTML = danhSach
    .map(
      (d, i) => `
    <a href="/customer/order-detail.html?id=${encodeURIComponent(d.id)}" class="tk-order motion-enter" style="--i:${i}">
      <div class="tk-order__main">
        <span class="tk-order__code">Đơn ${maDon(d.id)}</span>
        <span class="tk-order__date">${formatDate(d.ngayDat)}</span>
      </div>
      <div class="tk-order__side">
        <span class="tk-order__total">${formatCurrency(d.tongTien)}</span>
        <span class="badge badge--${d.trangThai}">${NHAN_TRANG_THAI_DON[d.trangThai] || d.trangThai}</span>
      </div>
    </a>`
    )
    .join("");
}
