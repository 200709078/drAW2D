# Geçiş regresyon kontrolleri

Komut ayrıştırıcısı `E`/`PI` sabitlerini `e`/`pi` biçimine dönüştürür. Doğal
logaritma fixture'ındaki kart metni bu ortak AST gösterimine göre güncellenmiştir;
`log(taban, değer)` sırası ve sayısal sonuç korunur. İş miktarı sınırlandırılmamış
`combinations`, `permutations`, `bignumber` ve `fraction` çağrıları girişte reddedilir;
çok büyük argümanların değerlendirme döngüsünü kilitlememesi ayrıca sınanır.

`command-parser.spec.ts` iç içe argümanları, sayısal parametreleri, komut
çeşitlerini ve parçalı fonksiyon koşullarını tarayıcı açmadan denetler.
`ParçalıFonksiyon(ifade, aralık; ...)` biçimi çıplak biçimle aynı komutu üretir;
`command-integration.spec.ts` yardım örneğinden bu komutun çizilmesini sınar.
`ParçalıFonksiyon(ifade, aralık; ...)` biçimi çıplak biçimle aynı komutu üretir;
`command-integration.spec.ts` yardım örneğinden bu komutun çizilmesini sınar.
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
düğmesinin güvenli iptali de sınanır. Dokunma ve iki parmak hareketi
`touch-integration.spec.ts` içinde ayrıca sınanır.

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
doğru seçimi gerçek dik uzaklıkla sınanır; seçim eşiği yakınlaştırmadan bağımsız
10 CSS pikselidir (varsayılan görünümde 0,1 birim).

