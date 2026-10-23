const MIN_PANEL_WIDTH = 260
const MAX_PANEL_WIDTH = 700
const CANVAS_RESERVE = 90
const MIN_SHEET_HEIGHT = 120
const MAX_SHEET_RATIO = 0.85

/** Narrow screens show the panel as a bottom sheet instead of a right column. */
export const NARROW_LAYOUT_QUERY = '(max-width: 700px)'

export interface SidePanel {
  readonly isHidden: boolean
  setHidden(hidden: boolean): void
}

function required<Element extends HTMLElement>(id: string): Element {
  const element = document.getElementById(id)
  if (!element) throw new Error(`drAW2D arayüz öğesi bulunamadı: ${id}`)
  return element as Element
}

/** The object panel, its collapse button, the tool accordion and the size handle. */
export function createSidePanel(onToggle: () => void): SidePanel {
  const wrapper = required<HTMLElement>('rightWrapper')
  const toolbar = required<HTMLElement>('rightToolbar')
  const toggle = required<HTMLButtonElement>('btnCalc')
  const toggleIcon = document.getElementById('btnimgCalc')
  const accordion = document.getElementById('btnAcordeon')
  const narrow = window.matchMedia(NARROW_LAYOUT_QUERY)

  // In the column layout the floating buttons follow the panel's left edge; over a
  // bottom sheet they stay in the canvas corner (CSS).
  const alignToolbar = () => {
    if (narrow.matches) toolbar.style.right = ''
    else toolbar.style.right = wrapper.classList.contains('hide') ? '0px' : `${wrapper.getBoundingClientRect().width}px`
  }

  const panel: SidePanel = {
    get isHidden() { return wrapper.classList.contains('hide') },
    setHidden(hidden) {
      wrapper.classList.toggle('hide', hidden)
      toggleIcon?.classList.toggle('panel-hidden', hidden)
      toggle.title = hidden ? 'Paneli Göster' : 'Paneli Gizle'
      alignToolbar()
    },
  }

  toggle.addEventListener('click', () => {
    onToggle()
    panel.setHidden(!panel.isHidden)
  })

  accordion?.addEventListener('click', () => {
    const open = !toolbar.classList.contains('is-open')
    toolbar.classList.toggle('is-open', open)
    accordion.setAttribute('aria-expanded', String(open))
    accordion.title = open ? 'Araçları gizle' : 'Araçları göster'
  })

  // The handle resizes the column's width or the sheet's height, with mouse, pen or finger.
  const resizer = wrapper.querySelector<HTMLElement>('.reSizer')
  resizer?.addEventListener('pointerdown', down => {
    if (down.pointerType === 'mouse' && down.button !== 0) return
    down.preventDefault()
    const sheet = narrow.matches
    const start = sheet ? down.clientY : down.clientX
    const rect = wrapper.getBoundingClientRect()
    const startSize = sheet ? rect.height : rect.width
    resizer.setPointerCapture(down.pointerId)
    wrapper.style.transition = 'none'
    toolbar.style.transition = 'none'
    const move = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return
      const delta = (sheet ? event.clientY : event.clientX) - start
      if (sheet) {
        const maxHeight = window.innerHeight * MAX_SHEET_RATIO
        wrapper.style.height = `${Math.max(MIN_SHEET_HEIGHT, Math.min(maxHeight, startSize - delta))}px`
      } else {
        const maxWidth = Math.min(MAX_PANEL_WIDTH, window.innerWidth - CANVAS_RESERVE)
        wrapper.style.width = `${Math.max(MIN_PANEL_WIDTH, Math.min(maxWidth, startSize - delta))}px`
      }
      alignToolbar()
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return
      wrapper.style.transition = ''
      toolbar.style.transition = ''
      resizer.removeEventListener('pointermove', move)
      resizer.removeEventListener('pointerup', up)
      resizer.removeEventListener('pointercancel', up)
    }
    resizer.addEventListener('pointermove', move)
    resizer.addEventListener('pointerup', up)
    resizer.addEventListener('pointercancel', up)
  })

  // A size dragged in one layout does not apply to the other.
  narrow.addEventListener('change', () => {
    wrapper.style.width = ''
    wrapper.style.height = ''
    alignToolbar()
  })
  new ResizeObserver(alignToolbar).observe(wrapper)
  wrapper.addEventListener('transitionend', alignToolbar)
  window.addEventListener('resize', alignToolbar)
  alignToolbar()
  return panel
}
