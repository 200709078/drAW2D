export type ToolAction =
  | 'select'
  | 'point'
  | 'intersect'
  | 'line'
  | 'linesegment'
  | 'circletangent'
  | 'circle2'
  | 'circle3'
  | 'angle'
  | 'distancesegment'
  | 'arcmeasure'
  | 'reflectpoint'
  | 'root'
  | 'extremum'
  | 'inflection'
  | 'midpoint'
  | 'ray'
  | 'perpendicular'
  | 'parallel'
  | 'bisector'
  | 'anglebisector'
  | 'polygon'
  | 'reflectline'
  | 'rotate'
  | 'translate'
  | 'vector'
  | 'regularpolygon'
  | 'circleradius'
  | 'circulararc'
  | 'area'
  | 'slope'
  | 'asymptote'
  | 'unitcircle'

export type ToolGroupId =
  | 'move' | 'point' | 'line' | 'specialLine' | 'polygon' | 'circle'
  | 'measure' | 'transform' | 'function' | 'slider'

export interface ToolGroup {
  id: ToolGroupId
  label: string
}

export interface ToolDefinition {
  action: ToolAction
  group: ToolGroupId
  label: string
  /** File in public/img. */
  icon: string
  /** What the user does next; shown when the tool is chosen. */
  instruction: string
}

/** Toolbar order. A group appears once it has a tool. */
export const TOOL_GROUPS: readonly ToolGroup[] = [
  { id: 'move', label: 'Taşı' },
  { id: 'point', label: 'Nokta' },
  { id: 'line', label: 'Doğru' },
  { id: 'specialLine', label: 'Özel Doğrular' },
  { id: 'polygon', label: 'Çokgen' },
  { id: 'circle', label: 'Çember' },
  { id: 'measure', label: 'Ölçüm' },
  { id: 'transform', label: 'Dönüşüm' },
  { id: 'function', label: 'Fonksiyon' },
  { id: 'slider', label: 'Kaydırıcı' },
]

