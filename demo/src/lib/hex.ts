export const toHex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) =>
  Uint8Array.from(h.match(/.{2}/g) ?? [], (x) => parseInt(x, 16));
