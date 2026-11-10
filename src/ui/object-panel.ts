import type { CardModel, StylePatch, StyleSpec, UnitCircleControls } from '../app/object-cards'
import type { UnitCirclePart } from '../geometry/function-types'
import type { LineStyle, ObjectId } from '../geometry/types'
import { cardMath } from './card-math'
import { definitionText } from './card-definition'

/**
 * What every card's main row shows: the value (definition below it while selected), the
 * definition, or the command that would make the object again. Values are hidden in the
 * last two, so a class can work out a value itself.
 */
export type CardViewMode = 'value' | 'definition' | 'command'

export interface PanelEntry {
  id: ObjectId
  color: string
  visible: boolean
  card: CardModel
  /** A parameter whose value is currently being animated. */
  animating?: boolean
  /** Text shown while the card is edited; null when the object cannot be edited. */
  editText: string | null
  /** Appearance settings; null when the object is not drawn. */
  style: StyleSpec | null
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
  /** Show or hide a parameter's slider on the plane. */
  parameterOnCanvas(id: ObjectId, shown: boolean): void
  /** A unit circle's check box: A or one of its values. */
  unitCirclePart(id: ObjectId, part: UnitCirclePart, checked: boolean): void
  unitCircleUnit(id: ObjectId, unit: 'degree' | 'radian'): void
  /** Apply an edited card; true when accepted, false to keep editing (an error was shown). */
  redefine(id: ObjectId, text: string): boolean
  /** An appearance change; changes until `styleCommit` are one undoable step. */
  styleInput(id: ObjectId, patch: StylePatch): void
  styleCommit(): void
}

interface CardView {
  root: HTMLDivElement
  input: HTMLInputElement
  output: HTMLOutputElement
  /** The main row typeset as math, shown in its place while not editing. */
  math: HTMLSpanElement
  mathKey: string
  hide: HTMLButtonElement
  labels: HTMLLabelElement[]
  ranges: HTMLInputElement[]
  outputKey: string
  settings: HTMLDivElement
  bounds: HTMLInputElement[]
  play: HTMLButtonElement
  onCanvas: HTMLInputElement
  edit: HTMLButtonElement
  styleButton: HTMLButtonElement
  style: StyleView
  styleOpen: boolean
  /** Latest display text; restored when editing ends. */
  display: string
  editText: string | null
  editing: boolean
  /** A unit circle's check boxes and angle unit, made when first needed. */
  unitCircle: UnitCircleView | null
}

interface UnitCircleView {
  root: HTMLDivElement
  boxes: Map<UnitCirclePart, HTMLInputElement>
  unit: HTMLSelectElement
}

interface StyleView {
  root: HTMLDivElement
  color: HTMLInputElement
  size: HTMLInputElement
  sizeCaption: HTMLSpanElement
  lineStyle: HTMLSelectElement
  label: HTMLInputElement
  guides: HTMLInputElement
  trace: HTMLInputElement
}

const BOUND_FIELDS = [['min', 'En küçük'], ['max', 'En büyük'], ['step', 'Adım']] as const

/** Each option shows a sample of the stroke beside its name. */
const LINE_STYLES: readonly [LineStyle, string, string][] = [
  ['solid', 'Düz', '────────'], ['dashed', 'Kesikli', '– – – –'], ['dotted', 'Noktalı', '· · · · ·'],
]

const SLIDER_COUNT = 2

