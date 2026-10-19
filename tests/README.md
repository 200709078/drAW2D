# Geçiş regresyon kontrolleri

Komut ayrıştırıcısı `E`/`PI` sabitlerini `e`/`pi` biçimine dönüştürür. Doğal
logaritma fixture'ındaki kart metni bu ortak AST gösterimine göre güncellenmiştir;
`log(taban, değer)` sırası ve sayısal sonuç korunur. İş miktarı sınırlandırılmamış
`combinations`, `permutations`, `bignumber` ve `fraction` çağrıları girişte reddedilir;
çok büyük argümanların değerlendirme döngüsünü kilitlememesi ayrıca sınanır.

`command-parser.spec.ts` iç içe argümanları, sayısal parametreleri, komut
çeşitlerini ve parçalı fonksiyon koşullarını tarayıcı açmadan denetler.
`command-expressions.spec.ts` skaler AST doğrulamasını, kısmi tanım alanlarını,
adlı fonksiyon başvurularını/çağrılarını, bileşke karmaşıklık sınırlarını ve
afin katsayıların cebirsel hesabını sınar.

`command-prepare.spec.ts` komutun mevcut belgeyi değiştirmeden bütün olarak
hazırlanmasını, paylaşılan nokta başvurularını, benzersiz adları ve parçalı
fonksiyon uç bilgisini denetler. Hatalı komutta hazırlanmış noktalar ve kimlikler
kalıcılaşmaz. `command-integration.spec.ts` aynı davranışı arayüzde sınar:
sayısal ifadeli koordinatlar, doğru katsayıları, `f(x+1)` başvurusu, hatadan sonra
geri al/yinele dalının ve kimlik sırasının korunması, Ctrl+A ile metin seçimi, IME
Enter davranışı ve tek noktalı parçalı fonksiyonun çizilmesi.

`geometry-document.spec.ts` belge/geçmiş modülünü tarayıcı açmadan sınar:
kopyaların canlı modellerden ayrılması, ortak başvuru yapısı, `NaN`/sonsuzluk/işaretli
sıfır ayrımı, değişmeyen düzenlemede yinelemenin korunması, yapılandırılabilir
geçmiş sınırı ve en eski taban, oturum boyunca artan kimlikler, taslak kayıt engeli,
geçersiz ekleme grubunun atomik reddi ve düzenlemeyi tek işlemde kaydetme/iptal.
Seçim geçmişe girmez; kimlikler geri alma, temizleme veya taslak iptaliyle yeniden
kullanılmaz.

`document-integration.spec.ts` aynı sınırları arayüzde denetler: yeni geçmiş dalı,
temizleme sonrası ortak bağımlılıkların çalışması, sürüklemeyi tek adımda geri
alma, değişmeyen harekette yinelemeyi koruma, yarım çizimin iptali, reddedilen
teğet noktasının belgeye sızmaması ve mevcut noktalarla aracı tamamlamanın
noktaları yanlışlıkla sürüklememesi. Escape ile süren sürüklemenin geri çevrilmesi,
panel üzerinde fare bırakmanın işlemi tamamlaması ve taslak kartındaki gizle
düğmesinin güvenli iptali de sınanır. Fare olaylarındaki bu kontroller Pointer
Events veya dokunma/kalem doğrulaması değildir.

`function-models.spec.ts` fonksiyon/analiz modellerinin klonlanabilir belge grafiğini,
sayısal hassasiyetini, teğet/sekant güncellemelerinin mevcut nesneleri kullanmasını
ve geçersiz girişte atomik kalmasını denetler. `function-algebra.spec.ts` AST
bileşkeleri, iki parametreli logaritma türevleri ve tam hassasiyetli doğru ifadeleri
için sayısal matematik kontrollerini içerir.

`function-model-integration.spec.ts` ve `function-math-regressions.spec.ts` aynı
davranışları arayüzden sınar: bileşke/türev/teğet örnekleri, iç içe virgüllü
parçalar, doğru kartı katsayıları, eksik başvurular, büyük dizi aralıkları ve
tanım dışı limit örneklerinden sonra çizim/giriş/geçmişin çalışması. Bileşke
fixture'ındaki gereksiz parantezler yeni AST gösterimine göre güncellenmiştir.

`geometry-models.spec.ts`, tarayıcı açmadan TypeScript modellerinin
geçici nesne kimlik/adlandırma davranışını, paylaşılan başvurularla geri alma
kopyalarını ve metin koordinatlarla kesişim bilgilerinin korunmasını denetler.

`geometry-primitives.spec.ts`, `geometry-intersections.spec.ts` ve
`geometry-tangents.spec.ts` DOM veya belge modeli oluşturmadan saf hesapları sınar:
sonlu gerçek koordinatlar, normalize doğru tanımları, sınırlı izdüşümler,
`hypot`/`atan2` ile uzaklık ve açılar, ötelenmiş üç noktalı çemberler, küçük/büyük
ölçeklerde kesişimler, yakın eğimler, teğete yakın kökler ve dejenere durumlar.
Teğetlerin yarıçapa dikliği, dal sırası ve seçilmiş dala izdüşüm de denetlenir.

`geometry-integration.spec.ts`, aynı hesapların arayüzdeki kullanımını denetler:
yakın eğimli doğruların kesişmesi, doğrusal duruma gelen çemberin yeniden
toparlanması, bağlı noktanın yuvarlanmadan izdüşürülmesi, iki ayrı teğet temas
adı ve geri al/yinele, kesişimin iki nokta/teğet/boş küme arasında güncellenmesi.
Bağımlı geometri tanımsızken son koordinatlar korunur; `geometryValid: false`
durumuyla gizlenir ve yeniden geçerli olduğunda hesaplara döner. Dik eğimli
doğru seçimi gerçek dik uzaklıkla sınanır; seçim eşiği hâlâ matematik
koordinatlarında `0.1` birimdir, CSS pikseli eşiğine taşınmamıştır.

