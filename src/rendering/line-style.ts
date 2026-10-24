import type { LineStyle } from '../geometry/types'

/** Canvas dash pattern of a line style, proportional to the stroke width. */
export function lineDash(style: LineStyle | undefined, width: number): number[] | undefined {
  switch (style) {
    case 'dashed': return [6 + 2 * width, 4 + width]
    case 'dotted': return [width, 2 * width + 2]
    default: return undefined
  }
}
