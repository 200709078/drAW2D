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
  startX: NumberArgument | null
  endX: NumberArgument | null
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
  /** `point` names a point, or any transformable object. */
  | { kind: 'reflect'; point: PointArgument; center: PointArgument }
  /**
   * Curves are intersected numerically in [start, end]; lines and circles exactly. An
   * argument that names no object is a function expression, drawn first.
   */
  | { kind: 'intersect'; first: string; second: string; start?: NumberArgument; end?: NumberArgument }
  /**
   * Points of one function in [start, end]; without a range, the visible x range at creation.
   * `function` is a name, or an expression that becomes a new function.
   */
  | { kind: 'root' | 'extremum' | 'inflection'; function: string; start?: NumberArgument; end?: NumberArgument }
  | { kind: 'integral'; function: string; start: NumberArgument; end: NumberArgument }
  /** Vertical asymptotes are searched in [start, end] (the visible x range by default). */
  | { kind: 'asymptote'; function: string; start?: NumberArgument; end?: NumberArgument }
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
  /** By a vector object. */
  | { kind: 'translateVector'; point: PointArgument; vector: string }
  | { kind: 'vector'; A: PointArgument; B: PointArgument }
  /** Vertices A, B, then counterclockwise; the side count is fixed when created. */
  | { kind: 'regularPolygon'; A: PointArgument; B: PointArgument; sides: NumberArgument }
  | { kind: 'circularArc'; center: PointArgument; A: PointArgument; B: PointArgument }
  | { kind: 'area'; object: string }
  | { kind: 'slope'; line: string }
  /** (x(t), y(t)) for the named variable from start to end. */
  | { kind: 'curve'; x: string; y: string; variable: string; start: NumberArgument; end: NumberArgument }
  /** r(θ) from start to end. */
  | { kind: 'polar'; expression: string; start: NumberArgument; end: NumberArgument }
  /** An equation in x and y that is not y = f(x) or x = c. */
  | { kind: 'implicit'; left: string; right: string }
  | { kind: 'inequality'; left: string; operator: '<' | '<=' | '>' | '>='; right: string }
  /** `a=2` defines a slider; `b=a+1` a number that depends on other parameters. */
  | { kind: 'parameter'; name: string; value: NumberArgument }

export type ParseCommandResult =
  | { ok: true; command: Command }
  | { ok: false; error: string }
