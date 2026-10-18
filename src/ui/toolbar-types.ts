export type RadialToolAction =
    | "select"
    | "point"
    | "line"
    | "linesegment"
    | "distancesegment"
    | "reflectpoint"
    | "intersect"
    | "circle2"
    | "circle3"
    | "circletangent"
    | "angle"
    | "arcmeasure"

export interface RadialTool {
    id: string
    label: string
    icon: string
    action: RadialToolAction
    buttonId?: string
    cursor?: string
    toast: string
    title: string
}

export interface ToolChangeOptions {
    showToast?: boolean
}

export interface RadialToolChangeDetail {
    id: string
    action: RadialToolAction
    toast: string
    title: string
    showToast: boolean
}

export interface RadialToolbarApi {
    getActiveTool(): RadialTool
    selectToolByAction(action: string, options?: ToolChangeOptions): void
}

declare global {
    interface Window {
        drAW2DRadialToolbar?: RadialToolbarApi
    }

    interface HTMLElementEventMap {
        "radial-tool-change": CustomEvent<RadialToolChangeDetail>
    }
}
