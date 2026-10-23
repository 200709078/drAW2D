# drAW2D altyapı geçişi

## İlk aşama: ortak çalışan uygulama

Geçiş aynı Git deposunda yapılır. Geçişten önceki uygulamanın geçici bir kopyası
oluşturuldu. Aynı 20 regresyon testi eski sürüm ve yeni üretim çıktısı
üzerinde çalıştırıldı; Electron açılışı da kontrol edildi. Karşılaştırma tamamlanınca
kullanıcının isteği doğrultusunda geçici kopya kaldırıldı. Geçiş öncesinde çalışma
alanında bulunan `css/styles.css` değişikliği yeni uygulamanın
`src/styles/styles.css` dosyasında korunmuştur.

Yeni uygulamanın giriş noktası `src/main.ts`, web derleyicisi Vite'dır. İlk aşamada
araç çubuğu, temel geometri modelleri ve matematik kütüphanesi yapılandırması
TypeScript'e taşındı. Kalan geometri ve komut yorumlama kodu `src/legacy/app.js`
içinde ES modülü olarak bırakıldı. Sonraki taşıma adımları aşağıda açıklanır. `allowJs: true`
mevcut JavaScript ile yeni TypeScript modüllerini birlikte kullanmamızı sağlar.
TypeScript dosyaları `strict` denetiminden geçer; JavaScript motorunun henüz bu
denetimden geçtiği iddia edilmez.

Motorun ES modülüne uyarlanmasında örtük global değişkenler açıkça tanımlanır,
HTML içindeki olay bağları `addEventListener` ile kurulur. Altyapının ilk geçişinde
mevcut davranış referans alınmıştır; sonraki adımlarda daha verimli ve kullanışlı
tasarımlara geçilebilir. math.js sürümü 15.2.0 olarak
sabitlenir; eski `log(a, b)` özelleştirmesi aynen uygulanır.

Masaüstü kabuğu `electron/main.ts` dosyasından `dist-electron/main.js` olarak
derlenir. Electron geliştirmede yerel Vite sunucusunu, üretimde `dist/index.html`
dosyasını açar. Ortak arayüze Node.js erişimi verilmez. İşletim sistemi işlemleri
ayrı bir preload/IPC katmanından sunulur; geometri kodu doğrudan Electron'a
bağlanmaz. İlk kullanım pencere denetimleridir: pencere çerçevesizdir ve
`electron/preload.cts` yalnızca `drAW2DDesktop.windowControls` nesnesini açar;
drAW ile aynı görünümdeki başlık çubuğunu `src/ui/title-bar.ts` çizer.

## Adım 1: temel geometri modelleri

`src/geometry/types.ts` nesne kimliklerini, koordinatları, ortak görünüm alanlarını
ve yedi nokta bağımlılığı çeşidini tanımlar. `src/geometry/models.ts` içinde nokta,
üç çember türü, açı, yay ölçüsü, iki noktayla doğru, doğru parçası, uzaklık ve çember
teğeti olmak üzere 10 sınıf strict TypeScript'e taşınmıştır. JavaScript motoru bu
sınıfları artık yeni modülden alır.

İsim/kimlik/renk üretimi mevcut motordan callback ile sağlanır; yeni modül DOM'a
veya global uygulama durumuna bağlı değildir. Koordinatların metin ya da mathjs
sayısal değeri olabilmesi, geçici nesnelerin mevcut isim/kimlik davranışı, canlı nokta/çember
başvuruları ve geri alma geçmişindeki nesne grafiği korunur. Denklemle tanımlanan
doğrular, fonksiyon/analiz modelleri ve matematik algoritmaları bu adımda taşınmaz.

Her adım tamamlanıp doğrulandıktan sonra durulur. Sonraki adım kullanıcı devam
etmemizi istediğinde başlatılır.

## Adım 2: çizim altyapısı ve eksenler

