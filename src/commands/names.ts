import type { GeometryNameGroup } from '../geometry/types'
import type { FunctionNameGroup } from '../geometry/function-types'

export type ObjectNameGroup = GeometryNameGroup | FunctionNameGroup | 'parameter' | 'integral'

/** Naming uses a supplied snapshot, so a rejected command reserves no names. */
export function createObjectName(group: ObjectNameGroup, names: Iterable<string | null>): string {
  const occupied = new Set(names)
  if (group === 'verLine') {
    let index = 1
    while (occupied.has(`denk${index}`)) index++
    return `denk${index}`
  }
  // Parameters and vectors avoid the variables x, y and n and the constants e and i.
  const alphabet = group === 'point' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    : group === 'parameter' ? 'abcdkmpqrstuvwz'
    : group === 'angle' ? 'αβθδ'
    : group === 'vector' ? 'uvwabcdfghjklmopqrstz'
      : ['circleR', 'lineSegment', 'distanceSegment', 'sequence', 'arcMeasure', 'integral', 'polygon', 'measure', 'region'].includes(group)
        ? 'abcdefghijklmnopqrstuvwxyz' : 'fghpqr'
  for (let index = 0; ; index++) {
    const suffix = index < alphabet.length ? '' : String(Math.floor(index / alphabet.length))
    const candidate = alphabet[index % alphabet.length]! + suffix
    if (!occupied.has(candidate)) return candidate
  }
}
