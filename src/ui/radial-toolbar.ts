import type {
    RadialTool,
    RadialToolChangeDetail,
    ToolChangeOptions
} from "./toolbar-types"

interface SlotGeometry {
    path: string
    iconX: number
    iconY: number
}

interface ToolbarDragState {
    isPointerDown: boolean
    isDragging: boolean
    pointerId: number | null
    startPointerX: number
    startPointerY: number
    startToolbarX: number
    startToolbarY: number
    currentX: number
    currentY: number
    dragThreshold: number
}

function requireToolbarElement(id: string): HTMLElement {
    const element = document.getElementById(id)

    if (!(element instanceof HTMLElement)) {
        throw new Error(`drAW2D araç çubuğu öğesi bulunamadı: ${id}`)
    }

    return element
}

const toolbarStage = requireToolbarElement("toolbarStage")
const radialToolbar = requireToolbarElement("radialToolbar")

const TOOLBAR_POSITION_KEY = "draw2d.radialToolbar.position"

const slotGeometries: SlotGeometry[] = [
    {
        path: "M 155.474 35.935 A 170 170 0 0 1 244.526 35.935 L 218.031 126.170 A 76 76 0 0 0 181.969 126.170 Z",
        iconX: 183.00,
        iconY: 59.00
    },
    {
        path: "M 251.243 37.907 A 170 170 0 0 1 326.158 86.052 L 255.084 147.638 A 76 76 0 0 0 224.747 128.142 Z",
        iconX: 250.04,
        iconY: 78.68
    },
    {
        path: "M 330.742 91.342 A 170 170 0 0 1 367.736 172.347 L 274.649 185.731 A 76 76 0 0 0 259.668 152.929 Z",
        iconX: 295.79,
        iconY: 131.49
    },
    {
        path: "M 368.732 179.276 A 170 170 0 0 1 356.059 267.422 L 270.513 228.354 A 76 76 0 0 0 275.645 192.660 Z",
        iconX: 305.74,
        iconY: 200.65
    },
    {
        path: "M 353.151 273.789 A 170 170 0 0 1 294.834 341.091 L 243.989 261.975 A 76 76 0 0 0 267.605 234.722 Z",
        iconX: 276.71,
        iconY: 264.20
    },
    {
        path: "M 288.945 344.875 A 170 170 0 0 1 203.500 369.964 L 203.500 275.919 A 76 76 0 0 0 238.101 265.760 Z",
        iconX: 217.93,
        iconY: 301.98
    },
    {
        path: "M 196.500 369.964 A 170 170 0 0 1 111.055 344.875 L 161.899 265.760 A 76 76 0 0 0 196.500 275.919 Z",
        iconX: 148.07,
        iconY: 301.98
    },
    {
        path: "M 105.166 341.091 A 170 170 0 0 1 46.849 273.789 L 132.395 234.722 A 76 76 0 0 0 156.011 261.975 Z",
        iconX: 89.29,
        iconY: 264.20
    },
    {
        path: "M 43.941 267.422 A 170 170 0 0 1 31.268 179.276 L 124.355 192.660 A 76 76 0 0 0 129.487 228.354 Z",
        iconX: 60.26,
        iconY: 200.65
    },
    {
        path: "M 32.264 172.347 A 170 170 0 0 1 69.258 91.342 L 140.332 152.929 A 76 76 0 0 0 125.351 185.731 Z",
        iconX: 70.21,
        iconY: 131.49
    },
    {
        path: "M 73.842 86.052 A 170 170 0 0 1 148.757 37.907 L 175.253 128.142 A 76 76 0 0 0 144.916 147.638 Z",
        iconX: 115.96,
        iconY: 78.68
    }
]

