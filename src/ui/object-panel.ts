import type { CardModel } from '../app/object-cards'
import type { ObjectId } from '../geometry/types'

export interface PanelEntry {
  id: ObjectId
  color: string
  visible: boolean
  card: CardModel
  /** A parameter whose value is currently being animated. */
  animating?: boolean
  /** Text shown while the card is edited; null when the object cannot be edited. */
  editText: string | null
}

export interface ObjectPanelHandlers {
  select(id: ObjectId): void
  toggleVisibility(id: ObjectId): void
  remove(id: ObjectId): void
  /** Pointer or keyboard interaction with a slider begins one editable step. */
  sliderStart(): void
  sliderInput(id: ObjectId, values: number[]): void
  sliderCommit(): void
  /** New slider bounds typed on a parameter card. */
  parameterRange(id: ObjectId, min: number, max: number, step: number): void
  toggleAnimation(id: ObjectId): void
  /** Apply an edited card; true when accepted, false to keep editing (an error was shown). */
  redefine(id: ObjectId, text: string): boolean
}

interface CardView {
  root: HTMLDivElement
  input: HTMLInputElement
  output: HTMLOutputElement
  hide: HTMLButtonElement
  labels: HTMLLabelElement[]
  ranges: HTMLInputElement[]
  outputKey: string
  settings: HTMLDivElement
  bounds: HTMLInputElement[]
  play: HTMLButtonElement
  edit: HTMLButtonElement
  /** Latest display text; restored when editing ends. */
  display: string
  editText: string | null
  editing: boolean
}

const BOUND_FIELDS = [['min', 'En küçük'], ['max', 'En büyük'], ['step', 'Adım']] as const

const SLIDER_COUNT = 2

function element<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className = ''): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function setIfChanged<Target, Key extends keyof Target>(target: Target, key: Key, value: Target[Key]): void {
  if (target[key] !== value) target[key] = value
}

/**
 * Cards are keyed by object ID and updated in place, newest first. Their element IDs
 * (`<id>-input`, `<id>-sliderA`, ...) are stable across undo/redo for tests and styles.
 */
export class ObjectPanel {
  private readonly views = new Map<ObjectId, CardView>()

  constructor(private readonly container: HTMLElement, private readonly handlers: ObjectPanelHandlers) {}

  render(entries: readonly PanelEntry[], activeId: ObjectId | null): void {
    const wanted = new Set(entries.map(entry => entry.id))
    for (const [id, view] of this.views) {
      if (!wanted.has(id)) {
        view.root.remove()
        this.views.delete(id)
      }
    }
    entries.forEach((entry, index) => {
      const view = this.views.get(entry.id) ?? this.create(entry.id)
      this.update(view, entry, entry.id === activeId)
      if (this.container.children[index] !== view.root) this.container.insertBefore(view.root, this.container.children[index] ?? null)
    })
  }

