import type { Coordinate } from '../geometry/types'

/** Presentation only; formatted values never feed geometry or function expressions. */
export function formatDisplayNumber(value: Coordinate): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  const integer = Math.round(number)
  return Math.abs(number - integer) < 0.000001 ? String(integer) : number.toFixed(2)
}

export function formatMeasure(value: number): string {
  return Number.isFinite(value) ? formatDisplayNumber(value) : '∅'
}

/** A curve's parameter bound: rational multiples of π as typed (`2π`, `π/2`), other values in full. */
export function formatBound(value: number): string {
  if (value !== 0) {
    for (const denominator of [1, 2, 3, 4, 6]) {
      const numerator = value * denominator / Math.PI
      const whole = Math.round(numerator)
      if (whole !== 0 && Math.abs(numerator - whole) < 1e-12 * Math.max(1, Math.abs(whole))) {
        const factor = whole === 1 ? 'π' : whole === -1 ? '-π' : `${whole}π`
        return denominator === 1 ? factor : `${factor}/${denominator}`
      }
    }
  }
  return String(value)
}
