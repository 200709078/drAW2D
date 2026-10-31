/**
 * The input language in one table: command names for the parser, templates for the
 * command input's suggestions, and the help window's topics and examples.
 */

export type NamedCommand = 'circle' | 'line' | 'segment' | 'distance' | 'angle' | 'reflect' |
  'intersect' | 'arc' | 'circleTangent' | 'sequence' | 'limit' | 'tangent' | 'tangentH' |
  'tangentX' | 'derivative' | 'composition' | 'piecewise' | 'root' | 'extremum' | 'inflection' | 'integral' |
  'midpoint' | 'ray' | 'perpendicular' | 'parallel' | 'bisector' | 'angleBisector' | 'polygon' | 'rotate' | 'translate' |
  'asymptote' | 'vector' | 'regularPolygon' | 'circularArc' | 'area' | 'slope' | 'length' | 'dot' | 'curve' | 'polar' | 'unitCircle'

/** Display name first, then accepted aliases. Matching ignores case and diacritics. */
export const COMMAND_NAMES: Readonly<Record<NamedCommand, readonly string[]>> = {
  circle: ['Çember', 'Circle'],
  line: ['Doğru', 'Line'],
  segment: ['DoğruParçası', 'Segment', 'LineSegment'],
  distance: ['Uzaklık', 'Distance', 'DistanceSegment'],
  angle: ['Açı', 'Angle'],
  reflect: ['YansıtNokta', 'Yansıt', 'Reflect'],
  intersect: ['Kesiştir', 'Intersect'],
  arc: ['YayÖlçüsü', 'ArcMeasure'],
  circleTangent: ['TeğetC', 'CircleTangent'],
  sequence: ['Dizi', 'Sequence'],
  limit: ['Limit'],
  tangent: ['Teğet', 'Tangent'],
  tangentH: ['TeğetH', 'TangentH'],
  tangentX: ['TeğetX', 'TangentX'],
  derivative: ['Türev', 'Derivative'],
  composition: ['Bileşke', 'Composition'],
  piecewise: ['ParçalıFonksiyon', 'Piecewise'],
  root: ['Kök', 'Root'],
  extremum: ['Ekstremum', 'Extremum'],
  inflection: ['Dönüm', 'DönümNoktası', 'InflectionPoint'],
  integral: ['İntegral', 'Integral'],
  midpoint: ['OrtaNokta', 'Midpoint'],
  ray: ['Işın', 'Ray'],
  perpendicular: ['DikDoğru', 'PerpendicularLine'],
  parallel: ['ParalelDoğru', 'Paralel', 'ParallelLine'],
  bisector: ['OrtaDikme', 'PerpendicularBisector'],
  angleBisector: ['Açıortay', 'AngleBisector'],
  polygon: ['Çokgen', 'Polygon'],
  rotate: ['Döndür', 'Rotate'],
  translate: ['Ötele', 'Translate'],
  asymptote: ['Asimptot', 'Asymptote'],
  vector: ['Vektör', 'Vector'],
  regularPolygon: ['DüzgünÇokgen', 'RegularPolygon'],
  circularArc: ['Yay', 'CircularArc'],
  area: ['Alan', 'Area'],
  slope: ['Eğim', 'Slope'],
  length: ['Uzunluk', 'Length'],
  dot: ['İçÇarpım', 'Dot', 'DotProduct'],
  curve: ['Eğri', 'Curve'],
  polar: ['Kutupsal', 'Polar'],
  unitCircle: ['BirimÇember', 'UnitCircle'],
}

export function normalizedName(name: string): string {
  return name.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')
}

const commandsByName = new Map(Object.entries(COMMAND_NAMES)
  .flatMap(([kind, names]) => names.map(name => [normalizedName(name), kind as NamedCommand] as const)))

export function commandKind(name: string): NamedCommand | undefined {
  return commandsByName.get(normalizedName(name))
}

export interface LanguageEntry {
  topic: string
  /** As shown in help. With `command`, also a template: `<Placeholders>` are filled in. */
  syntax: string
  command?: NamedCommand
  examples: readonly string[]
}

export interface HelpTopic {
  title: string
  note?: string
}

