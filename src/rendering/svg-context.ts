interface SvgState {
  strokeStyle: string
  fillStyle: string
  lineWidth: number
  dash: number[]
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  globalAlpha: number
  clip: string | null
}

const TAU = Math.PI * 2

const escapeXml = (text: string) => text.replace(/[<>&"']/g, char => `&#${char.charCodeAt(0)};`)
const number = (value: number) => Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0'

/** `#rrggbbaa` as a colour and an opacity, which every SVG reader understands. */
function paint(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(color)
  const opacity = (match ? parseInt(match[2]!, 16) / 255 : 1) * alpha
  return match ? `#${match[1]}" data-opacity="${number(opacity)}` : `${escapeXml(color)}" data-opacity="${number(alpha)}`
}

/**
 * The part of the Canvas 2D API the painters and the grid use, recorded as SVG elements,
 * so an exported drawing is the same picture as vector graphics.
 */
export class SvgContext {
  private state: SvgState = {
    strokeStyle: '#000000', fillStyle: '#000000', lineWidth: 1, dash: [], font: '10px sans-serif',
    textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1, clip: null,
  }
  private readonly stack: SvgState[] = []
  private readonly elements: string[] = []
  private readonly definitions: string[] = []
  private path = ''
  private current: { x: number; y: number } | null = null
  globalCompositeOperation = 'source-over'

  constructor(private readonly width: number, private readonly height: number) {}

  get strokeStyle(): string { return this.state.strokeStyle }
  set strokeStyle(value: string) { this.state.strokeStyle = String(value) }
  get fillStyle(): string { return this.state.fillStyle }
  set fillStyle(value: string) { this.state.fillStyle = String(value) }
  get lineWidth(): number { return this.state.lineWidth }
  set lineWidth(value: number) { this.state.lineWidth = value }
  get font(): string { return this.state.font }
  set font(value: string) { this.state.font = value }
  get textAlign(): CanvasTextAlign { return this.state.textAlign }
  set textAlign(value: CanvasTextAlign) { this.state.textAlign = value }
  get textBaseline(): CanvasTextBaseline { return this.state.textBaseline }
  set textBaseline(value: CanvasTextBaseline) { this.state.textBaseline = value }
  get globalAlpha(): number { return this.state.globalAlpha }
  set globalAlpha(value: number) { this.state.globalAlpha = value }

  save(): void { this.stack.push({ ...this.state, dash: [...this.state.dash] }) }
  restore(): void { this.state = this.stack.pop() ?? this.state }
  setTransform(): void {}
  setLineDash(dash: number[]): void { this.state.dash = [...dash] }

  beginPath(): void {
    this.path = ''
    this.current = null
  }

  moveTo(x: number, y: number): void {
    this.path += `M${number(x)} ${number(y)}`
    this.current = { x, y }
  }

  lineTo(x: number, y: number): void {
    this.path += `${this.current ? 'L' : 'M'}${number(x)} ${number(y)}`
    this.current = { x, y }
  }

  closePath(): void {
    if (this.path) this.path += 'Z'
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.path += `M${number(x)} ${number(y)}h${number(width)}v${number(height)}h${number(-width)}Z`
    this.current = { x, y }
  }

  arc(x: number, y: number, radius: number, start: number, end: number, counterclockwise = false): void {
    this.ellipse(x, y, radius, radius, 0, start, end, counterclockwise)
  }

  ellipse(x: number, y: number, rx: number, ry: number, _rotation: number, start: number, end: number, counterclockwise = false): void {
    const point = (angle: number) => ({ x: x + rx * Math.cos(angle), y: y + ry * Math.sin(angle) })
    const from = point(start)
    this.path += `${this.current ? 'L' : 'M'}${number(from.x)} ${number(from.y)}`
    let delta = counterclockwise ? start - end : end - start
    if (delta >= TAU || delta <= -TAU || (delta === 0 && start !== end)) delta = TAU
    else delta = ((delta % TAU) + TAU) % TAU
    // Canvas angles grow clockwise on screen, as does SVG's positive sweep.
    const sweep = counterclockwise ? 0 : 1
    if (delta >= TAU - 1e-9) {
      const middle = point(start + (counterclockwise ? -Math.PI : Math.PI))
      this.path += `A${number(rx)} ${number(ry)} 0 0 ${sweep} ${number(middle.x)} ${number(middle.y)}`
      this.path += `A${number(rx)} ${number(ry)} 0 0 ${sweep} ${number(from.x)} ${number(from.y)}`
      this.current = from
      return
    }
    const to = point(counterclockwise ? start - delta : start + delta)
    this.path += `A${number(rx)} ${number(ry)} 0 ${delta > Math.PI ? 1 : 0} ${sweep} ${number(to.x)} ${number(to.y)}`
    this.current = to
  }

  private clipAttribute(): string {
    return this.state.clip ? ` clip-path="url(#${this.state.clip})"` : ''
  }

  stroke(): void {
    if (!this.path) return
    const dash = this.state.dash.length ? ` stroke-dasharray="${this.state.dash.map(number).join(' ')}"` : ''
    this.elements.push(`<path d="${this.path}" fill="none" stroke="${paint(this.state.strokeStyle, this.state.globalAlpha)}" `
      + `stroke-width="${number(this.state.lineWidth)}"${dash} stroke-linejoin="round"${this.clipAttribute()}/>`)
  }

  fill(): void {
    if (!this.path) return
    this.elements.push(`<path d="${this.path}" fill="${paint(this.state.fillStyle, this.state.globalAlpha)}"${this.clipAttribute()}/>`)
  }

  clip(): void {
    const id = `clip${this.definitions.length}`
    this.definitions.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`)
    this.state.clip = id
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.elements.push(`<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" `
      + `fill="${paint(this.state.fillStyle, this.state.globalAlpha)}"${this.clipAttribute()}/>`)
  }

  /** An estimate: the export has no text metrics, and labels only need to avoid each other. */
  measureText(text: string): TextMetrics {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.state.font)?.[1] ?? 10)
    return { width: text.length * size * 0.55 } as TextMetrics
  }

  fillText(text: string, x: number, y: number): void {
    const anchor = this.state.textAlign === 'center' ? 'middle' : this.state.textAlign === 'right' || this.state.textAlign === 'end' ? 'end' : 'start'
    this.elements.push(`<text x="${number(x)}" y="${number(y)}" text-anchor="${anchor}" style="font: ${escapeXml(this.state.font)}" `
      + `fill="${paint(this.state.fillStyle, this.state.globalAlpha)}"${this.clipAttribute()}>${escapeXml(text)}</text>`)
  }

  drawImage(): void {}

  /** The finished document; translucent colours become fill/stroke opacities. */
  toString(): string {
    const body = this.elements.join('\n').replace(/(fill|stroke)="([^"]*)" data-opacity="([^"]*)"/g,
      (_match, attribute: string, color: string, opacity: string) => opacity === '1' ? `${attribute}="${color}"` : `${attribute}="${color}" ${attribute}-opacity="${opacity}"`)
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${number(this.width)}" height="${number(this.height)}" `
      + `viewBox="0 0 ${number(this.width)} ${number(this.height)}">\n<defs>${this.definitions.join('')}</defs>\n${body}\n</svg>\n`
  }
}
