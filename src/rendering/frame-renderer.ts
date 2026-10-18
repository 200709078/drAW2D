export interface FrameClock {
  request(callback: FrameRequestCallback): number
  cancel(handle: number): void
}

/** Coalesce changes into one paint; changes made during paint get a later frame. */
export function createFrameRenderer(paint: () => void, clock: FrameClock = {
  request: callback => requestAnimationFrame(callback),
  cancel: handle => cancelAnimationFrame(handle),
}): { request(): void; dispose(): void } {
  let pending: number | null = null
  let disposed = false
  return {
    request() {
      if (disposed || pending !== null) return
      pending = clock.request(() => {
        pending = null
        if (!disposed) paint()
      })
    },
    dispose() {
      disposed = true
      if (pending !== null) clock.cancel(pending)
      pending = null
    },
  }
}

/** Cache draw order without sorting or otherwise mutating the document array. */
export function createSceneOrder<Object extends { id: number | null }>(): {
  get(objects: readonly Object[]): readonly Object[]
} {
  let snapshot: Object[] = []
  let ids: (number | null)[] = []
  let ordered: Object[] = []
  return {
    get(objects) {
      if (objects.length !== snapshot.length
        || objects.some((object, index) => object !== snapshot[index] || object.id !== ids[index])) {
        snapshot = [...objects]
        ids = objects.map(object => object.id)
        ordered = [...objects].sort((a, b) => (b.id ?? -Infinity) - (a.id ?? -Infinity))
      }
      return ordered
    },
  }
}