`app-tools.spec.ts` tarayıcı açmadan araç durum makinesini sınar: araçların komut
hazırlamasını kullanması, aynı noktanın iki kez seçilmesinin ve doğrusal üç
noktalı çemberin reddedilip önceki seçimlerin korunması, nesneye bağlı nokta
oluşturma, reddedilen teğet adayının kimlik ayırmaması, yay ölçüsünün seçilen
çemberi kullanması, zincirleme silme kümesi, bağımlı noktaların yeniden hesabı ve
piksel cinsinden en yakın nesne seçimi. `app-view-cards.spec.ts` imleç merkezli
yakınlaştırmayı, eksen sürüklemeyi, kaydırmayı, kart metinlerini/kaydırıcı
aralıklarını ve reddedilen kaydırıcı değerinin modeli değiştirmemesini denetler.
`parameters.spec.ts` parametreleri tarayıcı açmadan sınar: bilinmeyen adlı sayıların
ifade olarak hazırlamaya bırakılması, kaydırıcıyla nokta/çember/fonksiyon/dik doğru
ve başka fonksiyonu kullanan tanımların yeniden hesaplanırken kimliklerini ve
başvurularını koruması, doğru/eğri ayrımının parametre değerinden bağımsız olması,
öğretim komutlarının kaydırıcıları, değerlendirilemeyen tanımın son değeri koruyup
toparlanması, bağımlı parametreler, yeniden tanımlama ve döngü engeli, aralık
doğrulaması, zincirleme silme ve değeri değişmeyen yeniden hesaplamanın belge
grafiğini (dolayısıyla geçmişi) değiştirmemesi. `app-integration.spec.ts`
kaydırıcıyı, `a=7` ile yeniden tanımlamayı, kartta aralık düzenlemeyi, animasyonun
tek geçmiş adımı olmasını ve parametreye bağlı noktanın sürüklenmemesini arayüzde
denetler. Komut matrisinde `Teğet`, `TeğetH/X` ve `Limit` satırları oluşan
kaydırıcıları da içerir.
`touch-integration.spec.ts` 390 × 844 dokunmatik telefon görünümünde gerçek dokunma
olaylarını Chromium CDP arabirimiyle gönderir: panelin kapalı başlaması, başlangıç
noktasının ortada olması, alttan açılan panelin tutamakla büyütülmesi, yapı aracında
parmağın nişan alıp kalkınca nokta koyması, iki parmakla orta nokta sabit kalarak
yakınlaştırma/kaydırma ve ikinci parmağın süren nokta sürüklemesini geçmiş adımı
bırakmadan geri alması sınanır. `app-view-cards.spec.ts` sürekli yakınlaştırmayı ve
iki parmak hareketinin hesabını tarayıcı açmadan denetler. Fare olaylarını kodla
gönderen çizim testleri artık `PointerEvent` kullanır.
`constructions.spec.ts` yeni yapıları sınar: orta nokta, ışının yalnız bir yönde
kesişmesi, çokgen alanı ve köşe değişince güncellenmesi, dik/paralel doğru, kenar
orta dikmesi ve açıortayın denklemleri ve noktaları izlemesi, gizli yardımcıların
doğruyla silinmesi, doğruya göre yansıtma, döndürme (açı kaydırıcısıyla) ve öteleme;
ayrıca dik doğru, çokgen ve öteleme araçları.
`analysis.spec.ts` sayısal analizi tarayıcı açmadan sınar: kökler (çift kök, kutup ve
sıçramanın kök sayılmaması), `Kök`/`Ekstremum`/`Dönüm` noktalarının sırası ve kartı,
aralık doğrulaması, fonksiyonların fonksiyon/doğru/dik doğru/çemberle kesişimi,
parametre değişince noktaların izlemesi ve çözümsüzde `∅`, belirli integral ve
parametreli sınırlar, fonksiyon üzerindeki noktanın izlemesi ve zincirleme silme.
`app-integration.spec.ts` Kök aracını, eğriye bağlı noktanın sürüklenmesini ve
integral taramasını arayüzde denetler.
`math-keyboard.spec.ts` matematik klavyesini sınar: düğmeyle açma/kapama ve
`inputmode`, fonksiyon tuşunun imleci parantezin içine koyması ve ⏎ ile gönderme,
komut şablonunun klavyeden doldurulması (⇥ ve eksik alan uyarısı dahil), ⌫ ve ok
tuşları, parantez eşleme ve Türkçe harfler; dokunmatik ekranda ilk dokunuşta açılma;
⇧ tuşunun bir harfi, iki kez basılınca bütün harfleri büyük yazması (i → İ, ı → I).
`curves.spec.ts` kapalı eğri, eğri ve eşitsizlikleri tarayıcı açmadan sınar: x ve y
içeren denklemin kapalı eğri, `y = f(x)`, `x = c`, `a = 2` ve `r = f(θ)` ayrımı,
eşitsizliğin koşullu ifade ve parçalı fonksiyonla karışmaması, marching squares'in
çemberi eğri üstünde tek kapalı çizgi olarak bulması, kutup üstünde çizgi
çizmemesi, bölge hücrelerinin alanı doğru kaplaması, parametrik örneklemenin eğri
üstünde kalıp tanımsız yerde kesilmesi, kart metinleri, parametreyle yeniden hesap
ve isabet testi (bölge yalnız sınırından seçilir).
`analysis-extensions.spec.ts` doğrudan ifadeli analiz komutlarını (`Kök(x^2-4)`),
parçalı fonksiyonların ve köşelerin (`|x|`) ekstremumlarını, kutbun ekstremum
sayılmamasını, `Asimptot`'un düşey/yatay/eğik asimptotlarını ve yokluklarını,
parametreli arama aralığını, çözüm sayısı artınca nokta kümesinin büyümesini ve
parçalı fonksiyonun parametreli aralık sınırlarını sınar.
`constructions-extensions.spec.ts` vektörü ve vektörle ötelemeyi, düzgün çokgeni,
merkezli yayı, alan ve eğim ölçümlerini, doğru/çember/çokgen/denklemli doğrunun
yansıtılmasını, döndürülmesini ve ötelenmesini (gizli yardımcı noktalar, zincirleme
silme), döndürme açısının kaydırıcıyla değişmesini, görüntü nesnesinin karttan
yeniden tanımlanınca yardımcılarını korumasını ve fonksiyon grafiğinin
`f(x − dx) + dy` olarak sürüklenmesini sınar.
`document-files.spec.ts` `.drw2` biçimini (paylaşılan nesnelerin `$ref` ile bir kez
yazılması, açınca paylaşımın ve canlı tanımların geri gelmesi, bozuk/yabancı/yeni
sürüm belgelerin reddi), otomatik kayıttan dönen belgenin geçmişini, doğru, çember ve
grafik izlerinin kaydını ve SVG çıktısını sınar.
`unit-circle.spec.ts` birim çemberi tarayıcı açmadan sınar: çeyrek turlarda tam değerler,
özel açılarda kesin yazım ve işaretler, tanımsız değerler, sürüklenen A'nın özel açılara
yapışması ve tam turlarla sürekliliği, radyan yazımı, θ kaydırıcısının (0°–720°, θ2 …)
oluşması, başlangıçta yalnız çemberin görünmesi, değer kutucuğunun A'yı açıp kilitlemesi,
yeniden tanımlamada ve dosyada ayarların korunması ve zincirleme silme.
`unit-circle-integration.spec.ts` aynı davranışları arayüzde denetler: araçla oluşturma,
kutucuklar ve A kilidi, θ kaydırıcısı (çember kartında kaydırıcı yok), A'yı tuvalde
sürükleme, radyan seçimi, θ silinince çemberin de silinmesi, geri alma
ve sayfa yenilenince otomatik kayıttan dönüş.
`features-integration.spec.ts` aynı özellikleri arayüzde denetler: değer soran
düzgün çokgen ve merkez-yarıçap aracı (iptal dahil), nesne seçen dönüşüm aracı,
vektör, alan ve asimptot araçları, tuvaldeki kaydırıcının sürüklenmesi ve taşınması,
grafiğin sürüklenmesi, doğrunun izi, kapalı eğri/eğri/eşitsizlik girişi, otomatik
kayıt ve Dosya → Yeni, `.drw2` kaydetme/açma (indirme ve dosya seçiciyle) ile PNG ve
SVG dışa aktarma.
`command-templates.spec.ts` dil tablosunu (her komut adının ayrıştırılması, her yardım
örneğinin çözümlenmesi, her şablonun kendi komutunu adlandırması) ve girişteki
önerileri sınar: komut adı yazınca öneri, Enter/Tab/tıklama ile şablon yerleştirme,
Tab ile yer tutucular arası geçiş, doldurulmamış yer tutucuyla göndermede uyarı, ok
tuşları, Esc, aksansız eşleşme, seçili yer tutucuya parantez yazma ve tek harf,
ifade veya yazılmış çağrıda öneri çıkmaması.
`redefine.spec.ts` karttan yeniden tanımlamayı tarayıcı açmadan sınar: düzenleme
metninin ad ve tanıma ayrılması, her kart türünün düzenleme metninin aynı nesneyi
yeniden üretmesi, ad değişikliğinin tanımlardaki başvurulara yansıması, nokta, çember,
doğru ve fonksiyonun yerinde değişip bağımlıların izlemesi, bağlı yapılarda tür
değişikliğinin reddi, nesneye bağlı noktanın koordinatla taşınması, kesişim ve teğet
yardımcı noktalarının kimliklerini koruması, döngüsel ve geçersiz girişlerin belgeyi
değiştirmemesi ve düzenlenen `TeğetH` kaydırıcılarının korunması.
`app-integration.spec.ts` kalem düğmesi, Enter, Esc, hata sonrası düzeltme, ad
değiştirme ve tek geri alma adımını arayüzde denetler.
`object-style.spec.ts` görünüm ayarlarını ve bütün nesne sürüklemeyi sınar: her
türün sunduğu ayarlar, varsayılanların alan olarak saklanmaması (ayarı geri almak
modeli aynen geri getirir), ayarların yeniden hesaplamada korunması, Canvas çağrıları
kaydedilerek kesik/noktalı desen ve gizli etiket, doğru, çember ve çokgenin serbest
noktalarıyla ötelenmesi, başlangıca dönünce saklı değerlerin aynen geri gelmesi,
bağımlı noktalı nesnenin yerinde kalması, yapı doğrusunun kaynak noktasıyla ve
denklemli doğrunun denklemiyle taşınması. Arayüzde tek satırlı ve "değer önde"
kartlar (tanım yalnız seçiliyken, değerin altında), ayar panelinden renk, çizgi,
etiket ve kalınlık değişikliklerinin birer geri alma adımı olması, iz bırakan noktanın
izi ve doğru parçasının bütün olarak sürüklenip tek adımda geri alınması denetlenir.
`toolbar.spec.ts` araç kaydının her aracı bir kez bir gruba koymasını, grup
düğmesinin son aracını seçip menüsünü açmasını, menüden seçilen aracın grubun yüzü
olmasını, menünün dışarı tıklama ve Esc ile kapanmasını, çubuktan seçilen araçla
çizimi ve dar ekranda araçların alt paneldeki "Araçlar" sekmesinden seçilmesini
sınar. Diğer arayüz testleri aracı `window.drAW2DToolbar` üzerinden seçer.
`page-shell.spec.ts` bütün betikler engellendiğinde de panel simgelerinin küçük
kaldığını (stillerin `index.html` içinden ilk çizimden önce yüklendiğini) ve
tarayıcıda özel başlık çubuğu eklenmediğini denetler.
`app-integration.spec.ts` aynı davranışları arayüzde sınar: zincirleme silme ve tek
adımda geri alma, tamamlanan aracın seçim aracına dönüp yeni nesneyi seçili
bırakması ve tekerlek yakınlaştırmasından sonra imlecin altındaki noktanın
sürüklenebilmesi.

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
`Uzaklık` kartı artık ölçülen uzaklığı da gösterir (`a=1.41`); matris beklentisi
buna göre güncellenmiştir.
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
Açık tanım uçları değerlendirilmez ama eğri uca kadar çizilir; `x^(1/2)` piksel
arasına düşen sınırdan, tam (0,0)'dan başlar; `log(x)` asimptotta alt kenara iner.
Ayrıca 26 fonksiyon (logaritmalar, kökler, `tan`/`cot`, `1/x`, `floor`, `sign`,
`asin`/`acos`, `nthRoot` ...) dokuz görünümde (varsayılan, küçük kaydırmalar,
uzaklaştırma, asimptotlara 1000–100000 piksel/birim yakınlaştırma) çizilip gerçek
fonksiyonla karşılaştırılır: görünür ve tanımlı her piksel sütunu çizilmiş olmalı,
çizilen parçalar eğriden 1,5 pikselden fazla sapmamalı ve tanımsız bölgelerin ya da
karşı dalların üstünden geçmemelidir. Önceki çizici bu denetimde sınır, sıçrama ve
asimptot hatalarıyla başarısız oluyordu. Piksel altında salınan `sin(1/x)` gibi
eğriler denetime alınmaz; onlar için yalnızca değerlendirme sayısının sınırlı
olduğu ölçülür.
`function-evaluator.spec.ts` derleme önbelleğini; `coordinate-grid.spec.ts` görünür
ızgarayı, okunabilir aralıkları ve etiketleri; `frame-renderer.spec.ts` kare
planlamasını denetler. Bu kontroller mobil paket doğrulaması sayılmaz.

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
denetler. Başlık çubuğunun başlığı, düğmeleri, tuval ile panelin çubuğun
altında başlaması ve Büyüt düğmesinin pencere durumunu değiştirmesi de sınanır;
preload yalnızca `drAW2DDesktop.windowControls` ve `drAW2DDesktop.files` (aç, kaydet,
dışa aktar) nesnelerini açar. Kontrol, önceki çalıştırmanın otomatik kaydını silerek
boş belgeyle başlar. `<img>` öğelerinin yanında CSS
arka plan görselleri (kart silme simgesi gibi) de paketten yüklenebilmelidir. Hazır Linux paket klasöründeki çalıştırılabilir dosya da aynı kontrolle
açılabilir:

```sh
DRAW2D_ELECTRON_EXECUTABLE="$PWD/release/linux-unpacked/draw2d" node scripts/test-electron.mjs
```
