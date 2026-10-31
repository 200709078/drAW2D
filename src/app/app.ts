import { createObjectName, type ObjectNameGroup } from '../commands/names'
import { parseCommand } from '../commands/parser'
import { prepareCommand } from '../commands/prepare'
import { collectDependents, resolveConstraints } from '../document/dependencies'
import { baseName, DEFAULT_FILE_NAME, FILE_EXTENSION, parseDocument, serializeDocument, type DocumentFile } from '../document/file-format'
import { growPointSets } from '../document/point-sets'
import { recomputeDefinitions, redefineParameter, setParameterRange } from '../document/definitions'
import { redefineObject } from '../document/redefine'
import { GeometryDocument } from '../document/geometry-document'
import { createGeometryModels } from '../geometry/models'
import type { NumericPoint } from '../geometry/primitives'
import type { ObjectId } from '../geometry/types'
import { createCanvasSurface } from '../rendering/canvas-surface'
import { nextSliderPosition, sliderAt, sliderValueAt } from '../rendering/canvas-slider'
import { createGridRenderer, drawGridDirect, snapToGrid } from '../rendering/coordinate-grid'
import { createFrameRenderer, createSceneOrder } from '../rendering/frame-renderer'
import { createFunctionEvaluator } from '../rendering/function-evaluator'
import type { DrawingContext, PainterFrame } from '../rendering/painter-types'
import { paintDocumentScene } from '../rendering/scene-painter'
import { SvgContext } from '../rendering/svg-context'
import { createTransientPainter } from '../rendering/transient-painter'
import { bindCommandInput } from '../ui/command-input'
import { bindCommandTemplates } from '../ui/command-templates'
import { createMathKeyboard } from '../ui/math-keyboard'
import { createHelpPopup } from '../ui/help-popup'
import { ObjectPanel } from '../ui/object-panel'
import { createToolbar } from '../ui/main-toolbar'
import { createSidePanel, NARROW_LAYOUT_QUERY } from '../ui/side-panel'
import { createFileMenu } from '../ui/file-menu'
import { closePrompt, promptValue } from '../ui/prompt-dialog'
import { createToast } from '../ui/toast'
import type { ToolAction } from '../ui/tool-registry'
import { HIT_TOLERANCE_PX, hitTest } from './hit-test'
import { applyStyle, describeCard, editText, setUnitCirclePart, setUnitCircleUnit, styleSpec } from './object-cards'
import { beginObjectDrag, moveObjectDrag, type ObjectDrag } from './object-drag'
import { exportFile, openDocumentFile, readHandedFile, saveDocumentFile, type FileTarget, type OpenedFile } from './files'
import { bindAndroid } from './native'
import { ToolController, type ToolInput, type ToolOutcome } from './tools'
import { TraceRecorder } from './traces'
import { ViewportState, type PixelPoint, type ViewAxis } from './viewport-state'

const AXIS_GRAB_PX = 8
const TOUCH_AXIS_GRAB_PX = 16
const TOUCH_HIT_TOLERANCE_PX = 22
const TRACKPAD_ZOOM_RATE = 0.01
/** An animated parameter sweeps from its minimum to its maximum in this time, then back. */
const ANIMATION_SWEEP_MS = 4000
const AUTOSAVE_KEY = 'drAW2D.autosave'
/** On unless turned off; a preference of this device, not of the document. */
const GRID_SNAP_KEY = 'drAW2D.gridSnap'
/** A press trembles this far (CSS px) without being a drag, so selecting does not snap a point away. */
const DRAG_SLOP_PX = 3
const TOUCH_DRAG_SLOP_PX = 8
const AUTOSAVE_DELAY = 1000

function required<Element extends HTMLElement>(id: string): Element {
  const element = document.getElementById(id)
  if (!element) throw new Error(`drAW2D arayüz öğesi bulunamadı: ${id}`)
  return element as Element
}

/** A random, slightly darkened color that stays readable on the white plane. */
function randomColor(): string {
  const channel = () => Math.round(Math.random() * 255 * 0.75).toString(16).padStart(2, '0')
  return `#${channel()}${channel()}${channel()}`
}

