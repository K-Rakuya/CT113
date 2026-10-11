const GOC = new URL("../", import.meta.url);

export function resolve(specifier, ngCanh, tiepTheo) {
  if (specifier.startsWith("/js/")) return tiepTheo(new URL(specifier.slice(1), GOC).href, ngCanh);
  return tiepTheo(specifier, ngCanh);
}
