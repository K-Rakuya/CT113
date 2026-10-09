import { auth, db } from "/js/firebase-config.js";
import { formatCurrency, escapeHtml, showToast } from "/js/utils.js";
import { setBusy } from "/js/motion.js";
import { getCartCount, setCartCount } from "/js/cart-badge.js";
import { duongDanDangNhap } from "/js/redirect-rules.js";
import { LOAI_BO_PC, tinhBoPc, keHoachThemGio } from "/js/home/bundles.js";
import { bieuTuongDanhMuc } from "/js/home/home-rules.js";
import { khoiTaoHang, hienKhiCuonToi } from "/js/home/carousel.js";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const MINH_HOA = { van_phong: "van-phong", gaming: "gaming", do_hoa: "do-hoa", khac: "khac" };
const SO_DONG_HIEN = 5;
const icon = (ma) => `<svg class="home-icon" aria-hidden="true"><use href="/images/home/icons.svg#${ma}"/></svg>`;

let dsBo = [];
let theoId = new Map();
let tenDanhMuc = new Map();

function htmlThe({ bo, t }) {
  const dong = t.dong.slice(0, SO_DONG_HIEN).map((d) => `<li>${icon(bieuTuongDanhMuc(tenDanhMuc.get(d.sanPham.danhMucId) ?? ""))}<span>${d.soLuong > 1 ? `${d.soLuong} × ` : ""}${escapeHtml(d.sanPham.tenSanPham)}</span></li>`).join("");
  const them = t.dong.length - SO_DONG_HIEN;
  return `<article class="home-bo" data-id="${escapeHtml(bo.id)}" data-loai="${escapeHtml(bo.loai)}">
    <div class="home-bo__art"><img src="/images/home/bopc-${MINH_HOA[bo.loai] ?? "khac"}.svg" alt="" width="320" height="220" loading="lazy" decoding="async" draggable="false"><span class="home-bo__tag">${LOAI_BO_PC[bo.loai] ?? "Khác"}</span></div>
    <h3 class="home-bo__name">${escapeHtml(bo.ten)}</h3>
    <p class="home-bo__desc">${escapeHtml(bo.moTa ?? "")}</p>
    <ul class="home-bo__spec">${dong}${them > 0 ? `<li class="home-bo__more">+ ${them} linh kiện khác</li>` : ""}</ul>
    <div class="home-bo__price"><small>Tổng giá linh kiện</small><strong>${formatCurrency(t.tong)}</strong></div>
    <div class="home-bo__stock ${t.conHang ? "" : "is-out"}">${t.conHang ? `Còn ${t.soBoCoThe} bộ` : "Tạm hết hàng"}</div>
    <div class="home-bo__actions"><button type="button" class="home-btn home-btn--ghost" data-chi-tiet>Chi tiết</button><button type="button" class="home-btn home-btn--solid" data-them ${t.conHang ? "" : "disabled"}>Thêm cả bộ</button></div>
  </article>`;
}

function htmlChiTiet({ bo, t }) {
  const dong = t.dong.map((d) => `<tr>
    <td><span class="home-dialog__sp"><img src="${escapeHtml(d.sanPham.hinhAnh)}" alt="" width="44" height="44" loading="lazy" onerror="this.style.visibility='hidden'"><a href="/product-detail.html?id=${encodeURIComponent(d.sanPhamId)}">${escapeHtml(d.sanPham.tenSanPham)}</a></span></td>
    <td class="is-num">${d.soLuong}</td><td class="is-num">${formatCurrency(d.sanPham.gia)}</td><td class="is-num">${formatCurrency(d.thanhTien)}</td></tr>`).join("");
  return `<header class="home-dialog__head"><div><span class="home-bo__tag">${LOAI_BO_PC[bo.loai] ?? "Khác"}</span><h2 id="home-dialog-ten">${escapeHtml(bo.ten)}</h2>${bo.moTa ? `<p>${escapeHtml(bo.moTa)}</p>` : ""}</div><button type="button" class="home-dialog__close" data-dong aria-label="Đóng">&times;</button></header>
    <div class="home-dialog__body"><div class="home-dialog__scroll"><table class="home-dialog__table"><thead><tr><th>Linh kiện</th><th class="is-num">SL</th><th class="is-num">Đơn giá</th><th class="is-num">Thành tiền</th></tr></thead><tbody>${dong}</tbody>
    <tfoot><tr><td colspan="3">Tổng giá linh kiện</td><td class="is-num">${formatCurrency(t.tong)}</td></tr></tfoot></table></div>
    <p class="home-dialog__note">Giá và số lượng lấy theo từng sản phẩm tại thời điểm xem. Hãy hỏi nhân viên nếu bạn cần kiểm tra tương thích hoặc muốn thay đổi linh kiện.</p></div>
    <footer class="home-dialog__foot"><a class="home-btn home-btn--ghost" href="/customer/chat.html">Chat tư vấn</a><button type="button" class="home-btn home-btn--solid" data-them data-id="${escapeHtml(bo.id)}" ${t.conHang ? "" : "disabled"}>${t.conHang ? "Thêm cả bộ vào giỏ" : "Tạm hết hàng"}</button></footer>`;
}

