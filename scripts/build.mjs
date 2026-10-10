// scripts/build.mjs — chạy lúc deploy trên Vercel (không cần cài thư viện nào).
//
// Làm 3 việc, KHÔNG sửa file nguồn trong repo (chỉ ghi vào thư mục dist/):
//  1. Gắn ?v=<mã băm> vào mọi tham chiếu /js/*.js và /css/*.css (HTML, JS, CSS)
//     => cho phép cache 1 năm "immutable"; mỗi lần code đổi, URL đổi theo.
//  2. Tự thêm <link rel="modulepreload"> cho toàn bộ module tĩnh của từng trang
//     (tính từ cây import thật, nên không bao giờ lỗi thời).
//  3. Chèn sẵn HTML footer (js/footer-rules.js) vào từng trang, để footer có ngay cả khi chưa chạy JS.
//  4. Chỉ chép file cần phục vụ web (bỏ README, firestore.rules, scripts, api...).
//
// Chạy thử trên máy:  node scripts/build.mjs   rồi mở thư mục dist/ bằng 1 static server.

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

const BO_QUA_THU_MUC = new Set([".git", ".github", ".vercel", ".firebase", "node_modules", "dist", "scripts", "api", "dev", "docs", "tests"]);
const BO_QUA_FILE = /^(README\.md|firestore\.rules|vercel\.json|\.vercelignore|\.gitignore|package(-lock)?\.json|\.DS_Store|Thumbs\.db|.*\.log|\.env.*)$/;

function duyet(thuMuc, loc = () => true) {
  const kq = [];
  for (const ten of readdirSync(thuMuc)) {
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) kq.push(...duyet(p, loc));
    else if (loc(p)) kq.push(p);
  }
  return kq;
}

// ---- 0. Dọn dist và chép file web sang ---------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, ".gitignore"), "*\n"); // dist/ tự bị git bỏ qua, không cần sửa .gitignore của repo
for (const ten of readdirSync(ROOT)) {
  if (BO_QUA_THU_MUC.has(ten) || BO_QUA_FILE.test(ten)) continue;
  cpSync(join(ROOT, ten), join(OUT, ten), {
    recursive: true,
    filter: (src) => !(statSync(src).isFile() && BO_QUA_FILE.test(src.split(/[\\/]/).pop())),
  });
}

// ---- 0b. Chèn sẵn HTML footer vào các trang ------------------------------------
const { dungFooter } = await import(pathToFileURL(join(ROOT, "js", "footer-rules.js")).href);
const CHO_FOOTER = /<footer class="site-footer"(?: data-variant="(\w+)")?><\/footer>/;
for (const p of duyet(OUT, (f) => f.endsWith(".html"))) {
  const goc = readFileSync(p, "utf8");
  const moi = goc.replace(CHO_FOOTER, (m, bienThe) => m.replace("></footer>", `>${dungFooter(bienThe)}\n  </footer>`));
  if (moi !== goc) writeFileSync(p, moi);
}

// ---- 1. Mã phiên bản = băm toàn bộ js/ và css/ --------------------------------
const bam = createHash("sha256");
for (const p of duyet(join(ROOT, "js")).concat(duyet(join(ROOT, "css"))).sort()) {
  bam.update(relative(ROOT, p).replace(/\\/g, "/"));
  bam.update(readFileSync(p));
}
const V = bam.digest("hex").slice(0, 10);

const THAM_CHIEU = /(["'`(])(\/(?:js|css)\/[\w\-./]+\.(?:js|css))(?=["'`)])/g;
const ganV = (s) => s.replace(THAM_CHIEU, `$1$2?v=${V}`);

const fileText = duyet(OUT, (p) => /\.(html|js|css)$/.test(p));
for (const p of fileText) {
  const goc = readFileSync(p, "utf8");
  const moi = ganV(goc);
  if (moi !== goc) writeFileSync(p, moi);
}

// ---- 2. modulepreload theo cây import tĩnh -------------------------------------
const IMPORT = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["'](\/js\/[^"'?]+\.js)(?:\?v=\w+)?["']/g;
const doc = (p) => (existsSync(join(OUT, p)) ? readFileSync(join(OUT, p), "utf8") : "");
const phuThuoc = (p) => [...doc(p).matchAll(IMPORT)].map((m) => m[1]);

function cay(diemVao) {
  const thay = new Set();
  const hang = [...diemVao];
  const thuTu = [];
  while (hang.length) {
    const m = hang.shift();
    if (thay.has(m)) continue;
    thay.add(m);
    thuTu.push(m);
    hang.push(...phuThuoc(m));
  }
  return thuTu;
}

let soTrang = 0;
let soThe = 0;
for (const p of duyet(OUT, (f) => f.endsWith(".html"))) {
  let html = readFileSync(p, "utf8");
  if (!html.trim()) continue;

  const diemVao = [...html.matchAll(/<script[^>]+type="module"[^>]+src="(\/js\/[^"?]+)/g)].map((m) => m[1]);
  for (const kh of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    diemVao.push(...[...kh[1].matchAll(IMPORT)].map((m) => m[1]));
  }
  const daCo = new Set([...html.matchAll(/rel="modulepreload" href="([^"?]+)/g)].map((m) => m[1]));
  const moi = cay(diemVao).filter((m) => !daCo.has(m));
  if (!moi.length) continue;

  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const the = moi.map((m) => `  <link rel="modulepreload" href="${m}?v=${V}" />`).join(eol) + eol;
  const neo = /<link rel="modulepreload" href="\/js\/firebase-config\.js[^"]*" \/>\r?\n/;
  if (neo.test(html)) html = html.replace(neo, (s) => s + the);
  else html = html.replace(/<\/head>/, the + "</head>");
  writeFileSync(p, html);
  soTrang++;
  soThe += moi.length;
}

console.log(`build xong: phiên bản ${V} • ${fileText.length} file đã gắn ?v= • ${soTrang} trang thêm ${soThe} modulepreload → dist/`);
