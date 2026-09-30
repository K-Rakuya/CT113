// admin/categories.js

import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

async function taiDanhSachDanhMuc() {
  const tbody = document.getElementById("danhMucBody");
  try {
    const snap = await getDocs(collection(db, "danhmuc"));
    const danhMucList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (danhMucList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="qt-empty">Chưa có danh mục nào.</td></tr>`;
      return;
    }

    // Đếm số sản phẩm thuộc mỗi danh mục (song song cho nhanh, không chờ tuần tự)
    const rows = await Promise.all(danhMucList.map(async (dm) => {
      const qSp = query(collection(db, "sanpham"), where("danhMucId", "==", dm.id));
      const spSnap = await getDocs(qSp);
      return { ...dm, soSanPham: spSnap.size };
    }));

    tbody.innerHTML = rows.map(dm => `
      <tr>
        <td>${dm.tenDanhMuc}</td>
        <td>${dm.soSanPham}</td>
        <td>
          <button class="qt-btn-sm" data-action="sua" data-id="${dm.id}" data-ten="${dm.tenDanhMuc}">Sửa</button>
          <button class="qt-btn-sm qt-btn-sm--danger" data-action="xoa" data-id="${dm.id}" data-count="${dm.soSanPham}">Xoá</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll('[data-action="sua"]').forEach(btn => {
      btn.addEventListener("click", () => nhapFormSua(btn.dataset.id, btn.dataset.ten));
    });
    tbody.querySelectorAll('[data-action="xoa"]').forEach(btn => {
      btn.addEventListener("click", () => xoaDanhMuc(btn.dataset.id, Number(btn.dataset.count)));
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="3" class="qt-empty">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function nhapFormSua(id, ten) {
  document.getElementById("formTitle").textContent = "Sửa danh mục";
  document.getElementById("danhMucId").value = id;
  document.getElementById("tenDanhMuc").value = ten;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function lamMoiForm() {
  document.getElementById("formTitle").textContent = "Thêm danh mục mới";
  document.getElementById("formDanhMuc").reset();
  document.getElementById("danhMucId").value = "";
}
document.getElementById("btnHuy").addEventListener("click", lamMoiForm);

document.getElementById("formDanhMuc").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("danhMucId").value;
  const tenDanhMuc = document.getElementById("tenDanhMuc").value.trim();
  if (!tenDanhMuc) return;

  try {
    if (id) {
      await updateDoc(doc(db, "danhmuc", id), { tenDanhMuc });
      await ghiNhatKy(`doi_ten_danh_muc: danhmuc/${id}`);
      showToast("Cập nhật danh mục thành công.", "success");
    } else {
      const docRef = await addDoc(collection(db, "danhmuc"), { tenDanhMuc });
      await ghiNhatKy(`them_danh_muc: danhmuc/${docRef.id}`);
      showToast("Thêm danh mục thành công.", "success");
    }
    lamMoiForm();
    taiDanhSachDanhMuc();
  } catch (err) {
    console.error(err);
    showToast("Lỗi: " + err.message, "error");
  }
});

// Không cho xoá nếu còn sản phẩm thuộc danh mục này - tránh sản phẩm bị "mồ côi"
// (danhMucId trỏ tới 1 document không còn tồn tại nữa)
async function xoaDanhMuc(id, soSanPham) {
  if (soSanPham > 0) {
    showToast(`Không thể xoá: vẫn còn ${soSanPham} sản phẩm thuộc danh mục này.`, "error");
    return;
  }
  if (!confirm("Xoá danh mục này?")) return;

  try {
    await deleteDoc(doc(db, "danhmuc", id));
    await ghiNhatKy(`xoa_danh_muc: danhmuc/${id}`);
    showToast("Đã xoá danh mục.", "success");
    taiDanhSachDanhMuc();
  } catch (err) {
    console.error(err);
    showToast("Lỗi: " + err.message, "error");
  }
}

taiDanhSachDanhMuc();
