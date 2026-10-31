import type { ViewSnapshot } from '../app/viewport-state'
import type { GeometryDocumentObject } from '../geometry/function-types'
import type { ObjectId } from '../geometry/types'

/** drAW2D documents; the family uses .drw (drAW), .drw2 (drAW2D) and .drw3 (drAW3D). */
export const FILE_EXTENSION = '.drw2'
export const FILE_FORMAT = 1
export const DEFAULT_FILE_NAME = `adsız${FILE_EXTENSION}`

export interface DocumentFile {
  objects: GeometryDocumentObject[]
  view?: ViewSnapshot
}

export type ParseResult = ({ ok: true } & DocumentFile) | { ok: false; error: string }

const OBJECT_TYPES: ReadonlySet<string> = new Set<GeometryDocumentObject['type']>([
  'point', 'circleR', 'circle2', 'circle3', 'angle', 'arcMeasure', 'lineWithPoints', 'lineSegment', 'distanceSegment',
  'circleTangent', 'ray', 'polygon', 'vector', 'circularArc', 'verLine', 'lineWithEquation', 'sequence', 'limit',
  'function', 'functioncomposition', 'tangent', 'tangentHX', 'derivative', 'sectionalFunctions', 'integral', 'asymptote',
  'area', 'slope', 'vectorMeasure', 'curve', 'implicit', 'inequality', 'unitCircle', 'parameter',
])

/** A shared document object inside another one, such as a circle's centre point. */
interface Reference { $ref: ObjectId }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isReference = (value: unknown): value is Reference =>
  isRecord(value) && Object.keys(value).length === 1 && Number.isSafeInteger(value.$ref)

/**
 * The document as JSON. Objects that others share (a segment's end points) are written
 * once and referred to as `{ "$ref": id }`, so opening the file restores the sharing.
 */
export function serializeDocument(file: DocumentFile): string {
  const members = new Map<unknown, ObjectId>()
  for (const object of file.objects) if (object.id !== null) members.set(object, object.id)
  const encode = (value: unknown, top: boolean): unknown => {
    if (Array.isArray(value)) return value.map(item => encode(item, false))
    if (!isRecord(value)) return typeof value === 'number' && !Number.isFinite(value) ? null : value
    if (!top && members.has(value)) return { $ref: members.get(value) }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item, false)]))
  }
  return JSON.stringify({
    app: 'drAW2D', format: FILE_FORMAT, objects: file.objects.map(object => encode(object, true)),
    ...(file.view ? { view: file.view } : {}),
  })
}

function viewOf(value: unknown): ViewSnapshot | undefined {
  if (!isRecord(value)) return undefined
  const fields = ['scaleX', 'scaleY', 'minX', 'minY', 'tickX', 'tickY'] as const
  if (!fields.every(field => typeof value[field] === 'number' && Number.isFinite(value[field]))) return undefined
  return Object.fromEntries(fields.map(field => [field, value[field]])) as unknown as ViewSnapshot
}

/**
 * Read a .drw2 file. The structure is checked here (known types, unique IDs, references
 * to objects in the file); the geometry itself is checked when the document resolves.
 */
export function parseDocument(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Dosya okunamadı: geçerli bir drAW2D belgesi değil.' }
  }
  if (!isRecord(data) || data.app !== 'drAW2D' || !Array.isArray(data.objects)) {
    return { ok: false, error: 'Bu dosya bir drAW2D belgesi değil.' }
  }
  if (typeof data.format !== 'number' || data.format > FILE_FORMAT) {
    return { ok: false, error: 'Bu belge drAW2D’nin daha yeni bir sürümüyle kaydedilmiş.' }
  }
  const byId = new Map<ObjectId, Record<string, unknown>>()
  for (const object of data.objects as unknown[]) {
    if (!isRecord(object) || typeof object.type !== 'string' || !OBJECT_TYPES.has(object.type)
      || !(object.name === null || typeof object.name === 'string') || typeof object.color !== 'string'
      || !Number.isSafeInteger(object.id) || (object.id as number) < 0 || byId.has(object.id as number)) {
      return { ok: false, error: 'Belgede tanınmayan ya da bozuk bir nesne var.' }
    }
    byId.set(object.id as number, object)
  }
  let missing = false
  const decode = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(decode)
    if (isReference(value)) {
      const target = byId.get(value.$ref)
      if (!target) missing = true
      return target ?? null
    }
    if (!isRecord(value)) return value
    for (const [key, item] of Object.entries(value)) value[key] = decode(item)
    return value
  }
  for (const object of byId.values()) {
    for (const [key, item] of Object.entries(object)) object[key] = decode(item)
  }
  if (missing) return { ok: false, error: 'Bir nesnenin dayandığı bir nesne belgede yok.' }
  const objects = [...byId.values()] as unknown as GeometryDocumentObject[]
  for (const object of objects) {
    if (object.type === 'point' && !Array.isArray(object.onOther)) return { ok: false, error: `${object.name ?? 'Nokta'} bozuk.` }
  }
  return { ok: true, objects, view: viewOf(data.view) }
}

/** The file name without its folder, for the title and messages. */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || DEFAULT_FILE_NAME
}