const toolsArr: [RadialTool, ...RadialTool[]] = [
    {
        id: "select",
        label: "Taşı",
        icon: "select.svg",
        action: "select",
        buttonId: "btnSelect",
        cursor: "pointer",
        toast: "Taşı|Düzlemi veya nesneyi tutarak kaydırınız.",
        title: "Taşı|Düzlemi veya nesneyi tutarak kaydırınız."
    },
    {
        id: "point",
        label: "Nokta",
        icon: "point.svg",
        action: "point",
        buttonId: "btnPoint",
        toast: "Nokta|Konum seçiniz.",
        title: "Nokta|Konum seçiniz."
    },
    {
        id: "line",
        label: "Doğru",
        icon: "line.svg",
        action: "line",
        buttonId: "btnLine",
        toast: "Doğru|Farklı iki nokta seçiniz.",
        title: "Doğru|Farklı iki nokta seçiniz."
    },
    {
        id: "linesegment",
        label: "Doğru Parçası",
        icon: "linesegment.svg",
        action: "linesegment",
        buttonId: "btnLineSegment",
        toast: "Doğru Parçası|Farklı iki nokta seçiniz.",
        title: "Doğru Parçası|Farklı iki nokta seçiniz."
    },
    {
        id: "distance",
        label: "Uzaklık",
        icon: "distance.svg",
        action: "distancesegment",
        buttonId: "btnDistanceSegment",
        toast: "Uzaklık|Farklı iki nokta seçiniz.",
        title: "Uzaklık|Farklı iki nokta seçiniz."
    },
    {
        id: "reflect",
        label: "Yansıt Nokta",
        icon: "reflect.svg",
        action: "reflectpoint",
        buttonId: "btnReflectPoint",
        toast: "Yansıt Nokta|Yansıtılacak noktayı ve yansıtma merkezini seçiniz.",
        title: "Yansıt Nokta|Yansıtılacak noktayı ve yansıtma merkezini seçiniz."
    },
    {
        id: "intersect",
        label: "Kesiştir",
        icon: "intersect.svg",
        action: "intersect",
        buttonId: "btnIntersect",
        toast: "Kesiştir|İki nesne seçiniz.",
        title: "Kesiştir|İki nesne seçiniz."
    },
    {
        id: "circle2",
        label: "Çember 2",
        icon: "circle2.svg",
        action: "circle2",
        toast: "Çember|Merkez nokta ve çember üzerinde bir nokta seçiniz.",
        title: "Çember|Merkez nokta ve çember üzerinde bir nokta seçiniz."
    },
    {
        id: "circle3",
        label: "Çember 3",
        icon: "circle3.svg",
        action: "circle3",
        toast: "Çember|Çember üzerinde üç nokta seçiniz.",
        title: "Çember|Çember üzerinde üç nokta seçiniz."
    },
    {
        id: "circletangent",
        label: "Teğet",
        icon: "circletng.svg",
        action: "circletangent",
        toast: "Teğet|Önce teğet çizilecek çemberi, sonra noktayı seçiniz.",
        title: "Teğet|Önce teğet çizilecek çemberi, sonra noktayı seçiniz."
    },
    {
        id: "angle",
        label: "Açı",
        icon: "angle.svg",
        action: "angle",
        toast: "Açı|Üç nokta seçiniz.",
        title: "Açı|Üç nokta seçiniz."
    },
    {
        id: "arcmeasure",
        label: "Yay Ölçüsü",
        icon: "arcmeasure.svg",
        action: "arcmeasure",
        toast: "Yay Ölçüsü|Aynı çember üzerinde iki nokta seçiniz.",
        title: "Yay Ölçüsü|Aynı çember üzerinde iki nokta seçiniz."
    }
]

const dragState: ToolbarDragState = {
    isPointerDown: false,
    isDragging: false,
    pointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    startToolbarX: 16,
    startToolbarY: 16,
    currentX: 16,
    currentY: 16,
    dragThreshold: 4
}

let menuCloseTimer: number | undefined

function openRadialMenu(): void {
    window.clearTimeout(menuCloseTimer)
    radialToolbar.classList.add("is-open")
}

function scheduleCloseRadialMenu(): void {
    window.clearTimeout(menuCloseTimer)

    menuCloseTimer = window.setTimeout(() => {
        radialToolbar.classList.remove("is-open")
    }, 450)
}

function applyToolDataset(button: HTMLButtonElement, tool: RadialTool): void {
    if (tool.buttonId) {
        button.id = tool.buttonId
    }

    button.setAttribute("aria-label", tool.label)
    button.dataset.action = tool.action
    button.dataset.toast = tool.toast
    button.title = tool.title

    if (tool.cursor) {
        button.dataset.cursor = tool.cursor
    }
}