Eski uygulamanın kodunu veya davranışını aynen korumak zorunlu değildir. Verimlilik,
matematiksel doğruluk ve kullanım kolaylığı için algoritmalar değiştirilebilir;
değişikliklerin sonucu test edilip açıklanır.

- `drawAll` çizim taleplerini `requestAnimationFrame` ile birleştirir. Model
  bağımlılıkları kartlar/geçmiş için hemen eşitlenir; boyama kareye bırakılır.
- `coordinate-grid.ts` görünür ızgarayı, eksenleri ve etiketleri önbellekte tutar.
  Görünüm değişmedikçe tekrar hesaplanmaz. Çizgiler üç grupta çizilir; okunabilir
  aralıklar 1/2/5 serisinden seçilir. Eksen ekran dışında olsa da etiketler görünür
  kenarlara yerleşir; π/e birimleri desteklenir.
- `canvas-surface.ts` matematik ve etkileşimde CSS pikselini, görüntü belleğinde
  cihaz pikselini kullanır. Yoğunluk ve bellek kullanımı sınırlandırılır.
- `coordinate-transform.ts` matematik koordinatları ile CSS pikselleri arasında
  ortak dönüşümü sağlar. Orijin, ölçek, ters ölçek ve görünür matematik sınırları
  bir kez hesaplanır; uygulama bunları görünüm değişene kadar kullanır. Eksenler,
  nesne çizimi, fonksiyon örneklemesi ve işaretçi konumu bu dönüşümü paylaşır.
  Dönüşüm DPR, yuvarlama veya ızgaraya yakalama içermez. İşaretçi girişindeki iki
  ondalığa yuvarlama kaldırılmıştır; gösterim metni ayrıca biçimlendirilir.
- Araç önizlemeleri ana sahneden sonra aynı karede çizilir; fare hareketleri
  geçici nesneleri kalıcı kimlik sayacına eklemez.
- Çizim sırası önbellekli ayrı bir dizidir; boyama belge dizisini sıralayıp değiştirmez.
- Doğrular sabit ±50000 sınırı yerine görünür alana kırpılır; uç değerler için
  tekrar denklem çözümleme yapılmaz. Teğet denklemi kaydırıcıyla eşzamanlı güncellenir;
  boyama ve parçalı fonksiyon vurgusu belgeyi veya geri alma geçmişini değiştirmez.
- Fonksiyon ifadeleri piksel başına yeniden çözümlenmez: 128 girişli sınırlı LRU
  derleme önbelleği kullanılır. `function-plotter.ts` yalnız görünür x aralığı ile
  istenen tanım aralığının kesişimini, sınırlı örnekleme işiyle çizer. Geçersiz,
  sonsuz veya gerçek olmayan örnekler eğride boşluk oluşturur; tanım alanı sınırına
  yapay bir dikey çizgi eklenmez. Şüpheli sıçramalar ek örnekle kontrol edilerek
  asimptotun karşı dallarının birleştirilmesi önlenir; dik çizgiler görünür alana
  kırpılır. Bu sayısal örnekleme bütün süreksizlikleri sembolik olarak çözmez.

Bu adım, gelecekte GeoGebra benzeri araçları eklemek için ortak dönüşüm ve çizim
temelini hazırlar. Sonraki mimari hedef, araç durumu/controller, geometri ve
bağımlılık hesapları ile çizicileri ayrı modüllerde tutmaktır. Bu adımda yeni
geometri araçları, Pointer Events, dokunma/kalem veya mobil düzen eklenmemiştir.

Yerel ölçüm: 1200×800 görünümde `sin(x+1)`, `cos(2x)`, `x^3` ile tek JavaScript
görevinde art arda 10 zıt yönlü tekerlek olayı gönderildi. Önce 20 tam boyama ve
2050 `stroke` çağrısı oluşurken bu yapıda bir boyama ve 6 `stroke` çağrısı oluştu.
Olay işleme süresi aynı ortamda yaklaşık 403 ms'den 0,8 ms'ye düştü; bu tek
senaryonun ölçümüdür, bütün uygulama için sabit bir hızlanma oranı değildir.

