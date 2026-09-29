// js/customer/cart.js
// Trang cart.html: sửa số lượng / xoá sp, tính tổng tiền. Collection: giohang.
//
// Đổi số lượng / xoá 1 dòng KHÔNG tải lại toàn bộ giỏ hàng từ Firestore nữa —
// cập nhật ngay trên state đang có trong bộ nhớ (dongGioHangHienTai) + đúng
// phần DOM bị ảnh hưởng (dòng đó + 2 ô tổng tiền)

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, showToast } from "/js/utils.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-gio-hang");

let dongGioHangHienTai = []; // state hiện tại trong bộ nhớ — nguồn dữ liệu để vẽ lại cục bộ

/**
 * Gọi từ callback onDaXacThuc của checkRole() trong cart.html — đảm bảo
 * auth.currentUser đã sẵn sàng trước khi truy vấn.
 */
export function initGioHang() {
  taiGioHang();
}

/** Tải lại toàn bộ giỏ hàng từ Firestore — dùng khi vào trang lần đầu, hoặc để đồng bộ lại sau khi 1 thao tác ghi nền thất bại. */
async function taiGioHang() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const q = query(collection(db, "giohang"), where("khachHangId", "==", uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      dongGioHangHienTai = [];
      renderRong();
      return;
    }

    // Nạp kèm thông tin sản phẩm cho từng dòng giỏ hàng.
    const dongGioHang = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const gh = { id: docSnap.id, ...docSnap.data() };
        const spSnap = await getDoc(doc(db, "sanpham", gh.sanPhamId));
        gh.sanPham = spSnap.exists() ? { id: spSnap.id, ...spSnap.data() } : null;
        return gh;
      })
    );

    dongGioHangHienTai = dongGioHang.filter((d) => d.sanPham); // bỏ qua sp đã bị xoá khỏi hệ thống
    renderGioHang();
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được giỏ hàng.</p>';
    showToast(err.message, "error");
  }
}

function renderRong() {
  elNoiDung.innerHTML = `
    <div class="empty-state">
      Giỏ hàng của bạn đang trống.
      <div style="margin-top: var(--spacing-md);"><a href="/product-list.html" class="btn btn--primary">Mua sắm ngay</a></div>
    </div>`;
}

function tinhTongTien() {
  return dongGioHangHienTai.reduce((tong, d) => tong + d.sanPham.gia * d.soLuong, 0);
}

/** Vẽ lại 2 ô "Tạm tính"/"Tổng cộng" theo state hiện tại — không đụng vào danh sách dòng sản phẩm. */
function capNhatTongTienHienThi() {
  const tongTien = formatCurrency(tinhTongTien());
  document
    .querySelectorAll("#khung-tom-tat .kh-summary__row span:last-child")
    .forEach((el) => (el.textContent = tongTien));
}

function renderGioHang() {
  const tongTien = tinhTongTien();

  elNoiDung.innerHTML = `
    <div class="kh-cart-layout">
      <div>
        <div id="danh-sach-gio-hang"></div>
      </div>
      <div class="card kh-summary" id="khung-tom-tat">
        <h3>Tóm tắt đơn hàng</h3>
        <div class="kh-summary__row"><span>Tạm tính</span><span>${formatCurrency(tongTien)}</span></div>
        <div class="kh-summary__row kh-summary__total"><span>Tổng cộng</span><span>${formatCurrency(tongTien)}</span></div>
        <a href="/checkout.html" class="btn btn--primary" style="width:100%; margin-top: var(--spacing-md); text-align:center;">Tiến hành đặt hàng</a>
      </div>
    </div>
  `;

  const elDanhSach = document.getElementById("danh-sach-gio-hang");
  dongGioHangHienTai.forEach((d) => elDanhSach.appendChild(taoDongGioHang(d)));
}

/** Tạo DOM cho 1 dòng giỏ hàng */
function taoDongGioHang(d) {
  const dong = document.createElement("div");
  dong.className = "kh-cart-item";
  dong.innerHTML = `
    <img class="kh-cart-item__img" src="${d.sanPham.hinhAnh || ''}" alt="${d.sanPham.tenSanPham}" onerror="this.style.visibility='hidden'">
    <div class="kh-cart-item__info">
      <div class="kh-cart-item__name">${d.sanPham.tenSanPham}</div>
      <div class="text-muted">${formatCurrency(d.sanPham.gia)} / sản phẩm</div>
      <div class="kh-qty-stepper" style="margin-top:6px;">
        <button type="button" class="btn-giam">−</button>
        <input type="number" class="input-so-luong" value="${d.soLuong}" min="1" max="${d.sanPham.soLuongTon}">
        <button type="button" class="btn-tang">+</button>
      </div>
    </div>
    <div class="text-center">
      <div style="font-weight:700;" class="kh-cart-item__thanh-tien">${formatCurrency(d.sanPham.gia * d.soLuong)}</div>
      <button class="kh-cart-item__remove">Xoá</button>
    </div>
  `;

  const elInput = dong.querySelector(".input-so-luong");
  const elThanhTien = dong.querySelector(".kh-cart-item__thanh-tien");

  const capNhatSoLuong = (soLuongMoi) => {
    soLuongMoi = Math.max(1, Math.min(d.sanPham.soLuongTon, soLuongMoi));
    if (soLuongMoi === d.soLuong) {
      elInput.value = soLuongMoi; // ép lại giá trị input nếu người dùng gõ ra ngoài khoảng cho phép
      return;
    }

    // Cập nhật ngay trên state + DOM cục bộ.
    d.soLuong = soLuongMoi;
    elInput.value = soLuongMoi;
    elThanhTien.textContent = formatCurrency(d.sanPham.gia * soLuongMoi);
    capNhatTongTienHienThi();

    updateDoc(doc(db, "giohang", d.id), { soLuong: soLuongMoi }).catch((err) => {
      showToast("Không cập nhật được số lượng: " + err.message, "error");
      taiGioHang(); // ghi thất bại — tải lại toàn bộ để đồng bộ với server
    });
  };

  dong.querySelector(".btn-giam").addEventListener("click", () => capNhatSoLuong(Number(elInput.value) - 1));
  dong.querySelector(".btn-tang").addEventListener("click", () => capNhatSoLuong(Number(elInput.value) + 1));
  elInput.addEventListener("change", () => capNhatSoLuong(Number(elInput.value)));

  dong.querySelector(".kh-cart-item__remove").addEventListener("click", () => {
    // Xoá khỏi state + DOM ngay lập tức; xoá trên Firestore chạy nền.
    dongGioHangHienTai = dongGioHangHienTai.filter((x) => x.id !== d.id);
    dong.remove();
    if (dongGioHangHienTai.length === 0) {
      renderRong();
    } else {
      capNhatTongTienHienThi();
    }

    deleteDoc(doc(db, "giohang", d.id)).catch((err) => {
      showToast("Không xoá được sản phẩm: " + err.message, "error");
      taiGioHang(); // xoá thất bại (hiếm) — tải lại toàn bộ để đồng bộ với server
    });
  });

  return dong;
}