function createOuterButton(
    tool: RadialTool,
    geometry: SlotGeometry,
    toolIndex: number
): HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `slice-button tool-${tool.id}`

    applyToolDataset(button, tool)

    button.innerHTML = `
    <svg class="slice-svg" viewBox="0 0 400 400" aria-hidden="true">
      <path
        class="slice-shape"
        d="${geometry.path}">
      </path>
      <image
        class="tool-icon"
        href="./img/${tool.icon}"
        x="${geometry.iconX}"
        y="${geometry.iconY}"
        width="34"
        height="34">
      </image>
    </svg>
  `

    button.addEventListener("click", event => {
        event.stopPropagation()
        swapWithCenter(toolIndex)
    })

    button.addEventListener("pointerenter", openRadialMenu)
    button.addEventListener("pointerleave", scheduleCloseRadialMenu)

    return button
}

function createCenterButton(tool: RadialTool): HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `center-button tool-${tool.id}`

    applyToolDataset(button, tool)

    button.innerHTML = `
    <svg class="center-svg" viewBox="0 0 400 400" aria-hidden="true">
      <circle class="center-shape" cx="200" cy="200" r="62"></circle>
      <image
        class="center-icon"
        href="./img/${tool.icon}"
        x="162"
        y="162"
        width="75"
        height="75">
      </image>
    </svg>
  `

    button.addEventListener("pointerdown", event => {
        startToolbarDrag(event)
    })

    button.addEventListener("pointerenter", openRadialMenu)
    button.addEventListener("pointerleave", scheduleCloseRadialMenu)

    return button
}

function swapWithCenter(toolIndex: number): void {
    if (toolIndex <= 0) return

    const selectedTool = toolsArr[toolIndex]
    if (!selectedTool) return

    toolsArr[toolIndex] = toolsArr[0]
    toolsArr[0] = selectedTool

    window.clearTimeout(menuCloseTimer)
    radialToolbar.classList.remove("is-open")

    renderRadialToolbar()
    dispatchToolChange(selectedTool)
}

function dispatchToolChange(tool: RadialTool, options: ToolChangeOptions = {}): void {
    const showToast = options.showToast !== false

    radialToolbar.dispatchEvent(
        new CustomEvent<RadialToolChangeDetail>("radial-tool-change", {
            bubbles: true,
            detail: {
                id: tool.id,
                action: tool.action,
                toast: tool.toast,
                title: tool.title,
                showToast: showToast
            }
        })
    )
}

function renderRadialToolbar(): void {
    radialToolbar.replaceChildren()

    const centerTool = toolsArr[0]
    const outerTools = toolsArr.slice(1)

    outerTools.forEach((tool, outerIndex) => {
        const geometry = slotGeometries[outerIndex]
        if (!geometry) return

        const toolIndex = outerIndex + 1

        radialToolbar.appendChild(
            createOuterButton(tool, geometry, toolIndex)
        )
    })

    radialToolbar.appendChild(createCenterButton(centerTool))
}

function startToolbarDrag(event: PointerEvent): void {
    event.preventDefault()
    event.stopPropagation()

    window.clearTimeout(menuCloseTimer)

    const rect = toolbarStage.getBoundingClientRect()

    dragState.isPointerDown = true
    dragState.isDragging = false
    dragState.pointerId = event.pointerId
    dragState.startPointerX = event.clientX
    dragState.startPointerY = event.clientY
    dragState.startToolbarX = rect.left
    dragState.startToolbarY = rect.top

    document.addEventListener("pointermove", handleToolbarDrag)
    document.addEventListener("pointerup", endToolbarDrag)
    document.addEventListener("pointercancel", cancelToolbarDrag)
}

function handleToolbarDrag(event: PointerEvent): void {
    if (!dragState.isPointerDown) return
    if (event.pointerId !== dragState.pointerId) return

    const deltaX = event.clientX - dragState.startPointerX
    const deltaY = event.clientY - dragState.startPointerY
    const distance = Math.hypot(deltaX, deltaY)

    if (!dragState.isDragging && distance >= dragState.dragThreshold) {
        dragState.isDragging = true
        toolbarStage.classList.add("is-dragging")
        radialToolbar.classList.remove("is-open")
    }

    if (!dragState.isDragging) return

    const nextX = dragState.startToolbarX + deltaX
    const nextY = dragState.startToolbarY + deltaY

    setToolbarPosition(nextX, nextY, false)
}

