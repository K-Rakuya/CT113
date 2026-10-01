// js/customer/product-detail.js
// Trang product-detail.html: chi tiết sp, thêm vào giỏ, xem & gửi đánh giá
// Collection: sanpham, danhgia, donhang.

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, formatDate, showToast, ghiNhatKy } from "/js/utils.js";
import { setBusy, confirmButton, swapContent, flyToCart } from "/js/motion.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const thamSo = new URLSearchParams(window.location.search);
const sanPhamId = thamSo.get("id");

const elChiTiet = document.getElementById("noi-dung-chi-tiet");
const elFormDanhGia = document.getElementById("khung-form-danh-gia");
const elDanhSachDanhGia = document.getElementById("danh-sach-danh-gia");

let sanPhamHienTai = null;
let nguoiDungHienTai = null; // cập nhật bởi onAuthStateChanged

if (!sanPhamId) {
  elChiTiet.innerHTML = '<p class="empty-state">Thiếu mã sản phẩm.</p>';
  elChiTiet.removeAttribute("aria-busy");
} else {
  taiSanPham();
  taiDanhSachDanhGia();
}

onAuthStateChanged(auth, (user) => {
  nguoiDungHienTai = user;
  capNhatKhuVucDanhGia(); // đăng nhập/đăng xuất có thể đổi quyền được đánh giá
});

async function taiSanPham() {
  try {
    const snap = await getDoc(doc(db, "sanpham", sanPhamId));
    if (!snap.exists()) {
      elChiTiet.innerHTML = '<p class="empty-state">Không tìm thấy sản phẩm.</p>';
      return;
    }
    sanPhamHienTai = { id: snap.id, ...snap.data() };
    swapContent(elChiTiet, renderSanPham);
    capNhatBreadcrumb();
  } catch (err) {
    elChiTiet.innerHTML = '<p class="empty-state">Lỗi tải sản phẩm.</p>';
    showToast(err.message, "error");
  } finally {
    elChiTiet.removeAttribute("aria-busy"); // khung chờ (skeleton) tĩnh trong product-detail.html đã được thay
  }
}

/**
 * Nối thêm danh mục + tên sản phẩm vào breadcrumb tĩnh có sẵn trong
 * product-detail.html
 */
async function capNhatBreadcrumb() {
  const elBreadcrumb = document.getElementById("breadcrumb-san-pham");
  if (!elBreadcrumb) return;

  let tenDanhMuc = null;
  if (sanPhamHienTai.danhMucId) {
    try {
      const dmSnap = await getDoc(doc(db, "danhmuc", sanPhamHienTai.danhMucId));
      if (dmSnap.exists()) tenDanhMuc = dmSnap.data().tenDanhMuc;
    } catch {
      /* bỏ qua — breadcrumb vẫn hiển thị được mà không cần danh mục */
    }
  }

  const sep = '<span class="breadcrumb__sep motion-fade">/</span>';
  let them = "";
  if (tenDanhMuc) {
    them += `${sep}<a class="motion-fade" href="/product-list.html?danhmuc=${sanPhamHienTai.danhMucId}">${tenDanhMuc}</a>`;
  }
  them += `${sep}<span class="motion-fade" aria-current="page">${sanPhamHienTai.tenSanPham}</span>`;
  elBreadcrumb.insertAdjacentHTML("beforeend", them);
}

