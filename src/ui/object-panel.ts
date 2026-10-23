import type { CardModel } from '../app/object-cards'
import type { ObjectId } from '../geometry/types'

export interface PanelEntry {
  id: ObjectId
  color: string
  visible: boolean
  card: CardModel
}

export interface ObjectPanelHandlers {
  select(id: ObjectId): void
  toggleVisibility(id: ObjectId): void
  remove(id: ObjectId): void
  /** Pointer or keyboard interaction with a slider begins one editable step. */
  sliderStart(): void
  sliderInput(id: ObjectId, values: number[]): void
  sliderCommit(): void
}

interface CardView {
  root: HTMLDivElement
  input: HTMLInputElement
  output: HTMLOutputElement
  hide: HTMLButtonElement
  labels: HTMLLabelElement[]
  ranges: HTMLInputElement[]
  outputKey: string
}

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
    input.addEventListener('click', () => this.handlers.select(id))
    hide.addEventListener('click', () => this.handlers.toggleVisibility(id))
    remove.addEventListener('click', () => this.handlers.remove(id))
    block.append(input, output, hide, remove)
    root.append(block, sliders, element('hr'))
    const view = { root, input, output, hide, labels, ranges, outputKey: '' }
    this.views.set(id, view)
    return view
  }

  private update(view: CardView, entry: PanelEntry, active: boolean): void {
    const { card } = entry
    setIfChanged(view.input, 'value', card.input)
    const outputKey = card.output.join('\n')
    if (view.outputKey !== outputKey) {
      view.output.replaceChildren(...card.output.flatMap((line, index) => index ? [element('br'), line] : [line]))
      view.outputKey = outputKey
    }
    view.input.style.backgroundColor = active ? '#eaf3ff' : ''
    view.output.style.backgroundColor = active ? '#f2f7ff' : ''
    view.hide.title = entry.visible ? 'Gizle' : 'Göster'
    view.hide.style.background = entry.visible ? entry.color : 'transparent'
    view.ranges.forEach((range, index) => {
      const spec = card.sliders[index]
      const label = view.labels[index]!
      const hidden = !spec || !active
      setIfChanged(range, 'hidden', hidden)
      setIfChanged(label, 'hidden', hidden)
      if (!spec) return
      // Bounds before value, so the browser does not clamp the value to stale bounds.
      setIfChanged(range, 'min', String(spec.min))
      setIfChanged(range, 'max', String(spec.max))
      setIfChanged(range, 'step', String(spec.step))
      setIfChanged(range, 'value', String(spec.value))
      setIfChanged(label, 'textContent', spec.label)
    })
  }
}
