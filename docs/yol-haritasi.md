# drAW2D yol haritası

Taşıma tamamlandıktan sonra düşünülen geliştirmeler. Buradaki maddeler not
amaçlıdır; hiçbiri uygulanmadı. Hangisinin ne zaman yapılacağına kullanıcı karar
verir.

## Planlanan sıra (2026-10-23)

Kullanıcıyla kararlaştırılan uygulama sırası; her adımdan sonra durulur.

1. Küçük açık işler.
2. Tanım tabanlı belge modeli ve parametreler (İ3). **Tamamlandı (2026-10-23).**
3. Gruplu araç çubuğu (İ4). **Tamamlandı (2026-10-23).**
4. Karttan yeniden tanımlama (öneri 5'in ilk yarısı). **Tamamlandı (2026-10-23).**
5. Komut kaydı ve şablonlar (İ2). **Tamamlandı (2026-10-23).**
6. Fonksiyon analizi (öneri 2). **Tamamlandı (2026-10-23).**
7. Yeni çizim araçları (öneri 4). **Tamamlandı (2026-10-23).**
8. Matematik klavyesi (İ1). **Tamamlandı (2026-10-23).**
9. Nesne görünüm ayarları ve bütün nesneyi sürükleme (öneri 5'in ikinci yarısı), kart
   düzeni (İ5, seçenek 1 ve 2). **Tamamlandı (2026-10-23).**
10. Kapalı, parametrik ve kutupsal eğriler, eşitsizlik bölgeleri.
11. Kaydetme, açma, otomatik kayıt ve dışa aktarma (öneri 1).
12. Android/iOS paketleme.

## Kullanıcı istekleri

Kullanıcının bildirdiği istekler, bildirildiği tarihle. Henüz eklenmedi.

### İ1. Matematik klavyesi (2026-10-23)

Matematiksel ifadeleri kolay yazmak için sanal bir klavye: kök, üs, kesir, π, e,
trigonometrik fonksiyonlar ve komut düğmeleri. Özellikle dokunmatik ekranlarda
sistem klavyesinin yerine veya yanında kullanılır.

**Uygulandı (2026-10-23):** komut girişindeki klavye düğmesi `src/ui/math-keyboard.ts`
klavyesini panelin altında açar (telefonda alt panelin dibinde). Sekmeler: "123"
(rakamlar, işlemler, x, y, n, π, e, √, üs), "f(x)" (trigonometrik, ters
trigonometrik, log, ln, exp, |x|, n. kök, taban/tavan, karşılaştırmalar), "abc"
(Türkçe Q harfleri) ve "Komutlar" (dil tablosundaki her şablon). Fonksiyon tuşları
imleci parantezin içine koyar; komut tuşu şablonu ekleyip ilk yer tutucuyu seçer.
⌫, ←/→, ⇥ (sonraki alan) ve ⏎ girişin kendi tuş işleyicilerinden geçer; yer tutucu,
öneri ve eksik alan uyarısı fiziksel klavyedeki gibi çalışır. Açıkken giriş
`inputmode="none"` alır, dokunmatik ekranda sistem klavyesi açılmaz; dokunmatik
ekranlarda ilk dokunuşta kendiliğinden açılır.

### İ2. Komut şablonları ve otomatik tamamlama (2026-10-23)

Giriş alanına yazılırken eşleşen komutlar girişin altında önerilir. Örneğin
`Diz` yazınca `Dizi(Fonksiyon, Başlangıç, Bitiş)` çıkar. Öneri onaylanınca girişe
bir şablon yerleşir; kullanıcı yalnızca gerekli kısımları doldurur (yer tutucular
arasında Tab ile geçiş gibi).

Not: Girişte bugün yardım penceresindeki örneklerden (`Dizi(1/n,1,7)` gibi)
öneri listesi çıkıyor; ancak bu, doldurulacak yer tutucuları olan bir şablon
değil, hazır bir örnek.

**Uygulandı (2026-10-23):** `src/commands/language.ts` giriş dilinin tek tablosudur:
komut adları ve eş adları (ayrıştırıcı buradan okur), şablonlar
(`Dizi(<Fonksiyon (n)>, <Başlangıç>, <Bitiş>)`), yardım konuları ve örnekleri.
Yardım penceresi artık `index.html` içinde elle yazılmıyor, bu tablodan üretiliyor;
yeni "Parametre" konusu eklendi. Girişte bir komut adının en az iki harfi
yazılınca eşleşen şablonlar önerilir (aksan ve büyük/küçük harf duyarsız, Türkçe ve
İngilizce adlar). Ok tuşları gezer, Enter veya Tab kabul eder, Esc kapatır. Kabul
edilen şablonun ilk yer tutucusu seçilir; yazmak onu değiştirir, Tab sonrakine
geçer, seçili yer tutucuya `(` yazmak onu `()` yapar. Doldurulmamış yer tutucuyla
gönderilen komut uyarı verir ve o alanı seçer. Eski örnek tabanlı öneriler kaldırıldı.

### İ3. Ayrı kaydırıcılar (2026-10-23)

Bağımsız bir kaydırıcı nesnesi. Öneri 3 (parametre kaydırıcıları) ile aynı konudur.

**Karar (2026-10-23):** Kaydırıcılar tek bir kavramda birleşir: kaydırıcı =
parametre. Bugünkü otomatik kaydırıcılar bu sisteme taşınır, ayrı bir yapı olarak
kalmaz.

- Parametre nesnesi `a=2` girişiyle veya kaydırıcı aracıyla oluşur. Kartında
  kaydırıcı ve ayarları bulunur: en küçük, en büyük, adım, tam sayı modu,
  oynat/döngü (animasyon). İstenirse tuvalde de gösterilir. Aralığı görünüme bağlı
  değildir.
- Parametre her ifadede kullanılabilir: `a·x^2+1`, `Çember((0,0),a)`, `(a,2)`,
  `Teğet(f,a)`, `Dizi(1/n,1,a)`. Değişince ona bağlı her şey yeniden hesaplanır.
- Nokta ve doğru kaydırıcıları kalkar; bunlar tuvalde sürüklenerek veya karttaki
  tanım düzenlenerek değiştirilir (öneri 5).
- Öğretim amaçlı komutlar (`Teğet`, `TeğetH/X`, `Limit`) yaklaşım değeri için
  kendiliğinden bir parametre oluşturur. Örneğin `Teğet(x^2,1)` girişi `x₀=1`
  parametresini oluşturur ve teğeti ona bağlar.
- Gereken altyapı: nesneler değer yerine tanım saklar (`r = a`), değer tanımdan
  hesaplanır. Aynı değişiklik karttan yeniden tanımlamanın (öneri 5) ve kaydetme
  biçiminin (öneri 1) de temelidir.

**Uygulandı (2026-10-23):**

- `a=2` kaydırıcı, `b=a+1` başka parametrelere bağlı (kaydırıcısız) bir sayı
  oluşturur; var olan bir parametreye `a=3` yazmak onu değiştirir. Kendine veya
  döngüsel başvuru reddedilir.
- Parametreler nokta koordinatlarında, yarıçapta, `x=a` dik doğrusunda, fonksiyon
  ifadelerinde, `Dizi` sınırlarında ve öğretim komutlarının yaklaşım değerinde
  kullanılabilir. Parametre kullanan bir fonksiyonun doğru mu eğri mi olduğu
  parametre değerinden bağımsız belirlenir (`a·x+1` doğrudur, `x^a` eğridir).
- Tanımı olan nesneler parametre değişince bağımlılık sırasıyla yeniden hesaplanır;
  başka bir fonksiyonu kullanan tanımlar (`f(x+1)`) da artık canlıdır. Kimlik, ad,
  renk ve başvurular korunur. Değerlendirilemeyen tanım (örneğin negatif yarıçap)
  son değerini korur, çizilmez ve kartında `∅` görünür.
- `Teğet` ve `TeğetH/X` sabit bir yaklaşım değeri için kaydırıcı oluşturur
  (`TeğetH` ayrıca `h`, `TeğetX` ikinci x değeri için). `Limit` yaklaşım
  kılavuzlarının uzaklığı için `δ` kaydırıcısını oluşturur. Teğet doğrusu ve limit
  kılavuzları artık nesne seçili olmasa da çizilir.
- Kartlardaki nokta, doğru, dik doğru, çember, limit ve teğet kaydırıcıları
  kaldırıldı. Parametre kartının kaydırıcısı her zaman görünür; kart seçiliyken en
  küçük, en büyük, adım ve oynat/durdur düğmesi açılır. Animasyon değeri gidip
  getirir; durdurmak tek bir geri alma adımı kaydeder.
- Parametreye bağlı noktalar sürüklenmez. Bir parametreyi silmek ona dayanan bütün
  tanımları da siler.
- Henüz yok: parametrenin tuvalde gösterilmesi, parçalı fonksiyon aralık
  sınırlarında parametre, nokta ve doğruları karttan kesin değerle düzenleme
  (adım 3).

### İ4. Gruplu araç çubuğu (2026-10-23)

Radyal araç çubuğu en fazla 11 araç alıyor; planlanan araçlar sığmıyor.

**Karar (2026-10-23):**

- Radyal araç çubuğu kalkar. Yerine GeoGebra Classic tarzı, gruplu bir araç
  çubuğu gelir: her grup tek düğmedir, düğme grubun son seçilen aracını gösterir,
  basınca grubun araçları adları ve kısa açıklamalarıyla açılır.
- Gruplar: Taşı; Nokta (Nokta, Kesişim, Orta Nokta); Doğru (Doğru, Doğru Parçası,
  Işın, Vektör); Özel doğrular (Dik, Paralel, Kenar Orta Dikmesi, Açıortay, Çembere
  Teğet); Çokgen; Çember (Merkez ve Nokta, Üç Nokta, Merkez ve Yarıçap, Yay); Ölçüm
  (Açı, Uzaklık, Yay Ölçüsü, Alan, Eğim); Dönüşüm (Noktaya ve Doğruya Göre Yansıt,
  Döndür, Ötele); Fonksiyon (Fonksiyon Üzerinde Nokta, Kök, Ekstremum, İntegral);
  Kaydırıcı. Henüz olmayan araçların grupları, araçlar eklendikçe görünür.
- Geri al, yinele, standart görünüm, yardım ve panel düğmesi çubuğun sağ ucuna
  taşınır; tuvalin sağındaki yüzen düğme sütunu kalkar.
- Dar ekranlarda araçlar alttan açılan panelde ayrı bir "Araçlar" sekmesinde,
  gruplu bir ızgarada durur ("Cebir | Araçlar").
- Araçların adı, simgesi, grubu ve açıklaması tek bir araç kaydından gelir.

**Uygulandı (2026-10-23):** Radyal çubuk ve tuvalin sağındaki düğme sütunu
(akordeon dahil) kaldırıldı. `src/ui/tool-registry.ts` grupları ve araçları tutar;
`src/ui/main-toolbar.ts` çubuğu, grup menülerini, dar ekranda etkin aracın düğmesini
ve paneldeki "Araçlar" sekmesini bu kayıttan üretir. Grup düğmesi son kullanılan
aracı seçer ve grubun menüsünü açar; dışarı tıklamak veya Esc menüyü kapatır. Bir
araç eklemek kayda bir satır ve araç durum makinesine bir tanım eklemektir. Şu an
görünen gruplar: Taşı, Nokta, Doğru, Özel Doğrular, Çember, Ölçüm, Dönüşüm.

### İ5. Kart düzeni (2026-10-23)

Kartların her zaman iki satır olması hoş görünmüyor. Önerilen seçenekler: (1) boş
değer satırı kalksın; (2) üst satırda ad ve değer, tanım yalnız farklıysa ve kart
seçiliyken altta küçük gri satırda; (3) bir görüntüleme kipi ayarı (değer / tanım /
komut); (4) değerlerin KaTeX ile matematik yazımıyla gösterilmesi. Kullanıcı 1 ve 2'yi
9. adımla birlikte istedi; 3 ve 4 sonraya kaldı.

Ek istek (2026-10-23): çizgi stili seçeneklerinin yanında çizginin görünüşü de
olsun (ör. `Noktalı · · · ·`).

**Uygulandı (2026-10-23):**
- Değeri olmayan kart (serbest nokta, çember, fonksiyon, parametre) tek satırdır.
- Değeri tanımından farklı olan kartlarda (parametreye bağlı nesneler, kesişim,
  yansıma, analiz noktaları, özel doğrular, ölçümler, teğet, bileşke, çokgen,
  integral) üst satır adıyla değerdir (`f: y = 2x+1`, `A=(2,1)`, `b = 3`); tanım
  (`f: y = a*x+1`) yalnız kart seçiliyken altta gri görünür. Kalem tanım metnini açar.
  Değer satırları bunun için adı içerir (`y = 2x+1` yerine `f: y = 2x+1`; parametre
  yarıçaplı çember `b: Çember(A,2)`).
- Türev ve TeğetH/X kartında iki satır da kendi başına bilgi olduğundan iki satır
  kalır; değeri tanımsız (`∅`, `∞`) kartta tanım önde kalır.
- Seçili kartın tamamı vurgulanır.
- Sonraya kalan: görüntüleme kipi ayarı (3) ve KaTeX gösterimi (4).

## Önerilen geliştirmeler

Önem sırasıyla (2026-10-23).

### 1. Kaydetme, açma ve otomatik kayıt

Şu an kalıcılık yok; sayfayı yenilemek veya uygulamayı kapatmak çizimi siler.

**Zamanlama (2026-10-23):** Sonlara doğru uygulanacak; belge modelinde daha
değişiklikler (tanım tabanlı nesneler, parametreler) olacağından dosya biçimi
ondan sonra belirlenir.

- Web: tarayıcıda otomatik kayıt; dosya olarak indirme ve yükleme.
- Masaüstü: Dosya > Aç/Kaydet, mevcut preload/IPC katmanı üzerinden.
- Belge kopyalanabilir bir nesne grafiği olduğundan JSON'a dönüştürmek kolaydır.
- PNG/SVG olarak dışa aktarma (ders notu, sınav kâğıdı).

### 2. Fonksiyon analizi

- `Kesiştir(f,g)`: iki fonksiyonun ve fonksiyon ile doğrunun kesişimi. Şu an
  yalnızca doğru ve çemberler kesiştirilebiliyor.
- `Kök(f)`, `Ekstremum(f)`, `Dönüm(f)`, `İntegral(f,a,b)` (alanı taralı),
  `Asimptot(f)`.
- Fonksiyon üzerine bağlı, eğri boyunca sürüklenebilen nokta.
- Yeni fonksiyon çizicisindeki sınır ve sıçrama bulma altyapısı sayısal kök
  bulmaya temel olabilir.

**Uygulandı (2026-10-23):** `src/geometry/analysis.ts` her nesneyi ortak bir eğriye
(grafik, dik doğru, çember) çevirir; kökler 512 aralıkta işaret değişimiyle bulunup
ikiye bölmeyle inceltilir, kutuplar ve sıçramalar kök sayılmaz, çift kökler ayrıca
yakalanır. `Kök(f)`, `Ekstremum(f)` (türevin işaret değiştirdiği yerler), `Dönüm(f)`
ve fonksiyonları içeren `Kesiştir(f,g)` (fonksiyon, doğru, dik doğru, çember) bütün
çözümleri x sırasıyla nokta olarak oluşturur; isteğe bağlı aralık `Kök(f,a,b)`,
verilmezse oluşturma anındaki görünür x aralığı. Noktalar kaynaklarına bağlıdır;
parametre veya sürükleme kaynağı değiştirince yeniden hesaplanır, çözüm yoksa `∅`.
`İntegral(f,a,b)` eğri ile x ekseni arasını tarar, değeri kartta görünür; sınırlar
parametre olabilir. Nokta aracı eğriye tıklanınca noktayı eğriye bağlar, nokta
eğri boyunca sürüklenir. Araç çubuğunda "Fonksiyon" grubu (Kök, Ekstremum, Dönüm
Noktası) açıldı; Kesiştir aracı eğrilerle de çalışır.

Sınırlar: nokta sayısı oluşturma anında belirlenir (en fazla 20); sonradan
ortaya çıkan ek çözümler gösterilmez. Analiz komutları fonksiyon adı alır
(`Kök(x^2-4)` gibi doğrudan ifade henüz yok); arama aralığı parametre olamaz;
parçalı fonksiyonlarda ekstremum ve dönüm noktası yok.

### 3. Parametre kaydırıcıları

Kullanıcı isteği İ3 ile aynı konu; karar ve ayrıntılar orada.

- `a=2` girişi bir kaydırıcı oluşturur; `f(x)=a·x^2+1` gibi ifadeler ona bağlanır
  ve kaydırıcıyla grafik canlı değişir.
- İfadelerdeki ad çözümlemesi (`f(x+1)`) sayısal adlara genişletilir.

### 4. Yeni çizim araçları

- Orta nokta, dik doğru, paralel doğru, açıortay, kenar orta dikmesi.
- Çokgen (alanıyla), ışın.
- Dönüşümler: öteleme, döndürme, doğruya göre yansıtma.
- Her araç mevcut düzene oturur: araç durum makinesi, komut, model, çizici, kart.

**Uygulandı (2026-10-23):** komutlar ve araçlar: `OrtaNokta(A,B)`, `Işın(A,B)`,
`DikDoğru(P,d)`, `ParalelDoğru(P,d)`, `OrtaDikme(A,B)`, `Açıortay(A,B,C)`,
`Çokgen(A,B,C,...)` (kartında alan), `Yansıt(P,d)` (doğruya göre), `Döndür(P,açı,M)`
(açı, `Teğet` gibi kendiliğinden kaydırıcı olur) ve `Ötele(P,A,B)`. Özel doğrular
olağan iki noktalı doğrulardır; ikinci noktaları (kenar orta dikmesinde ikisi)
gizli, adsız yardımcı noktalardır ve doğruyla birlikte silinir, böylece kesişim,
doğruya bağlı nokta ve çizim altyapısı aynen çalışır. Araç çubuğunda Çokgen grubu
açıldı; Nokta, Doğru, Özel Doğrular ve Dönüşüm gruplarına araçlar eklendi; her
aracın imleci izleyen önizlemesi var. Çokgen aracı ilk köşeye tıklanınca kapanır.

Sınırlar: dönüşümler yalnız noktalara uygulanır (doğru, çember veya çokgen
dönüşümü yok); vektör nesnesi, düzgün çokgen, merkez ve yarıçap aracı, yay, alan
ve eğim ölçümü henüz yok.

### 5. Nesne özellikleri ve düzenleme

- Kart girişinden nesneyi yeniden tanımlama, ad değiştirme. **Uygulandı
  (2026-10-23):** kalem düğmesi, çift tıklama, Enter veya F2 kartı düzenlemeye
  açar; metin `ad: tanım` biçimindedir (`f: Doğru(A,B)`, `A = (1,2)`,
  `f: Teğet(x^2,a)`). Enter uygular, Esc ve alandan çıkmak vazgeçer, hatada metin
  düzeltilmek üzere kalır. Ad değişince o ada başvuran tanımlar da güncellenir. Yeni
  tanım nesneye yerinde uygulanır; kimlik, renk ve başvurular korunur, işlem tek
  geri alma adımıdır. Bağlı yapıları olan nesnenin türü yalnız uyumlu türe değişir
  (doğru→doğru, çember→çember, fonksiyon→fonksiyon); kendine veya ona bağlı nesneye
  başvuran tanım reddedilir. Nesneye bağlı noktaya yazılan koordinat noktayı o
  nesne üzerinde taşır. Kesişim ve teğet yeniden tanımlanınca yardımcı noktalar
  sırayla eşlenir ve kimliklerini korur; düzenlenen `Limit` ve `TeğetH/X`
  kaydırıcılarını korur.
- Renk, çizgi kalınlığı ve stili; etiketi gizleme; iz bırakma. **Uygulandı
  (2026-10-23):** seçili kartın palet düğmesi görünüm ayarlarını açar: renk, kalınlık
  (noktada boyut), çizgi (düz, kesikli, noktalı; seçeneklerin yanında örneğiyle),
  etiket ve noktalarda "İz bırak". Yalnız nesneye uyan ayarlar görünür; parametrede
  ayar yoktur. Her değişiklik tek geri alma adımıdır (renk ve kalınlık sürüklenirken
  tek adım); ayarlar yeniden hesaplamada ve yeniden tanımlamada korunur. Gizli
  etiketli ölçümler (açı, uzaklık, yay) yalnız değerini yazar. İz, noktanın geçtiği
  konumları düzlem koordinatında tutar (kaydırma ve yakınlaştırmada yerinde kalır),
  belgeye ve geçmişe girmez; iz kapatılınca veya nokta silinince silinir.
- Doğru ve çemberlerin bütün olarak sürüklenmesi. **Uygulandı (2026-10-23):** doğru,
  doğru parçası, ışın, uzaklık, çember, açı ve çokgen, tanımlayan noktalarının hepsi
  serbestse sürüklenince bütün olarak ötelenir; yapı doğruları (dik, paralel, orta
  dikme, açıortay) kaynak noktalarıyla taşınır. Denklemle verilmiş doğru (`2x+1`,
  `x=3`) denklemi değişerek sürüklenir. Hesaplanan, nesneye bağlı veya parametreye
  bağlı noktası olan nesne yerinde kalır; sürüklenebilen nesnenin üstünde imleç el
  olur. Sürükleme tek geri alma adımıdır, Esc veya ikinci parmak geri alır.
- Sınırlar: iz yalnız noktalarda (doğru ve fonksiyon izi yok); fonksiyon grafikleri
  sürüklenerek ötelenmez.

### Daha büyük işler

- Kapalı eğriler (`x^2+y^2=4`); ayrı bir çizim algoritması gerekir.
- Parametrik eğriler (`Eğri(cos t, sin t, t, 0, 2π)`), kutupsal grafikler,
  eşitsizlik bölgeleri.

## Açık küçük işler

Kart silme simgesinin Electron'da görünmeme şüphesi incelendi (2026-10-23): Vite
yolu derlemede `../img/clear.svg` olarak yeniden yazıyor, simge `file://` altında
yükleniyor. Electron kontrolü artık CSS arka plan görsellerini de denetliyor.

- Tuvalin sol altındaki mADEMatik bağlantısı (madematik.com) kaldırıldı
  (2026-10-23); ileride uygun bir yere (örneğin yardım penceresi veya bir "Hakkında"
  bölümü) geri eklenecek. Eski işaretleme ve stil Git geçmişindedir.
- Derlemede math.js kaynaklı "500 kB'tan büyük parça" uyarısı; kod bölme ilk
  açılışı hızlandırabilir.
- Aralarında tanımsız noktalar olan çok seyrek tanımlı fonksiyonlarda (`x^x`,
  negatif taraf) çizgi tanımsız bölgenin üstünden geçebilir; düzeltmek her
  grafiğin maliyetini ikiye katlar.
- Android/iOS paketleme: platform ve dağıtım yolu (mağaza, APK, PWA) kararı
  bekliyor.
