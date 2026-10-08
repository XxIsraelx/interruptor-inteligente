/**
 * Cor de cada aparelho (identidade), na ordem de cadastro — nunca pela posição no ranking,
 * para um aparelho não "mudar de cor" quando outro some ou muda de lugar.
 * Paleta categórica (modo escuro) validada contra a superfície #0f141b:
 * contraste ≥ 3:1, separação para daltonismo ΔE ≥ 8 entre vizinhos.
 */
export const DEVICE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/** Aparelhos além do 8º usam cinza (não se gera uma 9ª cor). */
export const OTHER_COLOR = '#5b6879';

export function colorMap(ids: string[]): Record<string, string> {
  return Object.fromEntries(ids.map((id, i) => [id, DEVICE_COLORS[i] ?? OTHER_COLOR]));
}

/** Mesma cor com transparência (fundos de ícone, áreas). */
export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
