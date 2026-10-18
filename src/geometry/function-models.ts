import {
  composeExpressions,
  differentiate,
  evaluateReal,
  linearExpression,
  normalizeReal,
} from '../math/function-algebra'
import type {
  Derivative,
  EquationLine,
  FunctionComposition,
  FunctionCurve,
  FunctionDomain,
  FunctionModelContext,
  FunctionNameGroup,
  FunctionSection,
  Limit,
  SectionalFunctions,
  Sequence,
  Tangent,
  TangentHX,
  VerticalLine,
} from './function-types'
import type { GeometryObject, LineWithPoints, ObjectReference } from './types'

type NumericInput = number | string

function normalizeDomain(startX: NumericInput | null, endX: NumericInput | null): FunctionDomain {
  const start = startX === null ? null : normalizeReal(startX)
  const end = endX === null ? null : normalizeReal(endX)
  if (start !== null && end !== null && start > end) {
    throw new RangeError('The function domain must start before it ends.')
  }
  return { startX: start, endX: end }
}

function tangentValues(expression: string, derivativeExpression: string, approach: NumericInput) {
  const approachVal = normalizeReal(approach)
  const y = evaluateReal(expression, approachVal)
  const m = evaluateReal(derivativeExpression, approachVal)
  const n = normalizeReal(y - m * approachVal)
  return { approachVal, y, m, n, func: linearExpression(m, n) }
}