function renderSanPham() {
  const sp = sanPhamHienTai;
  const conHang = (sp.soLuongTon ?? 0) > 0;

  elChiTiet.innerHTML = `
    <div class="kh-detail">
      <img class="kh-detail__img img-fade" src="${sp.hinhAnh || ''}" alt="${sp.tenSanPham}" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.style.visibility='hidden'">
      <div>
        <h1>${sp.tenSanPham}</h1>
        <div class="kh-detail__price">${formatCurrency(sp.gia)}</div>
        <p class="${conHang ? '' : 'kh-product-card__stock--out'}">${conHang ? `Còn ${sp.soLuongTon} sản phẩm` : 'Tạm hết hàng'}</p>
        <p class="kh-detail__desc">${sp.moTa || ''}</p>
        ${conHang ? `
          <div class="flex" style="margin-top: var(--spacing-md);">
            <div class="kh-qty-stepper">
              <button type="button" id="btn-giam">−</button>
              <input type="number" id="so-luong" value="1" min="1" max="${sp.soLuongTon}">
              <button type="button" id="btn-tang">+</button>
            </div>
            <button class="btn btn--primary" id="btn-them-gio">Thêm vào giỏ</button>
          </div>
        ` : `<button class="btn btn--secondary" disabled>Tạm hết hàng</button>`}
      </div>
    </div>
  `;

  if (conHang) {
    const elSoLuong = document.getElementById("so-luong");
    document.getElementById("btn-giam").addEventListener("click", () => {
      elSoLuong.value = Math.max(1, Number(elSoLuong.value) - 1);
    });
    document.getElementById("btn-tang").addEventListener("click", () => {
      elSoLuong.value = Math.min(sp.soLuongTon, Number(elSoLuong.value) + 1);
    });
    document.getElementById("btn-them-gio").addEventListener("click", () => themVaoGio(Number(elSoLuong.value)));
  }
}

