/**
 * A number as typed: a constant evaluated by the parser, or an expression naming
 * parameters, which only the document can evaluate.
 */
export type NumberArgument = number | { expression: string }

export type PointArgument =
  | { kind: 'coordinates'; a: NumberArgument; b: NumberArgument }
  | { kind: 'reference'; name: string }

export interface SectionSpec {
  expression: string
  startX: number | null
  endX: number | null
  startInclusive: boolean
  endInclusive: boolean
}

export type Command =
  | { kind: 'point'; point: { a: NumberArgument; b: NumberArgument } }
  | { kind: 'circleRadius'; center: PointArgument; radius: NumberArgument }
  | { kind: 'circle2'; A: PointArgument; B: PointArgument }
  | { kind: 'circle3'; A: PointArgument; B: PointArgument; C: PointArgument }
  | { kind: 'verticalLine'; x: NumberArgument }
  | { kind: 'line' | 'segment' | 'distance'; A: PointArgument; B: PointArgument }
  | { kind: 'angle'; A: PointArgument; B: PointArgument; C: PointArgument }
  | { kind: 'reflect'; point: PointArgument; center: PointArgument }
  /** Curves are intersected numerically in [start, end]; lines and circles exactly. */
  | { kind: 'intersect'; first: string; second: string; start?: NumberArgument; end?: NumberArgument }
  /** Points of one function in [start, end]; without a range, the visible x range at creation. */
  | { kind: 'root' | 'extremum' | 'inflection'; function: string; start?: NumberArgument; end?: NumberArgument }
  | { kind: 'integral'; function: string; start: NumberArgument; end: NumberArgument }
  | { kind: 'arc'; A: string; B: string; circle?: string }
  | { kind: 'circleTangent'; circle: string; point: PointArgument }
  | { kind: 'sequence'; expression: string; start: NumberArgument; end: NumberArgument }
  /** `delta` is the distance of the left/right approach guides from `at`. */
  | { kind: 'limit'; expression: string; at: NumberArgument; delta?: NumberArgument }
  | { kind: 'tangent'; expression: string; at: NumberArgument }
  /** `h` is the secant increment (TeğetH) or the second x value (TeğetX). */
  | { kind: 'tangentH' | 'tangentX'; expression: string; at: NumberArgument; h?: NumberArgument }
  | { kind: 'derivative'; expression: string }
  | { kind: 'composition'; expressions: string[] }
  | { kind: 'function'; expression: string }
  | { kind: 'piecewise'; source: string; sections: SectionSpec[] }
  | { kind: 'midpoint' | 'ray' | 'bisector'; A: PointArgument; B: PointArgument }
  | { kind: 'perpendicular' | 'parallel'; point: PointArgument; line: string }
  | { kind: 'angleBisector'; A: PointArgument; B: PointArgument; C: PointArgument }
  | { kind: 'polygon'; points: PointArgument[] }
  /** Counterclockwise by `angle` degrees about `center`; a typed constant becomes a slider. */
  | { kind: 'rotate'; point: PointArgument; angle: NumberArgument; center: PointArgument }
  /** By the vector from `from` to `to`. */
  | { kind: 'translate'; point: PointArgument; from: PointArgument; to: PointArgument }
  /** `a=2` defines a slider; `b=a+1` a number that depends on other parameters. */
  | { kind: 'parameter'; name: string; value: NumberArgument }

export type ParseCommandResult =
  | { ok: true; command: Command }
  | { ok: false; error: string }