## Adım 3: denklem, fonksiyon ve analiz modelleri

`src/geometry/function-types.ts` ve `function-models.ts` kalan 10 model türünü
strict TypeScript'e taşır: dik doğru, denklem doğrusu, dizi, limit, fonksiyon,
bileşke, teğet, sekant, türev ve parçalı fonksiyon. Böylece 20 belge modeli tiplidir;
`GeometryDocumentObject` tüm nesne türlerini birleştirir. Model fabrikaları DOM'a
bağlı değildir; kimlik, ad, renk ve temel nokta/doğru oluşturma dışarıdan sağlanır.

- Türev modeli tek kaynak eğri ve türev eğrisi taşır; `func.func.func` katmanı
  kaldırılmıştır. Türev ve parçalı fonksiyon alt nesneleri üst nesnenin kimliğini
  paylaşır; geçici fonksiyon modelleri kalıcı ad/kimlik tüketmez.
- `src/math/function-algebra.ts` bileşkeyi metin değiştirme yerine ifade ağacında
  yalnız `x` değişkenini yerine koyarak kurar. `exp`/`max` adları ve iç içe
  fonksiyon parametreleri korunur. Türev hesabı iç içe iki parametreli logaritmaları
  `log(taban, değer)` sözleşmesine göre dönüştürür.
- Doğru ifadeleri tam sayısal hassasiyette tutulur. Küçük katsayılar hesap sırasında
  sıfırlanmaz; kartlar ayrıca biçimlendirilir. Katsayı metnindeki `1x` gibi alt
  dizileri silen eski gösterim yöntemi kaldırılmıştır.
- Teğet modelleri türev ifadesini saklar; kaydırıcı güncellemeleri önbellekli
  değerlendirme kullanır. Mevcut nokta ve doğrular güncellenir; renk veya kimlik
  üretilmez. Geçersiz bir konum modeli kısmen değiştirmez.
- Komut tanıma model oluşturmaz; eksik fonksiyon başvuruları belge/geçmişe
  eklenmeden reddedilir. Bileşke ve parçalı fonksiyon parametreleri iç içe
  virgüller dikkate alınarak ayrılır.
- Dizilerde yalnız görünür tam sayı indisleri hesaplanır; yoğun görünümde nokta
  sayısı ekran genişliğine göre sınırlandırılır. Tanım dışı limit örnekleri çizim
  karesini kesmez. Bu, sembolik limit hesabı eklendiği anlamına gelmez.

Bu adımda komut yorumlayıcının tamamı, geometri algoritmaları, belge yönetimi ve
araç denetleyicileri henüz JavaScript'teydi. Yeni araçlar ve mobil etkileşim sonraki
adımlardadır. Her adım doğrulandıktan sonra yine durulur.

## Adım 4: saf geometri hesapları

`src/geometry/primitives.ts`, `intersections.ts` ve `tangents.ts` uzaklık, nokta
yansıması, açı/yay, doğru/çember izdüşümü, kesişim ve çember teğeti hesaplarını
strict TypeScript'e taşır. Modüller DOM'a veya uygulama durumuna bağlı değildir;
hesaplama için model, ad, kimlik ya da rastgele renk üretmez. Sonuçlar saf sayısal
veridir; belge başvuruları ve görünüm JavaScript katmanında yönetilir.

- Doğrular eğim bölmesi yerine normalize yön vektörü, orijin ve varsa sınırlı
  parametre aralığıyla hesaplanır. Doğru parçaları ve denklem tanım aralıkları
  kesişim/izdüşümde uygulanır; sıfır uzunluklu parça tek nokta kabul edilirken
  aynı iki noktadan sonsuz doğru tanımlanmaz.
