import { parseNumericExpression } from './expressions'
import type { Command, ParseCommandResult, PointArgument, SectionSpec } from './types'

const openings = new Map([['(', ')'], ['[', ']'], ['{', '}']])
const closings = new Set(openings.values())

/** Split only outside balanced brackets; empty and trailing arguments are errors. */
export function splitTopLevel(source: string, separator = ','): string[] {
  if (!source.trim()) return []
  const stack: string[] = []
  const parts: string[] = []
  let start = 0
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!
    const closing = openings.get(char)
    if (closing) stack.push(closing)
    else if (closings.has(char)) {
      if (stack.pop() !== char) throw new Error('Parantezler dengeli olmalı.')
    } else if (char === separator && stack.length === 0) {
      const part = source.slice(start, index).trim()
      if (!part) throw new Error('Boş komut parametresi kullanılamaz.')
      parts.push(part)
      start = index + 1
    }
  }
  if (stack.length) throw new Error('Parantezler dengeli olmalı.')
  const last = source.slice(start).trim()
  if (!last) throw new Error('Boş komut parametresi kullanılamaz.')
  parts.push(last)
  return parts
}

function normalizedName(name: string): string {
  return name.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')
}

type NamedCommand = 'circle' | 'line' | 'segment' | 'distance' | 'angle' | 'reflect' |
  'intersect' | 'arc' | 'circleTangent' | 'sequence' | 'limit' | 'tangent' | 'tangentH' |
  'tangentX' | 'derivative' | 'composition'

const commandNames: Readonly<Record<string, NamedCommand>> = {
  cember: 'circle', circle: 'circle',
  dogru: 'line', line: 'line',
  dogruparcasi: 'segment', segment: 'segment', linesegment: 'segment',
  uzaklik: 'distance', distance: 'distance', distancesegment: 'distance',
  aci: 'angle', angle: 'angle',
  yansitnokta: 'reflect', yansit: 'reflect', reflect: 'reflect',
  kesistir: 'intersect', intersect: 'intersect',
  yayolcusu: 'arc', arcmeasure: 'arc',
  tegetc: 'circleTangent', circletangent: 'circleTangent',
  dizi: 'sequence', sequence: 'sequence',
  limit: 'limit', teget: 'tangent', tangent: 'tangent',
  tegeth: 'tangentH', tangenth: 'tangentH', tegetx: 'tangentX', tangentx: 'tangentX',
  turev: 'derivative', derivative: 'derivative', bileske: 'composition', composition: 'composition',
}

function commandName(name: string): NamedCommand | undefined {
  const normalized = normalizedName(name)
  return Object.hasOwn(commandNames, normalized) ? commandNames[normalized] : undefined
}

function enclosed(source: string): boolean {
  if (!source.startsWith('(') || !source.endsWith(')')) return false
  let depth = 0
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '(') depth++
    else if (source[index] === ')' && --depth === 0) return index === source.length - 1
  }
  return false
}

function requireCount(args: string[], count: number): void {
  if (args.length !== count) throw new Error(`Bu komut ${count} parametre gerektirir.`)
}

function reference(source: string): string {
  if (!/^[\p{L}_][\p{L}\p{N}_'′]*$/u.test(source)) {
    throw new Error('Geçerli bir nesne adı kullanın.')
  }
  return source
}

function pointArgument(source: string): PointArgument {
  if (enclosed(source)) {
    const args = splitTopLevel(source.slice(1, -1))
    requireCount(args, 2)
    return { kind: 'coordinates', a: parseNumericExpression(args[0]!), b: parseNumericExpression(args[1]!) }
  }
  return { kind: 'reference', name: reference(source) }
}

function namedCommand(kind: NamedCommand, args: string[]): Command {
  switch (kind) {
    case 'circle': {
      if (args.length !== 2 && args.length !== 3) throw new Error('Çember iki veya üç parametre gerektirir.')
      const A = pointArgument(args[0]!)
      if (args.length === 3) return { kind: 'circle3', A, B: pointArgument(args[1]!), C: pointArgument(args[2]!) }
      if (enclosed(args[1]!) && splitTopLevel(args[1]!.slice(1, -1)).length === 2) {
        return { kind: 'circle2', A, B: pointArgument(args[1]!) }
      }
      let radius: number
      try {
        radius = parseNumericExpression(args[1]!)
      } catch {
        return { kind: 'circle2', A, B: pointArgument(args[1]!) }
      }
      if (radius < 0) throw new Error('Yarıçap negatif olamaz.')
      return { kind: 'circleRadius', center: A, radius }
    }
    case 'line': case 'segment': case 'distance':
      requireCount(args, 2)
      return { kind, A: pointArgument(args[0]!), B: pointArgument(args[1]!) }
    case 'angle':
      requireCount(args, 3)
      return { kind, A: pointArgument(args[0]!), B: pointArgument(args[1]!), C: pointArgument(args[2]!) }
    case 'reflect':
      requireCount(args, 2)
      return { kind, point: pointArgument(args[0]!), center: pointArgument(args[1]!) }
    case 'intersect':
      requireCount(args, 2)
      return { kind, first: reference(args[0]!), second: reference(args[1]!) }
    case 'arc':
      requireCount(args, 2)
      return { kind, A: reference(args[0]!), B: reference(args[1]!) }
    case 'circleTangent':
      requireCount(args, 2)
      return { kind, circle: reference(args[0]!), point: pointArgument(args[1]!) }
    case 'sequence': {
      requireCount(args, 3)
      const start = parseNumericExpression(args[1]!)
      const end = parseNumericExpression(args[2]!)
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
        throw new Error('Dizi indisleri artan sırada pozitif tam sayılar olmalı.')
      }
      return { kind, expression: args[0]!, start, end }
    }
    case 'limit': case 'tangent': case 'tangentH': case 'tangentX':
      requireCount(args, 2)
      return { kind, expression: args[0]!, at: parseNumericExpression(args[1]!) }
    case 'derivative':
      requireCount(args, 1)
      return { kind, expression: args[0]! }
    case 'composition':
      if (!args.length) throw new Error('Bileşke en az bir fonksiyon gerektirir.')
      return { kind, expressions: args }
  }
}