  private create(id: ObjectId): CardView {
    const root = element('div')
    const block = element('div', 'expr-block')
    const input = element('input')
    input.id = `${id}-input`
    input.readOnly = true
    const output = element('output')
    output.id = `${id}-output`
    const hide = element('button', 'btn gizle')
    const remove = element('button', 'btn sil')
    remove.title = 'Sil'
    const sliders = element('div', 'sliders')
    const labels: HTMLLabelElement[] = []
    const ranges: HTMLInputElement[] = []
    for (const suffix of ['A', 'B'].slice(0, SLIDER_COUNT)) {
      const label = element('label')
      label.id = `${id}-label${suffix}`
      label.htmlFor = `${id}-slider${suffix}`
      label.style.width = '50px'
      const range = element('input')
      range.type = 'range'
      range.id = `${id}-slider${suffix}`
      range.addEventListener('pointerdown', () => this.handlers.sliderStart())
      range.addEventListener('keydown', () => this.handlers.sliderStart())
      range.addEventListener('input', () => this.handlers.sliderInput(id, ranges.map(item => Number(item.value))))
      range.addEventListener('change', () => this.handlers.sliderCommit())
      labels.push(label)
      ranges.push(range)
      sliders.append(label, range)
    }
    // Parameter cards: editable slider bounds and an animation toggle, shown while selected.
    const settings = element('div', 'parameter-settings')
    settings.hidden = true
    const bounds = BOUND_FIELDS.map(([field, title]) => {
      const label = element('label', 'parameter-bound')
      const caption = element('span')
      caption.textContent = title
      const bound = element('input')
      bound.type = 'number'
      bound.id = `${id}-${field}`
      bound.addEventListener('change', () => {
        const [min, max, step] = bounds.map(item => Number(item.value))
        this.handlers.parameterRange(id, min!, max!, step!)
      })
      label.append(caption, bound)
      settings.append(label)
      return bound
    })
    const play = element('button', 'btn parameter-play')
    play.type = 'button'
    play.id = `${id}-play`
    play.addEventListener('click', () => this.handlers.toggleAnimation(id))
    settings.append(play)

    const edit = element('button', 'btn duzenle')
    edit.type = 'button'
    edit.id = `${id}-edit`
    edit.title = 'Düzenle'
    edit.setAttribute('aria-label', 'Düzenle')

    input.addEventListener('click', () => { if (!view.editing) this.handlers.select(id) })
    input.addEventListener('dblclick', () => this.startEdit(view))
    // Keep the input focused when the button is pressed, so blur does not end the edit first.
    edit.addEventListener('mousedown', event => event.preventDefault())
    edit.addEventListener('click', () => {
      this.handlers.select(id)
      if (view.editing) this.endEdit(view)
      else this.startEdit(view)
    })
    input.addEventListener('keydown', event => {
      if (!view.editing) {
        if (event.key === 'Enter' || event.key === 'F2') this.startEdit(view)
        return
      }
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        event.stopPropagation()
        if (this.handlers.redefine(id, input.value)) this.endEdit(view)
      } else if (event.key === 'Escape') {
        event.stopPropagation()
        this.endEdit(view)
      }
    })
    input.addEventListener('blur', () => { if (view.editing) this.endEdit(view) })
    hide.addEventListener('click', () => this.handlers.toggleVisibility(id))
    remove.addEventListener('click', () => this.handlers.remove(id))
    block.append(input, output, edit, hide, remove)
    root.append(block, sliders, settings, element('hr'))
    const view: CardView = {
      root, input, output, hide, labels, ranges, outputKey: '', settings, bounds, play, edit,
      display: '', editText: null, editing: false,
    }
    this.views.set(id, view)
    return view
  }

  private startEdit(view: CardView): void {
    if (view.editing || view.editText === null) return
    view.editing = true
    view.input.readOnly = false
    view.input.value = view.editText
    view.root.classList.add('is-editing')
    view.input.focus()
    view.input.select()
  }

  private endEdit(view: CardView): void {
    view.editing = false
    view.input.readOnly = true
    view.input.value = view.display
    view.root.classList.remove('is-editing')
  }

  private update(view: CardView, entry: PanelEntry, active: boolean): void {
    const { card } = entry
    view.display = card.input
    view.editText = entry.editText
    view.edit.hidden = entry.editText === null
    // The text being typed is left alone until the edit ends.
    if (!view.editing) setIfChanged(view.input, 'value', card.input)
    const outputKey = card.output.join('\n')
    if (view.outputKey !== outputKey) {
      view.output.replaceChildren(...card.output.flatMap((line, index) => index ? [element('br'), line] : [line]))
      view.outputKey = outputKey
    }
    view.input.style.backgroundColor = active ? '#eaf3ff' : ''
    view.output.style.backgroundColor = active ? '#f2f7ff' : ''
    view.hide.title = entry.visible ? 'Gizle' : 'Göster'
    view.hide.style.background = entry.visible ? entry.color : 'transparent'
    // A parameter's slider is its main control and stays visible; others show when selected.
    const pinned = card.parameter !== undefined
    view.ranges.forEach((range, index) => {
      const spec = card.sliders[index]
      const label = view.labels[index]!
      const hidden = !spec || !(active || pinned)
      setIfChanged(range, 'hidden', hidden)
      setIfChanged(label, 'hidden', hidden || !spec?.label)
      if (!spec) return
      // Bounds before value, so the browser does not clamp the value to stale bounds.
      setIfChanged(range, 'min', String(spec.min))
      setIfChanged(range, 'max', String(spec.max))
      setIfChanged(range, 'step', String(spec.step))
      setIfChanged(range, 'value', String(spec.value))
      setIfChanged(label, 'textContent', spec.label)
    })
    const settings = card.parameter
    setIfChanged(view.settings, 'hidden', !settings || !active)
    if (settings) {
      view.bounds.forEach((bound, index) => {
        // Do not overwrite a bound while it is being typed.
        if (document.activeElement !== bound) setIfChanged(bound, 'value', String(settings[BOUND_FIELDS[index]![0]]))
      })
      const label = entry.animating ? 'Durdur' : 'Oynat'
      setIfChanged(view.play, 'title', label)
      setIfChanged(view.play, 'textContent', entry.animating ? '⏸' : '▶')
      view.play.setAttribute('aria-label', label)
    }
  }
}