- Uzaklıkta `Math.hypot`, açılarda `Math.atan2` kullanılır. Üç noktalı çemberin
  merkezi dünya koordinatlarının kareleri yerine yerel ve ölçeklenmiş
  koordinatlarda bulunur; doğrusal üçlü tanımsız sonuç verir. Kesişim ve teğet
  hesapları da uzunlukları ölçekleyerek ara çarpımların taşmasını azaltır.
- Sabit dünya birimi toleransı yerine sayısal büyüklüğe göre yuvarlama toleransı
  kullanılır. Küçük çemberler ve yakın eğimli farklı doğrular korunur; teğet,
  birbirine yakın iki kesişim, ayrık/örtüşen parçalar ve sıfır yarıçap durumları
  ayrı ele alınır. Bu, kayan noktalı sayıların hassasiyet sınırını kaldırmaz.
- Nokta bağımlılıkları, önizlemeler ve nesne seçimi aynı geometri modüllerini
  kullanır. İzdüşüm sonucu iki ondalığa yuvarlanmaz; kartlar hesabı değiştirmeden
  biçimlendirilir. Çiziciler tanımsız geometriyi boyamaz, seçim hesabı onu seçmez.
- Bağımlı noktanın isteğe bağlı `geometryValid: false` durumu son koordinatları
  saklar. Üst yapı tanımsız olduğunda nokta ve ona bağlı tanımsız nesneler
  gizlenir; yapı yeniden geçerli olduğunda sonuçlar toparlanır. Örneğin üç
  noktalı çemberin noktaları aynı doğruya gelip sonra ayrılabilir.
- `reprojectAllOnOther` her geçişte nesneleri kimlik haritasından bulur;
  çember tanımlarını ve aynı nesne çiftinin kesişimini geçiş boyunca önbellekler.
  Bu düzen tam bir bağımlılık grafiği motoru değildir; belge ve bağımlılık
  yönetiminin ayrılması ileriki adımlardadır.
- Çember teğetleri çizilirken geçici belge modeli oluşturulmaz. Kalıcı temas
  noktaları belgeye sırayla eklenir; eski örnekteki iki `C` yerine `C` ve `D`
  adları alınır. Temas noktaları bağımlılıklarını ve geri al/yinele davranışını
  korur.

Bu adımın sonunda komut çözümleme ve kalan matematik girişleri, belge/geçmiş
yönetimi, nesne çizicileri ile giriş/arayüz akışı hâlâ JavaScript'teydi. Bu adım
yeni araç, Pointer Events, dokunma/kalem veya mobil düzen eklemez. Sonraki taşıma
komut yorumlayıcı ve kalan matematik girişleridir; her adım doğrulandıktan sonra durulur.

## Adım 5: komutlar ve matematik girişleri

`src/commands/` komut dilini ve nesne hazırlamayı strict TypeScript'e ayırır.
`types.ts` komut verilerini, `parser.ts` dengeli parantezleri, iç içe argümanları,
komut adlarını ve parçalı fonksiyon aralıklarını tanımlar. `expressions.ts`
matematik ifadelerini AST üzerinden doğrular ve çözer. `prepare.ts` komutun bütün
nesnelerini geçici olarak hazırlar; `names.ts` belge ve hazırlanmış nesnelerden ad
üretir. Bu modüller DOM'a veya global uygulama durumuna bağlı değildir.

- Komut ancak bütünüyle başarılı olduktan sonra belgeye ve geçmişe eklenir.
  Eksik başvuru, geçersiz geometri veya sonraki parçada bulunan hatalı ifade;
  belgeye yetim nokta eklemez, ad/kimlik tüketmez ve yineleme dalını silmez.
  Adlandırma için geçici olarak global belge dizisini değiştirme kaldırılmıştır.