async function themBoVaoGio(muc, nut) {
  const user = auth.currentUser;
  if (!user) {
    showToast("Vui lòng đăng nhập để thêm vào giỏ hàng.", "info");
    setTimeout(() => (window.location.href = duongDanDangNhap("/index.html#bo-pc")), 1200);
    return;
  }
  setBusy(nut, true);
  try {
    const snap = await getDocs(query(collection(db, "giohang"), where("khachHangId", "==", user.uid)));
    const gioHang = new Map(snap.docs.map((d) => [d.data().sanPhamId, { id: d.id, soLuong: d.data().soLuong }]));
    const kh = keHoachThemGio(tinhBoPc(muc.bo, theoId), gioHang);
    if (!kh.viec.length) return showToast("Không thể thêm: bộ này đã hết hàng hoặc giỏ của bạn đã đạt số lượng tối đa.", "error");
    await Promise.all(kh.viec.map((v) => (v.docId
      ? updateDoc(doc(db, "giohang", v.docId), { soLuong: v.soLuongMoi })
      : addDoc(collection(db, "giohang"), { khachHangId: user.uid, sanPhamId: v.sanPhamId, soLuong: v.soLuongMoi }))));
    setCartCount(getCartCount() + kh.tongThem);
    showToast(kh.duDu ? `Đã thêm bộ "${muc.bo.ten}" vào giỏ hàng.` : `Chỉ thêm được một phần bộ "${muc.bo.ten}" do giới hạn tồn kho. Hãy kiểm tra lại giỏ hàng.`, kh.duDu ? "success" : "info");
  } catch (err) {
    console.error("Lỗi thêm bộ PC vào giỏ:", err);
    showToast("Không thêm được vào giỏ hàng, vui lòng thử lại.", "error");
  } finally {
    setBusy(nut, false);
  }
}

/** @returns {number} số bộ đã hiển thị */
export function veBoPc(goc, du) {
  theoId = new Map(du.sanPham.map((sp) => [sp.id, sp]));
  tenDanhMuc = new Map(du.danhMuc.map((dm) => [dm.id, dm.tenDanhMuc]));
  dsBo = [...(du.boPc ?? [])].sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0)).map((bo) => ({ bo, t: tinhBoPc(bo, theoId) })).filter((m) => m.t.hopLe);
  if (!dsBo.length) {
    goc.hidden = true;
    return 0;
  }
  const cacLoai = [...new Set(dsBo.map((m) => m.bo.loai))];
  const tab = cacLoai.length > 1
    ? `<div class="home-bopc__tabs" role="tablist" aria-label="Lọc theo loại">${[["", "Tất cả"], ...cacLoai.map((l) => [l, LOAI_BO_PC[l] ?? "Khác"])].map(([l, ten], i) => `<button type="button" role="tab" data-loai="${escapeHtml(l)}" aria-selected="${i === 0}">${ten}</button>`).join("")}</div>`
    : "";
  goc.innerHTML = `<header class="home-bopc__head">
      <div class="home-bopc__title"><span class="home-group__icon" aria-hidden="true">${icon("pc")}</span><div><h2 id="h-bo-pc">Bộ PC dựng sẵn</h2><p>Chọn nguyên bộ theo nhu cầu, thêm cả bộ vào giỏ chỉ với một lần bấm</p></div></div>${tab}
    </header>
    <div class="home-row">
      <button class="home-row__nav home-row__nav--prev" type="button" data-huong="truoc" aria-label="Cuộn sang trái">${icon("chev-l")}</button>
      <div class="home-row__track" role="group" aria-label="Bộ PC dựng sẵn">${dsBo.map(htmlThe).join("")}</div>
      <button class="home-row__nav home-row__nav--next" type="button" data-huong="sau" aria-label="Cuộn sang phải">${icon("chev-r")}</button>
    </div>`;
  goc.hidden = false;
  const hang = goc.querySelector(".home-row");
  const track = hang.querySelector(".home-row__track");
  khoiTaoHang(hang);
  hienKhiCuonToi(goc);

  goc.querySelector(".home-bopc__tabs")?.addEventListener("click", (e) => {
    const nut = e.target.closest("[data-loai]");
    if (!nut) return;
    goc.querySelectorAll(".home-bopc__tabs [data-loai]").forEach((n) => n.setAttribute("aria-selected", String(n === nut)));
    track.querySelectorAll(".home-bo").forEach((c) => (c.hidden = !!nut.dataset.loai && c.dataset.loai !== nut.dataset.loai));
    track.scrollTo({ left: 0, behavior: "auto" });
    track.dispatchEvent(new Event("scroll"));
  });

  const hop = document.getElementById("home-bo-dialog");
  const timMuc = (id) => dsBo.find((m) => m.bo.id === id);
  goc.addEventListener("click", (e) => {
    const the = e.target.closest(".home-bo");
    const muc = timMuc(the?.dataset.id);
    if (!muc) return;
    if (e.target.closest("[data-them]")) return themBoVaoGio(muc, e.target.closest("[data-them]"));
    if (!e.target.closest("[data-chi-tiet]")) return;
    hop.innerHTML = htmlChiTiet(muc);
    hop.dataset.id = muc.bo.id;
    document.body.style.overflow = "hidden";
    hop.showModal();
  });
  hop.addEventListener("click", (e) => {
    if (e.target === hop || e.target.closest("[data-dong]")) return hop.close();
    const nut = e.target.closest("[data-them]");
    if (nut) themBoVaoGio(timMuc(hop.dataset.id), nut);
  });
  hop.addEventListener("close", () => (document.body.style.overflow = ""));
  return dsBo.length;
}
