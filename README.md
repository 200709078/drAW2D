# drAW2D

Web ve masaüstü için **2B geometri ve fonksiyon çizim** uygulaması.

made by **mADEMatik Solutions** — [madematik.com](https://madematik.com/drAW2D/)

İlgili proje: [drAW3D](https://github.com/200709078/drAW3D)

## İndir

Uygulamanın son sürümü (bağlantılar her zaman en yeni sürümü indirir):

- **Windows 10/11 (64-bit):** [drAW2D-win-x64.exe](https://github.com/200709078/drAW2D/releases/latest/download/drAW2D-win-x64.exe)
- **Linux DEB (Pardus, Debian, Ubuntu):** [drAW2D-linux-amd64.deb](https://github.com/200709078/drAW2D/releases/latest/download/drAW2D-linux-amd64.deb)
- **Linux AppImage:** [drAW2D-linux-x86_64.AppImage](https://github.com/200709078/drAW2D/releases/latest/download/drAW2D-linux-x86_64.AppImage)
- **Android 7.0 ve üstü (telefon, tablet):** [drAW2D-android.apk](https://github.com/200709078/drAW2D/releases/latest/download/drAW2D-android.apk) — Play Store dışından kurulur; Android bir kez "bilinmeyen uygulamaları yükleme" izni ister.

Bütün sürümler, kurulum adımları ve SHA-256 değerleri: [Releases](https://github.com/200709078/drAW2D/releases).

## Özellikler

- **Geometrik araçlar**: nokta, orta nokta, doğru, doğru parçası, ışın, vektör, dik ve paralel doğru, kenar orta dikmesi, açıortay, çokgen ve düzgün çokgen (alanıyla), çember (merkez + nokta / merkez + yarıçap / üç nokta), merkez ve iki noktadan yay, çembere teğet, açı, yay ölçüsü
- **Dönüşümler**: noktaya ve doğruya göre yansıtma, döndürme (açı kaydırıcısıyla), iki noktayla veya bir vektörle öteleme; noktaların yanında doğrular, vektörler, çemberler, yaylar ve çokgenler de dönüştürülür
- **İşlemler ve ölçümler**: kesiştir, uzaklık, alan (çokgen, çember), eğim (eğim üçgeniyle)
- **Birim çember**: Çember grubundaki araç ya da `BirimÇember()` O merkezli birim çember ve 0°–720° θ kaydırıcısı oluşturur; kartındaki kutucuklarla A noktası ve OA ışını ile sin, cos, tan, cot, sec, csc ayrı renklerde çizilir, değerleri özel açılarda tam (`√3/2`) yazılır. A sürüklenerek açı değiştirilir; açı derece ya da radyan gösterilir.
- **Eğriler ve bölgeler**: kapalı eğriler (`x^2+y^2=4`), parametrik eğriler (`Eğri(cos(t), sin(t), t, 0, 2π)`), kutupsal grafikler (`Kutupsal(1+cos(θ))`, `r=2sin(3θ)`), eşitsizlik bölgeleri (`y<x^2`, `x^2+y^2<=4`)
- **Fonksiyon çizimi**: trigonometrik (`sin`, `cos`, `tan`, `cot`), üstel, logaritmik, parçalı fonksiyonlar
- **Analiz komutları**: `Türev`, `Limit`, `Bileşke`, `Teğet` / `TeğetH` / `TeğetX` / `TeğetC`, `Dizi`
- **Fonksiyon analizi**: `Kök(f)`, `Ekstremum(f)`, `Dönüm(f)`, fonksiyonların fonksiyon/doğru/çemberle `Kesiştir`'i, taranmış alanlı `İntegral(f,a,b)` ve `Asimptot(f)`; fonksiyon adı yerine doğrudan ifade de yazılabilir (`Kök(x^2-4)`), parçalı fonksiyonlar ve köşeler (`|x|`) de incelenir. Noktalar fonksiyon değişince izler, yeni çözümler çıkınca yeni noktalar eklenir; arama aralığı parametre olabilir. Eğriye bağlı nokta eğri boyunca sürüklenir.
- **İfade birleştirme**: daha önce çizilmiş fonksiyonlarla işlem (`2f/(1-3x)`, `3f-4g`, `f(x+1)`, ...)
- **Matematik klavyesi**: giriş alanındaki düğmeyle açılır; rakam ve işlemler, fonksiyonlar, harfler (⇧ ile büyük harf) ve komut şablonları sekmeleri vardır. Dokunmatik ekranlarda sistem klavyesinin yerini alır.
- **Komut şablonları**: girişte komut adı yazılırken (`Diz`, `teg`) eşleşen komutlar önerilir; seçilen şablonun yer tutucuları (`<Fonksiyon>`) Tab ile sırayla doldurulur.
- **Karttan düzenleme**: kalem düğmesi veya çift tıklama kartı açar; `ad: tanım` metni değiştirilip Enter ile uygulanır. Nesne kimliğini ve bağlı yapılarını koruyarak yeniden tanımlanır, ad değiştirilince ona başvuran tanımlar da güncellenir.
- **Kartlar**: değeri olmayan nesnenin kartı tek satırdır; değeri tanımından farklı olanlarda üst satır ad ve değerdir (`f: y = 2x+1`), tanım (`f: y = a*x+1`) kart seçiliyken altta görünür.
- **Görünüm ayarları**: seçili kartın palet düğmesi renk, kalınlık/boyut, çizgi stili (düz, kesikli, noktalı), etiket ve iz bırakma ayarlarını açar. Noktalar, doğrular, çemberler, çokgenler ve fonksiyon grafikleri iz bırakır.
- **Bütün nesneyi sürükleme**: serbest noktalardan kurulan doğru, doğru parçası, ışın, vektör, çember, yay, açı ve çokgen sürüklenince bütün olarak taşınır; denklemle verilmiş doğru denklemi değişerek kayar, kendi başına bir fonksiyon grafiği `f(x − a) + b` olarak ötelenir.
- **Vektör ölçümleri**: `Uzunluk(u)`, `İçÇarpım(u,v)`, `Açı(u,v)` değeri kartta canlı gösterir; uzunluk vektörün yanına, aynı noktadan başlayan vektörlerde açı yay olarak düzleme çizilir.
- **Vektör işlemleri**: `w=u+v`, `u-v`, `2u`, `a*u-v` canlı bir sonuç vektörü çizer; `u=(3,2)` orijinden vektör, `B=A+u`
  ötelenmiş nokta verir.
- **Karelere yapıştırma**: serbest noktalar koyulurken ve sürüklenirken en yakın küçük kare köşesine yapışır; adım
  ızgarayla birlikte yakınlaştırmaya uyar. Araç çubuğundaki mıknatıs düğmesi açıp kapatır (varsayılan açık).
- **Parametreler ve kaydırıcılar**: `a=2` bir kaydırıcı oluşturur; `a·x^2+1`, `(a,1)`, `Çember((0,0),a)`, `x=a`, `Teğet(f,a)`, parçalı fonksiyonun aralık sınırları, analiz komutlarının arama aralığı gibi her tanım ona bağlanır ve kaydırıcıyla canlı değişir. Kaydırıcının aralığı ve adımı kartta düzenlenir, değer canlandırılabilir, kaydırıcı tuvalde de gösterilebilir. `Teğet`, `TeğetH/X` ve `Limit` yaklaşım değerleri için kaydırıcıyı kendisi oluşturur.
- **Dosya**: `.drw2` belgelerini açma ve kaydetme (Ctrl+O, Ctrl+S, Ctrl+Shift+S), otomatik kayıt (açılışta son çalışma geri gelir), görüntüyü PNG veya SVG olarak kaydetme
- **Geri al / yinele**, temizleme, standart görünüm
- **Gruplu araç çubuğu**: her grup son kullanılan aracını gösterir, basınca grubun araçları açılır; geri al, yinele, temizle, standart görünüm ve yardım çubuğun sağındadır. Dar ekranlarda araçlar alttan açılan panelin "Araçlar" sekmesindedir.
- Gizlenebilir, yeniden boyutlandırılabilir nesne paneli
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
a=2                          # kaydırıcı (parametre)
a*x^2+1                      # parametreye bağlı fonksiyon
ParçalıFonksiyon(2x+1, x<0; x^2, x>=0)  # parçalı fonksiyon
Kök(x^2-4)                   # fonksiyonu çizer, köklerini bulur
Asimptot((x^2+1)/(x-1))      # düşey ve eğik asimptot
x^2+y^2=4                    # kapalı eğri
Eğri(cos(t), sin(t), t, 0, 2π)  # parametrik eğri
r=2sin(3θ)                   # kutupsal grafik
y<x^2                        # eşitsizlik bölgesi
Vektör((0,0),(3,2))          # vektör
Uzunluk(u)                   # vektörün uzunluğu
İçÇarpım(u,v)                # iç çarpım
Açı(u,v)                     # iki vektör arasındaki açı (0°–180°)
u=(3,2)                      # orijinden vektör
w=u+v                        # vektör toplama; u-v, 2u, a*u-v (a kaydırıcı)
B=A+u                        # noktaya vektör ekleme
DüzgünÇokgen((0,0),(2,0),6)  # düzgün altıgen
Yay((0,0),(2,0),(0,2))       # merkez ve iki noktadan yay
BirimÇember(30)              # birim çember, θ = 30° kaydırıcısıyla
Yansıt(a,f)                  # nesneyi doğruya göre yansıtma
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
npm run android:apk   # Android APK (JDK 21 ve Android SDK gerekir; imza için ANDROID_KEYSTORE* ortam değişkenleri)
bash scripts/icons.sh # bütün simgeleri public/img/app-icon.svg'den yeniden üretir (Inkscape, ImageMagick)
```

Paketler `release/` altında oluşur. Linux paketlerini Linux üzerinde, Windows paketini
Windows üzerinde üretmek önerilir; Linux'ta Windows için çapraz derleme ek Wine
araçları gerektirebilir. Pardus uyumluluğu hedeflenen Pardus sürümünde ayrıca denenmelidir.

Sürüm paketleri GitHub Actions ile üretilir (`.github/workflows/release.yml`): Linux paketleri
Ubuntu'da, Windows `.exe` Windows'ta derlenir ve GitHub sürümüne yüklenir. Yeni sürüm için
`npm version patch` ardından `git push --follow-tags`; mevcut sürümün paketlerini yenilemek için
Actions sekmesinde **Run workflow**. Dosya adlarında sürüm yoktur, böylece
`releases/latest/download/<ad>` bağlantıları değişmez.

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
│   ├── ui/           # Araç kaydı ve araç çubuğu, nesne paneli, komut girişi, yardım ve bildirimler
│   └── styles/       # Mevcut stiller
├── public/           # SVG simgeler, uygulama simgesi ve ses
├── electron/         # TypeScript masaüstü kabuğu; pencere denetimi ve dosya diyalogları preload'u
├── android/          # Android projesi (Capacitor; dosya eklentisi, simgeler)
├── build/            # Linux ve Windows paket simgeleri
├── scripts/          # Electron başlatıcıları, simge üretimi, sürüm notları
├── tests/            # Tarayıcı regresyon kontrolleri
└── docs/             # Yol haritası
```

## Teknoloji

- TypeScript + Vite + Canvas; uygulamanın tamamı strict TypeScript'tir.
- Parametreye veya başka fonksiyona dayanan nesneler tanımlarını saklar; değer değişince bağımlılık sırasıyla yeniden hesaplanır, kimlikleri ve başvuruları korunur.
- Araçlar noktaları taslak olarak seçer ve yapıyı komut satırıyla aynı hazırlama yolundan oluşturur; tıklanan doğru, çember, teğet veya açıya bağlı nokta oluşur. Seçim eşiği yakınlaştırmadan bağımsız olarak CSS pikseli cinsindendir.
- Fare, kalem ve dokunma Pointer Events ile aynı yoldan çalışır. Dokunmada yapı araçları parmağı izleyen önizlemeyle nişan alır ve parmak kalkınca noktayı koyar; iki parmak yakınlaştırır ve kaydırır. Dar ekranlarda nesne paneli alttan açılan bir sayfadır, dokunmatik ekranlarda düğmeler büyüktür.
- Tekerlekle yakınlaştırma imlecin altındaki noktayı sabit tutar; dokunmatik yüzeyle (Ctrl+tekerlek) yakınlaştırma süreklidir. Bir nesneyi silmek ona bağlı yapıları da siler; geri alma hepsini tek adımda getirir.
- Uzaklık, yansıma, açı/yay, izdüşüm, kesişim ve çember teğeti hesapları saf TypeScript modüllerindedir. Aynı geometri hesabı nokta bağımlılıkları ve nesne seçimi için kullanılır; hesaplar DOM'a veya ad/kimlik üretimine bağlı değildir.
- Komutlar ve matematik girdileri strict TypeScript modüllerinde çözümlenir. İç içe argümanlar, sayısal ifadeler ve adlı fonksiyon çağrıları AST ile doğrulanır; doğru katsayıları cebirsel olarak bulunur. Hatalı komut belgeyi, kimlik sayacını veya geri al/yinele geçmişini değiştirmez.
- Belge ve geçmiş strict TypeScript modülündedir. Varsayılan son 100 işlem geri alınabilir; sınır yapılandırılabilir. Değişmeyen etkileşim geçmiş adımı oluşturmaz. Kaydırıcı ve nokta sürüklemesi tek işlem olarak kaydedilir; Escape devam eden düzenlemeyi geri çevirir. Yarım çizimler tamamlanmış belgeye sızmaz.
- Electron + electron-builder ile Linux ve Windows paketleme. Masaüstü penceresi çerçevesizdir; drAW ile aynı görünümdeki başlık çubuğu küçült, büyüt, tam ekran (F11, Esc ile çıkış) ve kapat düğmelerini sunar. Pencere denetimleri yalıtılmış bir preload üzerinden verilir, arayüze Node.js erişimi açılmaz.
- Stiller `index.html` içinden bağlanır; sayfa ilk çizimden itibaren stilli görünür.
- [math.js](https://mathjs.org/) 15.2.0 — eski uygulamayla aynı sürüm ve logaritma davranışı. Yalnız giriş dilinin kullandığı fonksiyonlarla kurulur ve ayrı bir parçada yüklenir; uygulama kodu değişince tarayıcı onu yeniden indirmez.
- Uygulama varlıkları ve matematik kütüphanesi çıktıya dahil edilir; çalışma sırasında CDN gerekmez.
- Çizim talepleri ekran karelerinde birleştirilir; eksen/ızgara ve derlenmiş fonksiyon ifadeleri önbelleğe alınır. Yüksek yoğunluklu ekranlar desteklenir.
- Çizim ve işaretçi girişi aynı matematik/CSS piksel dönüşümünü kullanır; görünüm değişene kadar dönüşüm önbellekten kullanılır. Dönüşüm koordinatları yuvarlamaz veya ızgaraya yakalamaz; metin gösterimi ayrıca biçimlendirilir.
- Belge nesnelerinin, analiz nesnelerinin ve araç önizlemelerinin çizicileri strict TypeScript modüllerindedir. Çizim belgeyi yalnızca okur; sıralamayı çağıran verir, önizlemeler geometri modeli oluşturmaz.
- Kapalı eğriler ve eşitsizlik bölgeleri 6 piksellik ızgarada marching squares ile, kenar kesişimleri eğrinin üstüne iyileştirilerek çizilir; kutuplardaki işaret değişimi eğri sayılmaz. Parametrik ve kutupsal eğriler yarım piksel doğrulukla uyarlamalı örneklenir. Sonuçlar görünüm değişene kadar önbellekte tutulur.
- Belgeler `.drw2` uzantılı JSON dosyalarıdır; paylaşılan nesneler bir kez yazılıp başvuruyla anılır. Masaüstünde dosyalar yerel diyaloglarla açılıp kaydedilir (ana süreç yalnızca diyalogda seçilen yollara yazar), Chromium tabanlı tarayıcılarda File System Access API ile aynı dosyaya kaydedilir, diğerlerinde indirme ve dosya seçici kullanılır. SVG çıktısı çizicilerin Canvas çağrılarının SVG'ye kaydedilmesiyle üretilir.
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
Taşıma adımlarının ayrıntıları Git geçmişinde bulunur. Planlanan geliştirmeler ve
kullanıcı istekleri [yol haritasında](docs/yol-haritasi.md) not edilir.

GeoGebra benzeri araçları ileride genişletmek için araç durumu, geometri/bağımlılık
hesapları ve çiziciler ayrı modüllerdedir. Dokunma/kalem desteği, iki parmakla
yakınlaştırma ve mobil ekran düzeni tamamlandı; sıradaki adım, ihtiyaç
netleştiğinde Android/iOS paketlemesidir.

Geçiş sırasında oluşturulan eski uygulama kopyası karşılaştırmalar tamamlandıktan
sonra kaldırıldı. Eski davranışlardan ölçülen beklenen çıktılar regresyon testlerinde,
önceki kaynaklar Git geçmişinde bulunur.
