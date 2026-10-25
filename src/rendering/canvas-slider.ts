import type { GeometryDocumentObject, Parameter } from '../geometry/function-types'
import { formatDisplayNumber } from '../math/format-display'
import type { PainterFrame } from './painter-types'

/** Track length in CSS pixels; the parameter's position is the track's left end. */
export const SLIDER_LENGTH = 160
const KNOB_RADIUS = 7
const GRAB_PX = 10
/** The caption above the track, which moves the slider when dragged. */
const CAPTION_HEIGHT = 18

export type SliderPart = 'track' | 'caption'

type CanvasParameter = Parameter & { onCanvas: { x: number; y: number } }

export function isCanvasSlider(object: GeometryDocumentObject): object is CanvasParameter {
  return object.type === 'parameter' && object.onCanvas !== undefined && object.visibility
}

function knobX(parameter: CanvasParameter): number {
  const { min, max, value } = parameter
  const ratio = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0
  return parameter.onCanvas.x + ratio * SLIDER_LENGTH
}

/** The value at a pointer's x on the track, on the slider's step grid. */
export function sliderValueAt(parameter: Parameter, x: number): number {
  const origin = parameter.onCanvas?.x ?? 0
  const { min, max, step } = parameter
  const raw = min + Math.min(1, Math.max(0, (x - origin) / SLIDER_LENGTH)) * (max - min)
  const snapped = Number((min + Math.round((raw - min) / step) * step).toPrecision(12))
  return Math.min(max, Math.max(min, snapped))
}

/** Which part of a canvas slider is under the pointer, topmost slider first. */
export function sliderAt(objects: readonly GeometryDocumentObject[], x: number, y: number, touch = false):
  { parameter: Parameter; part: SliderPart } | null {
  const grab = touch ? GRAB_PX * 2 : GRAB_PX
  for (let index = objects.length - 1; index >= 0; index--) {
    const object = objects[index]!
    if (!isCanvasSlider(object)) continue
    const { x: left, y: top } = object.onCanvas
    if (x >= left - grab && x <= left + SLIDER_LENGTH + grab && Math.abs(y - top) <= grab) return { parameter: object, part: 'track' }
    if (x >= left && x <= left + SLIDER_LENGTH && y >= top - grab - CAPTION_HEIGHT && y < top - grab) return { parameter: object, part: 'caption' }
  }
  return null
}

/** A free spot for a new canvas slider below the ones already shown. */
export function nextSliderPosition(objects: readonly GeometryDocumentObject[]): { x: number; y: number } {
  const used = objects.filter(isCanvasSlider).map(object => object.onCanvas.y)
  let y = 90
  while (used.some(other => Math.abs(other - y) < 40)) y += 44
  return { x: 24, y }
}

/** Canvas sliders over the scene, in screen pixels so they stay put while the plane moves. */
export function paintCanvasSliders(frame: PainterFrame): void {
  const { ctx } = frame
  for (const object of frame.objects) {
    if (!isCanvasSlider(object)) continue
    const { x, y } = object.onCanvas
    const active = frame.activeId === object.id
    ctx.save()
    ctx.lineWidth = active ? 5 : 4
    ctx.strokeStyle = '#cbd5e1'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + SLIDER_LENGTH, y)
    ctx.stroke()
    const knob = knobX(object)
    ctx.strokeStyle = object.color
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(knob, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(knob, y, KNOB_RADIUS + (active ? 1 : 0), 0, Math.PI * 2)
    ctx.fillStyle = object.color
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = object.color
    ctx.font = 'bold 14px arial'
    ctx.textAlign = 'left'
    ctx.fillText(`${object.name} = ${formatDisplayNumber(object.value)}`, x, y - 14)
    ctx.restore()
  }
}