// Only data lives on the document objects. Algebra and allocation services stay
// outside the graph that undo/redo copies with structuredClone.
export function createFunctionModels(context: FunctionModelContext) {
  class FunctionModel<Type extends string> implements GeometryObject<Type> {
    type: Type
    name: string | null
    id: ObjectReference
    color: string
    visibility = true
    size = 2
    temp: boolean

    constructor(type: Type, group: FunctionNameGroup, temp: boolean) {
      this.type = type
      this.name = temp ? null : context.createName(group)
      this.id = temp ? null : context.nextId()
      this.color = context.randomColor()
      this.temp = temp
    }
  }

  class mVerLine extends FunctionModel<'verLine'> implements VerticalLine {
    x: number

    constructor(x: NumericInput, temp = false) {
      const value = normalizeReal(x)
      super('verLine', 'verLine', temp)
      this.x = value
    }
  }

  class mLineWithEquation extends FunctionModel<'lineWithEquation'> implements EquationLine {
    m: number
    n: number
    func: string
    startX: number | null
    endX: number | null

    constructor(m: NumericInput, n: NumericInput, temp = false, startX: NumericInput | null = null, endX: NumericInput | null = null) {
      const slope = normalizeReal(m)
      const intercept = normalizeReal(n)
      const expression = linearExpression(slope, intercept)
      const domain = normalizeDomain(startX, endX)
      super('lineWithEquation', 'line', temp)
      this.m = slope
      this.n = intercept
      this.func = expression
      this.startX = domain.startX
      this.endX = domain.endX
    }
  }

  class mSequence extends FunctionModel<'sequence'> implements Sequence {
    func: string
    start: number
    end: number

    constructor(func: string, start: NumericInput, end: NumericInput, temp = false) {
      const first = normalizeReal(start)
      const last = normalizeReal(end)
      if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first) {
        throw new RangeError('Sequence indices must be positive integers in ascending order.')
      }
      super('sequence', 'sequence', temp)
      this.func = func
      this.start = first
      this.end = last
    }
  }

  class mLimit extends FunctionModel<'limit'> implements Limit {
    func: string
    approachVal: number
    approachValRight: number
    approachValLeft: number
    lineDash: number[] = []

    constructor(func: string, approach: NumericInput, temp = false) {
      const approachVal = normalizeReal(approach)
      const approachValRight = normalizeReal(approachVal + 0.4)
      const approachValLeft = normalizeReal(approachVal - 0.4)
      super('limit', 'limit', temp)
      this.func = func
      this.approachVal = approachVal
      this.approachValRight = approachValRight
      this.approachValLeft = approachValLeft
    }
  }

  class mFunction extends FunctionModel<'function'> implements FunctionCurve {
    func: string
    startX: number | null
    endX: number | null

    constructor(func: string, temp = false, startX: NumericInput | null = null, endX: NumericInput | null = null) {
      const domain = normalizeDomain(startX, endX)
      super('function', 'function', temp)
      this.func = func
      this.startX = domain.startX
      this.endX = domain.endX
    }
  }

  class mFunctionComposition extends FunctionModel<'functioncomposition'> implements FunctionComposition {
    funcs: string[]
    func: string
    startX: number | null
    endX: number | null

    constructor(funcs: readonly string[], temp = false, startX: NumericInput | null = null, endX: NumericInput | null = null) {
      const expression = composeExpressions(funcs)
      const domain = normalizeDomain(startX, endX)
      super('functioncomposition', 'functioncomposition', temp)
      this.funcs = [...funcs]
      this.func = expression
      this.startX = domain.startX
      this.endX = domain.endX
    }
  }

  class mTangent extends FunctionModel<'tangent'> implements Tangent {
    func: string
    derivativeExpression: string
    approachVal: number
    tngLine: EquationLine
    lineDash: number[] = []

    constructor(func: string, approach: NumericInput, temp = false) {
      const derivativeExpression = differentiate(func)
      const values = tangentValues(func, derivativeExpression, approach)
      super('tangent', 'tangent', temp)
      this.func = func
      this.derivativeExpression = derivativeExpression
      this.approachVal = values.approachVal
      this.tngLine = new mLineWithEquation(values.m, values.n, true)
    }
  }

  class mTangentHX extends FunctionModel<'tangentHX'> implements TangentHX {
    func: string
    derivativeExpression: string
    approachVal: number
    h = 2
    haveH: boolean
    tngLine: EquationLine
    aodLine: LineWithPoints
    lineDash: number[] = []

    constructor(func: string, approach: NumericInput, haveH: boolean, temp = false) {
      const derivativeExpression = differentiate(func)
      const values = tangentValues(func, derivativeExpression, approach)
      const bx = haveH ? normalizeReal(values.approachVal + 2) : 2
      const by = evaluateReal(func, bx)
      super('tangentHX', 'tangentHX', temp)
      this.func = func
      this.derivativeExpression = derivativeExpression
      this.approachVal = values.approachVal
      this.haveH = haveH
      this.tngLine = new mLineWithEquation(values.m, values.n, true)
      const A = context.createPoint(values.approachVal, values.y, true)
      const B = context.createPoint(bx, by, true)
      this.aodLine = context.createLineWithPoints(A, B, true)
    }
  }

  class mDerivative extends FunctionModel<'derivative'> implements Derivative {
    func: FunctionCurve
    derFunc: FunctionCurve
    lineDash: number[] = []

    constructor(source: string, temp = false) {
      const expression = differentiate(source)
      super('derivative', 'derivative', temp)
      this.func = new mFunction(source, true)
      this.derFunc = new mFunction(expression, true)
      this.func.id = this.derFunc.id = this.id
      this.func.name = this.name
      this.derFunc.name = this.name === null ? null : `${this.name}'`
      this.func.color = this.derFunc.color = this.color
    }
  }

  class mSectionalFunctions extends FunctionModel<'sectionalFunctions'> implements SectionalFunctions {
    cmd: string
    secFuncs: FunctionSection[]

    constructor(cmd: string, sections: FunctionSection[] = [], temp = false) {
      super('sectionalFunctions', 'function', temp)
      this.cmd = cmd
      this.secFuncs = sections
      for (const section of sections) {
        section.id = this.id
        section.name = this.name
        section.color = this.color
        section.temp = true
      }
    }
  }

  function updateTangent(model: Tangent, approach: NumericInput): void {
    const values = tangentValues(model.func, model.derivativeExpression, approach)
    Object.assign(model.tngLine, { m: values.m, n: values.n, func: values.func })
    model.approachVal = values.approachVal
  }

  function updateTangentHX(model: TangentHX, approach: NumericInput, h: NumericInput): void {
    const values = tangentValues(model.func, model.derivativeExpression, approach)
    const increment = normalizeReal(h)
    const bx = model.haveH ? normalizeReal(values.approachVal + increment) : increment
    const by = evaluateReal(model.func, bx)
    // Evaluation can fail at a domain boundary. Finish it before touching any
    // stored coordinate, so a rejected slider value cannot leave a partial graph.
    Object.assign(model.aodLine.A, { a: values.approachVal, b: values.y })
    Object.assign(model.aodLine.B, { a: bx, b: by })
    Object.assign(model.tngLine, { m: values.m, n: values.n, func: values.func })
    model.approachVal = values.approachVal
    model.h = increment
  }

  return {
    mVerLine,
    mLineWithEquation,
    mSequence,
    mLimit,
    mFunction,
    mFunctionComposition,
    mTangent,
    mTangentHX,
    mDerivative,
    mSectionalFunctions,
    updateTangent,
    updateTangentHX,
  }
}
