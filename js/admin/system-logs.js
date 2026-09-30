// admin/system-logs.js
//
// CHIẾN LƯỢC LỌC: tải sẵn 200 nhật ký gần nhất (đủ dùng cho quy mô đồ án),
// rồi lọc theo ngày/hành động/người thực hiện HOÀN TOÀN Ở PHÍA CLIENT.
// Vì sao không lọc bằng query() của Firestore? Vì hanhDong là chuỗi tự do
// dạng "doi_gia: sanpham/abc123" - Firestore không hỗ trợ tìm kiếm "chứa
// chuỗi con" hiệu quả, phải lọc bằng JavaScript sau khi đã tải về.

import { db } from "/js/firebase-config.js";
import { formatDate } from "/js/utils.js";
import {
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

let danhSachLog = [];
let mapTenNguoiDung = {}; // uid -> hoTen, tra cứu nhanh thay vì gọi Firestore lặp lại cho mỗi dòng log

async function taiTenNguoiDung() {
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => { mapTenNguoiDung[d.id] = d.data().hoTen || d.id; });
}

function layNgayFromTimestamp(thoiGian) {
  // thoiGian là Firestore Timestamp -> đổi sang chuỗi yyyy-mm-dd để so sánh với input type="date"
  if (!thoiGian?.toDate) return "";
  const d = thoiGian.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function taiNhatKy() {
  const tbody = document.getElementById("logBody");
  try {
    await taiTenNguoiDung();

    const q = query(collection(db, "nhatky"), orderBy("thoiGian", "desc"), limit(200));
    const snap = await getDocs(q);
    danhSachLog = snap.docs.map(d => d.data());

    renderBoLocHanhDong();
    renderBoLocNguoiThucHien();
    renderBang();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="3" class="qt-empty">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

// Tự sinh danh sách hành động duy nhất từ dữ liệu thật (lấy phần trước dấu ":") để đổ vào dropdown lọc
function renderBoLocHanhDong() {
  const select = document.getElementById("filterHanhDong");
  const tapHanhDong = new Set(
    danhSachLog.map(l => (l.hanhDong || "").split(":")[0].trim()).filter(Boolean)
  );
  select.innerHTML = `<option value="">-- Tất cả hành động --</option>` +
    [...tapHanhDong].sort().map(hd => `<option value="${hd}">${hd}</option>`).join("");
}

function renderBoLocNguoiThucHien() {
  const select = document.getElementById("filterNguoiThucHien");
  const tapUid = new Set(danhSachLog.map(l => l.nguoiThucHienId).filter(Boolean));
  select.innerHTML = `<option value="">-- Tất cả người thực hiện --</option>` +
    [...tapUid].map(uid => `<option value="${uid}">${mapTenNguoiDung[uid] || uid}</option>`).join("");
}

function renderBang() {
  const tbody = document.getElementById("logBody");
  const ngayLoc = document.getElementById("filterNgay").value;
  const hanhDongLoc = document.getElementById("filterHanhDong").value;
  const nguoiLoc = document.getElementById("filterNguoiThucHien").value;

  const filtered = danhSachLog.filter(l => {
    const khopNgay = !ngayLoc || layNgayFromTimestamp(l.thoiGian) === ngayLoc;
    const khopHanhDong = !hanhDongLoc || (l.hanhDong || "").startsWith(hanhDongLoc);
    const khopNguoi = !nguoiLoc || l.nguoiThucHienId === nguoiLoc;
    return khopNgay && khopHanhDong && khopNguoi;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="qt-empty">Không có nhật ký phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>${formatDate(l.thoiGian)}</td>
      <td>${mapTenNguoiDung[l.nguoiThucHienId] || l.nguoiThucHienId || "—"}</td>
      <td><code>${l.hanhDong}</code></td>
    </tr>
  `).join("");
}

document.getElementById("filterNgay").addEventListener("change", renderBang);
document.getElementById("filterHanhDong").addEventListener("change", renderBang);
document.getElementById("filterNguoiThucHien").addEventListener("change", renderBang);
document.getElementById("btnXoaLoc").addEventListener("click", () => {
  document.getElementById("filterNgay").value = "";
  document.getElementById("filterHanhDong").value = "";
  document.getElementById("filterNguoiThucHien").value = "";
  renderBang();
});

taiNhatKy();
