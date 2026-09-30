// admin/dashboard.js
// Trang tổng quan: đếm tổng users/donhang/sanpham + phân bố theo vaiTro / trangThai.
//
// VÌ SAO DÙNG getCountFromServer() THAY VÌ getDocs().size ?
// getDocs() phải tải TOÀN BỘ document về máy rồi mới đếm được -> tốn băng thông
// và bị tính phí đọc theo SỐ DOCUMENT thực tải. getCountFromServer() nhờ Firestore
// đếm sẵn ở server và chỉ trả về 1 con số -> nhanh hơn và rẻ hơn (Firestore tính
// phí đọc "count" rẻ hơn nhiều so với đọc từng document).

import { db } from "/js/firebase-config.js";
import { showToast } from "/js/utils.js";
import {
  collection, query, where, getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const VAI_TRO_LIST = ["khach_hang", "nhan_vien", "quan_tri", "chu_cua_hang"];
const VAI_TRO_LABEL = {
  khach_hang: "Khách hàng", nhan_vien: "Nhân viên",
  quan_tri: "Quản trị", chu_cua_hang: "Chủ cửa hàng"
};

const DON_HANG_STATUS_LIST = ["cho_duyet", "dang_giao", "hoan_thanh", "huy"];
const DON_HANG_STATUS_LABEL = {
  cho_duyet: "Chờ duyệt", dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành", huy: "Đã huỷ"
};

async function demTong(tenCollection) {
  const snap = await getCountFromServer(collection(db, tenCollection));
  return snap.data().count;
}

async function demTheoDieuKien(tenCollection, field, value) {
  const q = query(collection(db, tenCollection), where(field, "==", value));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

async function taiThongKeTong() {
  try {
    const [soUser, soDon, soSanPham] = await Promise.all([
      demTong("users"),
      demTong("donhang"),
      demTong("sanpham")
    ]);
    document.getElementById("statUsers").textContent = soUser;
    document.getElementById("statOrders").textContent = soDon;
    document.getElementById("statProducts").textContent = soSanPham;
  } catch (err) {
    console.error(err);
    showToast("Không tải được số liệu tổng quan: " + err.message, "error");
  }
}

async function taiThongKeTheoVaiTro() {
  const tbody = document.querySelector("#roleTable tbody");
  try {
    const rows = await Promise.all(
      VAI_TRO_LIST.map(async (vt) => ({
        vaiTro: vt,
        soLuong: await demTheoDieuKien("users", "vaiTro", vt)
      }))
    );
    tbody.innerHTML = rows.map(r => `
      <tr><td>${VAI_TRO_LABEL[r.vaiTro]}</td><td>${r.soLuong}</td></tr>
    `).join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2" class="qt-empty">Lỗi tải dữ liệu.</td></tr>`;
  }
}

async function taiThongKeTheoTrangThaiDon() {
  const tbody = document.querySelector("#orderStatusTable tbody");
  try {
    const rows = await Promise.all(
      DON_HANG_STATUS_LIST.map(async (tt) => ({
        trangThai: tt,
        soLuong: await demTheoDieuKien("donhang", "trangThai", tt)
      }))
    );
    tbody.innerHTML = rows.map(r => `
      <tr><td><span class="badge badge--${r.trangThai}">${DON_HANG_STATUS_LABEL[r.trangThai]}</span></td><td>${r.soLuong}</td></tr>
    `).join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2" class="qt-empty">Lỗi tải dữ liệu.</td></tr>`;
  }
}

taiThongKeTong();
taiThongKeTheoVaiTro();
taiThongKeTheoTrangThaiDon();
