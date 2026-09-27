// js/customer/checkout.js
// Trang checkout.html — cài đặt UC-03 "Đặt hàng"

import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, showToast, ghiNhatKy } from "/js/utils.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const elNoiDung = document.getElementById("noi-dung-checkout");

export async function initCheckout() {
  const uid = auth.currentUser.uid;

  try {
    const [gioHangSnap, userSnap] = await Promise.all([
      getDocs(query(collection(db, "giohang"), where("khachHangId", "==", uid))),
      getDoc(doc(db, "users", uid)),
    ]);

    if (gioHangSnap.empty) {
      elNoiDung.innerHTML = `
        <div class="empty-state">
          Giỏ hàng đang trống, không có gì để đặt hàng.
          <div style="margin-top: var(--spacing-md);"><a href="/product-list.html" class="btn btn--primary">Tiếp tục mua sắm</a></div>
        </div>`;
      return;
    }

    const dongGioHang = await Promise.all(
      gioHangSnap.docs.map(async (d) => {
        const gh = { id: d.id, ...d.data() };
        const spSnap = await getDoc(doc(db, "sanpham", gh.sanPhamId));
        gh.sanPham = spSnap.exists() ? { id: spSnap.id, ...spSnap.data() } : null;
        return gh;
      })
    );

    const diaChiMacDinh = userSnap.exists() ? userSnap.data().diaChi || "" : "";
    render(dongGioHang.filter((d) => d.sanPham), diaChiMacDinh);
  } catch (err) {
    elNoiDung.innerHTML = '<p class="empty-state">Không tải được thông tin đặt hàng.</p>';
    showToast(err.message, "error");
  }
}

function render(dongGioHang, diaChiMacDinh) {
  const tongTien = dongGioHang.reduce((tong, d) => tong + d.sanPham.gia * d.soLuong, 0);

  elNoiDung.innerHTML = `
    <div class="card" style="margin-bottom: var(--spacing-lg);">
      <h3>Sản phẩm (${dongGioHang.length})</h3>
      ${dongGioHang
        .map(
          (d) => `
        <div class="kh-cart-item">
          <img class="kh-cart-item__img" src="${d.sanPham.hinhAnh || ''}" alt="${d.sanPham.tenSanPham}" onerror="this.style.visibility='hidden'">
          <div class="kh-cart-item__info">
            <div class="kh-cart-item__name">${d.sanPham.tenSanPham}</div>
            <div class="text-muted">${formatCurrency(d.sanPham.gia)} × ${d.soLuong}</div>
          </div>
          <div style="font-weight:700;">${formatCurrency(d.sanPham.gia * d.soLuong)}</div>
        </div>`
        )
        .join("")}
    </div>

    <form id="form-checkout" class="card">
      <div class="form-group">
        <label for="dia-chi-giao">Địa chỉ giao hàng</label>
        <textarea class="textarea" id="dia-chi-giao" required>${diaChiMacDinh}</textarea>
        <span class="hint">Bạn có thể sửa lại địa chỉ trước khi đặt hàng.</span>
      </div>
      <div class="form-group">
        <label>Phương thức thanh toán</label>
        <select class="select">
          <option>Thanh toán khi nhận hàng (COD)</option>
        </select>
      </div>
      <div class="kh-summary__row kh-summary__total">
        <span>Tổng cộng</span><span>${formatCurrency(tongTien)}</span>
      </div>
      <button type="submit" class="btn btn--primary" style="width:100%; margin-top: var(--spacing-md);" id="btn-xac-nhan">
        Xác nhận đặt hàng
      </button>
    </form>
  `;

  document.getElementById("form-checkout").addEventListener("submit", (e) => {
    e.preventDefault();
    const diaChiGiao = document.getElementById("dia-chi-giao").value.trim();
    if (!diaChiGiao) return;
    xuLyDatHang(dongGioHang, diaChiGiao);
  });
}

async function xuLyDatHang(dongGioHang, diaChiGiao) {
  const btn = document.getElementById("btn-xac-nhan");
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";

  const uid = auth.currentUser.uid;
  const donHangRef = doc(collection(db, "donhang")); // sinh sẵn ID trước transaction

  try {
    await runTransaction(db, async (transaction) => {
      // bắt buộc: mọi transaction.get() phải chạy trước
      // transaction.set()/update().
      const banGhiSanPham = [];
      for (const dong of dongGioHang) {
        const spRef = doc(db, "sanpham", dong.sanPhamId);
        const spSnap = await transaction.get(spRef);
        if (!spSnap.exists()) {
          throw new Error(`Sản phẩm "${dong.sanPham.tenSanPham}" không còn tồn tại.`);
        }
        banGhiSanPham.push({ dong, spRef, spData: spSnap.data() });
      }

      // NL-1: kiểm tra tồn kho — nếu thiếu, báo lỗi rõ ràng, KHÔNG ghi gì cả
      for (const { dong, spData } of banGhiSanPham) {
        if ((spData.soLuongTon ?? 0) < dong.soLuong) {
          throw new Error(
            `"${dong.sanPham.tenSanPham}" chỉ còn ${spData.soLuongTon ?? 0} sản phẩm (bạn chọn ${dong.soLuong}). Vui lòng điều chỉnh số lượng hoặc xoá khỏi giỏ.`
          );
        }
      }

      const tongTien = banGhiSanPham.reduce(
        (tong, { dong, spData }) => tong + spData.gia * dong.soLuong,
        0
      );

      // BƯỚC 2 — GHI: tạo donhang.
      transaction.set(donHangRef, {
        khachHangId: uid,
        ngayDat: serverTimestamp(),
        trangThai: "cho_duyet",
        tongTien,
        diaChiGiao,
      });

      // Tạo chitietdonhang cho từng dòng + trừ tồn kho sanpham.
      for (const { dong, spRef, spData } of banGhiSanPham) {
        const ctdhRef = doc(collection(db, "chitietdonhang"));
        transaction.set(ctdhRef, {
          donHangId: donHangRef.id,
          sanPhamId: dong.sanPhamId,
          khachHangId: uid,
          soLuong: dong.soLuong,
          donGia: spData.gia,
          thanhTien: spData.gia * dong.soLuong,
        });

        transaction.update(spRef, { soLuongTon: spData.soLuongTon - dong.soLuong });
      }
    });

    // Xoá giỏ hàng SAU khi đơn đã tạo thành công
    try {
      const gioHangSnap = await getDocs(
        query(collection(db, "giohang"), where("khachHangId", "==", uid))
      );
      await Promise.all(gioHangSnap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.error("Xoá giỏ hàng sau khi đặt hàng thất bại (đơn vẫn đã tạo):", err);
    }

    await ghiNhatKy(`dat_hang: donhang/${donHangRef.id}`);
    showToast("Đặt hàng thành công! Mã đơn: " + donHangRef.id.slice(0, 8).toUpperCase(), "success");
    window.location.href = `/customer/order-detail.html?id=${donHangRef.id}`;
  } catch (err) {
    // NL-1: quay lại bước xác nhận, báo lỗi rõ ràng.
    showToast(err.message || "Đặt hàng thất bại, vui lòng thử lại.", "error");
    btn.disabled = false;
    btn.textContent = "Xác nhận đặt hàng";
  }
}
