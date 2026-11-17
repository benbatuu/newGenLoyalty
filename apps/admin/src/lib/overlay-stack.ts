/**
 * Üst üste açılan katmanlar (çekmece, pencere, onay) için Esc yönetimi.
 * Yalnızca en üstteki katman Esc'e tepki verir; altındaki çekmece kapanmaz.
 */
const stack: symbol[] = [];

export function pushOverlay(): symbol {
  const id = Symbol("overlay");
  stack.push(id);
  return id;
}

export function popOverlay(id: symbol): void {
  const i = stack.indexOf(id);
  if (i >= 0) stack.splice(i, 1);
}

export function isTopOverlay(id: symbol): boolean {
  return stack[stack.length - 1] === id;
}