- Koordinat, yarıçap ve sayısal komut parametreleri `sqrt(4)`, `sin(pi/2)` veya
  `log(2,8)` gibi ifadeleri kabul eder; sonuç sonlu gerçek sayı olmalıdır.
  İç içe fonksiyon virgülleri komut parametrelerini yanlışlıkla bölmez.
- Fonksiyonlar bilinmeyen sembollere ve skaler olmayan yapılara karşı doğrulanır;
  atama, blok, erişim, dizi ve nesne ifadeleri kabul edilmez. Uzunluk, düğüm ve
  derinlik sınırları vardır. Tanım kontrolü tek bir örnek noktaya bağlı değildir;
  `sqrt(x-1000)` ve `1/x` gibi kısmi tanımlı eğriler kabul edilir.
  Çok büyük argümanlarda mathjs içinde sınırsız döngüye girebilen `combinations`,
  `permutations`, `bignumber` ve `fraction` çağrıları değerlendirilmeden reddedilir.
- Adlı fonksiyonlar tam sembol adıyla çözülür; `f(x+1)` argümanı ifade ağacında
  yerine konur. İç içe `Bileşke` analiz komutlarında da kullanılabilir. Türev
  nesnesinin `f` başvurusu kaynak eğriyi belirtir. İfadenin doğru oluşturup
  oluşturmadığı örnek noktalarla tahmin edilmez; afin katsayılar cebirsel olarak
  hesaplanır, hesap hassasiyeti kart biçimlendirmesinden ayrı kalır.
- Parçalı fonksiyonlarda `<`/`<=` ve `>`/`>=` ayrımı modele ve çizime taşınır.
  Açık/kapalı uç işaretleri ile `x=c` biçimindeki tek noktalı parçalar çizilir;
  aynı yerdeki kapalı nokta açık işaret tarafından örtülmez.
- Giriş alanındaki eski tuş izin listesi kaldırılmıştır. Ctrl/Cmd kısayolları
  kullanılabilir; IME bileşimi sırasında Enter komut göndermez.

Bu adımın sonunda `src/legacy/app.js` hazırlanan komutları belgeye uygulayıp
geçmişe kaydediyordu; belge/geçmiş, bağımlılık eşleme, kalan çiziciler ve giriş
olayları JavaScript'teydi. Belge ve geçmiş sonraki adımda ayrıldı.

## Adım 6: belge durumu ve geri al/yinele

`src/document/geometry-document.ts` nesne üyeliğini, seçimi, kimlik üretimini,
yarım çizimleri ve düzenleme geçmişini strict TypeScript'e taşır. Legacy
denetleyiciler belgeyi bu modül üzerinden değiştirir; DOM ve görünüm modüle bağlı
değildir.

- Sınırsız iki yığın yerine sınırlı durum kopyaları ve bir imleç kullanılır.
  Varsayılan son 100 işlem geri alınabilir; `historyLimit` ile değiştirilebilir.
  Sınır aşılınca en eski tutulan durum yeni taban olur. Gezinmede bütün grafik
  bir kez klonlanır; doğru/çemberlerin aynı noktalara başvuruları korunur.
- `graph-equality.ts` JSON dönüştürmeden alanları ve ortak başvuruları karşılaştırır.
  `NaN`, sonsuzluklar ve işaretli sıfır ayırt edilir. Değişmeyen işlem kopya
  üretmez ve yineleme dalını silmez. Seçim geçmişe dahil değildir.
- Kimlikler oturum boyunca artar; geri alma, temizleme veya taslak iptali sonrası
  yeniden kullanılmaz. Hatalı komut hazırlığı ve reddedilen teğet adayı kimlik
  ayırmaz. Adlandırma mevcut nesnelerden yapılır; boşalan ad yeniden kullanılabilir.
- Taslak noktalar tamamlanmadan geçmiş kaydı engellenir; komut uygulamadan veya
  araç değiştirmeden önce yarım çizim iptal edilir. Kaydırıcı ve nokta sürükleme
  güncellemeleri tek işlemde kaydedilir. Escape düzenlemeyi geri çevirir; temizleme
  ve geçmiş gezinmesi de bütün araç/sürükleme durumunu sıfırlar.
