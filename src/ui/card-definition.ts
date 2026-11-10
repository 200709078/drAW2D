import { commandKind, type NamedCommand } from '../commands/language'

/**
 * The "Tanım" card view: a command (`C = OrtaNokta(A,B)`) said in words
 * (`C: A ve B noktalarının orta noktası`), so a class sees how an object was made without its
 * values. Phrases put the case endings on Turkish nouns, never on object names, so a name
 * needs no suffix (`A ve B noktalarının`, not `A'nın`). Formulas (`f: y = a*x+1`), points and
 * anything without a phrase are returned as they are.
 */

type Phrase = (args: string[]) => string | null

const isNumber = (text: string) => /^-?\d+(?:[.,]\d+)?$/.test(text)
const list = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ve ${names.at(-1)}`

const PHRASES: Partial<Record<NamedCommand, Phrase>> = {
  midpoint: ([a, b]) => `${a} ve ${b} noktalarının orta noktası`,
  line: ([a, b]) => `${a} ve ${b} noktalarından geçen doğru`,
  segment: ([a, b]) => `${a} ve ${b} noktaları arasındaki doğru parçası`,
  ray: ([a, b]) => `${a} noktasından başlayıp ${b} noktasından geçen ışın`,
  vector: ([a, b]) => `${a} noktasından ${b} noktasına vektör`,
  perpendicular: ([p, d]) => `${p} noktasından geçen, ${d} doğrusuna dik doğru`,
  parallel: ([p, d]) => `${p} noktasından geçen, ${d} doğrusuna paralel doğru`,
  bisector: ([a, b]) => `${a} ve ${b} noktalarının orta dikmesi`,
  angleBisector: ([a, b, c]) => `köşesi ${b} noktası olan ${a}${b}${c} açısının açıortayı`,
  intersect: args => `${list(args)} nesnelerinin kesişim noktası`,
  circle: args => {
    if (args.length === 3) return `${list(args)} noktalarından geçen çember`
    const [center, second] = args
    if (!center || !second) return null
    return /^\p{Lu}/u.test(second) && !isNumber(second)
      ? `merkezi ${center} noktası olan, ${second} noktasından geçen çember`
      : `merkezi ${center} noktası, yarıçapı ${second} olan çember`
  },
  circularArc: ([m, a, b]) => `merkezi ${m} noktası olan, ${a} noktasından ${b} noktasına yay`,
  unitCircle: () => 'birim çember',
  polygon: args => `köşeleri ${list(args)} olan çokgen`,
  regularPolygon: ([a, b, n]) => `${a} ve ${b} köşelerinden kurulan düzgün ${n} kenarlı çokgen`,
  reflect: ([x, y]) => `${x} nesnesinin ${y} nesnesine göre yansıması`,
  rotate: ([x, angle, center]) => `${x} nesnesinin ${center} noktası etrafında ${angle}${isNumber(angle!) ? '°' : ''} döndürülmüş hâli`,
  translate: args => args.length === 3
    ? `${args[0]} nesnesinin ${args[1]} noktasından ${args[2]} noktasına ötelenmiş hâli`
    : `${args[0]} nesnesinin ${args[1]} vektörüyle ötelenmiş hâli`,
  distance: ([a, b]) => `${a} ve ${b} noktaları arasındaki uzaklık`,
  angle: args => args.length === 3 ? `köşesi ${args[1]} noktası olan ${args.join('')} açısı` : `${list(args)} vektörleri arasındaki açı`,
  area: ([x]) => `${x} nesnesinin alanı`,
  slope: ([d]) => `${d} doğrusunun eğimi`,
  length: ([u]) => `${u} vektörünün uzunluğu`,
  dot: ([u, v]) => `${u} ve ${v} vektörlerinin iç çarpımı`,
  components: ([u, d, e]) => e !== undefined ? `${u} vektörünün ${d} ve ${e} doğrultularındaki bileşeni`
    : d !== undefined ? `${u} vektörünün ${d} doğrultusuna göre bileşeni` : `${u} vektörünün eksenler boyunca bileşeni`,
  derivative: ([f]) => `${f} fonksiyonunun türevi`,
  root: ([f]) => `${f} fonksiyonunun kökü`,
  extremum: ([f]) => `${f} fonksiyonunun ekstremum noktası`,
  inflection: ([f]) => `${f} fonksiyonunun dönüm noktası`,
  asymptote: ([f]) => `${f} fonksiyonunun asimptotları`,
  integral: ([f, a, b]) => `${f} fonksiyonunun [${a}, ${b}] aralığındaki belirli integrali`,
  tangent: ([f, a]) => `${f} fonksiyonuna x = ${a} noktasında teğet`,
  composition: ([f, g]) => `${f} ve ${g} fonksiyonlarının bileşkesi`,
}

/** Arguments split at top-level commas: `Çember((0,0),2)` gives `(0,0)` and `2`. */
function splitArguments(text: string): string[] {
  const args: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === ',' && depth === 0) {
      args.push(text.slice(start, index).trim())
      start = index + 1
    }
  }
  args.push(text.slice(start).trim())
  return args.filter(arg => arg !== '')
}

export function definitionText(text: string): string {
  const match = /^\s*([^\s:=]+)\s*[:=]\s*([\p{L}][\p{L}\p{N}]*)\((.*)\)\s*$/u.exec(text)
  if (!match) return text
  const [, name, command, inside] = match
  const kind = commandKind(command!)
  const phrase = kind ? PHRASES[kind] : undefined
  if (!phrase) return text
  const args = splitArguments(inside!)
  if (args.some(arg => arg.includes(' '))) return text
  const words = phrase(args)
  return words && !words.includes('undefined') ? `${name}: ${words}` : text
}
