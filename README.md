# drAW2D

Web ve masaüstü için **2B geometri ve fonksiyon çizim** uygulaması.

made by **mADEMatik Solutions** — [madematik.com](https://www.madematik.com/drAW2D)

İlgili proje: [drAW3D](https://github.com/200709078/drAW3D)

## Özellikler

- **Geometrik araçlar**: nokta, doğru, doğru parçası, çember (merkez + nokta / üç nokta), teğet çember, açı, yay ölçüsü
- **İşlemler**: kesiştir, yansıt (nokta), uzaklık ölç
- **Fonksiyon çizimi**: trigonometrik (`sin`, `cos`, `tan`, `cot`), üstel, logaritmik, parçalı fonksiyonlar
- **Analiz komutları**: `Türev`, `Limit`, `Bileşke`, `Teğet` / `TeğetH` / `TeğetX` / `TeğetC`, `Dizi`
- **İfade birleştirme**: daha önce çizilmiş fonksiyonlarla işlem (`2f/(1-3x)`, `3f-4g`, `f(x+1)`, ...)
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
Çember((sin(pi/2),0),sqrt(4)) # ifadelerle merkez ve yarıçap
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
│   ├── app/          # Uygulama kökü, araçlar, isabet testi, görünüm ve kart metinleri
│   ├── math.ts       # math.js yapılandırması
│   ├── commands/     # Komut/ifade çözümleme, adlandırma ve atomik nesne hazırlama
│   ├── document/     # Belge, seçim, kimlikler, taslaklar, geçmiş ve bağımlılık çözümü
│   ├── geometry/     # TypeScript modelleri, belge tipleri ve saf geometri hesapları
│   ├── math/         # Bileşke, türev, hassas doğru ifadeleri ve analiz değerlendirmesi
│   ├── rendering/    # Koordinat dönüşümü, kare/ızgara önbelleği, fonksiyon çizimi ve nesne çizicileri
│   ├── ui/           # Radyal araç çubuğu, nesne paneli, komut girişi, yardım ve bildirimler
│   └── styles/       # Mevcut stiller
├── public/           # SVG simgeler, uygulama simgesi ve ses
├── electron/         # TypeScript masaüstü kabuğu ve pencere denetimi preload'u
├── build/            # Linux ve Windows paket simgeleri
├── scripts/          # Electron geliştirme başlatıcısı
├── tests/            # Tarayıcı regresyon kontrolleri
└── docs/             # Geçiş planı
```

## Teknoloji

- TypeScript + Vite + Canvas; uygulamanın tamamı strict TypeScript'tir.
- Araçlar noktaları taslak olarak seçer ve yapıyı komut satırıyla aynı hazırlama yolundan oluşturur; tıklanan doğru, çember, teğet veya açıya bağlı nokta oluşur. Seçim eşiği yakınlaştırmadan bağımsız olarak CSS pikseli cinsindendir.
- Fare, kalem ve dokunma Pointer Events ile aynı yoldan çalışır. Dokunmada yapı araçları parmağı izleyen önizlemeyle nişan alır ve parmak kalkınca noktayı koyar; iki parmak yakınlaştırır ve kaydırır. Dar ekranlarda nesne paneli alttan açılan bir sayfadır, dokunmatik ekranlarda düğmeler büyüktür.
- Tekerlekle yakınlaştırma imlecin altındaki noktayı sabit tutar; dokunmatik yüzeyle (Ctrl+tekerlek) yakınlaştırma süreklidir. Bir nesneyi silmek ona bağlı yapıları da siler; geri alma hepsini tek adımda getirir.
- Uzaklık, yansıma, açı/yay, izdüşüm, kesişim ve çember teğeti hesapları saf TypeScript modüllerindedir. Aynı geometri hesabı nokta bağımlılıkları ve nesne seçimi için kullanılır; hesaplar DOM'a veya ad/kimlik üretimine bağlı değildir.
- Komutlar ve matematik girdileri strict TypeScript modüllerinde çözümlenir. İç içe argümanlar, sayısal ifadeler ve adlı fonksiyon çağrıları AST ile doğrulanır; doğru katsayıları cebirsel olarak bulunur. Hatalı komut belgeyi, kimlik sayacını veya geri al/yinele geçmişini değiştirmez.
- Belge ve geçmiş strict TypeScript modülündedir. Varsayılan son 100 işlem geri alınabilir; sınır yapılandırılabilir. Değişmeyen etkileşim geçmiş adımı oluşturmaz. Kaydırıcı ve nokta sürüklemesi tek işlem olarak kaydedilir; Escape devam eden düzenlemeyi geri çevirir. Yarım çizimler tamamlanmış belgeye sızmaz.
- Electron + electron-builder ile Linux ve Windows paketleme. Masaüstü penceresi çerçevesizdir; drAW ile aynı görünümdeki başlık çubuğu küçült, büyüt, tam ekran (F11, Esc ile çıkış) ve kapat düğmelerini sunar. Pencere denetimleri yalıtılmış bir preload üzerinden verilir, arayüze Node.js erişimi açılmaz.
- Stiller `index.html` içinden bağlanır; sayfa ilk çizimden itibaren stilli görünür.
- [math.js](https://mathjs.org/) 15.2.0 — eski uygulamayla aynı sürüm ve logaritma davranışı.
- Uygulama varlıkları ve matematik kütüphanesi çıktıya dahil edilir; çalışma sırasında CDN gerekmez.
- Çizim talepleri ekran karelerinde birleştirilir; eksen/ızgara ve derlenmiş fonksiyon ifadeleri önbelleğe alınır. Yüksek yoğunluklu ekranlar desteklenir.
- Çizim ve işaretçi girişi aynı matematik/CSS piksel dönüşümünü kullanır; görünüm değişene kadar dönüşüm önbellekten kullanılır. Dönüşüm koordinatları yuvarlamaz veya ızgaraya yakalamaz; metin gösterimi ayrıca biçimlendirilir.
- Belge nesnelerinin, analiz nesnelerinin ve araç önizlemelerinin çizicileri strict TypeScript modüllerindedir. Çizim belgeyi yalnızca okur; sıralamayı çağıran verir, önizlemeler geometri modeli oluşturmaz.
- Fonksiyon çizicisi piksel başına bir örnekle başlar, eğri, tanım boşluğu veya sıçrama görülen aralıkları yarım piksel doğruluğa kadar uyarlamalı olarak böler. Tanım sınırları kayan nokta hassasiyetinde bulunur (`sqrt(x)` tam (0,0)'dan başlar); yakınsamayan sınırlar (`log`, `1/x`) asimptot sayılır ve kol ekran kenarına kadar uzanır. Kutup ve basamaklarda (`tan`, `floor`) kollar birbirine bağlanmaz; değerlendirme sayısı ekran genişliğiyle sınırlıdır.
- Parçalı fonksiyonların açık/kapalı uçları ve tek noktadan oluşan parçaları çizimde gösterilir. Giriş alanı Ctrl/Cmd kısayollarını destekler; IME bileşimi sırasında Enter komut göndermez.
- Android/iOS paketleri henüz eklenmedi. Dokunmaya uyumlu ortak web çekirdeği ileride mobil paketlemeye temel olur.

## Aşamalı geçiş

Geliştirme, paketleme, temel çizim altyapısı, 20 geometri/fonksiyon/analiz modeli,
saf geometri hesapları, komut/matematik çözümleme, belge/geçmiş yönetimi, nesne
çizicileri, araçlar, bağımlılık çözümü ve arayüz bağları TypeScript'e taşındı.
Eski JavaScript motoru kaldırıldı.
Bağımlı noktaların hesap koordinatları yuvarlanmaz; tanımsız yapılar son konumları
korunarak gizlenir ve yeniden geçerli olduklarında toparlanır. Çember teğetinin
iki temas noktası farklı adlar alır.
Her taşıma adımından sonra durulur; daha verimli veya kullanışlı tasarımlar için eski uygulama davranışı
değiştirilebilir. Tamamlanan adımlar, sonraki modüller ve
doğrulama sırası [geçiş planında](docs/gecis-plani.md) açıklanır.

GeoGebra benzeri araçları ileride genişletmek için araç durumu, geometri/bağımlılık
hesapları ve çiziciler ayrı modüllerdedir. Dokunma/kalem desteği, iki parmakla
yakınlaştırma ve mobil ekran düzeni tamamlandı; sıradaki adım, ihtiyaç
netleştiğinde Android/iOS paketlemesidir.

Geçiş sırasında oluşturulan eski uygulama kopyası karşılaştırmalar tamamlandıktan
sonra kaldırıldı. Eski davranışlardan ölçülen beklenen çıktılar regresyon testlerinde,
önceki kaynaklar Git geçmişinde bulunur.