function endToolbarDrag(event: PointerEvent): void {
    if (event.pointerId !== dragState.pointerId) return

    const wasDragging = dragState.isDragging

    dragState.isPointerDown = false
    dragState.isDragging = false
    dragState.pointerId = null

    toolbarStage.classList.remove("is-dragging")

    document.removeEventListener("pointermove", handleToolbarDrag)
    document.removeEventListener("pointerup", endToolbarDrag)
    document.removeEventListener("pointercancel", cancelToolbarDrag)

    if (wasDragging) {
        saveToolbarPosition()
        openRadialMenu()
        return
    }

    window.clearTimeout(menuCloseTimer)
    radialToolbar.classList.toggle("is-open")
    dispatchToolChange(toolsArr[0])
}

function cancelToolbarDrag(event: PointerEvent): void {
    if (event.pointerId !== dragState.pointerId) return

    dragState.isPointerDown = false
    dragState.isDragging = false
    dragState.pointerId = null

    toolbarStage.classList.remove("is-dragging")

    document.removeEventListener("pointermove", handleToolbarDrag)
    document.removeEventListener("pointerup", endToolbarDrag)
    document.removeEventListener("pointercancel", cancelToolbarDrag)
}

function setToolbarPosition(x: number, y: number, shouldSave = false): void {
    const rect = toolbarStage.getBoundingClientRect()

    const maxX = Math.max(0, window.innerWidth - rect.width)
    const maxY = Math.max(0, window.innerHeight - rect.height)

    const clampedX = clamp(x, 0, maxX)
    const clampedY = clamp(y, 0, maxY)

    dragState.currentX = clampedX
    dragState.currentY = clampedY

    toolbarStage.style.left = `${clampedX}px`
    toolbarStage.style.top = `${clampedY}px`

    if (shouldSave) {
        saveToolbarPosition()
    }
}

function saveToolbarPosition(): void {
    localStorage.setItem(
        TOOLBAR_POSITION_KEY,
        JSON.stringify({
            x: dragState.currentX,
            y: dragState.currentY
        })
    )
}

function loadToolbarPosition(): void {
    const rawPosition = localStorage.getItem(TOOLBAR_POSITION_KEY)

    if (!rawPosition) {
        setToolbarPosition(16, 16, false)
        return
    }

    try {
        const position: unknown = JSON.parse(rawPosition)
        const storedX = typeof position === "object" && position !== null && "x" in position
            ? position.x
            : undefined
        const storedY = typeof position === "object" && position !== null && "y" in position
            ? position.y
            : undefined

        const x = typeof storedX === "number" && Number.isFinite(storedX) ? storedX : 16
        const y = typeof storedY === "number" && Number.isFinite(storedY) ? storedY : 16

        setToolbarPosition(x, y, false)
    } catch {
        setToolbarPosition(16, 16, false)
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

window.addEventListener("resize", () => {
    setToolbarPosition(dragState.currentX, dragState.currentY, true)
})

function getActiveRadialTool(): RadialTool {
    return { ...toolsArr[0] }
}

function selectToolByAction(action: string, options: ToolChangeOptions = {}): void {
    if (!action) return

    const toolIndex = toolsArr.findIndex(tool => tool.action === action)

    if (toolIndex < 0) return

    if (toolIndex === 0) {
        renderRadialToolbar()
        dispatchToolChange(toolsArr[0], options)
        return
    }

    const selectedTool = toolsArr[toolIndex]
    if (!selectedTool) return

    toolsArr[toolIndex] = toolsArr[0]
    toolsArr[0] = selectedTool

    window.clearTimeout(menuCloseTimer)
    radialToolbar.classList.remove("is-open")

    renderRadialToolbar()
    dispatchToolChange(selectedTool, options)
}

window.drAW2DRadialToolbar = {
    getActiveTool: getActiveRadialTool,
    selectToolByAction: selectToolByAction
}

renderRadialToolbar()
loadToolbarPosition()