/** The first row of a unit circle's check boxes. */
const MAIN_PARTS = new Set<UnitCirclePart>(['sin', 'cos', 'tan', 'cot'])

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
  private mode: CardViewMode = 'value'
  private typeset = true
  private last: { entries: readonly PanelEntry[]; activeId: ObjectId | null } = { entries: [], activeId: null }

  constructor(private readonly container: HTMLElement, private readonly handlers: ObjectPanelHandlers) {}

  /** Device preferences for every card: what the main row shows and whether formulas are typeset. */
  setDisplay(mode: CardViewMode, typeset: boolean): void {
    if (mode === this.mode && typeset === this.typeset) return
    this.mode = mode
    this.typeset = typeset
    this.render(this.last.entries, this.last.activeId)
  }

  render(entries: readonly PanelEntry[], activeId: ObjectId | null): void {
    this.last = { entries, activeId }
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
    const math = element('span', 'card-math')
    math.id = `${id}-math`
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
    const canvasLabel = element('label', 'parameter-canvas')
    const onCanvas = element('input')
    onCanvas.type = 'checkbox'
    onCanvas.id = `${id}-onCanvas`
    onCanvas.addEventListener('change', () => this.handlers.parameterOnCanvas(id, onCanvas.checked))
    canvasLabel.append(onCanvas, 'Tuvalde göster')
    settings.append(canvasLabel)

    const edit = element('button', 'btn duzenle')
    edit.type = 'button'
    edit.id = `${id}-edit`
    edit.title = 'Düzenle'
    edit.setAttribute('aria-label', 'Düzenle')

    const styleButton = element('button', 'btn ayarlar')
    styleButton.type = 'button'
    styleButton.id = `${id}-style`
    styleButton.title = 'Görünüm'
    styleButton.setAttribute('aria-label', 'Görünüm')
    styleButton.setAttribute('aria-pressed', 'false')
    styleButton.addEventListener('click', () => {
      view.styleOpen = !view.styleOpen
      this.handlers.select(id)
    })
    const style = this.createStyle(id)

    input.addEventListener('click', () => { if (!view.editing) this.handlers.select(id) })
    input.addEventListener('dblclick', () => this.startEdit(view))
    // A value card shows only its value until selected.
    output.addEventListener('click', () => this.handlers.select(id))
    output.addEventListener('dblclick', () => this.startEdit(view))
    math.addEventListener('click', () => { if (!view.editing) this.handlers.select(id) })
    math.addEventListener('dblclick', () => this.startEdit(view))
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
    // A key of the on-screen keyboard takes focus for a moment and gives it back; that is not leaving.
    input.addEventListener('blur', event => {
      const next = event.relatedTarget
      if (view.editing && !(next instanceof Element && next.closest('#mathKeyboard'))) this.endEdit(view)
    })
    hide.addEventListener('click', () => this.handlers.toggleVisibility(id))
    remove.addEventListener('click', () => this.handlers.remove(id))
    block.append(math, input, output, styleButton, edit, hide, remove)
    root.append(block, sliders, settings, style.root, element('hr'))
    const view: CardView = {
      root, input, output, math, mathKey: '', hide, labels, ranges, outputKey: '', settings, bounds, play, onCanvas, edit, styleButton, style,
      styleOpen: false, display: '', editText: null, editing: false, unitCircle: null,
    }
    this.views.set(id, view)
    return view
  }

  private createStyle(id: ObjectId): StyleView {
    const root = element('div', 'style-settings')
    root.id = `${id}-settings`
    root.hidden = true
    const field = (caption: string, control: HTMLElement) => {
      const wrapper = element('label', 'style-field')
      const text = element('span')
      text.textContent = caption
      wrapper.append(text, control)
      root.append(wrapper)
      return text
    }
    const input = (type: string, field: string) => {
      const control = element('input')
      control.type = type
      control.id = `${id}-${field}`
      return control
    }
    const color = input('color', 'color')
    color.addEventListener('input', () => this.handlers.styleInput(id, { color: color.value }))
    color.addEventListener('change', () => this.handlers.styleCommit())
    field('Renk', color)
    const size = input('range', 'size')
    size.addEventListener('input', () => this.handlers.styleInput(id, { size: Number(size.value) }))
    size.addEventListener('change', () => this.handlers.styleCommit())
    const sizeCaption = field('Kalınlık', size)
    const lineStyle = element('select')
    lineStyle.id = `${id}-lineStyle`
    for (const [value, caption, sample] of LINE_STYLES) {
      const option = element('option')
      option.value = value
      option.textContent = `${caption}\u2003${sample}`
      lineStyle.append(option)
    }
    lineStyle.addEventListener('change', () => {
      this.handlers.styleInput(id, { lineStyle: lineStyle.value as LineStyle })
      this.handlers.styleCommit()
    })
    field('Çizgi', lineStyle)
    const toggles = element('div', 'style-toggles')
    const toggle = (field: string, caption: string, patch: (checked: boolean) => StylePatch) => {
      const wrapper = element('label')
      const control = input('checkbox', field)
      control.addEventListener('change', () => {
        this.handlers.styleInput(id, patch(control.checked))
        this.handlers.styleCommit()
      })
      wrapper.append(control, caption)
      toggles.append(wrapper)
      return control
    }
    const label = toggle('label', 'Etiket', checked => ({ labelHidden: !checked }))
    const guides = toggle('guides', 'Yapımı göster', checked => ({ guidesHidden: !checked }))
    const trace = toggle('trace', 'İz bırak', checked => ({ trace: checked }))
    root.append(toggles)
    return { root, color, size, sizeCaption, lineStyle, label, guides, trace }
  }

  private updateStyle(view: CardView, spec: StyleSpec | null, open: boolean): void {
    const { style } = view
    setIfChanged(view.styleButton, 'hidden', spec === null)
    view.styleButton.setAttribute('aria-pressed', String(open))
    setIfChanged(style.root, 'hidden', !open)
    if (!spec || !open) return
    setIfChanged(style.color, 'value', spec.color)
    setIfChanged(style.size.parentElement!, 'hidden', spec.size === null)
    if (spec.size) {
      setIfChanged(style.sizeCaption, 'textContent', spec.size.caption)
      setIfChanged(style.size, 'min', String(spec.size.min))
      setIfChanged(style.size, 'max', String(spec.size.max))
      setIfChanged(style.size, 'value', String(spec.size.value))
    }
    setIfChanged(style.lineStyle.parentElement!, 'hidden', spec.lineStyle === null)
    if (spec.lineStyle) setIfChanged(style.lineStyle, 'value', spec.lineStyle)
    setIfChanged(style.label.parentElement!, 'hidden', spec.label === null)
    setIfChanged(style.label, 'checked', spec.label === true)
    setIfChanged(style.guides.parentElement!, 'hidden', spec.guides === null)
    setIfChanged(style.guides, 'checked', spec.guides === true)
    setIfChanged(style.trace.parentElement!, 'hidden', spec.trace === null)
    setIfChanged(style.trace, 'checked', spec.trace === true)
  }

  /** Check boxes for A and the values (`<id>-show-sin`, …) and the angle unit (`<id>-angleUnit`). */
  private createUnitCircle(id: ObjectId, view: CardView, controls: UnitCircleControls): UnitCircleView {
    const root = element('div', 'unit-circle-options')
    root.id = `${id}-unitCircle`
    // sin, cos, tan, cot on the first row; A, sec, csc and the angle unit on the second.
    const main = element('div', 'unit-circle-row')
    const rest = element('div', 'unit-circle-row')
    root.append(main, rest)
    const boxes = new Map<UnitCirclePart, HTMLInputElement>()
    for (const toggle of controls.toggles) {
      const label = element('label', `unit-circle-toggle part-${toggle.part}`)
      const box = element('input')
      box.type = 'checkbox'
      box.id = `${id}-show-${toggle.part}`
      box.addEventListener('change', () => this.handlers.unitCirclePart(id, toggle.part, box.checked))
      label.append(box, toggle.label)
      boxes.set(toggle.part, box)
      ;(MAIN_PARTS.has(toggle.part) ? main : rest).append(label)
    }
    const unit = element('select')
    unit.id = `${id}-angleUnit`
    unit.title = 'Açı birimi'
    for (const [value, caption] of [['degree', 'Derece'], ['radian', 'Radyan']] as const) {
      const option = element('option')
      option.value = value
      option.textContent = caption
      unit.append(option)
    }
    unit.addEventListener('change', () => this.handlers.unitCircleUnit(id, unit.value as 'degree' | 'radian'))
    rest.append(unit)
    view.settings.before(root)
    return { root, boxes, unit }
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
    const mode = this.mode
    // Command view: the text that would make the object again (the edit text), when it has one.
    // Definition view: that command in words where there is a phrase for it.
    const command = entry.editText ?? card.input
    const described = mode === 'definition' ? definitionText(command) : command
    const main = mode === 'command' ? command : mode === 'definition' && described !== command ? described : card.input
    view.display = main
    view.editText = entry.editText
    view.edit.hidden = entry.editText === null
    // The text being typed is left alone until the edit ends.
    if (!view.editing) setIfChanged(view.input, 'value', main)
    const outputKey = card.output.join('\n')
    if (view.outputKey !== outputKey) {
      view.output.replaceChildren(...card.output.flatMap((line, index) => index ? [element('br'), line] : [line]))
      view.outputKey = outputKey
    }
    // Nothing to show below the definition: the card is a single row. Only the value view shows values.
    setIfChanged(view.output, 'hidden', card.output.length === 0 || mode !== 'value')
    const valueFirst = mode === 'value' && card.valueFirst
    view.root.classList.toggle('value-first', valueFirst)
    // The main row as math, when it is a formula; a definition in words wraps instead of being cut.
    const lines = valueFirst ? card.output : [main]
    const words = mode === 'definition' && described !== command
    const mathKey = words ? `words\n${main}` : this.typeset ? lines.join('\n') : ''
    if (view.mathKey !== mathKey) {
      if (words) {
        view.math.replaceChildren(main)
      } else {
        const typeset = mathKey ? lines.map(line => cardMath(line)) : []
        const ok = typeset.length > 0 && typeset.every(item => item !== null)
        view.math.replaceChildren(...(ok ? typeset.flatMap((item, index) => index ? [element('br'), item!] : [item!]) : []))
      }
      view.mathKey = mathKey
    }
    view.math.classList.toggle('is-words', words)
    const shown = view.math.childNodes.length > 0
    view.root.classList.toggle('math-output', shown && valueFirst)
    view.root.classList.toggle('math-input', shown && !valueFirst)
    view.root.classList.toggle('is-active', active)
    if (!active) view.styleOpen = false
    this.updateStyle(view, entry.style, view.styleOpen && active)
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
    const controls = card.unitCircle
    if (controls) {
      view.unitCircle ??= this.createUnitCircle(entry.id, view, controls)
      for (const toggle of controls.toggles) {
        const box = view.unitCircle.boxes.get(toggle.part)!
        setIfChanged(box, 'checked', toggle.checked)
        setIfChanged(box, 'disabled', toggle.disabled)
        box.parentElement!.classList.toggle('is-locked', toggle.disabled)
      }
      setIfChanged(view.unitCircle.unit, 'value', controls.unit)
    }
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
      setIfChanged(view.onCanvas, 'checked', settings.onCanvas)
    }
  }
}
