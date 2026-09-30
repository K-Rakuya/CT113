// js/firebase-config.js
// -----------------------------------------------------------------------------
// Cấu hình & khởi tạo Firebase dùng chung cho toàn bộ dự án.
// -----------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDstP_hoFLvQoy0dZlyBFogUylnXYcZvLg",
  authDomain: "ct113-c9afe.firebaseapp.com",
  projectId: "ct113-c9afe",
  messagingSenderId: "398004053112",
  appId: "1:398004053112:web:708ab707e611be0456b98d"
};

// Khởi tạo app chính — mọi trang import auth/db từ cái này.
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Nhớ trạng thái đăng nhập gần nhất để lần tải sau
onAuthStateChanged(auth, (user) => {
  try {
    localStorage.setItem("ct113.auth", user ? "in" : "out");
  } catch {
    /* chế độ riêng tư có thể chặn localStorage */
  }
  document.documentElement.dataset.authHint = user ? "in" : "out";
});