/** Every tool, in menu order within its group. The first tool of a group is its default. */
export const TOOLS: readonly ToolDefinition[] = [
  { action: 'select', group: 'move', label: 'Taşı', icon: 'select.svg', instruction: 'Düzlemi veya nesneyi tutarak kaydırınız.' },
  { action: 'point', group: 'point', label: 'Nokta', icon: 'point.svg', instruction: 'Konum seçiniz.' },
  { action: 'intersect', group: 'point', label: 'Kesiştir', icon: 'intersect.svg', instruction: 'İki nesne seçiniz.' },
  { action: 'midpoint', group: 'point', label: 'Orta Nokta', icon: 'midpoint.svg', instruction: 'İki nokta seçiniz.' },
  { action: 'line', group: 'line', label: 'Doğru', icon: 'line.svg', instruction: 'Farklı iki nokta seçiniz.' },
  { action: 'linesegment', group: 'line', label: 'Doğru Parçası', icon: 'linesegment.svg', instruction: 'Farklı iki nokta seçiniz.' },
  { action: 'ray', group: 'line', label: 'Işın', icon: 'ray.svg', instruction: 'Başlangıç noktasını, sonra ışının geçtiği noktayı seçiniz.' },
  { action: 'vector', group: 'line', label: 'Vektör', icon: 'vector.svg', instruction: 'Başlangıç ve bitiş noktasını seçiniz.' },
  { action: 'perpendicular', group: 'specialLine', label: 'Dik Doğru', icon: 'perpendicular.svg', instruction: 'Bir nokta, sonra bir doğru seçiniz.' },
  { action: 'parallel', group: 'specialLine', label: 'Paralel Doğru', icon: 'parallel.svg', instruction: 'Bir nokta, sonra bir doğru seçiniz.' },
  { action: 'bisector', group: 'specialLine', label: 'Kenar Orta Dikmesi', icon: 'bisector.svg', instruction: 'İki nokta seçiniz.' },
  {
    action: 'anglebisector', group: 'specialLine', label: 'Açıortay', icon: 'anglebisector.svg',
    instruction: 'Üç nokta seçiniz; ikincisi açının köşesidir.',
  },
  {
    action: 'circletangent', group: 'specialLine', label: 'Çembere Teğet', icon: 'circletng.svg',
    instruction: 'Önce teğet çizilecek çemberi, sonra noktayı seçiniz.',
  },
  {
    action: 'polygon', group: 'polygon', label: 'Çokgen', icon: 'polygon.svg',
    instruction: 'Köşeleri sırayla seçiniz; kapatmak için ilk köşeye tıklayınız.',
  },
  {
    action: 'regularpolygon', group: 'polygon', label: 'Düzgün Çokgen', icon: 'regularpolygon.svg',
    instruction: 'İki köşe seçiniz, sonra köşe sayısını giriniz.',
  },
  {
    action: 'circle2', group: 'circle', label: 'Merkez ve Nokta ile Çember', icon: 'circle2.svg',
    instruction: 'Merkez nokta ve çember üzerinde bir nokta seçiniz.',
  },
  { action: 'circle3', group: 'circle', label: 'Üç Noktadan Çember', icon: 'circle3.svg', instruction: 'Çember üzerinde üç nokta seçiniz.' },
  {
    action: 'circleradius', group: 'circle', label: 'Merkez ve Yarıçap ile Çember', icon: 'circleradius.svg',
    instruction: 'Merkezi seçiniz, sonra yarıçapı giriniz.',
  },
  {
    action: 'unitcircle', group: 'circle', label: 'Birim Çember', icon: 'unitcircle.svg',
    instruction: 'Tuvale tıklayınız; birim çember O merkezli çizilir. Değerleri kartındaki kutucuklarla seçiniz.',
  },
  {
    action: 'circulararc', group: 'circle', label: 'Merkez ve İki Noktadan Yay', icon: 'circulararc.svg',
    instruction: 'Merkezi, yayın başlangıç noktasını ve bitişini belirleyen noktayı seçiniz.',
  },
  { action: 'angle', group: 'measure', label: 'Açı', icon: 'angle.svg', instruction: 'Üç nokta seçiniz.' },
  { action: 'distancesegment', group: 'measure', label: 'Uzaklık', icon: 'distance.svg', instruction: 'Farklı iki nokta seçiniz.' },
  { action: 'arcmeasure', group: 'measure', label: 'Yay Ölçüsü', icon: 'arcmeasure.svg', instruction: 'Aynı çember üzerinde iki nokta seçiniz.' },
  { action: 'area', group: 'measure', label: 'Alan', icon: 'area.svg', instruction: 'Bir çokgen veya çember seçiniz.' },
  { action: 'slope', group: 'measure', label: 'Eğim', icon: 'slope.svg', instruction: 'Bir doğru seçiniz.' },
  {
    action: 'reflectpoint', group: 'transform', label: 'Noktaya Göre Yansıt', icon: 'reflect.svg',
    instruction: 'Yansıtılacak nokta veya nesneyi, sonra yansıtma merkezini seçiniz.',
  },
  {
    action: 'reflectline', group: 'transform', label: 'Doğruya Göre Yansıt', icon: 'reflectline.svg',
    instruction: 'Yansıtılacak nokta veya nesneyi, sonra doğruyu seçiniz.',
  },
  {
    action: 'rotate', group: 'transform', label: 'Döndür', icon: 'rotate.svg',
    instruction: 'Döndürülecek nokta veya nesneyi, sonra merkezi seçiniz; açı kaydırıcıyla değişir.',
  },
  {
    action: 'translate', group: 'transform', label: 'Ötele', icon: 'translate.svg',
    instruction: 'Ötelenecek nokta veya nesneyi, sonra bir vektörü ya da öteleme vektörünün başlangıcını ve bitişini seçiniz.',
  },
  { action: 'root', group: 'function', label: 'Kök', icon: 'root.svg', instruction: 'Görünür aralıktaki kökler için bir fonksiyon seçiniz.' },
  {
    action: 'extremum', group: 'function', label: 'Ekstremum', icon: 'extremum.svg',
    instruction: 'Görünür aralıktaki yerel en büyük ve en küçük noktalar için bir fonksiyon seçiniz.',
  },
  {
    action: 'inflection', group: 'function', label: 'Dönüm Noktası', icon: 'inflection.svg',
    instruction: 'Görünür aralıktaki dönüm noktaları için bir fonksiyon seçiniz.',
  },
  {
    action: 'asymptote', group: 'function', label: 'Asimptot', icon: 'asymptote.svg',
    instruction: 'Bir fonksiyon seçiniz; düşey asimptotlar görünür aralıkta aranır.',
  },
]

export function toolDefinition(action: ToolAction): ToolDefinition {
  const tool = TOOLS.find(item => item.action === action)
  if (!tool) throw new Error(`Bilinmeyen araç: ${action}`)
  return tool
}

export function isToolAction(value: string): value is ToolAction {
  return TOOLS.some(tool => tool.action === value)
}

/** Groups with at least one tool, each with its tools. */
export function visibleGroups(): { group: ToolGroup; tools: ToolDefinition[] }[] {
  return TOOL_GROUPS
    .map(group => ({ group, tools: TOOLS.filter(tool => tool.group === group.id) }))
    .filter(entry => entry.tools.length > 0)
}
