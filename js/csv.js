function oCsv(giaTri) {
  let s = String(giaTri ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @returns {string} CSV có BOM để Excel đọc đúng tiếng Việt */
export function taoCsv(tieuDe, dong) {
  return "\uFEFF" + [tieuDe, ...dong].map((r) => r.map(oCsv).join(",")).join("\r\n");
}

export function taiFileCsv(tenFile, noiDung) {
  const url = URL.createObjectURL(new Blob([noiDung], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
