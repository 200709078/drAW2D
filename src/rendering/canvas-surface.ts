export interface CanvasSurface {
  readonly width: number
  readonly height: number
  readonly pixelRatio: number
  resize(): void
  prepare(): void
}

/** Keep geometry in CSS pixels while the backing store follows screen density. */
export function createCanvasSurface(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): CanvasSurface {
  let width = 1
  let height = 1
  let pixelRatio = 1
  return {
    get width() { return width },
    get height() { return height },
    get pixelRatio() { return pixelRatio },
    resize() {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      // Limit memory on large, dense displays without changing logical coordinates.
      const requestedRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
      pixelRatio = Math.min(requestedRatio, 16_384 / Math.max(width, height),
        Math.sqrt(16_777_216 / width / height))
      const pixelsWide = Math.max(1, Math.round(width * pixelRatio))
      const pixelsHigh = Math.max(1, Math.round(height * pixelRatio))
      if (canvas.width !== pixelsWide) canvas.width = pixelsWide
      if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh
    },
    prepare() {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    },
  }
}