async function themVaoGio(soLuong) {
  if (!auth.currentUser) {
    showToast("Vui lòng đăng nhập để thêm vào giỏ hàng.", "info");
    setTimeout(() => (window.location.href = "/login.html"), 1200);
    return;
  }
  const nut = document.getElementById("btn-them-gio");
  setBusy(nut, true); // vòng quay + chặn bấm đúp trong lúc ghi Firestore
  let thanhCong = false;
  try {
    const q = query(
      collection(db, "giohang"),
      where("khachHangId", "==", auth.currentUser.uid),
      where("sanPhamId", "==", sanPhamId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(collection(db, "giohang"), {
        khachHangId: auth.currentUser.uid,
        sanPhamId,
        soLuong,
      });
    } else {
      const docHienCo = snap.docs[0];
      const soLuongMoi = Math.min(
        sanPhamHienTai.soLuongTon,
        (docHienCo.data().soLuong || 0) + soLuong
      );
      await updateDoc(docHienCo.ref, { soLuong: soLuongMoi });
    }
    thanhCong = true;
    showToast("Đã thêm vào giỏ hàng.", "success");
  } catch (err) {
    showToast("Không thêm được vào giỏ: " + err.message, "error");
  } finally {
    setBusy(nut, false);
    if (thanhCong) {
      confirmButton(nut, "Đã thêm"); // ✓ ngay trên nút, thấy kết quả tại chỗ bấm
      flyToCart(document.querySelector(".kh-detail__img")); // ảnh bay vào giỏ trên header
    }
  }
}

// -------------------------- ĐÁNH GIÁ SẢN PHẨM -------------------------------

async function taiDanhSachDanhGia() {
  try {
    const q = query(collection(db, "danhgia"), where("sanPhamId", "==", sanPhamId));
    const snap = await getDocs(q);

    if (snap.empty) {
      elDanhSachDanhGia.innerHTML = '<p class="text-muted">Chưa có đánh giá nào cho sản phẩm này.</p>';
      return;
    }

    const danhSach = snap.docs
      .map((d) => d.data())
      .sort((a, b) => (b.ngayDanhGia?.toMillis?.() ?? 0) - (a.ngayDanhGia?.toMillis?.() ?? 0));

    swapContent(elDanhSachDanhGia, () => {
    elDanhSachDanhGia.innerHTML = danhSach
      .map(
        (dg, i) => `
        <div class="kh-review motion-enter" style="--i:${i}">
          <div class="kh-review__stars">${"★".repeat(dg.soSao)}${"☆".repeat(5 - dg.soSao)}</div>
          <p>${dg.noiDung}</p>
          <div class="text-muted" style="font-size:.8em;">${formatDate(dg.ngayDanhGia)}</div>
        </div>`
      )
      .join("");
    });
  } catch (err) {
    elDanhSachDanhGia.innerHTML = '<p class="text-muted">Không tải được đánh giá.</p>';
  }
}

/**
 * Khách chỉ được đánh giá nếu có ít nhất 1 đơn hàng "hoan_thanh" chứa sản
 * phẩm này. Dùng field khachHangId đã denormalize sẵn trên chitietdonhang
 * để truy vấn 1 bước, sau đó xác minh lại
 * đơn cha thật sự đã hoàn thành.
 */
async function duocPhepDanhGia(uid) {
  const qCTDH = query(
    collection(db, "chitietdonhang"),
    where("sanPhamId", "==", sanPhamId),
    where("khachHangId", "==", uid)
  );
  const snapCTDH = await getDocs(qCTDH);
  if (snapCTDH.empty) return false;

  const maDonHangDaXet = new Set();
  for (const d of snapCTDH.docs) {
    const donHangId = d.data().donHangId;
    if (maDonHangDaXet.has(donHangId)) continue;
    maDonHangDaXet.add(donHangId);

    const donSnap = await getDoc(doc(db, "donhang", donHangId));
    if (donSnap.exists() && donSnap.data().trangThai === "hoan_thanh") {
      return true;
    }
  }
  return false;
}

async function daDanhGiaChua(uid) {
  const q = query(
    collection(db, "danhgia"),
    where("sanPhamId", "==", sanPhamId),
    where("khachHangId", "==", uid)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

async function capNhatKhuVucDanhGia() {
  if (!nguoiDungHienTai) {
    elFormDanhGia.innerHTML = `<p class="text-muted motion-fade"><a href="/login.html">Đăng nhập</a> và mua sản phẩm này để có thể đánh giá.</p>`;
    return;
  }

  elFormDanhGia.innerHTML = '<p class="text-muted">Đang kiểm tra quyền đánh giá...</p>';
  try {
    const [duocPhep, daDanhGia] = await Promise.all([
      duocPhepDanhGia(nguoiDungHienTai.uid),
      daDanhGiaChua(nguoiDungHienTai.uid),
    ]);

    if (daDanhGia) {
      elFormDanhGia.innerHTML = '<p class="text-muted motion-fade">Bạn đã đánh giá sản phẩm này. Cảm ơn bạn!</p>';
    } else if (!duocPhep) {
      elFormDanhGia.innerHTML = '<p class="text-muted motion-fade">Bạn cần mua và nhận sản phẩm này (đơn hàng đã hoàn thành) trước khi đánh giá.</p>';
    } else {
      renderFormDanhGia();
    }
  } catch (err) {
    elFormDanhGia.innerHTML = '';
    console.error(err);
  }
}

function renderFormDanhGia() {
  elFormDanhGia.innerHTML = `
    <form id="form-danh-gia" class="kh-review-form card motion-fade">
      <div class="form-group">
        <label for="so-sao">Số sao</label>
        <select class="select" id="so-sao">
          <option value="5">★★★★★ (5 sao)</option>
          <option value="4">★★★★☆ (4 sao)</option>
          <option value="3">★★★☆☆ (3 sao)</option>
          <option value="2">★★☆☆☆ (2 sao)</option>
          <option value="1">★☆☆☆☆ (1 sao)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="noi-dung-danh-gia">Nhận xét</label>
        <textarea class="textarea" id="noi-dung-danh-gia" required placeholder="Chia sẻ trải nghiệm của bạn..."></textarea>
      </div>
      <button type="submit" class="btn btn--primary">Gửi đánh giá</button>
    </form>
  `;

  document.getElementById("form-danh-gia").addEventListener("submit", async (e) => {
    e.preventDefault();
    const soSao = Number(document.getElementById("so-sao").value);
    const noiDung = document.getElementById("noi-dung-danh-gia").value.trim();
    if (!noiDung) return;

    try {
      await addDoc(collection(db, "danhgia"), {
        sanPhamId,
        khachHangId: nguoiDungHienTai.uid,
        soSao,
        noiDung,
        ngayDanhGia: serverTimestamp(),
      });
      showToast("Cảm ơn bạn đã đánh giá!", "success");
      await ghiNhatKy(`them_danh_gia: sanpham/${sanPhamId}`);
      await taiDanhSachDanhGia();
      await capNhatKhuVucDanhGia();
    } catch (err) {
      showToast("Gửi đánh giá thất bại: " + err.message, "error");
    }
  });
}
