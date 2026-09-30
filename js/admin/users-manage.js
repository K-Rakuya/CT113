// admin/users-manage.js

import { auth, db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import {
  collection, getDocs, doc, updateDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const VAI_TRO_LABEL = {
  khach_hang: "Khách hàng", nhan_vien: "Nhân viên",
  quan_tri: "Quản trị", chu_cua_hang: "Chủ cửa hàng"
};
const VAI_TRO_LIST = Object.keys(VAI_TRO_LABEL);

let danhSachUser = []; // cache lại để lọc phía client, đỡ phải gọi lại Firestore mỗi lần gõ ô tìm kiếm

// ============================================================
// TẢI & HIỂN THỊ DANH SÁCH
// ============================================================
async function taiDanhSachUser() {
  const tbody = document.getElementById("userBody");
  try {
    const snap = await getDocs(collection(db, "users"));
    danhSachUser = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    renderDanhSach();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="qt-empty">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function renderDanhSach() {
  const tbody = document.getElementById("userBody");
  const keyword = document.getElementById("filterKeyword").value.trim().toLowerCase();
  const vaiTroLoc = document.getElementById("filterVaiTro").value;

  const filtered = danhSachUser.filter(u => {
    const khopTuKhoa = !keyword ||
      (u.hoTen || "").toLowerCase().includes(keyword) ||
      (u.email || "").toLowerCase().includes(keyword);
    const khopVaiTro = !vaiTroLoc || u.vaiTro === vaiTroLoc;
    return khopTuKhoa && khopVaiTro;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="qt-empty">Không có người dùng phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td>${u.hoTen || "(chưa đặt tên)"}</td>
      <td>${u.email || ""}</td>
      <td><span class="badge badge--${u.vaiTro}">${VAI_TRO_LABEL[u.vaiTro] || u.vaiTro}</span></td>
      <td><span class="badge badge--${u.trangThai}">${u.trangThai === "hoat_dong" ? "Hoạt động" : "Đã khoá"}</span></td>
      <td>
        <select data-uid="${u.uid}" class="chonVaiTroMoi">
          <option value="">-- đổi thành --</option>
          ${VAI_TRO_LIST.filter(vt => vt !== u.vaiTro).map(vt => `<option value="${vt}">${VAI_TRO_LABEL[vt]}</option>`).join("")}
        </select>
      </td>
      <td>
        <button class="qt-btn-sm ${u.trangThai === "hoat_dong" ? "qt-btn-sm--danger" : ""}" data-uid="${u.uid}" data-action="toggle-status" data-current="${u.trangThai}">
          ${u.trangThai === "hoat_dong" ? "Khoá" : "Mở khoá"}
        </button>
      </td>
    </tr>
  `).join("");

  // Gắn sự kiện sau khi render (vì render bằng innerHTML nên phải gắn lại mỗi lần)
  tbody.querySelectorAll(".chonVaiTroMoi").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const vaiTroMoi = e.target.value;
      if (!vaiTroMoi) return;
      doiVaiTro(e.target.dataset.uid, vaiTroMoi);
    });
  });
  tbody.querySelectorAll('[data-action="toggle-status"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const trangThaiMoi = btn.dataset.current === "hoat_dong" ? "khoa" : "hoat_dong";
      doiTrangThai(btn.dataset.uid, trangThaiMoi);
    });
  });
}

document.getElementById("filterKeyword").addEventListener("input", renderDanhSach);
document.getElementById("filterVaiTro").addEventListener("change", renderDanhSach);

// ============================================================
// ĐỔI VAI TRÒ
// ============================================================
async function doiVaiTro(uid, vaiTroMoi) {
  // Chặn admin tự đổi vai trò của chính mình -> tránh tự khoá quyền quản trị của bản thân giữa chừng
  if (uid === auth.currentUser?.uid) {
    showToast("Bạn không thể tự đổi vai trò của chính mình.", "error");
    renderDanhSach(); // vẽ lại để reset dropdown về trạng thái cũ
    return;
  }
  if (!confirm(`Đổi vai trò người dùng này thành "${VAI_TRO_LABEL[vaiTroMoi]}"?`)) {
    renderDanhSach();
    return;
  }
  try {
    await updateDoc(doc(db, "users", uid), { vaiTro: vaiTroMoi });
    try { await ghiNhatKy(`doi_vai_tro: users/${uid}`); } catch (e) { console.warn("Không ghi được nhật ký:", e); }
    showToast("Đổi vai trò thành công.", "success");
    await taiDanhSachUser();
  } catch (err) {
    console.error(err);
    showToast("Lỗi: " + err.message, "error");
  }
}

// ============================================================
// KHOÁ / MỞ KHOÁ TÀI KHOẢN
// ============================================================
async function doiTrangThai(uid, trangThaiMoi) {
  if (uid === auth.currentUser?.uid) {
    showToast("Bạn không thể tự khoá tài khoản của chính mình.", "error");
    return;
  }
  const hanhDongText = trangThaiMoi === "khoa" ? "khoá" : "mở khoá";
  if (!confirm(`Xác nhận ${hanhDongText} tài khoản này?`)) return;

  try {
    await updateDoc(doc(db, "users", uid), { trangThai: trangThaiMoi });
    try {
      await ghiNhatKy(`${trangThaiMoi === "khoa" ? "khoa_tai_khoan" : "mo_khoa_tai_khoan"}: users/${uid}`);
    } catch (e) { console.warn("Không ghi được nhật ký:", e); }
    showToast(`Đã ${hanhDongText} tài khoản.`, "success");
    await taiDanhSachUser();
  } catch (err) {
    console.error(err);
    showToast("Lỗi: " + err.message, "error");
  }
}

// ============================================================
// TẠO TÀI KHOẢN MỚI (nhân viên / quản trị / chủ cửa hàng)
//
// VÌ SAO PHẢI DÙNG "SECONDARY APP" (app phụ)?
// createUserWithEmailAndPassword() sẽ TỰ ĐỘNG đăng nhập luôn vào tài khoản
// vừa tạo trên cùng 1 phiên Auth. Nếu dùng trực tiếp `auth` chính (biến import
// từ firebase-config.js), Admin đang thao tác sẽ BỊ ĐĂNG XUẤT khỏi tài khoản
// của mình và tự động đăng nhập vào tài khoản nhân viên vừa tạo - rất nguy hiểm
// và gây khó hiểu. Giải pháp: tạo 1 app Firebase "phụ" (secondary), dùng app đó
// để tạo tài khoản Auth, còn phiên đăng nhập chính (auth) của Admin không đổi.
//
// Lấy lại đúng config dự án bằng auth.app.options — nhờ vậy không cần sửa
// firebase-config.js để export thêm config thô (giữ đúng quy tắc "không sửa
// file chung" của nhóm).
// ============================================================
async function taoTaiKhoanMoi(e) {
  e.preventDefault();
  const hoTen = document.getElementById("taoHoTen").value.trim();
  const email = document.getElementById("taoEmail").value.trim();
  const matKhau = document.getElementById("taoMatKhau").value;
  const vaiTro = document.getElementById("taoVaiTro").value;

  const configGoc = auth.app.options;
  const appPhu = initializeApp(configGoc, "secondary-" + Date.now()); // tên duy nhất, tránh trùng nếu tạo nhiều lần
  const authPhu = getAuth(appPhu);

  try {
    const result = await createUserWithEmailAndPassword(authPhu, email, matKhau);
    const uidMoi = result.user.uid;

    // Ghi document users/{uid} bằng `db` CHÍNH (vẫn đang đăng nhập là Admin)
    // -> firestore.rules kiểm tra request.auth chính là Admin, đúng quyền ghi.
    await setDoc(doc(db, "users", uidMoi), {
      hoTen, email,
      soDienThoai: "", diaChi: "",
      vaiTro, trangThai: "hoat_dong",
      chucVu: vaiTro === "nhan_vien" ? "" : null,
      luongCoBan: vaiTro === "nhan_vien" ? 0 : null,
      ngayTao: serverTimestamp()
    });

    await signOut(authPhu); // dọn dẹp phiên phụ, không cần giữ lại

    try { await ghiNhatKy(`tao_tai_khoan: users/${uidMoi}`); } catch (err) { console.warn(err); }

    showToast(`Tạo tài khoản "${hoTen}" thành công.`, "success");
    document.getElementById("formTaoUser").reset();
    await taiDanhSachUser();
  } catch (err) {
    console.error(err);
    // Lỗi hay gặp: email đã tồn tại, mật khẩu quá ngắn (Firebase yêu cầu tối thiểu 6 ký tự)
    showToast("Không tạo được tài khoản: " + err.message, "error");
  }
}

document.getElementById("formTaoUser").addEventListener("submit", taoTaiKhoanMoi);

taiDanhSachUser();
