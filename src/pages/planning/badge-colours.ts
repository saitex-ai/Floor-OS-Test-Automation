// The project compiles without the DOM lib; these are the only browser
// APIs paintedColours() touches (it runs in the page, via evaluate()).
interface PaintedNode {
  parentElement: PaintedNode | null;
}
declare function getComputedStyle(node: PaintedNode): { backgroundColor: string; color: string };

/**
 * Background and text colour of a status badge: the first element from
 * the badge's text node up (at most 3 levels) whose background isn't
 * transparent. Runs in the browser via `locator.evaluate(paintedColours)`.
 */
export function paintedColours(el: PaintedNode): string {
  let node: PaintedNode | null = el;
  for (let i = 0; node && i < 4; i += 1, node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)')
      return `${style.backgroundColor} / ${style.color}`;
  }
  return `transparent / ${getComputedStyle(el).color}`;
}
