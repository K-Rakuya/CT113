export const chiSoGanNhat = (scrollLeft, beRongSlide, soSlide) =>
  Math.max(0, Math.min(soSlide - 1, Math.round(scrollLeft / (beRongSlide || 1))));

export const chiSoVong = (chiSo, soSlide) => ((chiSo % soSlide) + soSlide) % soSlide;

/** @returns {{coCuon: boolean, dauTrang: boolean, cuoiTrang: boolean}} */
export function trangThaiNutCuon(scrollLeft, clientWidth, scrollWidth, dungSai = 2) {
  return {
    coCuon: scrollWidth - clientWidth > dungSai,
    dauTrang: scrollLeft <= dungSai,
    cuoiTrang: scrollLeft + clientWidth >= scrollWidth - dungSai,
  };
}

export const vuotNguongKeo = (dx, nguong = 6) => Math.abs(dx) > nguong;

export const buocCuon = (clientWidth) => Math.max(160, Math.round(clientWidth * 0.85));
