import { math } from '../math'

/**
 * Typesets a card row ("f: y = x^2/4+sqrt(x-1)", "c: (x-1)^2+(y-2)^2=9") as MathML, the
 * browser's own math layout: fractions, powers, roots and |x| as in a textbook. Every formula
 * row is typeset, so cards look alike; rows that are not formulas (points, commands, piecewise
 * definitions) return null and stay plain text.
 */

const MATHML = 'http://www.w3.org/1998/Math/MathML'

const FUNCTION_NAMES = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 'sinh', 'cosh', 'tanh', 'coth',
  'ln', 'log', 'exp', 'floor', 'ceil', 'round', 'sign',
])

/** Names longer than one letter that are still math, not words. */
const MATH_WORDS = new Set(['pi', 'π', 'θ', 'theta', 'alpha', 'beta', 'gamma', 'α', 'β', 'γ', 'e'])

const RELATIONS: Record<string, string> = { '<=': '≤', '>=': '≥', '≤': '≤', '≥': '≥', '=': '=', '<': '<', '>': '>' }

interface MathNode {
  type: string
  op?: string
  fn?: string | { name: string }
  name?: string
  value?: unknown
  args?: MathNode[]
  content?: MathNode
  implicit?: boolean
}

type Build = (node: MathNode) => Element

function create(tag: string, children: (Element | string)[] = [], attributes: Record<string, string> = {}): Element {
  const node = document.createElementNS(MATHML, tag)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value)
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child)
  return node
}

const mo = (text: string) => create('mo', [text])
const row = (...children: Element[]) => create('mrow', children)
// Brackets keep the text size: stretched ones around a power or a root look too heavy in a card.
const bracket = (text: string) => create('mo', [text], { stretchy: 'false' })
const fenced = (inner: Element, open = '(', close = ')') => row(bracket(open), inner, bracket(close))

function identifier(name: string): Element {
  if (name === 'pi') return create('mi', ['π'])
  // u_x, a_1: a subscript.
  const sub = /^([^_]+)_(.+)$/.exec(name)
  if (sub) return create('msub', [identifier(sub[1]!), identifier(sub[2]!)])
  return create('mi', [name], name.length > 1 ? { mathvariant: 'normal' } : {})
}

const stripParentheses = (node: MathNode): MathNode => node.type === 'ParenthesisNode' && node.content ? stripParentheses(node.content) : node