/** Help order. */
export const HELP_TOPICS: readonly HelpTopic[] = [
  { title: 'Nokta' },
  { title: 'Doğru' },
  { title: 'Doğru Parçası' },
  { title: 'Vektör' },
  { title: 'Özel Doğrular' },
  { title: 'Çokgen' },
  { title: 'Çember' },
  { title: 'Açı' },
  { title: 'Yay Ölçüsü' },
  { title: 'Ölçüm' },
  { title: 'Trigonometrik İfadeler' },
  { title: 'Üstel İfadeler' },
  { title: 'Logaritmik İfadeler' },
  { title: 'Dizi' },
  { title: 'Limit' },
  { title: 'Türev' },
  { title: 'Bileşke Fonksiyon' },
  { title: 'Teğet' },
  { title: 'Fonksiyon Analizi', note: 'Arama aralığı verilmezse oluşturma anındaki görünür x aralığı kullanılır' },
  { title: 'Fonksiyon İşlemleri', note: 'Kullanılacak fonksiyonların daha önce grafiğinin çizilmesi şartıyla' },
  { title: 'Parçalı Fonksiyon' },
  { title: 'Eğriler', note: 'Kapalı eğri x ve y içeren bir denklemdir; eğri değişkeni komutta adlandırılır' },
  { title: 'Eşitsizlik' },
  { title: 'Dönüşümler', note: 'Noktalar, doğrular, vektörler, çemberler, yaylar ve çokgenler dönüştürülebilir' },
  { title: 'Parametre' },
]