- Çember içindeki geçersiz teğet adayı belgeye eklenmez. Tamamlanan araç aynı
  fare olayıyla nokta sürüklemeye geçmez. Nokta ilk tıklamada imlece sıçramaz;
  sürükleme başlangıç uzaklığını korur. Canvas dışında bırakılan fare işlemi
  `window` üzerindeki `mouseup` ile tamamlanır.

Bu adımın sonunda araç denetleyicileri, bağımlılık eşleme, kalan nesne çizicileri
ve giriş/arayüz akışı JavaScript'teydi. Çiziciler sonraki adımda ayrıldı.

## Adım 7: nesne çizicileri

Kalıcı nesneleri, analiz nesnelerini ve araç önizlemelerini boyayan kod
`src/legacy/app.js` içinden strict TypeScript modüllerine ayrıldı. Legacy motorda
yalnızca kare hazırlığı (`paintScene`) ve hangi önizlemenin çizileceğine karar veren
araç akışı (`drawToolPreview`) kaldı.

- `painter-types.ts` tek bir boyama karesinin girdisini (`PainterFrame`) tanımlar:
  Canvas bağlamının kullanılan alt kümesi, koordinat dönüşümü, görünür boyut, etkin
  nesne kimliği, sıralanmış nesneler ve fonksiyon değerlendiricisi. Çiziciler bu
  veriyi yalnızca okur; belgeye, araç durumuna, ızgaraya veya DOM'a erişmez.
- `canvas-primitives.ts` nokta, görünür alana kırpılmış doğru, çember, yay ve metin
  çizimini matematik koordinatlarından yapar. Kılavuz çizgileri ve önizlemeler
  geometri modeli oluşturmadan düz tanımlarla çizilir.
- `geometry-painter.ts` nokta, çember türleri, doğrular, doğru parçası, uzaklık,
  çember teğeti, açı ve yay ölçüsünü; `analysis-painter.ts` fonksiyon, bileşke,
  türev, teğet, limit, dizi ve parçalı fonksiyonları boyar.
- `scene-painter.ts` nesne türüne göre ilgili çiziciyi seçer. Sıralama
  `createSceneOrder` ile çağıran tarafta yapılır; sahne çizimi nesneleri sıralamaz
  veya değiştirmez.
- `transient-painter.ts` araç önizlemelerini (nokta, doğru, uzaklık, çember, açı)
  belge modeline dokunmadan çizer.

Mevcut tarayıcı ve komut matrisi kontrollerinin tamamı (156 test)
ile tip denetimi geçti. Bu adımın sonunda araç denetleyicileri, bağımlılık eşleme,
komutların belgeye uygulanması ve giriş/arayüz akışı hâlâ JavaScript'teydi.

## Adım 8: araçlar, bağımlılıklar ve arayüz bağları

`src/legacy/app.js` kaldırıldı; uygulamanın tamamı strict TypeScript'tir ve
`allowJs` kapatıldı. Eski kod birebir çevrilmedi, sorumluluklarına göre yeniden
tasarlandı. `src/main.ts` yalnızca `src/app/app.ts` içindeki `startApp` işlevini
çağırır; bu dosya belgeyi, görünümü ve bütün DOM bağlarını bir araya getirir.

- `document/dependencies.ts` bağımlı noktaları (çember/doğru/açı/teğet üzerinde,
  yansıma, kesişim, teğet temas noktası) belge sırasıyla tek geçişte yeniden
  hesaplar ve bağımlılık grafiğini çıkarır. Eski koddaki, kaydırıcı değişince
  sahip nesnelerin koordinatlarını adla eşleyip elle kopyalayan döngü gereksizdi;
  nesneler aynı nokta başvurusunu paylaştığı için kaldırıldı.
