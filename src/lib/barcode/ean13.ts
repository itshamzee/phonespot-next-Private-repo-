/**
 * EAN-13: kontrolciffer og stregmønster til etiketter, vi selv printer.
 * Mønstret er 95 moduler ("1" = sort streg), klar til at tegne som SVG.
 */

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
/** Første ciffer bestemmer, om venstre halvdels cifre kodes med L eller G. */
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

export function ean13Pattern(code: string): string {
  if (!isValidEan13(code)) throw new Error(`Ugyldig EAN-13: ${code}`);
  const digits = code.split("").map(Number);
  const parity = PARITY[digits[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L : G)[digits[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[digits[i]];
  return bits + "101";
}

/** SVG med streger og cifre; `moduleWidth` i SVG-enheder. */
export function ean13Svg(code: string, { moduleWidth = 2, height = 60 } = {}): string {
  const bits = ean13Pattern(code);
  const quiet = 11 * moduleWidth;
  const width = bits.length * moduleWidth + quiet * 2;
  const textHeight = 14;
  let rects = "";
  for (let i = 0; i < bits.length; ) {
    if (bits[i] !== "1") { i++; continue; }
    let run = 1;
    while (bits[i + run] === "1") run++;
    rects += `<rect x="${quiet + i * moduleWidth}" y="0" width="${run * moduleWidth}" height="${height}"/>`;
    i += run;
  }
  const text = `<text x="${width / 2}" y="${height + textHeight - 2}" font-family="monospace" font-size="${textHeight}" text-anchor="middle" letter-spacing="2">${code}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + textHeight}" fill="#000">${rects}${text}</svg>`;
}