/** Top-level `name:` and the relations between expressions. */
function splitRow(line: string): { name: string | null; parts: string[]; relations: string[] } | null {
  let rest = line.trim()
  let name: string | null = null
  const labelled = /^([\p{L}][\p{L}\p{N}_']*(?:\([^()]*\))?)\s*:\s*(.+)$/u.exec(rest)
  if (labelled) {
    name = labelled[1]!
    rest = labelled[2]!
  }
  const parts: string[] = []
  const relations: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < rest.length; index++) {
    const char = rest[index]!
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (depth === 0 && (char === ',' || char === ';')) return null
    else if (depth === 0 && (char === '=' || char === '<' || char === '>' || char === '≤' || char === '≥')) {
      const two = rest.slice(index, index + 2)
      const relation = two === '<=' || two === '>=' ? two : char
      parts.push(rest.slice(start, index))
      relations.push(relation)
      index += relation.length - 1
      start = index + 1
    }
  }
  parts.push(rest.slice(start))
  if (parts.some(part => !part.trim())) return null
  return { name, parts, relations }
}

/** Number literals in the order the expression tree meets them, so "1.50" keeps its digits. */
function numberTexts(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []
}

function expression(text: string): Element | null {
  let tree: MathNode
  try {
    tree = math.parse(text) as unknown as MathNode
  } catch {
    return null
  }
  const literals = numberTexts(text)
  let literalIndex = 0
  let failed = false
  const build: Build = node => {
    switch (node.type) {
      case 'ConstantNode': {
        const value = node.value
        if (typeof value !== 'number') { failed = true; return row() }
        const literal = literals[literalIndex++]
        return create('mn', [literal !== undefined && Number(literal) === value ? literal : String(value)])
      }
      case 'SymbolNode': {
        // A word ("noktası") is text, not a product of letters; names like k1, u_x, f' are fine.
        const letters = node.name!.split('_')[0]!.replace(/[^\p{L}]/gu, '')
        if (letters.length > 1 && !MATH_WORDS.has(node.name!)) { failed = true; return row() }
        return identifier(node.name!)
      }
      case 'ParenthesisNode':
        return fenced(build(node.content!))
      case 'OperatorNode':
        return operator(node, build)
      case 'FunctionNode':
        return call(node, build)
      default:
        failed = true
        return row()
    }
  }
  const result = build(tree)
  return failed ? null : result
}

function operator(node: MathNode, build: Build): Element {
  const [left, right] = node.args ?? []
  switch (node.op) {
    case '+':
    case '-': {
      if (!right) return row(mo(node.op === '-' ? '−' : '+'), build(left!))
      return row(build(left!), mo(node.op === '-' ? '−' : '+'), build(right))
    }
    case '*': {
      // 2x, 3(x+1), a b: written side by side; otherwise a centred dot.
      const juxtapose = node.implicit || (left!.type === 'ConstantNode' && right!.type !== 'ConstantNode')
      return juxtapose ? row(build(left!), build(right!)) : row(build(left!), mo('·'), build(right!))
    }
    case '/':
      return create('mfrac', [build(stripParentheses(left!)), build(stripParentheses(right!))])
    case '^':
      return create('msup', [build(left!), build(stripParentheses(right!))])
    default:
      throw new Error(`operator ${node.op}`)
  }
}

function call(node: MathNode, build: Build): Element {
  const name = typeof node.fn === 'string' ? node.fn : node.fn?.name ?? ''
  const args = node.args ?? []
  if (name === 'sqrt' && args.length === 1) return create('msqrt', [build(stripParentheses(args[0]!))])
  if (name === 'cbrt' && args.length === 1) return create('mroot', [build(stripParentheses(args[0]!)), create('mn', ['3'])])
  if (name === 'nthRoot' && args.length === 2) return create('mroot', [build(stripParentheses(args[0]!)), build(args[1]!)])
  if (name === 'abs' && args.length === 1) return fenced(build(stripParentheses(args[0]!)), '|', '|')
  if (name === 'exp' && args.length === 1) return create('msup', [create('mi', ['e']), build(stripParentheses(args[0]!))])
  // drAW2D's log(base, value).
  if (name === 'log' && args.length === 2) {
    return row(create('msub', [create('mi', ['log'], { mathvariant: 'normal' }), build(args[0]!)]), fenced(build(args[1]!)))
  }
  // Commands (Çember, OrtaNokta…) are not formulas: the row stays plain text.
  if (!FUNCTION_NAMES.has(name) && /^\p{Lu}/u.test(name)) throw new Error(`command ${name}`)
  const head = FUNCTION_NAMES.has(name) ? create('mi', [name], { mathvariant: 'normal' }) : identifier(name)
  const list: Element[] = []
  args.forEach((arg, index) => {
    if (index) list.push(mo(','))
    list.push(build(arg))
  })
  return row(head, fenced(row(...list)))
}

/** The row as a `<math>` element, or null when it should stay plain text. */
export function cardMath(line: string): Element | null {
  const split = splitRow(line)
  if (!split) return null
  const children: Element[] = []
  if (split.name !== null) {
    const fn = /^(.+)\((.*)\)$/.exec(split.name)
    children.push(fn ? row(identifier(fn[1]!), fenced(identifier(fn[2]!))) : identifier(split.name), mo(':'))
  }
  for (const [index, part] of split.parts.entries()) {
    // Words separated by spaces are a sentence, not a formula.
    if (/[\p{L}\p{N})]\s+[\p{L}\p{N}(]/u.test(part.trim())) return null
    let built: Element | null
    try {
      built = expression(part)
    } catch {
      built = null
    }
    if (!built) return null
    if (index) children.push(mo(RELATIONS[split.relations[index - 1]!]!))
    children.push(built)
  }
  return create('math', children)
}