export const LANGUAGE: readonly LanguageEntry[] = [
  { topic: 'Nokta', syntax: '(<Apsis>, <Ordinat>)', examples: ['(-1, 2)'] },
  { topic: 'Nokta', syntax: 'YansıtNokta(<Nokta>, <Merkez Nokta>)', command: 'reflect', examples: ['YansıtNokta((1,2),(0,0))', 'YansıtNokta(A,B)'] },
  { topic: 'Nokta', syntax: 'OrtaNokta(<Nokta>, <Nokta>)', command: 'midpoint', examples: ['OrtaNokta((0,0),(4,2))', 'OrtaNokta(A,B)'] },
  { topic: 'Doğru', syntax: 'Eğimli Doğru: ax + b', examples: ['2x-3'] },
  { topic: 'Doğru', syntax: 'Dik Doğru: x = c', examples: ['x=2'] },
  { topic: 'Doğru', syntax: 'Doğru(<Nokta>, <Nokta>)', command: 'line', examples: ['Doğru((-1,0),(1,1))'] },
  { topic: 'Doğru', syntax: 'Kesiştir(<Nesne>, <Nesne>)', command: 'intersect', examples: ['Kesiştir(f,g)'] },
  { topic: 'Doğru', syntax: 'Işın(<Başlangıç Noktası>, <Nokta>)', command: 'ray', examples: ['Işın((0,0),(1,2))'] },
  { topic: 'Özel Doğrular', syntax: 'DikDoğru(<Nokta>, <Doğru>)', command: 'perpendicular', examples: ['DikDoğru(A,f)'] },
  { topic: 'Özel Doğrular', syntax: 'ParalelDoğru(<Nokta>, <Doğru>)', command: 'parallel', examples: ['ParalelDoğru(A,f)'] },
  { topic: 'Özel Doğrular', syntax: 'OrtaDikme(<Nokta>, <Nokta>)', command: 'bisector', examples: ['OrtaDikme((0,0),(4,2))'] },
  { topic: 'Özel Doğrular', syntax: 'Açıortay(<Nokta>, <Köşe>, <Nokta>)', command: 'angleBisector', examples: ['Açıortay((2,0),(0,0),(0,2))'] },
  { topic: 'Çokgen', syntax: 'Çokgen(<Nokta>, <Nokta>, <Nokta>, ...)', command: 'polygon', examples: ['Çokgen((0,0),(3,0),(3,2),(0,2))'] },
  { topic: 'Çokgen', syntax: 'DüzgünÇokgen(<Nokta>, <Nokta>, <Köşe Sayısı>)', command: 'regularPolygon', examples: ['DüzgünÇokgen((0,0),(2,0),6)'] },
  { topic: 'Vektör', syntax: 'Vektör(<Başlangıç>, <Bitiş>)', command: 'vector', examples: ['Vektör((0,0),(3,2))'] },
  { topic: 'Vektör', syntax: 'Bileşenlerle: u = (x, y)', examples: ['u=(3,2)'] },
  { topic: 'Vektör', syntax: 'İşlemler: toplama, çıkarma, sayıyla çarpma', examples: ['w=u+v', 'u-v', '2u', 'a*u-v'] },
  { topic: 'Vektör', syntax: 'Noktaya ekleme: <Nokta> + <Vektör>', examples: ['B=A+u'] },
  { topic: 'Vektör', syntax: 'Uzunluk(<Vektör>)', command: 'length', examples: ['Uzunluk(u)', 'k=Uzunluk(u+v)'] },
  { topic: 'Vektör', syntax: 'İçÇarpım(<Vektör>, <Vektör>)', command: 'dot', examples: ['İçÇarpım(u,v)'] },
  { topic: 'Vektör', syntax: 'Açı(<Vektör>, <Vektör>)', command: 'angle', examples: ['Açı(u,v)'] },
  { topic: 'Doğru Parçası', syntax: 'DoğruParçası(<Nokta>, <Nokta>)', command: 'segment', examples: ['DoğruParçası((-2,1),(-1,2))'] },
  { topic: 'Doğru Parçası', syntax: 'Uzaklık(<Nokta>, <Nokta>)', command: 'distance', examples: ['Uzaklık((-2,1),(-1,2))'] },
  { topic: 'Çember', syntax: 'Çember(<Merkez>, <Yarıçap>)', command: 'circle', examples: ['Çember((-1,2),1)'] },
  { topic: 'Çember', syntax: 'Çember(<Merkez>, <Nokta>)', command: 'circle', examples: ['Çember((-1,1),(0,2))'] },
  { topic: 'Çember', syntax: 'Çember(<Nokta>, <Nokta>, <Nokta>)', command: 'circle', examples: ['Çember((0,0),(0,-2),(-2,0))'] },
  { topic: 'Çember', syntax: 'Yay(<Merkez>, <Başlangıç Noktası>, <Bitiş Noktası>)', command: 'circularArc', examples: ['Yay((0,0),(2,0),(0,2))'] },
  {
    topic: 'Çember', syntax: 'BirimÇember(<Açı (derece)>)', command: 'unitCircle',
    examples: ['BirimÇember()', 'BirimÇember(30)'],
  },
  { topic: 'Açı', syntax: 'Açı(<Nokta>, <Köşe>, <Nokta>)', command: 'angle', examples: ['Açı((-1,2),(0,1),(-1,0))'] },
  { topic: 'Yay Ölçüsü', syntax: 'YayÖlçüsü(<Nokta>, <Nokta>)', command: 'arc', examples: ['YayÖlçüsü(A,B)'] },
  { topic: 'Ölçüm', syntax: 'Alan(<Çokgen veya Çember>)', command: 'area', examples: ['Alan(a)'] },
  { topic: 'Ölçüm', syntax: 'Eğim(<Doğru>)', command: 'slope', examples: ['Eğim(f)'] },
  { topic: 'Trigonometrik İfadeler', syntax: 'sin(...), cos(...), tan(...), cot(...)', examples: ['sin(-x+4)', 'cos(3x-1)', 'tan(1/x)', 'cot(x+1)'] },
  { topic: 'Üstel İfadeler', syntax: '(Taban)^(Üs)', examples: ['2^(x-1)', '(1/2)^sin(x)', 'E^(x-1)'] },
  { topic: 'Logaritmik İfadeler', syntax: 'log(Taban,...)', examples: ['log(E,4-x^2)', 'log(5,2x-3)'] },
  { topic: 'Dizi', syntax: 'Dizi(<Fonksiyon (n)>, <Başlangıç>, <Bitiş>)', command: 'sequence', examples: ['Dizi(1/n,1,7)'] },
  { topic: 'Limit', syntax: 'Limit(<Fonksiyon>, <Apsis>)', command: 'limit', examples: ['Limit(sin(2x-1),2)'] },
  { topic: 'Türev', syntax: 'Türev(<Fonksiyon>)', command: 'derivative', examples: ['Türev(sin(x+1))'] },
  { topic: 'Bileşke Fonksiyon', syntax: 'Bileşke(<Fonksiyon>, <Fonksiyon>)', command: 'composition', examples: ['Bileşke(x-1,x^2-2)'] },
  { topic: 'Teğet', syntax: 'Teğet(<Fonksiyon>, <Apsis>)', command: 'tangent', examples: ['Teğet(sin(2x-1),2)'] },
  { topic: 'Teğet', syntax: 'TeğetH(<Fonksiyon>, <Apsis>)', command: 'tangentH', examples: ['TeğetH(x^2,1)'] },
  { topic: 'Teğet', syntax: 'TeğetX(<Fonksiyon>, <Apsis>)', command: 'tangentX', examples: ['TeğetX(x^2,1)'] },
  { topic: 'Teğet', syntax: 'TeğetC(<Çember>, <Nokta>)', command: 'circleTangent', examples: ['TeğetC(c,A)', 'TeğetC(a,(3,2))'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Kök(<Fonksiyon>)', command: 'root', examples: ['Kök(f)', 'Kök(x^2-4)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Kök(<Fonksiyon>, <Başlangıç>, <Bitiş>)', command: 'root', examples: ['Kök(f,0,5)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Ekstremum(<Fonksiyon>)', command: 'extremum', examples: ['Ekstremum(f)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Dönüm(<Fonksiyon>)', command: 'inflection', examples: ['Dönüm(f)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Kesiştir(<Fonksiyon>, <Fonksiyon>)', command: 'intersect', examples: ['Kesiştir(f,g)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'İntegral(<Fonksiyon>, <Başlangıç>, <Bitiş>)', command: 'integral', examples: ['İntegral(f,0,2)'] },
  { topic: 'Fonksiyon Analizi', syntax: 'Asimptot(<Fonksiyon>)', command: 'asymptote', examples: ['Asimptot((x^2+1)/(x-1))'] },
  { topic: 'Fonksiyon İşlemleri', syntax: '', examples: ['2f/(1-3x)', 'f+2(3x-4)', '3f-4g', 'f*g'] },
  {
    topic: 'Parçalı Fonksiyon', syntax: 'ParçalıFonksiyon(<Fonksiyon>, <Aralık>; <Fonksiyon>, <Aralık>)', command: 'piecewise',
    examples: ['ParçalıFonksiyon(2x+1, x<0; x^2, x>=0)'],
  },
  { topic: 'Eğriler', syntax: 'Kapalı eğri: <Denklem>', examples: ['x^2+y^2=4', 'x^3+y^3=3x*y'] },
  {
    topic: 'Eğriler', syntax: 'Eğri(<x(t)>, <y(t)>, <Değişken>, <Başlangıç>, <Bitiş>)', command: 'curve',
    examples: ['Eğri(cos(t), sin(t), t, 0, 2π)', 'Eğri(t, t^2, t, -2, 2)'],
  },
  { topic: 'Eğriler', syntax: 'Kutupsal(<r(θ)>, <Başlangıç>, <Bitiş>)', command: 'polar', examples: ['Kutupsal(1+cos(θ), 0, 2π)', 'r=2sin(3θ)'] },
  { topic: 'Eşitsizlik', syntax: '<İfade> < <İfade>', examples: ['y<x^2', 'x^2+y^2<=4', 'x>1'] },
  { topic: 'Dönüşümler', syntax: 'Yansıt(<Nokta>, <Doğru>)', command: 'reflect', examples: ['Yansıt(A,f)'] },
  { topic: 'Dönüşümler', syntax: 'Döndür(<Nokta>, <Açı (derece)>, <Merkez>)', command: 'rotate', examples: ['Döndür((2,0),90,(0,0))'] },
  { topic: 'Dönüşümler', syntax: 'Ötele(<Nokta>, <Başlangıç>, <Bitiş>)', command: 'translate', examples: ['Ötele((1,1),(0,0),(2,1))'] },
  { topic: 'Dönüşümler', syntax: 'Ötele(<Nesne>, <Vektör>)', command: 'translate', examples: ['Ötele(a,u)'] },
  { topic: 'Parametre', syntax: 'Kaydırıcı: ad = değer', examples: ['a=2'] },
  { topic: 'Parametre', syntax: 'Parametreye bağlı nesne', examples: ['a*x^2+1', 'Çember((0,0),a)', '(a,1)'] },
]

/** `<Name>` marks a part of a template the user fills in. */
export const PLACEHOLDER = /<[\p{Lu}][^<>,;]*>/gu

/** Command templates whose names (in any alias) start with the typed prefix. */
export function matchingTemplates(prefix: string): LanguageEntry[] {
  const typed = normalizedName(prefix)
  if (!typed) return []
  return LANGUAGE.filter(entry => entry.command && COMMAND_NAMES[entry.command].some(name => normalizedName(name).startsWith(typed)))
}
