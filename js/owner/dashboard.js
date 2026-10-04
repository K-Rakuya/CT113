import { db } from "/js/firebase-config.js";
import { escapeHtml, showToast, formatCurrency } from "/js/utils.js";
import { animateNumber } from "/js/motion.js";
import { NGUONG_SAP_HET } from "/js/inventory-rules.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { taiDonHang } from "/js/owner/revenue-data.js";
import { taoKhoang, thongKeDon } from "/js/owner/revenue-metrics.js";

async function hienDoanhThu() {
  try {
    const khoang = taoKhoang("30");
    const thongKe = thongKeDon(await taiDonHang(khoang.tu, khoang.den), khoang.tu, khoang.den);
    animateNumber(document.getElementById("stat-doanh-thu"), thongKe.doanhThu, { from: 0, format: formatCurrency });
    animateNumber(document.getElementById("stat-cho-xu-ly"), thongKe.choXuLy, { from: 0 });
  } catch (err) {
    console.error("Lỗi tải doanh thu tổng quan:", err);
  }
}

export async function khoiTao() {
  hienDoanhThu();
  try {
    const snap = await getDocs(collection(db, "sanpham"));
    const ds = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const sapHet = ds.filter((sp) => (sp.soLuongTon ?? 0) <= NGUONG_SAP_HET).sort((a, b) => (a.soLuongTon ?? 0) - (b.soLuongTon ?? 0));
    const so = {
      "stat-tong": ds.length,
      "stat-dang-ban": ds.filter((sp) => sp.trangThai === "dang_ban").length,
      "stat-sap-het": sapHet.filter((sp) => (sp.soLuongTon ?? 0) > 0).length,
      "stat-het": sapHet.filter((sp) => (sp.soLuongTon ?? 0) === 0).length,
    };
    Object.entries(so).forEach(([id, n]) => animateNumber(document.getElementById(id), n, { from: 0 }));

    const elBang = document.getElementById("ds-sap-het");
    elBang.innerHTML = sapHet.length
      ? sapHet
          .slice(0, 8)
          .map(
            (sp) => `<tr><td>${escapeHtml(sp.tenSanPham)}</td><td class="qt-num">${sp.soLuongTon ?? 0}</td>
              <td><span class="badge badge--${(sp.soLuongTon ?? 0) === 0 ? "huy" : "cho_duyet"}">${(sp.soLuongTon ?? 0) === 0 ? "Hết hàng" : "Sắp hết"}</span></td></tr>`
          )
          .join("")
      : '<tr><td colspan="3" class="qt-empty">Kho hàng đang ổn định.</td></tr>';
  } catch (err) {
    showToast("Không tải được số liệu tổng quan.", "error");
    console.error("Lỗi dashboard chủ cửa hàng:", err);
  }
}