- `app/tools.ts` araç durumunu tek bir seçim listesiyle tutar; eski koddaki
  araç başına ayrı bayrak ve nokta değişkenleri (20'den fazla) kalktı. Araçlar
  noktaları taslak olarak seçer, son adımda yapıyı komut satırıyla aynı
  `prepareCommand` yolundan oluşturur. Böylece doğrulama ve adlandırma tek yerdedir:
  aynı doğrudaki üç noktadan çember veya aynı noktayı iki kez seçmek artık
  reddedilir, son seçim geri alınır ve önceki seçimler korunur. `YayÖlçüsü`
  komutu, aracın seçtiği çemberi kullanmak için isteğe bağlı çember adı alır.
- Bütün nokta seçen araçlar tıklanan doğruya, çembere, teğete veya açıya bağlı
  nokta oluşturur (önceden yalnızca nokta, doğru parçası ve açı araçları
  bağlıyordu). Önizleme imlecin oluşturacağı noktayı gösterir ve tıklamadan sonra
  da kalır; çember teğeti aracı teğet doğrularını önceden gösterir.
- `app/hit-test.ts` seçim eşiğini yakınlaştırmadan bağımsız 10 CSS pikseli olarak
  uygular (varsayılan görünümde eski 0,1 birime eşittir) ve ilk bulunan yerine en
  yakın nesneyi seçer; noktalar diğer nesnelere göre önceliklidir.
- `app/viewport-state.ts` kaydırma, tekerlekle yakınlaştırma ve eksen sürüklemeyi
  tutar. Yakınlaştırma imlecin altındaki noktayı, eksen sürükleme tutulan noktayı
  yerinde bırakır; eskiden ikisi de sol üst köşeye göre ölçekliyordu.
- `app/object-cards.ts` kart metinlerini ve kaydırıcı tanımlarını tek yerde üretir;
  eski kodda aynı metinler kart oluşturma, kaydırıcı ve seçim işlevlerinde üç kez
  ve kısmen farklı biçimlerde yazılıydı. Yatay `Doğru` kartı artık `y = c`,
  `Uzaklık` kartı ölçülen uzaklığı gösterir.
- `ui/object-panel.ts` kartları her olayda baştan kurmak yerine kimliğe göre yerinde
  günceller; sürükleme sırasında DOM yeniden oluşturulmaz. Kart öğe kimlikleri
  (`<id>-input`, `<id>-sliderA` ...) ve yeniden eskiye sıralama korunur.
- Silme, nesneye bağlı bütün yapıları birlikte siler ve tek geçmiş adımında geri
  getirir. Önceden başka nesnelerin kullandığı nesnelerin silme düğmesi gizleniyordu.
- Tamamlanan araç seçim aracına döner ve yeni nesneyi seçili bırakır.
- `ui/command-input.ts`, `ui/help-popup.ts`, `ui/side-panel.ts` ve `ui/toast.ts`
  komut girişi, yardım/öneriler, sağ panel ve bildirimleri ayrı modüllerde tutar.
  Araç çubuğu API'si `ui/radial-toolbar.ts` modülünden tipli olarak alınır;
  `window.drAW2DRadialToolbar` testler için korunur.

Bu adım Pointer Events, dokunma/kalem veya mobil düzen eklemedi; fare olayları
korundu. Tarayıcı, preview ve Electron kontrolleri geçti. Doğrulamadan sonra
kullanıcı devam etmemizi isteyene kadar durulur.

## Adım 9: dokunma, kalem ve mobil düzen

Tuval girdisi fare olaylarından Pointer Events'e taşındı; fare, kalem ve dokunma
aynı yoldan geçer. Basılı işaretçi tuvale bağlanır (pointer capture), böylece
tuval dışında bırakılan hareket de tamamlanır; pencere dinleyicileri yakalanamayan
olayları da bitirir.

- Fare ve kalem basıldığı anda etki eder; masaüstündeki davranış değişmedi.
- Dokunmada yapı araçları "nişan alır": önizleme parmağı izler, nokta parmak
  kalkınca konur. Küçük ekranda noktayı parmağın altından görmeden yerleştirmek
  yerine sürükleyip doğru yerde bırakmak mümkündür.
- Parmaklar için isabet eşiği 22 piksel, eksen tutma eşiği 16 pikseldir (fare
  ve kalemde 10 ve 8 piksel).
- İkinci parmak her tek parmak hareketini iptal eder: süren nokta sürüklemesi
  geçmiş adımı bırakmadan geri alınır, yarım nişan atılır ve iki parmak hareketi
  başlar. Parmakların orta noktasının altındaki matematik noktası orta noktayı
  izler, aralarındaki uzaklık ölçeği belirler; yakınlaştırma ve kaydırma birlikte
  yapılır. Kalan parmaklar hepsi kalkana kadar yok sayılır.
- İki parmak ve dokunmatik yüzey (Ctrl+tekerlek) yakınlaştırması sürekli ölçektir;
  ızgara aralığını ölçekten kendisi seçtiği için birim adımlarına bağlı değildir.
  Ölçek her iki eksende birim başına 0,001–10⁷ piksel arasında tutulur. Fare
  tekerleği önceki adımlı yakınlaştırmayı korur.
- Tuvalde `touch-action: none` vardır; dokunma sayfayı kaydırmaz veya tarayıcıyı
  yakınlaştırmaz.
- 700 pikselden dar ekranlarda nesne paneli alttan açılan bir sayfadır. Üst
  kenarındaki tutamak parmakla sürüklenerek yüksekliği değiştirir (fare ile
  sütun düzeninde genişlik). Uygulama bu ekranlarda panel kapalı ve başlangıç
  noktası tuvalin ortasında açılır; tarayıcı kimliği (user agent) koklaması
  kaldırıldı.
- Dokunmatik ekranlarda (`pointer: coarse`) araç düğmeleri 44 piksel, kart
  satırları ve gizle/sil düğmeleri büyüktür; komut girişi 16 piksel yazı
  kullanır, mobil tarayıcılar odaklanınca sayfayı yakınlaştırmaz.

Testler gerçek dokunma olaylarını Chromium'un CDP arabirimiyle (çoklu dokunuş
dahil) gönderir. Tarayıcı, preview ve Electron kontrolleri geçer. Doğrulamadan
sonra kullanıcı devam etmemizi isteyene kadar durulur.