interface Comparison { operands: string[]; operators: string[] }

function comparisons(source: string): Comparison {
  const operands: string[] = []
  const operators: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') depth--
    else if (depth === 0 && (char === '<' || char === '>' || char === '=')) {
      const operand = source.slice(start, index).trim()
      if (!operand) throw new Error('Geçersiz tanım aralığı.')
      operands.push(operand)
      let op = char
      if (source[index + 1] === '=') op += source[++index]
      if (op === '==') throw new Error('Tanım aralığında tek eşittir kullanın.')
      operators.push(op)
      start = index + 1
    }
  }
  const last = source.slice(start).trim()
  if (!last) throw new Error('Geçersiz tanım aralığı.')
  operands.push(last)
  return { operands, operators }
}

function section(expression: string, range: string): SectionSpec {
  const { operands, operators } = comparisons(range)
  const middle = operands.indexOf('x')
  if ((operators.length !== 1 && operators.length !== 2) || middle < 0
    || operands.lastIndexOf('x') !== middle || (operators.length === 2 && middle !== 1)) {
    throw new Error('Tanım aralığını x için bir eşitsizlik olarak yazın.')
  }
  const result: SectionSpec = {
    expression, startX: null, endX: null, startInclusive: false, endInclusive: false,
  }
  for (let index = 0; index < operators.length; index++) {
    const xOnLeft = operands[index] === 'x'
    const value = parseNumericExpression(operands[xOnLeft ? index + 1 : index]!)
    const op = operators[index]!
    if (op === '=') {
      if (operators.length !== 1) throw new Error('Eşitlik aralığı tek bir değer içermeli.')
      result.startX = result.endX = value
      result.startInclusive = result.endInclusive = true
    } else if ((op.startsWith('>') && xOnLeft) || (op.startsWith('<') && !xOnLeft)) {
      if (result.startX !== null) throw new Error('Tanım aralığının iki alt sınırı olamaz.')
      result.startX = value
      result.startInclusive = op.endsWith('=')
    } else {
      if (result.endX !== null) throw new Error('Tanım aralığının iki üst sınırı olamaz.')
      result.endX = value
      result.endInclusive = op.endsWith('=')
    }
  }
  if (result.startX !== null && result.endX !== null
    && (result.startX > result.endX || (result.startX === result.endX && (!result.startInclusive || !result.endInclusive)))) {
    throw new Error('Tanım aralığı boş olamaz.')
  }
  return result
}

function equationSides(source: string): [string, string] | null {
  let depth = 0
  let equals = -1
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') depth--
    else if (depth === 0 && char === '=' && !/[<>=!]/.test(source[index - 1] ?? '') && source[index + 1] !== '=') {
      if (equals !== -1) throw new Error('Tek bir denklem girin.')
      equals = index
    }
  }
  if (equals === -1) return null
  const left = source.slice(0, equals).trim()
  const right = source.slice(equals + 1).trim()
  if (!left || !right) throw new Error('Denklemin iki tarafını da yazın.')
  return [left, right]
}

function parse(source: string): Command {
  if (!source) throw new Error('Bir komut veya matematik ifadesi girin.')
  // Validate the whole input before parsing a prefix or evaluating any numbers.
  splitTopLevel(source, ';')
  const call = source.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*\(/u)
  if (call) {
    const kind = commandName(call[1]!)
    if (kind) {
      const opening = source.indexOf('(')
      let depth = 0
      let end = -1
      for (let index = opening; index < source.length; index++) {
        if (source[index] === '(') depth++
        else if (source[index] === ')' && --depth === 0) { end = index; break }
      }
      if (end !== source.length - 1) throw new Error('Komuttan sonra fazladan ifade bulunuyor.')
      return namedCommand(kind, splitTopLevel(source.slice(opening + 1, -1)))
    }
  } else if (commandName(source)) {
    throw new Error('Komut parametrelerini parantez içinde yazın.')
  }

  if (enclosed(source)) {
    const parts = splitTopLevel(source.slice(1, -1))
    if (parts.length === 2) {
      const point = pointArgument(source)
      if (point.kind === 'coordinates') return { kind: 'point', point: { a: point.a, b: point.b } }
    }
  }

  const segments = splitTopLevel(source, ';')
  if (segments.length > 1 || splitTopLevel(source).length > 1) {
    const sections = segments.map(segment => {
      const parts = splitTopLevel(segment)
      requireCount(parts, 2)
      return section(parts[0]!, parts[1]!)
    })
    return { kind: 'piecewise', source, sections }
  }

  const equation = equationSides(source)
  if (equation) {
    const [left, right] = equation
    if (left === 'y' || right === 'y') return { kind: 'function', expression: left === 'y' ? right : left }
    if (left === 'x' || right === 'x') return { kind: 'verticalLine', x: parseNumericExpression(left === 'x' ? right : left) }
    throw new Error('Denklem y veya x için yazılmalı.')
  }
  return { kind: 'function', expression: source }
}

/** No document access or model allocation: successful results are plain data. */
export function parseCommand(input: string): ParseCommandResult {
  try {
    return { ok: true, command: parse(input.trim()) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Komut çözümlenemedi.' }
  }
}
