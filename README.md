# drAW2D

Web ve masaüstü için **2B geometri ve fonksiyon çizim** uygulaması.

made by **mADEMatik Solutions** — [madematik.com](https://www.madematik.com/drAW2D)

İlgili proje: [drAW3D](https://github.com/200709078/drAW3D)

## Özellikler

- **Geometrik araçlar**: nokta, doğru, doğru parçası, çember (merkez + nokta / üç nokta), teğet çember, açı, yay ölçüsü
- **İşlemler**: kesiştir, yansıt (nokta), uzaklık ölç
- **Fonksiyon çizimi**: trigonometrik (`sin`, `cos`, `tan`, `cot`), üstel, logaritmik, parçalı fonksiyonlar
- **Analiz komutları**: `Türev`, `Limit`, `Bileşke`, `Teğet` / `TeğetH` / `TeğetX` / `TeğetC`, `Dizi`
- **İfade birleştirme**: daha önce çizilmiş fonksiyonlarla işlem (`2f/(1-3x)`, `3f-4g`, ...)
- **Geri al / yinele**, temizleme, standart görünüm
- **Radyal (dairesel) araç çubuğu** ve katlanır sağ panel
- **Yardım penceresi**: uygulama içi komut referansı

## Giriş dili örnekleri

```
(-1, 2)                      # nokta
2x-3                         # eğimli doğru
x=2                          # dik doğru
Doğru((-1,0),(1,1))          # iki noktadan doğru
Çember((0,0),(0,-2),(-2,0))  # üç noktadan çember
Uzaklık((-2,1),(-1,2))       # iki nokta arası uzaklık
YansıtNokta((1,2),(0,0))     # yansıtma
Kesiştir(f,g)                # iki nesnenin kesişimi
Türev(sin(x+1))              # türev
Limit(sin(2x-1),2)           # limit
Teğet(sin(2x-1),2)           # teğet doğrusu
Dizi(1/n,1,7)                # dizi değerleri
2x+1,x<0; x^2,x>=0           # parçalı fonksiyon
```

## Çalıştırma

Node.js 22.12 veya üzeri gerekir. NVM kullanılıyorsa proje kökünde `nvm use` çalıştırın.

```bash
npm ci
npm run dev
```

Terminalde gösterilen adresi tarayıcıda açın. Electron ile geliştirme için:

```bash
npm run electron:dev
```

Üretim derlemesini hazırlamak ve incelemek için:

```bash
npm run build
npm run preview       # Web önizlemesi
npm run electron      # Derlenmiş uygulamayı masaüstünde açar
```

Web yayınına yalnızca `dist/` klasörünün içeriği yüklenir. Çıktı statik dosyalardan oluşur;
Node.js son kullanıcının bilgisayarında veya web sunucusunda gerekli değildir. Kaynak
`index.html` yerine Vite geliştirme sunucusu veya derlenmiş çıktı kullanılmalıdır.

## Masaüstü paketleri

```bash
npm run pack          # Kurulum paketi oluşturmadan uygulama klasörü
npm run dist:linux    # Linux/Pardus için AppImage ve .deb
npm run dist:win      # Windows için NSIS .exe kurulum paketi
```

Paketler `release/` altında oluşur. Linux paketlerini Linux üzerinde, Windows paketini
Windows üzerinde üretmek önerilir; Linux'ta Windows için çapraz derleme ek Wine
araçları gerektirebilir. Pardus uyumluluğu hedeflenen Pardus sürümünde ayrıca denenmelidir.

## Kontroller

```bash
npm run typecheck
npm test
```

Tarayıcı testleri sistemdeki Chromium'u kullanır; farklı bir Chromium çalıştırılabilir
dosyası `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ile seçilebilir. Test yapılandırması ve örnekler
[tests/README.md](tests/README.md) içinde açıklanır.

## Proje yapısı

```
drAW2D/
├── index.html        # Ortak web/masaüstü arayüzü
├── src/
│   ├── main.ts       # TypeScript giriş noktası
│   ├── math.ts       # math.js yapılandırması
│   ├── geometry/     # TypeScript geometri/fonksiyon/analiz modelleri ve belge tipleri
│   ├── math/         # Bileşke, türev, hassas doğru ifadeleri ve analiz değerlendirmesi
│   ├── rendering/    # Ortak koordinat dönüşümü, kare/ızgara önbelleği ve fonksiyon çizimi
│   ├── ui/           # TypeScript radyal araç çubuğu ve tipleri
│   ├── legacy/       # Aşamalı taşınacak JavaScript geometri motoru
│   └── styles/       # Mevcut stiller
├── public/           # SVG simgeler, uygulama simgesi ve ses
├── electron/         # TypeScript masaüstü uygulama kabuğu
├── build/            # Linux ve Windows paket simgeleri
├── scripts/          # Electron geliştirme başlatıcısı
├── tests/            # Tarayıcı regresyon kontrolleri
└── docs/             # Geçiş planı
```

## Teknoloji

- TypeScript + Vite + Canvas; 20 geometri/fonksiyon/analiz modeli TypeScript'tir, kalan motor aşamalı taşınır.
- Electron + electron-builder ile Linux ve Windows paketleme.
- [math.js](https://mathjs.org/) 15.2.0 — eski uygulamayla aynı sürüm ve logaritma davranışı.
- Uygulama varlıkları ve matematik kütüphanesi çıktıya dahil edilir; çalışma sırasında CDN gerekmez.
- Çizim talepleri ekran karelerinde birleştirilir; eksen/ızgara ve derlenmiş fonksiyon ifadeleri önbelleğe alınır. Yüksek yoğunluklu ekranlar desteklenir.
- Çizim ve işaretçi girişi aynı matematik/CSS piksel dönüşümünü kullanır; görünüm değişene kadar dönüşüm önbellekten kullanılır. Dönüşüm koordinatları yuvarlamaz veya ızgaraya yakalamaz; metin gösterimi ayrıca biçimlendirilir.
- Fonksiyon çizicisi görünür x aralığını ve tanım aralığını sınırlı örneklemeyle çizer; tanımsız bölgelerde ve tespit edilen asimptot sıçramalarında eğriyi keser.
- Android/iOS paketleri henüz eklenmedi. Ortak web çekirdeği ileride mobil paketlemeye temel olur.

## Aşamalı geçiş

Geliştirme, paketleme, temel çizim altyapısı ve 20 geometri/fonksiyon/analiz modeli TypeScript'e taşındı.
Geometri motorunun tamamı henüz TypeScript'e çevrilmemiştir. Her taşıma adımından
sonra durulur; daha verimli veya kullanışlı tasarımlar için eski uygulama davranışı
değiştirilebilir. Tamamlanan adımlar, sonraki modüller ve
doğrulama sırası [geçiş planında](docs/gecis-plani.md) açıklanır.

GeoGebra benzeri araçları ileride genişletmek için araç durumu/controller,
geometri/bağımlılık hesapları ve çizicileri ayırma hedeflenir. Mevcut çizim adımı
yeni araçlar veya mobil etkileşim eklemez; dokunma/kalem desteği ileriki adımlardadır.

Geçiş sırasında oluşturulan eski uygulama kopyası karşılaştırmalar tamamlandıktan
sonra kaldırıldı. Eski davranışlardan ölçülen beklenen çıktılar regresyon testlerinde,
önceki kaynaklar Git geçmişinde bulunur.