İki temel Chromium testi arayüzü, Canvas çizimini ve geçmişi kontrol eder.
Ek komut matrisi; doğru, doğru parçası, çember, açı, uzaklık, yansıtma, kesişim,
limit, bileşke, teğet çeşitleri, dizi ve logaritma komutlarını bağımsız sayfalarda
çalıştırır. İlk beklenen kart metinleri geçiş öncesindeki uygulama sürümünden
ölçüldü; doğrulanmış iyileştirmelerde ilgili beklentiler güncellenir. Rastgele
nesne renkleri nedeniyle sabit ekran görüntüsü kullanılmaz;
Canvas içeriğinin çizimle değişmesi ve temizlemeyle başlangıca dönmesi denetlenir.

Matris ilk geçişte kaydedilen örneklerden başlar; eski hataları koruma zorunluluğu
getirmez. Eski sürümde `TeğetC(a,(3,2))` iki temas noktasına aynı `C` adını
veriyordu. Saf geometri geçişinde noktalar sırayla belgeye eklenerek `C` ve `D`
adlarını alır; fixture ve arayüz kontrolleri bu iyileştirmeye göre güncellenmiştir.
Diğer doğruluk veya kullanım iyileştirmelerinde de beklentiler gerekçesiyle
güncellenebilir.

Çizim testleri ayrıca kare taleplerinin birleşmesini, ızgara/derleme önbelleğini,
görünür eksen etiketlerini, dpr=2 ekranda tıklama/sürükleme/resize doğruluğunu ve
`sqrt(x)`, `log(x)`, `1/x` gibi kısmi tanımlı eğrilerin doğru dallarını denetler.
Canvas piksel okumaları planlanmış çizimin tamamlanmasını bekler. Hız sınırı yerine
tek kare ve gereksiz ızgara boyamasının yokluğu gibi deterministik ölçütler kullanılır.
Ek tarayıcı kontrolleri, kesirli işaretçi konumunun modelde yuvarlanmadan kalmasını,
teğet kaydırıcısının kartı hemen güncellemesini ve boyamanın geçmişe boş adım
eklememesini denetler.

`coordinate-transform.spec.ts` ortak matematik/CSS piksel dönüşümünü negatif
koordinat, pan, farklı eksen ölçekleri ve π/e birimleriyle iki yönde denetler;
orijin, eksen yönleri, yarıçap, görünür sınırlar ve geçersiz görünümleri de kapsar.
Dönüşüm yuvarlama veya ızgaraya yakalama içermez. İşaretçi girişinde hesap değeri
korunur; kartlarda görünen metin ayrı biçimlendirilir. DPR, dönüşümün dışında
Canvas raster boyutunda uygulanır; dönüşüm görünüm değişene kadar tekrar kullanılır.

`function-plotter.spec.ts`, Canvas çağrılarını kaydederek örneklemenin görünür x ve
tanım aralıklarında kalmasını, örnek sayısının sınırlı olmasını, tanımsız bölgelerin
ve asimptot dallarının birleştirilmemesini denetler. Çok dik/büyük değerli eğrilerin
kırpılması ve hata durumunda çizim stilinin geri yüklenmesi de kontrol edilir.
`function-evaluator.spec.ts` derleme önbelleğini; `coordinate-grid.spec.ts` görünür
ızgarayı, okunabilir aralıkları ve etiketleri; `frame-renderer.spec.ts` kare
planlamasını denetler. Bu adımda yeni araç veya mobil etkileşim uygulanmadığından
bu kontroller dokunma/kalem ya da mobil paket doğrulaması sayılmaz.

```sh
npm test
npm run build
TEST_PREVIEW=1 npm test
```

Geçiş sırasında eski uygulamada aynı 20 kontrol geçti. Kullanıcının isteğiyle
geçici eski uygulama kopyası karşılaştırma tamamlanınca kaldırıldı; beklenen
sonuçlar fixture dosyalarında saklanır. Başka bir sunucuda çalışan uygulamayı
kontrol etmek için:

```sh
BASE_URL=http://127.0.0.1:4174 npm test
```

`BASE_URL` verilince Playwright kendi sunucusunu başlatmaz. Aksi halde Vite geliştirme
sunucusunu, `TEST_PREVIEW=1` verilirse derlenmiş `dist` için Vite preview sunucusunu
4173 portunda başlatır. Preview öncesi geliştirme sunucusunu kapatın; mevcut 4173
sunucusu yerelde yeniden kullanılabilir.

Sistemde `/usr/bin/chromium` varsa kullanılır. Başka bir tarayıcı yolu
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ile verilebilir. Bunlar yoksa Playwright'ın
Chromium kurulumunu kullanır (`npx playwright install chromium`). Başarısız
kontrollerin ekran görüntüsü ve trace dosyaları `test-results/` altında tutulur.

Yerel masaüstü çıktısını kontrol etmek için grafik oturumunda:

```sh
npm run test:electron
```

Bu kontrol derlenmiş uygulamayı `file://` üzerinden açar; türev çıktısını, araç
çubuğunu, simge/ses yüklemesini ve renderer'ın Node.js erişiminin kapalı olmasını
denetler. Hazır Linux paket klasöründeki çalıştırılabilir dosya da aynı kontrolle
açılabilir:

```sh
DRAW2D_ELECTRON_EXECUTABLE="$PWD/release/linux-unpacked/draw2d" node scripts/test-electron.mjs
```
