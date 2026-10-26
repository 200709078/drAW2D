import type { UnitCirclePart } from './function-types'
import type { NumericPoint } from './primitives'

export type TrigFunction = Exclude<UnitCirclePart, 'A'>

export const TRIG_FUNCTIONS: readonly TrigFunction[] = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc']
/** Card order of the check boxes; also the stored order of `show`. */
export const UNIT_CIRCLE_PARTS: readonly UnitCirclePart[] = ['A', ...TRIG_FUNCTIONS]

/** Angles (degrees, modulo 360) whose values are written exactly and that a dragged A snaps to. */
const SPECIAL_STEP = [30, 45]
const SNAP_DEGREES = 2

const isSpecial = (degrees: number) => Number.isInteger(degrees) && SPECIAL_STEP.some(step => degrees % step === 0)

/** A = (cos θ, sin θ), exact at quarter turns so that tan 90° is undefined, not 1.6e16. */
export function unitPoint(degrees: number): NumericPoint {
  const quarter = degrees / 90
  if (Number.isInteger(quarter)) {
    const turn = ((quarter % 4) + 4) % 4
    return { a: [1, 0, -1, 0][turn]!, b: [0, 1, 0, -1][turn]! }
  }
  const radians = degrees * Math.PI / 180
  return { a: Math.cos(radians), b: Math.sin(radians) }
}

/** The value of a trigonometric function at θ degrees; null where it is undefined. */
export function trigValue(fn: TrigFunction, degrees: number): number | null {
  const { a: cos, b: sin } = unitPoint(degrees)
  switch (fn) {
    case 'sin': return sin
    case 'cos': return cos
    case 'tan': return cos === 0 ? null : sin / cos
    case 'cot': return sin === 0 ? null : cos / sin
    case 'sec': return cos === 0 ? null : 1 / cos
    case 'csc': return sin === 0 ? null : 1 / sin
  }
}

// Magnitudes at the reference angle 0°, 30°, 45°, 60°, 90°; null is undefined.
const SIN = new Map([[0, '0'], [30, '1/2'], [45, '√2/2'], [60, '√3/2'], [90, '1']])
const TAN = new Map<number, string | null>([[0, '0'], [30, '√3/3'], [45, '1'], [60, '√3'], [90, null]])
const SEC = new Map<number, string | null>([[0, '1'], [30, '2√3/3'], [45, '√2'], [60, '2'], [90, null]])

/** `√3/2`, `-1/2`, `tanımsız` at angles that are multiples of 30° or 45°; null elsewhere. */
export function exactTrig(fn: TrigFunction, degrees: number): string | null {
  if (!isSpecial(degrees)) return null
  const turn = ((degrees % 360) + 360) % 360
  const half = turn % 180
  // The angle with the x axis, 0°–90°.
  const reference = Math.min(half, 180 - half)
  const complement = 90 - reference
  const magnitude = fn === 'sin' ? SIN.get(reference) : fn === 'cos' ? SIN.get(complement)
    : fn === 'tan' ? TAN.get(reference) : fn === 'cot' ? TAN.get(complement)
      : fn === 'sec' ? SEC.get(reference) : SEC.get(complement)
  if (magnitude === null || magnitude === undefined) return 'tanımsız'
  const value = trigValue(fn, degrees)!
  return value < 0 && magnitude !== '0' ? `-${magnitude}` : magnitude
}

/** A dragged angle close to 30°, 45°, 60° … becomes exactly that angle. */
export function snapAngle(degrees: number): number {
  const nearest = SPECIAL_STEP.map(step => Math.round(degrees / step) * step)
    .reduce((best, candidate) => Math.abs(candidate - degrees) < Math.abs(best - degrees) ? candidate : best)
  return Math.abs(nearest - degrees) <= SNAP_DEGREES ? nearest : degrees
}

/**
 * The angle of a dragged A: the direction of `position` from O, snapped, and moved by
 * whole turns to lie in [min, max] as close as possible to the previous angle.
 */
export function angleTowards(position: NumericPoint, previous: number, min: number, max: number): number {
  const base = ((Math.atan2(position.b, position.a) * 180 / Math.PI) % 360 + 360) % 360
  const snapped = snapAngle(base)
  let best = snapped
  for (let turn = -2; turn <= 2; turn++) {
    const candidate = snapped + 360 * Math.round(previous / 360) + 360 * turn
    if (candidate < min || candidate > max) continue
    if (best < min || best > max || Math.abs(candidate - previous) < Math.abs(best - previous)) best = candidate
  }
  return Math.min(max, Math.max(min, best))
}

/** `30°`, or in radians `π/6`, `3π/2`, `2π` (multiples of 15°) or `0.70`. */
export function angleText(degrees: number, unit: 'radian' | undefined, decimals: (value: number) => string): string {
  if (unit !== 'radian') return `${decimals(degrees)}°`
  const fifteenths = degrees / 15
  if (!Number.isInteger(fifteenths)) return decimals(degrees * Math.PI / 180)
  if (fifteenths === 0) return '0'
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a)
  const divisor = gcd(fifteenths, 12)
  const numerator = fifteenths / divisor
  const denominator = 12 / divisor
  const top = numerator === 1 ? 'π' : numerator === -1 ? '-π' : `${numerator}π`
  return denominator === 1 ? top : `${top}/${denominator}`
}
