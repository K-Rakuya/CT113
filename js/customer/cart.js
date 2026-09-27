// js/customer/cart.js
// Trang cart.html: sửa số lượng / xoá sp, tính tổng tiền. Collection: giohang.

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

/**
 * Gọi từ callback onDaXacThuc của checkRole() trong cart.html — đảm bảo
 * auth.currentUser đã sẵn sàng trước khi truy vấn.
 */
export function initGioHang() {
  taiGioHang();
}

async function taiGioHang() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const q = query(collection(db, "giohang"), where("khachHangId", "==", uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      elNoiDung.innerHTML = `
        <div class="empty-state">
          Giỏ hàng của bạn đang trống.
          <div style="margin-top: var(--spacing-md);"><a href="/product-list.html" class="btn btn--primary">Mua sắm ngay</a></div>
        </div>`;
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

    renderGioHang(dongGioHang.filter((d) => d.sanPham)); // bỏ qua sp đã bị xoá khỏi hệ thống
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được giỏ hàng.</p>';
    showToast(err.message, "error");
  }
}

function renderGioHang(dongGioHang) {
  const tongTien = dongGioHang.reduce((tong, d) => tong + d.sanPham.gia * d.soLuong, 0);

  elNoiDung.innerHTML = `
    <div class="kh-cart-layout">
      <div>
        <div id="danh-sach-gio-hang"></div>
      </div>
      <div class="card kh-summary">
        <h3>Tóm tắt đơn hàng</h3>
        <div class="kh-summary__row"><span>Tạm tính</span><span>${formatCurrency(tongTien)}</span></div>
        <div class="kh-summary__row kh-summary__total"><span>Tổng cộng</span><span>${formatCurrency(tongTien)}</span></div>
        <a href="/checkout.html" class="btn btn--primary" style="width:100%; margin-top: var(--spacing-md); text-align:center;">Tiến hành đặt hàng</a>
      </div>
    </div>
  `;

  const elDanhSach = document.getElementById("danh-sach-gio-hang");
  dongGioHang.forEach((d) => {
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
        <div style="font-weight:700;">${formatCurrency(d.sanPham.gia * d.soLuong)}</div>
        <button class="kh-cart-item__remove">Xoá</button>
      </div>
    `;

    const elInput = dong.querySelector(".input-so-luong");
    const capNhatSoLuong = async (soLuongMoi) => {
      soLuongMoi = Math.max(1, Math.min(d.sanPham.soLuongTon, soLuongMoi));
      elInput.value = soLuongMoi;
      try {
        await updateDoc(doc(db, "giohang", d.id), { soLuong: soLuongMoi });
        taiGioHang(); // tải lại để cập nhật tổng tiền chính xác
      } catch (err) {
        showToast("Không cập nhật được số lượng: " + err.message, "error");
      }
    };

    dong.querySelector(".btn-giam").addEventListener("click", () => capNhatSoLuong(Number(elInput.value) - 1));
    dong.querySelector(".btn-tang").addEventListener("click", () => capNhatSoLuong(Number(elInput.value) + 1));
    elInput.addEventListener("change", () => capNhatSoLuong(Number(elInput.value)));

    dong.querySelector(".kh-cart-item__remove").addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "giohang", d.id));
        taiGioHang();
      } catch (err) {
        showToast("Không xoá được sản phẩm: " + err.message, "error");
      }
    });

    elDanhSach.appendChild(dong);
  });
}
