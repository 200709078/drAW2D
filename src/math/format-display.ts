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
