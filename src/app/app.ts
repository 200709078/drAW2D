import { createObjectName, type ObjectNameGroup } from '../commands/names'
import { parseCommand } from '../commands/parser'
import { prepareCommand } from '../commands/prepare'
import { collectDependents, isDerivedPoint, resolveConstraints } from '../document/dependencies'
import { recomputeDefinitions, redefineParameter, setParameterRange } from '../document/definitions'
import { redefineObject } from '../document/redefine'
import { GeometryDocument } from '../document/geometry-document'
import { createGeometryModels } from '../geometry/models'
import { numericPoint, type NumericPoint } from '../geometry/primitives'
import type { GeometryPoint, ObjectId } from '../geometry/types'
import { createCanvasSurface } from '../rendering/canvas-surface'
import { createGridRenderer } from '../rendering/coordinate-grid'
import { createFrameRenderer, createSceneOrder } from '../rendering/frame-renderer'
import { createFunctionEvaluator } from '../rendering/function-evaluator'
import type { PainterFrame } from '../rendering/painter-types'
import { paintDocumentScene } from '../rendering/scene-painter'
import { createTransientPainter } from '../rendering/transient-painter'
import { bindCommandInput } from '../ui/command-input'
import { bindCommandTemplates } from '../ui/command-templates'
import { createMathKeyboard } from '../ui/math-keyboard'
import { createHelpPopup } from '../ui/help-popup'
import { ObjectPanel } from '../ui/object-panel'
import { createToolbar } from '../ui/main-toolbar'
import { createSidePanel, NARROW_LAYOUT_QUERY } from '../ui/side-panel'
import { createToast } from '../ui/toast'
import type { ToolAction } from '../ui/tool-registry'
import { HIT_TOLERANCE_PX, hitTest } from './hit-test'
import { describeCard, editText } from './object-cards'
import { ToolController, type ToolInput } from './tools'
import { ViewportState, type PixelPoint, type ViewAxis } from './viewport-state'

const AXIS_GRAB_PX = 8
const TOUCH_AXIS_GRAB_PX = 16
const TOUCH_HIT_TOLERANCE_PX = 22
const TRACKPAD_ZOOM_RATE = 0.01
/** An animated parameter sweeps from its minimum to its maximum in this time, then back. */
const ANIMATION_SWEEP_MS = 4000

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

interface PointDrag {
  point: GeometryPoint
  cursor: NumericPoint
  origin: NumericPoint
  raw: Pick<GeometryPoint, 'a' | 'b'>
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
  let pointDrag: PointDrag | null = null
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
    }
    paintDocumentScene(frame)
    tools.paintPreview(createTransientPainter(frame), cursor)
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

  /** Bring dependent geometry, cards, history buttons and the next frame up to date. */
  function refresh(): void {
    resolveConstraints(geometry.objects)
    const context = { objects: geometry.objects }
    const entries = geometry.objects.filter(object => !(object.type === 'point' && object.hideInLabels)).reverse()
      .map(object => ({
        id: object.id!, color: object.color, visible: object.visibility,
        card: describeCard(object, context), animating: animations.has(object.id!),
        editText: editText(object, context),
      }))
    panel.render(entries, geometry.activeId)
    undoButton.disabled = !geometry.canUndo
    redoButton.disabled = !geometry.canRedo
    clearButton.disabled = geometry.objects.length === 0
    frameRenderer.request()
  }

  function commit(): void {
    resolveConstraints(geometry.objects)
    geometry.commit()
  }

  function commitSlider(): void {
    if (!geometry.isEditing) return
    resolveConstraints(geometry.objects)
    geometry.commitEdit()
  }

  function endDrag(): void {
    grabbing = false
    pointDrag = null
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
    const tolerance = touch ? TOUCH_HIT_TOLERANCE_PX : HIT_TOLERANCE_PX
    return { position, hit: hitTest(geometry.objects, position, { transform: current, evaluator, tolerance }) }
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

  function moveDraggedPoint(position: NumericPoint): void {
    if (!pointDrag) return
    const { point, origin, raw, cursor: start } = pointDrag
    // Back at the start, restore the stored values exactly so history sees no change.
    if (position.a === start.a && position.b === start.b) {
      point.a = raw.a
      point.b = raw.b
      return
    }
    point.a = origin.a + (position.a - start.a)
    point.b = origin.b + (position.b - start.b)
  }

  function pressTool(input: ToolInput): void {
    const action = tools.action
    const outcome = tools.press(input)
    if (outcome.message) showToast(outcome.message.title, outcome.message.text)
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
    // Points computed from other objects or parameters are selected, not dragged.
    const origin = hit?.kind === 'point' && !isDerivedPoint(hit.object) ? numericPoint(hit.object) : null
    if (hit?.kind === 'point' && origin) {
      pointDrag = { point: hit.object, cursor: input.position, origin, raw: { a: hit.object.a, b: hit.object.b } }
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
    if (pointDrag) geometry.cancelEdit()
    endDrag()
    aiming = null
    primary = null
    cursor = null
    multiTouch = true
    const [first, second] = pointers.values()
    view.beginPinch(first!, second!, transform())
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
    if (aiming === event.pointerId) {
      aiming = null
      cursor = null
      if (!cancelled) pressTool(pointerInput(pixel, true))
      else refresh()
      return
    }
    if (pointDrag) {
      if (cancelled) {
        geometry.cancelEdit()
      } else {
        moveDraggedPoint(pointerInput(pixel, touch).position)
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
    }
    const input = pointerInput(pixel, touch)
    cursor = input
    if (aiming === event.pointerId) {
      frameRenderer.request()
      return
    }
    if (pointDrag) {
      moveDraggedPoint(input.position)
      refresh()
      return
    }
    if (grabbing && view.drag(pixel)) {
      refresh()
      return
    }
    const axis = tools.action === 'select' && !input.hit ? axisAt(pixel, touch) : null
    canvas.style.cursor = input.hit ? 'pointer' : axis ? axisCursor(axis) : 'default'
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
  })
  document.getElementById('helpMenuButton')?.addEventListener('click', () => help.open())
  createMathKeyboard(commandInput, required('rightWrapper'), required<HTMLButtonElement>('keyboardToggle'))
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
  refresh()
}