## Kalan taşıma sırası

Her adımda mevcut maliyet veya sorun belirlenir; yeni yapı webde ve Electron'da
doğrulanır. Eski sürüm örnekleri karşılaştırmaya yardımcı olur; iyileştirmeleri
engelleyen değişmez kurallar sayılmaz.

1. Mobil paketleme ihtiyacı netleştiğinde Android/iOS katmanı.

Sadece uzantı değiştirerek veya `@ts-nocheck` ekleyerek taşımak yerine her modülün
gerçek veri ve olay tipleri tanımlanır. Yeni özellikler `src/` altındaki ortak
uygulama üzerinde geliştirilir.

## Paketleme sınırları

`dist/` web çıktısı, `dist-electron/` masaüstü kabuğu, `release/` dağıtım çıktısıdır.
Bu üç klasör Git'e eklenmez. electron-builder dosya listesi yalnızca web çıktısı,
derlenmiş masaüstü kabuğu ve paket bilgilerini kapsar; testler ve kaynak belgeleri
dağıtım paketine dahil edilmez.

Linux için AppImage ve `.deb`, Windows için NSIS kurulum paketi yapılandırılmıştır.
Üretilen paketin hedef işletim sistemi üzerinde çalıştırılması, paket üretiminden
ayrı bir doğrulamadır. Mobil paketler bu aşamanın kapsamında değildir.
