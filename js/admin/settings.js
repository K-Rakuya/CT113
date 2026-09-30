// admin/settings.js
//
// cauhinh là collection chỉ có ĐÚNG 1 document, id cố định là "chung"
// (theo đúng hợp đồng dữ liệu mục 4 / mục 2 của 2 tài liệu). Vì vậy dùng
// doc(db, "cauhinh", "chung") thay vì addDoc - addDoc sẽ tự sinh ID ngẫu
// nhiên, tạo ra nhiều document thừa mỗi lần lưu, sai với thiết kế.

import { db, storage } from "/js/firebase-config.js";
import { showToast, ghiNhatKy } from "/js/utils.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const CAU_HINH_REF = doc(db, "cauhinh", "chung");
let logoUrlHienTai = "";

async function taiCauHinh() {
  try {
    const snap = await getDoc(CAU_HINH_REF);
    if (!snap.exists()) return; // chưa có cấu hình nào -> để form trống, lần lưu đầu tiên sẽ tạo mới

    const data = snap.data();
    document.getElementById("tenCuaHang").value = data.tenCuaHang || "";
    document.getElementById("soDienThoai").value = data.soDienThoai || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("diaChi").value = data.diaChi || "";

    if (data.logo) {
      logoUrlHienTai = data.logo;
      const preview = document.getElementById("logoPreview");
      preview.src = data.logo;
      preview.hidden = false;
    }
  } catch (err) {
    console.error(err);
    showToast("Không tải được cấu hình: " + err.message, "error");
  }
}

document.getElementById("logoFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // Xem trước ảnh ngay trên trình duyệt bằng URL tạm (chưa upload lên Storage)
  const preview = document.getElementById("logoPreview");
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

document.getElementById("formCauHinh").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Đang lưu...";

  try {
    let logoUrl = logoUrlHienTai;

    const file = document.getElementById("logoFile").files[0];
    if (file) {
      // Đặt tên file cố định "logo" (không random) -> mỗi lần đổi logo mới sẽ
      // GHI ĐÈ lên file cũ trong Storage, tránh rác tích tụ theo thời gian
      const duoiFile = file.name.split(".").pop();
      const logoRef = ref(storage, `cauhinh/logo.${duoiFile}`);
      await uploadBytes(logoRef, file);
      logoUrl = await getDownloadURL(logoRef);
    }

    await setDoc(CAU_HINH_REF, {
      tenCuaHang: document.getElementById("tenCuaHang").value.trim(),
      soDienThoai: document.getElementById("soDienThoai").value.trim(),
      email: document.getElementById("email").value.trim(),
      diaChi: document.getElementById("diaChi").value.trim(),
      logo: logoUrl
    });

    try { await ghiNhatKy("cap_nhat_cau_hinh: cauhinh/chung"); } catch (err) { console.warn(err); }

    showToast("Lưu cấu hình thành công.", "success");
    logoUrlHienTai = logoUrl;
  } catch (err) {
    console.error(err);
    showToast("Lỗi: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Lưu cấu hình";
  }
});

taiCauHinh();
