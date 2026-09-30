// js/admin/categories.js
// Quản trị danh mục sản phẩm (CRUD chi tiết, thống kê, tìm kiếm, lọc, modal chi tiết sản phẩm)

import { db } from "/js/firebase-config.js";
import { showToast, ghiNhatKy, formatCurrency, formatDate } from "/js/utils.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Biến lưu trữ dữ liệu danh mục cục bộ để tìm kiếm / lọc / sắp xếp nhanh
let danhSachDanhMuc = [];
let danhSachHienThi = [];

/**
 * Hàm chuyển đổi chuỗi tiếng Việt có dấu thành slug URL thân thiện
 * @param {string} str 
 * @returns {string}
 */
function taoSlug(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Tải toàn bộ danh mục sản phẩm và thống kê từ Firestore
 */
async function taiDanhSachDanhMuc() {
  const tbody = document.getElementById("danhMucBody");
  tbody.innerHTML = `<tr><td colspan="7" class="qt-empty">Đang tải danh sách danh mục...</td></tr>`;

  try {
    const snap = await getDocs(collection(db, "danhmuc"));
    const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Đếm số sản phẩm thuộc từng danh mục song song qua getCountFromServer
    const rows = await Promise.all(rawList.map(async (dm) => {
      try {
        const qSp = query(collection(db, "sanpham"), where("danhMucId", "==", dm.id));
        const countSnap = await getCountFromServer(qSp);
        return { ...dm, soSanPham: countSnap.data().count };
      } catch (err) {
        console.warn(`Lỗi đếm sản phẩm cho danh mục ${dm.id}:`, err);
        return { ...dm, soSanPham: 0 };
      }
    }));

    danhSachDanhMuc = rows;
    capNhatThongKeTongQuan();
    apDungBoLocVaSapXep();
  } catch (err) {
    console.error("Lỗi khi tải danh mục:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="qt-empty">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
    showToast("Không thể tải danh sách danh mục: " + err.message, "error");
  }
}

/**
 * Cập nhật các thẻ thống kê tổng quan danh mục
 */
function capNhatThongKeTongQuan() {
  const tongDanhMuc = danhSachDanhMuc.length;
  const hoatDong = danhSachDanhMuc.filter(dm => dm.trangThai !== "an").length;
  const tamAn = tongDanhMuc - hoatDong;
  const tongSanPham = danhSachDanhMuc.reduce((acc, cur) => acc + (cur.soSanPham || 0), 0);

  const elTong = document.getElementById("statTongDanhMuc");
  const elHoatDong = document.getElementById("statDanhMucHoatDong");
  const elAn = document.getElementById("statDanhMucAn");
  const elSp = document.getElementById("statTongSanPham");

  if (elTong) elTong.textContent = tongDanhMuc;
  if (elHoatDong) elHoatDong.textContent = hoatDong;
  if (elAn) elAn.textContent = tamAn;
  if (elSp) elSp.textContent = tongSanPham;
}

/**
 * Lọc và sắp xếp danh sách danh mục theo các tiêu chí trên giao diện
 */
function apDungBoLocVaSapXep() {
  const tuKhoa = (document.getElementById("filterTuKhoa")?.value || "").toLowerCase().trim();
  const trangThai = document.getElementById("filterTrangThai")?.value || "";
  const sapXep = document.getElementById("filterSapXep")?.value || "thuTu_asc";

  let ketQua = danhSachDanhMuc.filter(dm => {
    // Lọc theo từ khóa (tên danh mục, slug, mô tả, icon)
    if (tuKhoa) {
      const ten = (dm.tenDanhMuc || "").toLowerCase();
      const slug = (dm.slug || "").toLowerCase();
      const moTa = (dm.moTa || "").toLowerCase();
      const icon = (dm.icon || "").toLowerCase();
      if (!ten.includes(tuKhoa) && !slug.includes(tuKhoa) && !moTa.includes(tuKhoa) && !icon.includes(tuKhoa)) {
        return false;
      }
    }

    // Lọc theo trạng thái
    if (trangThai === "hoat_dong") {
      if (dm.trangThai === "an") return false;
    } else if (trangThai === "an") {
      if (dm.trangThai !== "an") return false;
    }

    return true;
  });

  // Sắp xếp
  ketQua.sort((a, b) => {
    switch (sapXep) {
      case "thuTu_asc":
        return Number(a.thuTu ?? 999) - Number(b.thuTu ?? 999);
      case "ten_asc":
        return (a.tenDanhMuc || "").localeCompare(b.tenDanhMuc || "", "vi");
      case "ten_desc":
        return (b.tenDanhMuc || "").localeCompare(a.tenDanhMuc || "", "vi");
      case "sanpham_desc":
        return (b.soSanPham ?? 0) - (a.soSanPham ?? 0);
      case "ngay_desc": {
        const timeA = a.ngayTao?.toDate?.()?.getTime() || 0;
        const timeB = b.ngayTao?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      }
      default:
        return 0;
    }
  });

  danhSachHienThi = ketQua;
  renderBangDanhMuc();
}

/**
 * Vẽ bảng danh mục ra giao diện
 */
function renderBangDanhMuc() {
  const tbody = document.getElementById("danhMucBody");
  if (!tbody) return;

  if (danhSachHienThi.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="qt-empty">Không tìm thấy danh mục nào phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = danhSachHienThi.map((dm, idx) => {
    const isAn = dm.trangThai === "an";
    const badgeStatus = isAn
      ? `<span class="badge badge--khoa">⚪ Tạm ẩn</span>`
      : `<span class="badge badge--hoat_dong">🟢 Hiển thị</span>`;

    const iconStr = dm.icon ? dm.icon : "📁";
    const slugStr = dm.slug ? dm.slug : dm.id;
    const moTaStr = dm.moTa ? dm.moTa : `<span class="text-muted">Chưa có mô tả</span>`;
    const ngayHienThi = formatDate(dm.ngayCapNhat || dm.ngayTao) || "—";
    const thuTu = dm.thuTu !== undefined ? dm.thuTu : (idx + 1);

    return `
      <tr>
        <td><span class="qt-code">#${thuTu}</span></td>
        <td>
          <div class="qt-category-name">
            <span class="qt-category-icon">${iconStr}</span>
            <div>
              <strong>${dm.tenDanhMuc}</strong>
              <div><span class="qt-code">/${slugStr}</span></div>
            </div>
          </div>
        </td>
        <td style="max-width: 250px; white-space: normal;">${moTaStr}</td>
        <td>
          <button type="button" class="qt-badge-count" data-action="xem-sp" data-id="${dm.id}" title="Xem sản phẩm thuộc danh mục">
            ${dm.soSanPham}
          </button>
        </td>
        <td>${badgeStatus}</td>
        <td><span style="font-size: var(--text-xs); color: var(--color-text-muted);">${ngayHienThi}</span></td>
        <td>
          <div class="qt-actions-cell">
            <button type="button" class="qt-btn-sm" data-action="chitiet" data-id="${dm.id}" title="Xem chi tiết">
              Chi tiết
            </button>
            <button type="button" class="qt-btn-sm qt-btn-sm--primary" data-action="sua" data-id="${dm.id}" title="Chỉnh sửa danh mục">
              Sửa
            </button>
            <button type="button" class="qt-btn-sm ${isAn ? "qt-btn-sm--success" : ""}" data-action="doitrangthai" data-id="${dm.id}" data-status="${isAn ? "hoat_dong" : "an"}" title="${isAn ? "Hiện danh mục" : "Ẩn danh mục"}">
              ${isAn ? "Hiện" : "Ẩn"}
            </button>
            <button type="button" class="qt-btn-sm qt-btn-sm--danger" data-action="xoa" data-id="${dm.id}" data-count="${dm.soSanPham}" data-ten="${dm.tenDanhMuc}" title="Xoá danh mục">
              Xoá
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Gắn sự kiện cho các nút hành động trong bảng
  tbody.querySelectorAll('[data-action="sua"]').forEach(btn => {
    btn.addEventListener("click", () => nhapFormSua(btn.dataset.id));
  });

  tbody.querySelectorAll('[data-action="chitiet"], [data-action="xem-sp"]').forEach(btn => {
    btn.addEventListener("click", () => moModalChiTiet(btn.dataset.id));
  });

  tbody.querySelectorAll('[data-action="doitrangthai"]').forEach(btn => {
    btn.addEventListener("click", () => doiNhanhTrangThai(btn.dataset.id, btn.dataset.status));
  });

  tbody.querySelectorAll('[data-action="xoa"]').forEach(btn => {
    btn.addEventListener("click", () => xoaDanhMuc(btn.dataset.id, Number(btn.dataset.count), btn.dataset.ten));
  });
}

/**
 * Đổ dữ liệu danh mục vào form để chỉnh sửa
 * @param {string} id 
 */
function nhapFormSua(id) {
  const dm = danhSachDanhMuc.find(d => d.id === id);
  if (!dm) return;

  document.getElementById("formTitle").textContent = "Chỉnh sửa danh mục";
  document.getElementById("formSubtitle").textContent = `Đang chỉnh sửa danh mục: "${dm.tenDanhMuc}"`;
  
  const badge = document.getElementById("formBadge");
  if (badge) {
    badge.className = "badge badge--khoa";
    badge.textContent = "Chế độ chỉnh sửa";
  }

  document.getElementById("danhMucId").value = dm.id;
  document.getElementById("tenDanhMuc").value = dm.tenDanhMuc || "";
  document.getElementById("slugDanhMuc").value = dm.slug || "";
  document.getElementById("iconDanhMuc").value = dm.icon || "💻";
  document.getElementById("thuTuDanhMuc").value = dm.thuTu !== undefined ? dm.thuTu : 1;
  document.getElementById("trangThaiDanhMuc").value = dm.trangThai || "hoat_dong";
  document.getElementById("moTaDanhMuc").value = dm.moTa || "";

  // Highlight icon tương ứng trong picker nếu có
  document.querySelectorAll(".qt-icon-opt").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.icon === dm.icon);
  });

  const cardForm = document.getElementById("cardFormDanhMuc");
  cardForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("tenDanhMuc")?.focus();
}

/**
 * Đặt lại form về chế độ thêm mới
 */
function lamMoiForm() {
  document.getElementById("formTitle").textContent = "Thêm danh mục mới";
  document.getElementById("formSubtitle").textContent = "Điền thông tin chi tiết để tạo danh mục phân loại sản phẩm mới.";
  
  const badge = document.getElementById("formBadge");
  if (badge) {
    badge.className = "badge badge--hoat_dong";
    badge.textContent = "Chế độ tạo mới";
  }

  document.getElementById("formDanhMuc").reset();
  document.getElementById("danhMucId").value = "";
  document.getElementById("iconDanhMuc").value = "💻";
  document.getElementById("thuTuDanhMuc").value = danhSachDanhMuc.length + 1;
  document.getElementById("trangThaiDanhMuc").value = "hoat_dong";

  document.querySelectorAll(".qt-icon-opt").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.icon === "💻");
  });
}

/**
 * Xử lý lưu danh mục (Thêm mới hoặc Cập nhật)
 */
document.getElementById("formDanhMuc")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("danhMucId").value;
  const tenDanhMuc = document.getElementById("tenDanhMuc").value.trim();
  let slug = document.getElementById("slugDanhMuc").value.trim();
  const icon = document.getElementById("iconDanhMuc").value.trim() || "💻";
  const thuTu = parseInt(document.getElementById("thuTuDanhMuc").value, 10) || 1;
  const trangThai = document.getElementById("trangThaiDanhMuc").value || "hoat_dong";
  const moTa = document.getElementById("moTaDanhMuc").value.trim();

  if (!tenDanhMuc) {
    showToast("Vui lòng nhập tên danh mục.", "error");
    return;
  }

  // Tự động sinh slug nếu để trống
  if (!slug) {
    slug = taoSlug(tenDanhMuc);
  }

  // Kiểm tra trùng lặp tên danh mục
  const tenTrung = danhSachDanhMuc.find(dm => 
    dm.id !== id && (dm.tenDanhMuc || "").toLowerCase() === tenDanhMuc.toLowerCase()
  );
  if (tenTrung) {
    showToast(`Tên danh mục "${tenDanhMuc}" đã tồn tại. Vui lòng chọn tên khác!`, "error");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitForm");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Đang lưu...";
  }

  try {
    const duLieu = {
      tenDanhMuc,
      slug,
      icon,
      thuTu,
      trangThai,
      moTa,
      ngayCapNhat: serverTimestamp()
    };

    if (id) {
      await updateDoc(doc(db, "danhmuc", id), duLieu);
      await ghiNhatKy(`cap_nhat_danh_muc: danhmuc/${id} ("${tenDanhMuc}")`);
      showToast("Cập nhật danh mục thành công.", "success");
    } else {
      duLieu.ngayTao = serverTimestamp();
      const docRef = await addDoc(collection(db, "danhmuc"), duLieu);
      await ghiNhatKy(`them_danh_muc: danhmuc/${docRef.id} ("${tenDanhMuc}")`);
      showToast("Thêm danh mục mới thành công.", "success");
    }

    lamMoiForm();
    await taiDanhSachDanhMuc();
  } catch (err) {
    console.error("Lỗi khi lưu danh mục:", err);
    showToast("Lỗi: " + err.message, "error");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "💾 Lưu danh mục";
    }
  }
});

/**
 * Đổi nhanh trạng thái hiển thị của danh mục (Hiển thị / Tạm ẩn)
 * @param {string} id 
 * @param {string} trangThaiMoi 
 */
async function doiNhanhTrangThai(id, trangThaiMoi) {
  try {
    await updateDoc(doc(db, "danhmuc", id), {
      trangThai: trangThaiMoi,
      ngayCapNhat: serverTimestamp()
    });

    const tenTt = trangThaiMoi === "hoat_dong" ? "Hiển thị" : "Tạm ẩn";
    await ghiNhatKy(`doi_trang_thai_danh_muc: danhmuc/${id} -> ${tenTt}`);
    showToast(`Đã chuyển danh mục sang trạng thái: ${tenTt}`, "success");
    await taiDanhSachDanhMuc();
  } catch (err) {
    console.error("Lỗi đổi trạng thái danh mục:", err);
    showToast("Lỗi khi cập nhật trạng thái: " + err.message, "error");
  }
}

/**
 * Xoá danh mục - Có kiểm tra ràng buộc số sản phẩm để tránh sản phẩm mồ côi
 * @param {string} id 
 * @param {number} soSanPham 
 * @param {string} ten 
 */
async function xoaDanhMuc(id, soSanPham, ten) {
  if (soSanPham > 0) {
    showToast(
      `Không thể xoá danh mục "${ten}": Hiện còn ${soSanPham} sản phẩm thuộc danh mục này. Vui lòng chuyển các sản phẩm sang danh mục khác trước!`,
      "error"
    );
    return;
  }

  const xacNhan = confirm(`Bạn có chắc chắn muốn xoá danh mục "${ten}"?\nThao tác này không thể hoàn tác.`);
  if (!xacNhan) return;

  try {
    await deleteDoc(doc(db, "danhmuc", id));
    await ghiNhatKy(`xoa_danh_muc: danhmuc/${id} ("${ten}")`);
    showToast(`Đã xoá danh mục "${ten}".`, "success");
    await taiDanhSachDanhMuc();
  } catch (err) {
    console.error("Lỗi xoá danh mục:", err);
    showToast("Lỗi khi xoá: " + err.message, "error");
  }
}

/**
 * Mở modal xem thông tin chi tiết danh mục và danh sách sản phẩm liên kết
 * @param {string} id 
 */
async function moModalChiTiet(id) {
  const modal = document.getElementById("modalChiTiet");
  const modalBody = document.getElementById("modalChiTietBody");
  const modalTitle = document.getElementById("modalChiTietTieuDe");

  const dm = danhSachDanhMuc.find(d => d.id === id);
  if (!dm || !modal || !modalBody) return;

  modalTitle.textContent = `Chi tiết: ${dm.icon || "📁"} ${dm.tenDanhMuc}`;
  modalBody.innerHTML = `<p class="text-muted">Đang tải dữ liệu sản phẩm trong danh mục...</p>`;
  modal.removeAttribute("hidden");

  try {
    // Tải danh sách sản phẩm thuộc danh mục này
    const qSp = query(collection(db, "sanpham"), where("danhMucId", "==", id));
    const snapSp = await getDocs(qSp);
    const sanPhamList = snapSp.docs.map(d => ({ id: d.id, ...d.data() }));

    const isAn = dm.trangThai === "an";
    const statusHtml = isAn
      ? `<span class="badge badge--khoa">⚪ Đang tạm ẩn</span>`
      : `<span class="badge badge--hoat_dong">🟢 Đang hiển thị</span>`;

    let danhSachSpHtml = "";
    if (sanPhamList.length === 0) {
      danhSachSpHtml = `
        <div class="empty-state" style="padding: var(--spacing-md); background: var(--color-bg); border-radius: var(--radius-sm); border: 1px dashed var(--color-border);">
          Chưa có sản phẩm nào thuộc danh mục này.
        </div>
      `;
    } else {
      danhSachSpHtml = `
        <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
          <table class="table" style="font-size: var(--text-xs);">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${sanPhamList.map(sp => {
                const spStatusBadge = sp.trangThai === "dang_ban"
                  ? `<span class="badge badge--dang_ban">Đang bán</span>`
                  : `<span class="badge badge--ngung_ban">Ngừng bán</span>`;
                return `
                  <tr>
                    <td><strong>${sp.tenSanPham || sp.ten || "—"}</strong></td>
                    <td>${formatCurrency(sp.gia || 0)}</td>
                    <td>${sp.soLuongTon ?? 0}</td>
                    <td>${spStatusBadge}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    modalBody.innerHTML = `
      <dl class="qt-detail-dl">
        <dt>Mã định danh (ID):</dt>
        <dd><span class="qt-code">${dm.id}</span></dd>

        <dt>Tên danh mục:</dt>
        <dd><strong>${dm.icon || "📁"} ${dm.tenDanhMuc}</strong></dd>

        <dt>Đường dẫn (Slug):</dt>
        <dd><span class="qt-code">/${dm.slug || dm.id}</span></dd>

        <dt>Thứ tự hiển thị:</dt>
        <dd><strong>#${dm.thuTu ?? 1}</strong></dd>

        <dt>Trạng thái:</dt>
        <dd>${statusHtml}</dd>

        <dt>Ngày tạo:</dt>
        <dd>${formatDate(dm.ngayTao) || "—"}</dd>

        <dt>Cập nhật lần cuối:</dt>
        <dd>${formatDate(dm.ngayCapNhat || dm.ngayTao) || "—"}</dd>

        <dt>Mô tả:</dt>
        <dd style="white-space: normal;">${dm.moTa || '<span class="text-muted">Chưa có mô tả chi tiết.</span>'}</dd>
      </dl>

      <h4 style="margin: var(--spacing-md) 0 var(--spacing-xs); font-size: var(--text-base); display: flex; align-items: center; justify-content: space-between;">
        <span>Sản phẩm thuộc danh mục</span>
        <span class="qt-badge-count">${sanPhamList.length}</span>
      </h4>
      ${danhSachSpHtml}
    `;
  } catch (err) {
    console.error("Lỗi tải chi tiết danh mục:", err);
    modalBody.innerHTML = `<p class="error-text">Lỗi khi tải thông tin: ${err.message}</p>`;
  }
}

/**
 * Đóng modal chi tiết
 */
function dongModalChiTiet() {
  const modal = document.getElementById("modalChiTiet");
  if (modal) modal.setAttribute("hidden", "");
}

// Gắn sự kiện đóng modal
document.getElementById("btnDongModal")?.addEventListener("click", dongModalChiTiet);
document.getElementById("btnDongModalFooter")?.addEventListener("click", dongModalChiTiet);
document.getElementById("modalBackdrop")?.addEventListener("click", dongModalChiTiet);

// Gắn sự kiện cho form làm mới
document.getElementById("btnHuy")?.addEventListener("click", lamMoiForm);

// Tự động sinh slug khi nhập tên danh mục nếu đang tạo mới
document.getElementById("tenDanhMuc")?.addEventListener("input", (e) => {
  const id = document.getElementById("danhMucId").value;
  if (!id) {
    const slugInput = document.getElementById("slugDanhMuc");
    if (slugInput) slugInput.value = taoSlug(e.target.value);
  }
});

// Icon picker buttons
document.querySelectorAll(".qt-icon-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("iconDanhMuc").value = btn.dataset.icon;
    document.querySelectorAll(".qt-icon-opt").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

// Gắn sự kiện cho các bộ lọc tìm kiếm & sắp xếp
document.getElementById("filterTuKhoa")?.addEventListener("input", apDungBoLocVaSapXep);
document.getElementById("filterTrangThai")?.addEventListener("change", apDungBoLocVaSapXep);
document.getElementById("filterSapXep")?.addEventListener("change", apDungBoLocVaSapXep);
document.getElementById("btnLamMoiBang")?.addEventListener("click", taiDanhSachDanhMuc);

// Khởi chạy khi tải trang
taiDanhSachDanhMuc();
