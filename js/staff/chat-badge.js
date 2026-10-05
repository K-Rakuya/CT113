import { auth, db } from "/js/firebase-config.js";
import { tieuDeCoSoPhienCho } from "/js/chat-rules.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const TIEU_DE_GOC = document.title;
const nguoiNghe = new Set();
let soCho = 0;
let dangNghe = false;

function capNhatGiaoDien() {
  document.title = tieuDeCoSoPhienCho(TIEU_DE_GOC, soCho);
  const lienKet = document.querySelector('.dashboard-layout__sidebar a[href="/staff/chat.html"]');
  if (!lienKet) return;
  let nhan = lienKet.querySelector(".nv-badge");
  if (!soCho) return nhan?.remove();
  if (!nhan) {
    nhan = document.createElement("span");
    nhan.className = "nv-badge";
    lienKet.append(nhan);
  }
  nhan.textContent = soCho;
  nhan.setAttribute("aria-label", `${soCho} phiên đang chờ`);
}

export function ngheSoPhienCho(khiDoi) {
  nguoiNghe.add(khiDoi);
  khiDoi(soCho);
}

onAuthStateChanged(auth, (user) => {
  if (!user || dangNghe) return;
  dangNghe = true;
  onSnapshot(
    query(collection(db, "tuvan"), where("trangThai", "==", "cho")),
    (snap) => {
      soCho = snap.size;
      capNhatGiaoDien();
      nguoiNghe.forEach((khiDoi) => khiDoi(soCho));
    },
    (err) => console.error("Lỗi nghe số phiên tư vấn đang chờ:", err)
  );
});