function storedGridSnap(): boolean {
  try {
    return localStorage.getItem(GRID_SNAP_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Composition root: owns the document, the view and every DOM binding of the application. */
export function startApp(): void {
  const canvas = required<HTMLCanvasElement>('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2B bağlamı oluşturulamadı.')
  const commandInput = required<HTMLInputElement>('giris')
  const undoButton = required<HTMLButtonElement>('undo')
  const redoButton = required<HTMLButtonElement>('redo')
  const clearButton = required<HTMLButtonElement>('clear')

  const geometry = new GeometryDocument()
  const view = new ViewportState()
  const surface = createCanvasSurface(canvas, ctx)
  const grid = createGridRenderer()
  const sceneOrder = createSceneOrder<GeometryDocument['objects'][number]>()
  const evaluator = createFunctionEvaluator()
  const showToast = createToast()
  const clearSound = new Audio('sound/clear.mp3')

  const createName = (group: ObjectNameGroup) => createObjectName(group, geometry.objects.map(object => object.name))
  const nextId = () => geometry.allocateId()
  const models = createGeometryModels({ createName, nextId, randomColor })
  /** The visible x range, rounded outwards to hundredths: the default analysis search range. */
  const visibleRange = () => {
    const { left, right } = transform().bounds
    return { start: Math.floor(left * 100) / 100, end: Math.ceil(right * 100) / 100 }
  }
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, geometry.objects, { nextId: geometry.nextId, randomColor, range: visibleRange() })
  const tools = new ToolController({ document: geometry, models, prepare, visibleRange })
  /** Recompute what depends on the changed parameters or functions. */
  const recompute = (changed: Iterable<string>) => recomputeDefinitions(geometry.objects, prepare, changed)
  const parameterById = (id: ObjectId) => {
    const object = geometry.objects.find(item => item.id === id)
    return object?.type === 'parameter' ? object : null
  }

  let cursor: ToolInput | null = null
  let objectDrag: ObjectDrag | null = null
  let gridSnap = storedGridSnap()
  /** Where a snapping drag was pressed, until the pointer leaves the press. */
  let dragPress: PixelPoint | null = null
  /** Positions and shapes traced objects passed through, in plane coordinates; not part of the document. */
  const traces = new TraceRecorder()
  /** A canvas slider being dragged: its value, or its position by the caption. */
  let sliderDrag: { id: ObjectId; part: 'track' | 'caption'; offset: { x: number; y: number } } | null = null
  let grabbing = false
  /** Pressed pointers on the canvas, in press order. */
  const pointers = new Map<number, PixelPoint>()
  /** The pointer that drives the current single-pointer gesture. */
  let primary: number | null = null
  /** A touch pointer aiming a construction tool; it acts when lifted. */
  let aiming: number | null = null
  /** A pinch happened; remaining pointers are ignored until all are lifted. */
  let multiTouch = false

  const transform = () => view.transform(surface.width, surface.height)
  const frameRenderer = createFrameRenderer(paint)
  if (import.meta.hot) import.meta.hot.dispose(() => frameRenderer.dispose())

  function paint(): void {
    surface.resize()
    surface.prepare()
    grid.draw(ctx!, view.viewport(surface.width, surface.height), surface.pixelRatio)
    const frame: PainterFrame = {
      ctx: ctx!,
      transform: transform(),
      width: surface.width,
      height: surface.height,
      activeId: geometry.activeId,
      objects: sceneOrder.get(geometry.objects),
      evaluator,
      traces: traces.frames(geometry.objects),
    }
    paintDocumentScene(frame)
    tools.paintPreview(createTransientPainter(frame), cursor)
  }

  /** The drawing as vector graphics: the same painters, recorded into SVG. */
  function svgDrawing(): string {
    const svg = new SvgContext(surface.width, surface.height)
    drawGridDirect(svg as unknown as CanvasRenderingContext2D, view.viewport(surface.width, surface.height))
    paintDocumentScene({
      ctx: svg as unknown as DrawingContext, transform: transform(), width: surface.width, height: surface.height,
      activeId: null, objects: sceneOrder.get(geometry.objects), evaluator, traces: traces.frames(geometry.objects),
    })
    return svg.toString()
  }

  const panel = new ObjectPanel(required('objectsContainer'), {
    select: selectObject,
    toggleVisibility(id) {
      // Selecting first cancels a half-finished tool, which may remove this very draft.
      selectObject(id)
      const object = geometry.objects.find(item => item.id === id)
      if (!object) return
      object.visibility = !object.visibility
      commit()
      refresh()
    },
    remove(id) {
      commitSlider()
      stopAnimation(id, false)
      resetInteraction()
      // Dependent constructions go with the object; one history step restores all of them.
      for (const dependent of collectDependents(geometry.objects, [id])) geometry.remove(dependent)
      commit()
      refresh()
    },
    sliderStart: () => geometry.beginEdit(),
    sliderInput(id, values) {
      const parameter = parameterById(id)
      const [value] = values
      if (!parameter || parameter.definition || value === undefined || !Number.isFinite(value)) return
      if (!geometry.isEditing) geometry.beginEdit()
      parameter.value = value
      recompute([parameter.name!])
      refresh()
    },
    sliderCommit: commitSlider,
    parameterRange(id, min, max, step) {
      const parameter = parameterById(id)
      if (!parameter) return
      commitSlider()
      const result = setParameterRange(parameter, min, max, step)
      if (result.ok) {
        recompute([parameter.name!])
        commit()
      } else {
        showToast('Kaydırıcı', result.error)
      }
      refresh()
    },
    toggleAnimation(id) {
      if (animations.has(id)) stopAnimation(id)
      else startAnimation(id)
    },
    unitCirclePart(id, part, checked) {
      const object = geometry.objects.find(item => item.id === id)
      if (object?.type !== 'unitCircle') return
      commitSlider()
      if (setUnitCirclePart(object, part, checked)) commit()
      refresh()
    },
    unitCircleUnit(id, unit) {
      const object = geometry.objects.find(item => item.id === id)
      if (object?.type !== 'unitCircle') return
      commitSlider()
      if (setUnitCircleUnit(object, unit)) commit()
      refresh()
    },
    parameterOnCanvas(id, shown) {
      const parameter = parameterById(id)
      if (!parameter) return
      commitSlider()
      if (shown) parameter.onCanvas = nextSliderPosition(geometry.objects)
      else delete parameter.onCanvas
      commit()
      refresh()
    },
    redefine(id, text) {
      const target = geometry.objects.find(object => object.id === id)
      const current = target ? editText(target, { objects: geometry.objects }) : null
      if (!target || current === null) return true
      commitSlider()
      if (tools.action !== 'select' || geometry.hasDraft) resetInteraction()
      const result = redefineObject(geometry.objects, target, text, current, prepare)
      if (!result.ok) {
        showToast('Düzenle', result.error.replace(/^İfade oluşturulamadı\.\s*/, ''))
        return false
      }
      for (const removed of result.remove) geometry.remove(removed)
      geometry.append(...result.append)
      recompute(result.changedNames)
      geometry.activeId = id
      commit()
      refresh()
      return true
    },
    styleInput(id, patch) {
      const object = geometry.objects.find(item => item.id === id)
      if (!object) return
      if (!geometry.isEditing) geometry.beginEdit()
      if (applyStyle(object, patch)) refresh()
    },
    styleCommit() {
      commitSlider()
      refresh()
    },
  })

  // --- Parameter animation -------------------------------------------------------
  /** Animated parameters: the unsnapped position and the sweep direction. */
  const animations = new Map<ObjectId, { position: number; direction: 1 | -1 }>()
  let animationFrame: number | null = null
  let lastFrameTime: number | null = null

  function startAnimation(id: ObjectId): void {
    const parameter = parameterById(id)
    if (!parameter || parameter.definition) return
    commitSlider()
    animations.set(id, { position: parameter.value, direction: parameter.value >= parameter.max ? -1 : 1 })
    if (animationFrame === null) animationFrame = requestAnimationFrame(animate)
    refresh()
  }

  /** Stop one animation; the values it reached become one undoable step. */
  function stopAnimation(id: ObjectId, record = true): void {
    if (!animations.delete(id)) return
    if (record) {
      commit()
      refresh()
    }
  }

  /** Undo, redo and clear replace the document: animations end without a history step. */
  function stopAllAnimations(): void {
    animations.clear()
  }

  function animate(time: number): void {
    animationFrame = null
    const elapsed = lastFrameTime === null ? 0 : Math.min(100, time - lastFrameTime)
    lastFrameTime = time
    const changed: string[] = []
    for (const [id, state] of animations) {
      const parameter = parameterById(id)
      if (!parameter || parameter.definition) {
        animations.delete(id)
        continue
      }
      const { min, max, step } = parameter
      state.position += state.direction * (max - min) * elapsed / ANIMATION_SWEEP_MS
      if (state.position >= max) [state.position, state.direction] = [max, -1]
      else if (state.position <= min) [state.position, state.direction] = [min, 1]
      // Values stay on the slider's step grid; rounding removes float noise from the grid.
      const snapped = Number((min + Math.round((state.position - min) / step) * step).toPrecision(12))
      if (snapped !== parameter.value) {
        parameter.value = Math.min(max, Math.max(min, snapped))
        changed.push(parameter.name!)
      }
    }
    if (changed.length) {
      recompute(changed)
      refresh()
    }
    if (animations.size) animationFrame = requestAnimationFrame(animate)
    else lastFrameTime = null
  }

  /** Resolve every constrained point; analysis sets that found more solutions get more points first. */
  function settle(): void {
    growPointSets(geometry.objects, (a, b) => {
      const point = new models.mPoint(a, b)
      geometry.append(point)
      return point
    })
    resolveConstraints(geometry.objects)
  }

  /** Bring dependent geometry, cards, history buttons and the next frame up to date. */
  function refresh(): void {
    settle()
    traces.record(geometry.objects, { transform: transform(), width: surface.width, height: surface.height, evaluator })
    const context = { objects: geometry.objects }
    const entries = geometry.objects.filter(object => !(object.type === 'point' && object.hideInLabels)).reverse()
      .map(object => ({
        id: object.id!, color: object.color, visible: object.visibility,
        card: describeCard(object, context), animating: animations.has(object.id!),
        editText: editText(object, context), style: styleSpec(object),
      }))
    panel.render(entries, geometry.activeId)
    undoButton.disabled = !geometry.canUndo
    redoButton.disabled = !geometry.canRedo
    clearButton.disabled = geometry.objects.length === 0
    frameRenderer.request()
    scheduleAutosave()
  }

  function commit(): void {
    settle()
    geometry.commit()
  }

  function commitSlider(): void {
    if (!geometry.isEditing) return
    settle()
    geometry.commitEdit()
  }

  function endDrag(): void {
    grabbing = false
    objectDrag = null
    sliderDrag = null
    aiming = null
    view.endDrag()
  }

  /** Abandon edits and drafts, deselect and return to the select tool, without repainting. */
  function resetInteraction(): void {
    geometry.cancelEdit()
    geometry.cancelDraft()
    tools.reset()
    endDrag()
    geometry.activeId = null
    toolbar.select('select', { showToast: false })
  }

  function cancelInteraction(): void {
    resetInteraction()
    refresh()
  }

  function activateTool(action: ToolAction): void {
    if (action === tools.action) return
    commitSlider()
    endDrag()
    geometry.cancelDraft()
    tools.setAction(action)
    geometry.activeId = null
    refresh()
  }

  function selectObject(id: ObjectId): void {
    commitSlider()
    if (tools.action !== 'select' || geometry.hasDraft) resetInteraction()
    geometry.activeId = id
    refresh()
  }

  function submitCommand(source: string): void {
    commitSlider()
    resetInteraction()
    const parsed = parseCommand(source)
    // `a=3` for an existing parameter changes it instead of creating a new object.
    if (parsed.ok && parsed.command.kind === 'parameter') {
      const name = parsed.command.name
      const existing = geometry.objects.find(object => object.name === name)
      if (existing?.type === 'parameter') {
        const result = redefineParameter(geometry.objects, existing, parsed.command.value)
        if (result.ok) {
          recompute([name])
          geometry.activeId = existing.id
          commit()
        } else {
          showToast('GİRİŞ', result.error)
        }
        refresh()
        return
      }
    }
    const prepared = parsed.ok ? prepare(parsed.command) : parsed
    if (prepared.ok) {
      geometry.append(...prepared.objects)
      geometry.activeId = prepared.activeId
      commit()
    } else {
      showToast('GİRİŞ', prepared.error)
    }
    refresh()
  }

  function canvasPixel(event: MouseEvent): PixelPoint {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  // Fingers cover more of the screen than a mouse cursor or a pen tip.
  const isTouch = (event: PointerEvent) => event.pointerType === 'touch'

  function pointerInput(pixel: PixelPoint, touch: boolean): ToolInput {
    const current = transform()
    const position = { a: current.pixelToX(pixel.x), b: current.pixelToY(pixel.y) }
    const options = { transform: current, evaluator, tolerance: touch ? TOUCH_HIT_TOLERANCE_PX : HIT_TOLERANCE_PX, width: surface.width, height: surface.height }
    const hit = hitTest(geometry.objects, position, options)
    if (!gridSnap || tools.action === 'select') return { position, hit }
    // The corner may already hold a point beyond the hit tolerance: that point is used, not doubled.
    const corner = snapPosition(position)
    const standing = hitTest(geometry.objects, corner, { ...options, tolerance: 1 })
    return { position, hit, grid: { position: corner, point: standing?.kind === 'point' ? standing.object : null } }
  }

  function snapPosition(position: NumericPoint): NumericPoint {
    return snapToGrid(view.viewport(surface.width, surface.height), position)
  }

  function axisAt(pixel: PixelPoint, touch: boolean): ViewAxis | null {
    const { originX, originY } = transform()
    const grab = touch ? TOUCH_AXIS_GRAB_PX : AXIS_GRAB_PX
    const nearX = originY >= 0 && originY <= surface.height && Math.abs(pixel.y - originY) <= grab
    const nearY = originX >= 0 && originX <= surface.width && Math.abs(pixel.x - originX) <= grab
    if (nearX && nearY) return Math.abs(pixel.y - originY) <= Math.abs(pixel.x - originX) ? 'xAxis' : 'yAxis'
    return nearX ? 'xAxis' : nearY ? 'yAxis' : null
  }

  const axisCursor = (axis: ViewAxis) => axis === 'xAxis' ? 'ew-resize' : 'ns-resize'

  /** False while a snapping drag's pointer still trembles where it was pressed. */
  function leftPress(pixel: PixelPoint, touch: boolean): boolean {
    if (!dragPress) return true
    if (Math.hypot(pixel.x - dragPress.x, pixel.y - dragPress.y) < (touch ? TOUCH_DRAG_SLOP_PX : DRAG_SLOP_PX)) return false
    dragPress = null
    return true
  }

  function moveDragged(position: NumericPoint): void {
    if (!objectDrag) return
    moveObjectDrag(objectDrag, position, gridSnap ? snapPosition : undefined)
    // A moved equation line or graph is used by name in other definitions; A turns an angle parameter.
    const name = objectDrag.line?.object.name ?? objectDrag.angle?.parameter.name
    if (name) recompute([name])
  }

  function pressTool(input: ToolInput): void {
    handleOutcome(tools.action, tools.press(input))
  }

  /** Show a tool's message; a completed construction is one history step, a question is asked first. */
  function handleOutcome(action: ToolAction, outcome: ToolOutcome): void {
    if (outcome.message) showToast(outcome.message.title, outcome.message.text)
    if (outcome.ask) {
      const question = outcome.ask
      refresh()
      void promptValue(question).then(text => {
        if (text === null || tools.action !== action) {
          cancelInteraction()
          return
        }
        const answer = question.answer(text)
        if (!answer.completed) {
          if (answer.message) showToast(answer.message.title, answer.message.text)
          cancelInteraction()
          return
        }
        handleOutcome(action, answer)
      })
      return
    }
    if (outcome.completed) {
      commit()
      // Return to selection, keeping the new construction selected. The finishing
      // press does not also start a drag, because it began with another tool.
      const created = geometry.activeId
      if (action !== 'point') toolbar.select('select', { showToast: false })
      geometry.activeId = created
    }
    refresh()
  }

  function beginSelectGesture(input: ToolInput, pixel: PixelPoint, touch: boolean): void {
    const { hit } = input
    if (hit) geometry.activeId = hit.object.id
    grabbing = true
    // Objects computed from others or from parameters are selected, not dragged.
    objectDrag = hit ? beginObjectDrag(hit.object, geometry.objects, input.position, dragPrecision(), grabRadius(touch)) : null
    if (objectDrag) {
      dragPress = gridSnap ? pixel : null
      geometry.beginEdit()
      canvas.style.cursor = 'grabbing'
    } else if (!hit) {
      const axis = axisAt(pixel, touch)
      if (axis) view.beginAxisDrag(axis, pixel, transform())
      else view.beginPan(pixel)
      canvas.style.cursor = axis ? axisCursor(axis) : 'grabbing'
    }
    refresh()
  }

  /** A second pointer turns any single-pointer gesture into a pinch; the first one is abandoned. */
  function beginPinch(): void {
    if (objectDrag) geometry.cancelEdit()
    endDrag()
    aiming = null
    primary = null
    cursor = null
    multiTouch = true
    const [first, second] = pointers.values()
    view.beginPinch(first!, second!, transform())
    refresh()
  }

  /** How near a handle (a unit circle's A) the pointer must be, in plane units. */
  function grabRadius(touch: boolean): number {
    return (touch ? TOUCH_HIT_TOLERANCE_PX : HIT_TOLERANCE_PX) / transform().pixelsPerUnitX
  }

  /** A dragged graph's offset is rounded to about a pixel, so its equation stays short. */
  function dragPrecision(): number {
    return 10 ** Math.floor(Math.log10(1 / transform().pixelsPerUnitX))
  }

  /** Move a canvas slider's knob or the whole slider. */
  function moveSlider(pixel: PixelPoint): void {
    const parameter = sliderDrag ? parameterById(sliderDrag.id) : null
    if (!sliderDrag || !parameter?.onCanvas) return
    if (sliderDrag.part === 'caption') {
      parameter.onCanvas = { x: pixel.x - sliderDrag.offset.x, y: pixel.y - sliderDrag.offset.y }
    } else if (!parameter.definition) {
      const value = sliderValueAt(parameter, pixel.x)
      if (value === parameter.value) return
      parameter.value = value
      recompute([parameter.name!])
    }
    refresh()
  }

  function finishPointer(event: PointerEvent, cancelled: boolean): void {
    if (!pointers.delete(event.pointerId)) return
    if (multiTouch) {
      // Fingers left after a pinch do nothing until all of them are lifted.
      if (pointers.size < 2) view.endPinch()
      if (pointers.size === 0) multiTouch = false
      refresh()
      return
    }
    if (event.pointerId !== primary) return
    primary = null
    const pixel = canvasPixel(event)
    const touch = isTouch(event)
    if (sliderDrag) {
      if (cancelled) geometry.cancelEdit()
      else commitSlider()
      endDrag()
      refresh()
      return
    }
    if (aiming === event.pointerId) {
      aiming = null
      cursor = null
      if (!cancelled) pressTool(pointerInput(pixel, true))
      else refresh()
      return
    }
    if (objectDrag) {
      if (cancelled) {
        geometry.cancelEdit()
      } else {
        if (leftPress(pixel, touch)) moveDragged(pointerInput(pixel, touch).position)
        resolveConstraints(geometry.objects)
        geometry.commitEdit()
      }
    } else if (view.isDragging && !cancelled) {
      view.drag(pixel)
    }
    endDrag()
    canvas.style.cursor = 'default'
    if (touch) cursor = null
    refresh()
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const pixel = canvasPixel(event)
    pointers.set(event.pointerId, pixel)
    try {
      // Keep receiving this pointer when it leaves the canvas, e.g. over the panel.
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic events have no active pointer to capture; window listeners still finish them.
    }
    if (pointers.size >= 2) {
      if (!multiTouch) beginPinch()
      return
    }
    primary = event.pointerId
    commitSlider()
    const touch = isTouch(event)
    // Canvas sliders take the pointer with any tool.
    const slider = sliderAt(geometry.objects, pixel.x, pixel.y, touch)
    if (slider) {
      geometry.beginEdit()
      geometry.activeId = slider.parameter.id
      const origin = slider.parameter.onCanvas!
      sliderDrag = { id: slider.parameter.id!, part: slider.part, offset: { x: pixel.x - origin.x, y: pixel.y - origin.y } }
      moveSlider(pixel)
      refresh()
      return
    }
    const input = pointerInput(pixel, touch)
    cursor = input
    if (tools.action === 'select') {
      beginSelectGesture(input, pixel, touch)
    } else if (touch) {
      // A finger aims: the preview follows it and the construction happens on release.
      aiming = event.pointerId
      frameRenderer.request()
    } else {
      pressTool(input)
    }
  })

  canvas.addEventListener('pointermove', event => {
    const pixel = canvasPixel(event)
    const touch = isTouch(event)
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, pixel)
      if (view.isPinching) {
        const [first, second] = pointers.values()
        if (second && view.pinch(first!, second)) refresh()
        return
      }
      if (multiTouch || event.pointerId !== primary) return
      if (sliderDrag) {
        moveSlider(pixel)
        return
      }
    }
    const input = pointerInput(pixel, touch)
    cursor = input
    if (aiming === event.pointerId) {
      frameRenderer.request()
      return
    }
    if (objectDrag) {
      if (!leftPress(pixel, touch)) return
      moveDragged(input.position)
      refresh()
      return
    }
    if (grabbing && view.drag(pixel)) {
      refresh()
      return
    }
    const axis = tools.action === 'select' && !input.hit ? axisAt(pixel, touch) : null
    const movable = tools.action === 'select' && input.hit
      && beginObjectDrag(input.hit.object, geometry.objects, input.position, undefined, grabRadius(touch))
    const slider = sliderAt(geometry.objects, pixel.x, pixel.y, touch)
    canvas.style.cursor = slider ? (slider.part === 'caption' ? 'move' : 'ew-resize')
      : movable ? 'grab' : input.hit ? 'pointer' : axis ? axisCursor(axis) : 'default'
    if (tools.isConstructing) frameRenderer.request()
  })

  canvas.addEventListener('pointerleave', event => {
    // Hover leaves; a pressed pointer is captured and keeps its gesture.
    if (pointers.has(event.pointerId)) return
    cursor = null
    if (tools.isConstructing) frameRenderer.request()
  })

  // Window listeners also finish gestures whose pointer could not be captured.
  window.addEventListener('pointerup', event => finishPointer(event, false))
  window.addEventListener('pointercancel', event => finishPointer(event, true))

  canvas.addEventListener('wheel', event => {
    event.preventDefault()
    if (event.deltaY === 0) return
    const anchor = canvasPixel(event)
    // Trackpad pinches arrive as ctrl+wheel with small deltas: zoom continuously.
    const changed = event.ctrlKey
      ? view.zoomBy(Math.exp(-event.deltaY * TRACKPAD_ZOOM_RATE), anchor, transform())
      : view.zoom(event.deltaY < 0, anchor, transform())
    if (changed) refresh()
  }, { passive: false })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelInteraction()
  })

  undoButton.addEventListener('click', () => {
    stopAllAnimations()
    geometry.undo()
    resetInteraction()
    refresh()
  })
  redoButton.addEventListener('click', () => {
    stopAllAnimations()
    geometry.redo()
    resetInteraction()
    refresh()
  })
  clearButton.addEventListener('click', () => {
    stopAllAnimations()
    resetInteraction()
    if (geometry.clear()) {
      commit()
      clearSound.play().catch(() => undefined)
    }
    refresh()
  })

  // --- Documents: .drw2 files, the autosave and exports ------------------------------
  let fileName: string | null = null
  let fileTarget: FileTarget | null = null
  let autosaveTimer: number | null = null
  let autosaved = ''

  function documentText(): string {
    return serializeDocument({ objects: [...geometry.objects], view: { ...view.snapshot } })
  }

  function autosave(): void {
    if (autosaveTimer !== null) window.clearTimeout(autosaveTimer)
    autosaveTimer = null
    // Half-finished tool drawings are not saved.
    if (geometry.hasDraft) return
    const text = documentText()
    if (text === autosaved) return
    try {
      localStorage.setItem(AUTOSAVE_KEY, text)
      autosaved = text
    } catch {
      // Storage full or refused (private window): the work is kept only in this page.
    }
  }

  function scheduleAutosave(): void {
    if (autosaveTimer === null) autosaveTimer = window.setTimeout(autosave, AUTOSAVE_DELAY)
  }
  window.addEventListener('pagehide', autosave)

  /** Bring a loaded document's computed values up to date; false if it does not resolve. */
  function resolveLoaded(): boolean {
    try {
      recomputeDefinitions(geometry.objects, prepare)
      settle()
      return true
    } catch {
      return false
    }
  }

  /** Replace the document with a file's objects, as one undoable step. */
  function loadDocument(file: DocumentFile, name: string): boolean {
    stopAllAnimations()
    resetInteraction()
    const previous = structuredClone([...geometry.objects])
    geometry.clear()
    try {
      geometry.append(...file.objects)
    } catch {
      geometry.append(...previous)
      return false
    }
    if (!resolveLoaded()) {
      geometry.clear()
      geometry.append(...previous)
      settle()
      return false
    }
    traces.clear()
    if (file.view) view.restore(file.view)
    fileName = name
    commit()
    refresh()
    return true
  }

  async function openFile(): Promise<void> {
    let opened: OpenedFile | null
    try {
      opened = await openDocumentFile()
    } catch {
      showToast('Aç', 'Dosya açılamadı.')
      return
    }
    if (opened) showOpened(opened)
  }

  /** A .drw2 file tapped in another app (Android), at start or while running. */
  async function openHandedFile(uri: string): Promise<void> {
    try {
      showOpened(await readHandedFile(uri))
    } catch {
      showToast('Aç', 'Dosya açılamadı.')
    }
  }

  /** Put an opened file's document in place (one undoable step) and say so. */
  function showOpened(opened: OpenedFile): void {
    const parsed = parseDocument(opened.text)
    if (!parsed.ok) {
      showToast('Aç', parsed.error)
      return
    }
    if (!loadDocument(parsed, opened.name)) {
      showToast('Aç', 'Belgedeki nesneler kurulamadı.')
      return
    }
    fileTarget = opened.target
    showToast('Aç', `${opened.name} açıldı.`)
  }

  async function saveFile(saveAs: boolean): Promise<void> {
    commitSlider()
    try {
      const saved = await saveDocumentFile(documentText(), fileName ?? DEFAULT_FILE_NAME, fileTarget, saveAs)
      if (!saved) return
      fileName = saved.name.endsWith(FILE_EXTENSION) ? saved.name : `${saved.name}${FILE_EXTENSION}`
      fileTarget = saved.target
      showToast('Kaydet', `${baseName(saved.name)} kaydedildi.`)
    } catch {
      showToast('Kaydet', 'Dosya kaydedilemedi.')
    }
  }

  /** The drawing without tool previews, as PNG (the canvas raster) or SVG (vector). */
  async function exportImage(kind: 'png' | 'svg'): Promise<void> {
    const stem = (fileName ?? DEFAULT_FILE_NAME).replace(/\.drw2$/i, '')
    try {
      let blob: Blob | null
      if (kind === 'svg') {
        blob = new Blob([svgDrawing()], { type: 'image/svg+xml' })
      } else {
        const previous = cursor
        cursor = null
        paint()
        cursor = previous
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        frameRenderer.request()
      }
      if (!blob) throw new Error('Görüntü oluşturulamadı.')
      const saved = await exportFile(blob, `${stem}.${kind}`, kind)
      if (saved) showToast('Dışa Aktar', `${saved} kaydedildi.`)
    } catch {
      showToast('Dışa Aktar', 'Görüntü kaydedilemedi.')
    }
  }

  function newDocument(): void {
    stopAllAnimations()
    resetInteraction()
    traces.clear()
    // Like Temizle, an undoable step; the next save asks for a new file.
    if (geometry.clear()) commit()
    fileName = null
    fileTarget = null
    refresh()
  }

  createFileMenu(required<HTMLButtonElement>('fileMenuButton'), {
    onNew: newDocument,
    onOpen: () => void openFile(),
    onSave: saveAs => void saveFile(saveAs),
    onExport: kind => void exportImage(kind),
  })
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'o') {
      event.preventDefault()
      void openFile()
    } else if (key === 's') {
      event.preventDefault()
      void saveFile(event.shiftKey)
    }
  })

  /** Reopen the last work of this browser; its history starts here. */
  function restoreAutosave(): void {
    let text: string | null = null
    try {
      text = localStorage.getItem(AUTOSAVE_KEY)
    } catch {
      return
    }
    const parsed = text ? parseDocument(text) : null
    if (!parsed?.ok || parsed.objects.length === 0) return
    try {
      geometry.reset(parsed.objects)
      if (!resolveLoaded()) throw new Error('Belge kurulamadı.')
      geometry.reset([...geometry.objects])
    } catch {
      geometry.reset([])
      return
    }
    autosaved = text!
    if (parsed.view) view.restore(parsed.view)
    showToast('Otomatik Kayıt', 'Son çalışmanız geri yüklendi. Boş bir belge için Dosya → Yeni.')
  }
  const gridSnapButton = required<HTMLButtonElement>('gridSnap')
  gridSnapButton.setAttribute('aria-pressed', String(gridSnap))
  gridSnapButton.addEventListener('click', () => {
    gridSnap = !gridSnap
    gridSnapButton.setAttribute('aria-pressed', String(gridSnap))
    try {
      localStorage.setItem(GRID_SNAP_KEY, gridSnap ? 'on' : 'off')
    } catch {
      // The choice still holds until the page closes.
    }
    showToast('Karelere Yapıştır', gridSnap
      ? 'Açık: noktalar en yakın küçük kare köşesine yapışır.'
      : 'Kapalı: noktalar fare neredeyse oraya konur.')
  })
  required('btnStandartWiew').addEventListener('click', () => {
    resetInteraction()
    view.resetStandard()
    refresh()
  })

  const sidePanel = createSidePanel(() => {
    commitSlider()
    resetInteraction()
    refresh()
  })
  const help = createHelpPopup({
    input: commandInput,
    onExample(command) {
      if (sidePanel.isHidden) sidePanel.setHidden(false)
      commandInput.value = command
      commandInput.focus()
    },
    onClose() {
      mathKeyboard.release()
    },
  })
  document.getElementById('helpMenuButton')?.addEventListener('click', () => help.open())
  const mathKeyboard = createMathKeyboard(commandInput, required('rightWrapper'), required<HTMLButtonElement>('keyboardToggle'))
  // Template suggestions handle their keys before the input submits.
  const templates = bindCommandTemplates(commandInput)
  bindCommandInput(commandInput, submitCommand, () => {
    const placeholder = templates.selectUnfilled()
    if (placeholder) showToast('GİRİŞ', `Şablondaki ${placeholder} alanını doldurun.`)
  })

  const toolbar = createToolbar({
    groups: required('toolGroups'),
    currentTool: required<HTMLButtonElement>('currentTool'),
    panel: required('toolsPanel'),
    onChange(tool, announce) {
      activateTool(tool.action)
      if (announce) showToast(tool.label, tool.instruction)
    },
    onOpenTools() {
      if (sidePanel.isHidden) sidePanel.setHidden(false)
      sidePanel.showTab('tools')
    },
    // Dar çubukta "⋯" menüsüne bu sırayla geçer; Dosya, Geri Al, Yinele ve panel düğmesi kalır.
    overflowActions: ['helpMenuButton', 'btnStandartWiew', 'clear', 'gridSnap'].map(id => required<HTMLButtonElement>(id)),
  })

  // Layout changes (window, panel, DPR) resize the canvas; card slider ranges follow the view.
  new ResizeObserver(() => {
    surface.resize()
    refresh()
  }).observe(canvas)

  surface.resize()
  if (window.matchMedia(NARROW_LAYOUT_QUERY).matches) {
    // Small screens start with the whole plane visible and the origin in the middle.
    sidePanel.setHidden(true)
    const { scaleX, scaleY } = view.snapshot
    view.setOrigin(-surface.width / 2 / scaleY, -surface.height / 2 / scaleX)
  }
  view.saveStandard()
  restoreAutosave()
  refresh()
  bindAndroid({ back: closeSomething, pause: autosave, openFile: uri => void openHandedFile(uri) })

  /** Android's back button: close one open thing, innermost first. */
  function closeSomething(): boolean {
    if (closePrompt()) return true
    if (document.querySelector('#mainToolbar [aria-expanded="true"]')) {
      // Every toolbar menu closes on Escape.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      return true
    }
    if (document.getElementById('help-popup')?.style.display === 'flex') {
      help.close()
      return true
    }
    if (mathKeyboard.isOpen) {
      mathKeyboard.setOpen(false)
      return true
    }
    if (tools.action !== 'select' || geometry.hasDraft || geometry.isEditing) {
      cancelInteraction()
      return true
    }
    if (window.matchMedia(NARROW_LAYOUT_QUERY).matches && !sidePanel.isHidden) {
      sidePanel.setHidden(true)
      refresh()
      return true
    }
    return false
  }
}
