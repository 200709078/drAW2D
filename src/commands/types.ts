export type PointArgument =
  | { kind: 'coordinates'; a: number; b: number }
  | { kind: 'reference'; name: string }

export interface SectionSpec {
  expression: string
  startX: number | null
  endX: number | null
  startInclusive: boolean
  endInclusive: boolean
}

export type Command =
  | { kind: 'point'; point: { a: number; b: number } }
  | { kind: 'circleRadius'; center: PointArgument; radius: number }
  | { kind: 'circle2'; A: PointArgument; B: PointArgument }
  | { kind: 'circle3'; A: PointArgument; B: PointArgument; C: PointArgument }
  | { kind: 'verticalLine'; x: number }
  | { kind: 'line' | 'segment' | 'distance'; A: PointArgument; B: PointArgument }
  | { kind: 'angle'; A: PointArgument; B: PointArgument; C: PointArgument }
  | { kind: 'reflect'; point: PointArgument; center: PointArgument }
  | { kind: 'intersect'; first: string; second: string }
  | { kind: 'arc'; A: string; B: string }
  | { kind: 'circleTangent'; circle: string; point: PointArgument }
  | { kind: 'sequence'; expression: string; start: number; end: number }
  | { kind: 'limit' | 'tangent' | 'tangentH' | 'tangentX'; expression: string; at: number }
  | { kind: 'derivative'; expression: string }
  | { kind: 'composition'; expressions: string[] }
  | { kind: 'function'; expression: string }
  | { kind: 'piecewise'; source: string; sections: SectionSpec[] }

export type ParseCommandResult =
  | { ok: true; command: Command }
  | { ok: false; error: string }
