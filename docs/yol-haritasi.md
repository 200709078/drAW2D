# drAW2D yol haritası

Taşıma tamamlandıktan sonra düşünülen geliştirmeler. Uygulananlar maddelerinde
"Uygulandı" olarak işaretlidir. Hangisinin ne zaman yapılacağına kullanıcı karar
verir.

## Planlanan sıra (2026-10-23)

Kullanıcıyla kararlaştırılan uygulama sırası; her adımdan sonra durulur.

1. Küçük açık işler. Kod bölme **tamamlandı (2026-10-25)**; kalanlar "Açık küçük işler"
   bölümünde.
2. Tanım tabanlı belge modeli ve parametreler (İ3). **Tamamlandı (2026-10-23).**
3. Gruplu araç çubuğu (İ4). **Tamamlandı (2026-10-23).**
4. Karttan yeniden tanımlama (öneri 5'in ilk yarısı). **Tamamlandı (2026-10-23).**
5. Komut kaydı ve şablonlar (İ2). **Tamamlandı (2026-10-23).**
6. Fonksiyon analizi (öneri 2). **Tamamlandı (2026-10-23).**
7. Yeni çizim araçları (öneri 4). **Tamamlandı (2026-10-23).**
8. Matematik klavyesi (İ1). **Tamamlandı (2026-10-23).**
9. Nesne görünüm ayarları ve bütün nesneyi sürükleme (öneri 5'in ikinci yarısı), kart
   düzeni (İ5, seçenek 1 ve 2). **Tamamlandı (2026-10-23).**
10. Kapalı, parametrik ve kutupsal eğriler, eşitsizlik bölgeleri. **Tamamlandı (2026-10-25).**
11. Kaydetme, açma, otomatik kayıt ve dışa aktarma (öneri 1). **Tamamlandı (2026-10-25).**
12. Android/iOS paketleme. **Android uygulandı (2026-10-25)**, drAW3D'deki gibi; imza
    secret'ları ve telefonda deneme bekleniyor. iOS beklemede. Bkz. "Android paketi".

## Kullanıcı istekleri

Kullanıcının bildirdiği istekler, bildirildiği tarihle. Uygulananlar maddelerinde
"Uygulandı" olarak işaretlidir; sonraya bırakılan kısımlar ayrıca belirtilir.

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
  (adım 3). **Uygulandı (2026-10-25):** parametre kartının ayarlarındaki "Tuvalde
  göster" kaydırıcıyı tuvalin sol üstüne koyar; düğmesi değeri değiştirir, başlığı
  sürüklenince kaydırıcı taşınır (ikisi de tek geri alma adımı), kartın gizle düğmesi
  onu da gizler. Parçalı fonksiyonun aralık sınırları (`x<a`) ve analiz komutlarının
  arama aralığı (`Kök(f,-b,b)`) parametre olabilir.

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

### İ6. Klavyede büyük/küçük harf tuşu (2026-10-25)

Matematik klavyesinin harf sekmesinde büyük harf yazılamıyordu; drAW3D'de de.

**Uygulandı (2026-10-25):** harf sekmesinin son satırının başında ⇧ tuşu: bir kez
basınca sonraki harf büyük, iki kez basınca kilitli (altı çizili), üçüncüde kapalı.
Harf tuşları Türkçe büyük harflerini gösterir ve yazar (i → İ, ı → I). Aynı değişiklik
drAW3D'nin klavyesine de yapıldı.

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

### İ7. Birim çember aracı (2026-10-26)

**Durum:** Uygulandı (2026-10-26, kullanıcı onayıyla); ayrıntılar maddenin sonunda.

**İstek:** Birim çember üzerinde bir açının sinüs, kosinüs, tanjant ve kotanjant
değerlerini animasyon tarzında gösteren bir araç. Örnek görsel kullanıcının masaüstünde:
`Unit_Circle_Definitions_of_Six_Trigonometric_Functions.png`. Görselde O merkezli birim
çember, çember üzerinde A noktası ve θ açısı var. sin θ ve cos θ, A'nın eksenlere
uzaklıklarıdır; tan θ x = 1 doğrusunda (B), cot θ y = 1 doğrusunda (C), sec θ x
ekseninde (E), csc θ y ekseninde (D) gösterilir. Her biri ayrı renkte bir doğru parçasıdır.
- Araç seçilip tuvale tıklanınca bu şekle benzer bir çizim yapılır. sin, cos, tan ve cot
  farklı renklerle gösterilir.
- Nesnenin kartında birim çemberin denklemi yazar (`x² + y² = 1`).
- Kartın altında sin, cos, tan, cot kutucukları bulunur. Kutucuk işaretliyse o değer
  gösterilir, değilse gösterilmez.
- Açı kartta bir kaydırıcıyla değiştirilir.

**Öneriler (2026-10-26):**
1. Açı, uygulamadaki olağan bir parametre olur (ör. `θ = 40`). `Teğet`'in x₀
   kaydırıcısını kendisi oluşturması gibi araç da açıyı kendisi oluşturur. Böylece
   Oynat düğmesiyle sürekli döner (animasyon), kaydırıcı tuvalde de gösterilebilir,
   açı başka ifadelerde kullanılabilir (`sin(θ)` grafiği, `(cos(θ), sin(θ))` noktası).
   Kaydırıcı birim çember kartında da görünür.
2. A noktası çember üzerinde sürüklenebilir; açı ve bütün değerler canlı değişir.
   Tahtada kaydırıcıdan daha doğal olur.
3. Değerler kartta sayıyla da yazar (`sin θ = 0,64`, `tan θ = 0,84`). Tanımsızken
   (tan 90°, cot 0°) "tanımsız" yazar, o parça çizilmez.
4. İşaretler görünür olur: II., III. ve IV. bölgede parçalar eksenin öbür yanına düşer,
   değer eksiyle yazılır. Hangi bölgede hangisinin pozitif olduğu kendiliğinden görülür.
5. sec ve csc de seçenek olur (görselde mor ve turuncu). sin, cos, tan, cot varsayılan
   açık; sec ve csc varsayılan kapalı.
6. Renkler görseldekine yakın: sin camgöbeği, cos yeşil, tan mavi, cot koyu yeşil, sec
   mor, csc turuncu. Etiketler parçanın yanında aynı renkte (`sin θ`, `cos θ`).
7. Yardımcılar yalnız gerektiğinde çizilir: x = 1 ve y = 1 kesikli doğruları yalnız tan
   ya da cot açıkken; A'dan eksenlere dikmeler kesikli; θ yayı ve derecesi her zaman.
8. Kartta derece / radyan seçimi; radyanda `π/6` gibi yazım ve kaydırıcıda π'nin katları.
9. Özel açılarda (30°, 45°, 60° …) tam değer (`√3/2`, `1/2`) yazılabilir; kaydırıcı bu
   açılara hafifçe yapışabilir (isteğe bağlı).
10. Aracın komut karşılığı (`BirimÇember()`, `BirimÇember(30)`); kart düzenleme,
    kaydetme/açma, geri alma ve SVG/PNG dışa aktarma diğer nesneler gibi çalışır.
11. Araç çubuğunda "Fonksiyon" grubunda ya da ileride başka trigonometri araçları
    gelecekse yeni bir "Trigonometri" grubunda.

**Kullanıcı kararları (2026-10-26):** Kodlama yine kullanıcının onayını bekliyor.
- **Yer:** Birim çember her zaman orijindedir; tuvalin neresine tıklanırsa tıklansın merkez
  O(0,0) olur, kart `x² + y² = 1` yazar. Çember sürüklenemez.
- **Açı:** Ayrı bir parametre (`θ`); araç onu kendisi oluşturur (öneri 1). Kaydırıcı
  çember kartında da görünür (2026-10-26'da değişti, aşağıya bkz.).
- **Değerler:** Altısı sunulur; sin, cos, tan, cot varsayılan açık, sec ve csc kutucukları
  var ama başta kapalı (öneri 5).
- **İlk sürümde olacaklar:** A noktası sürüklenebilir (öneri 2), derece/radyan seçimi
  (öneri 8), özel açılarda tam değer ve kaydırıcının bu açılara yapışması (öneri 9).
- **Araç çubuğunda yeri:** Çember grubu (öneri 11'in yerine).
- Öneri 3, 4, 6, 7 ve 10 (değerlerin kartta sayıyla yazılması, işaretler, renkler,
  yardımcı çizgiler, `BirimÇember()` komutu) için ayrı bir itiraz yok; plan bunlarla
  birlikte.

**Kullanıcı ayrıntıları (2026-10-26, yalnız not; kodlama onay bekliyor):**
- **Başlangıç:** Araçla oluşturulunca tuvalde yalnız birim çember görünür. θ açısı yine
  baştan bir kaydırıcıya (θ parametresi) bağlıdır.
- **OA ışını:** Karttaki kaydırıcı değiştirildikçe ya da A noktası sürüklendikçe görseldeki
  OA ışını çizilir.
- **Değerlerin kutucukları:** Kartın altındaki her kutucuk kendi değerini çizer ve tuvalde
  gösterir: sin seçilince sin, cos seçilince cos çizilir; diğerleri de öyle. Kutucuklar
  birbirinden bağımsızdır: istenirse yalnız tan, istenirse altısı birden gösterilir. Bu
  yüzden başlangıçta hiçbir kutucuk işaretli değildir (yukarıdaki "sin, cos, tan, cot
  varsayılan açık" kararının yerine).
- **Yardımcı doğrular:** tan seçiliyse x = 1, cot seçiliyse y = 1 doğrusu da görünür.
- **Kaydırıcı aralığı:** θ 0°–720° arasındadır.
- **Çember sabit:** Birim çember her zaman merkezdedir (O), sürüklenemez.
- **A için kutucuk:** "Başlangıçta yalnız çember" ile "A sürüklenebilir" arasındaki soru bir
  kutucukla çözülür (kullanıcı önerisi). Kartta değer kutucuklarının yanında bir de A
  kutucuğu olur; işaretliyken A noktası görünür ve sürüklenebilir, değilse görünmez.
  Başlangıçta işaretli değildir.
- **A kutucuğunun gösterdikleri (kullanıcı onayı, 2026-10-26):** A kutucuğu A noktasıyla
  birlikte OA ışınını ve θ yayını da gösterir. Kapalıyken açı kaydırıcıdan yine değişir.
- **Değer seçilince A da seçilir (kullanıcı kararı, 2026-10-26):** sin, cos, tan, cot, sec ya
  da csc kutucuklarından biri seçilince A kutucuğu kendiliğinden işaretlenir; A noktası, OA
  ışını ve θ yayı da çizilir. Değerler A'ya göre çizildiği için ışın olmadan anlamları
  kaybolur.
- **A kilitli (kullanıcı kararı, 2026-10-26):** Bir değer kutucuğu seçiliyken A kutucuğu
  işaretli ve pasif (soluk, tıklanamaz) kalır; iptal edilemez. Bütün değer kutucukları
  kaldırılınca A yeniden tıklanabilir olur ama işaretli kalır; kullanıcı isterse kaldırır
  (kullanıcı onayı, 2026-10-26).

**Uygulandı (2026-10-26):** Çember grubunda "Birim Çember" aracı ve `BirimÇember()` /
`BirimÇember(45)` komutu. Yukarıdaki kararların hepsi uygulandı; ayrıca:
- Yeni nesne türü `unitCircle` (`geometry/unit-circle.ts` hesaplar, `rendering/unit-circle-painter.ts`
  çizer). Açı θ parametresidir (ikinci çemberde θ2 …), başlangıç değeri 30°, aralığı
  0°–720°, adımı 1°; komutta açı ifade olarak verilirse (`BirimÇember(a)`) kaydırıcı
  oluşturulmaz. θ silinince çember de silinir.
- Değerler kartta sayıyla yazılır: 30°, 45°, 60° … katlarında tam değer (`1/2`, `√3/3`,
  `-√2`), diğer açılarda iki ondalık, tanımsızken "tanımsız" (o parça çizilmez). Çeyrek
  turlar tam hesaplanır, böylece tan 90° gerçekten tanımsızdır.
- Renkler: sin camgöbeği, cos yeşil, tan mavi, cot koyu yeşil, sec mor, csc turuncu;
  kutucuk adları kartta aynı renkte. tan ve cot seçiliyken x = 1, y = 1 ve O'dan geçen OA
  doğrusu, sec ve csc seçiliyken A'daki teğet kesikli çizilir; B, C, D, E görseldeki gibi.
- Yapışma: sürüklenen A, 30° ve 45° katlarına 2° yakınlıkta yapışır ve tam turlarla
  sürekli kalır (350°'den 10°'ye geçince 370° olur). θ kaydırıcısı 1° adımlı olduğu için
  özel açılara zaten tam iner.
- Radyanda açı `π/6`, `3π/2` biçiminde, 15°'nin katı olmayan açılar ondalık olarak yazılır.
- Kutucuklar ve birim seçimi birer geri alma adımıdır; ayarlar kaydetme/açma, otomatik
  kayıt ve karttan yeniden tanımlamada korunur.
- Testler: `tests/unit-circle.spec.ts`, `tests/unit-circle-integration.spec.ts`.

**Kullanıcı istekleri (2026-10-26, uygulandı):**
- Kartta sin, cos, tan, cot bir satırda; A, sec, csc ve Derece/Radyan seçimi ikinci satırda.
- Kaydırıcı birim çember kartında görünmez; açı yalnız ayrı üretilen θ parametresinin
  kartındaki (ya da tuvaldeki) kaydırıcıdan ve A sürüklenerek değişir.
- θ silinince birim çember de silinir (θ çemberin tanımında kullanıldığı için); geri alma
  ikisini birlikte getirir.

## Mobilde yatay kullanım (2026-10-28)

**Kullanıcı isteği (2026-10-28, yalnız not):** mobilde yatay kullanıma izin vermesek nasıl olur?
Değerlendirme (öneri): Android'de yön `MainActivity` / manifestte `screenOrientation` ile
kilitlenebilir; ama kilit yalnız **telefonlara** uygulanmalı (en küçük ekran genişliği < 600 dp).
Tabletler ve Android'li akıllı tahtalar yatay ekranlıdır, dikeye kilitlemek onları bozar. Web'de
yön ancak tam ekranda kilitlenebilir (`screen.orientation.lock`); kilitsiz yatayda bir "telefonu
dik tutun" uyarısı alternatif. Açık sorular: yalnız telefonda mı, yalnız Android paketinde mi,
web'de de mi? Kullanıcı kararı bekliyor.

## Önerilen geliştirmeler

Önem sırasıyla (2026-10-23).

### 1. Kaydetme, açma ve otomatik kayıt

Şu an kalıcılık yok; sayfayı yenilemek veya uygulamayı kapatmak çizimi siler.

**Dosya uzantısı (2026-10-24):** drAW2D belgeleri `.drw2` uzantısıyla kaydedilecek.
Ailenin kuralı: drAW `.drw`, drAW2D `.drw2`, drAW3D `.drw3` (drAW3D'de uygulandı).

**Zamanlama (2026-10-23):** Sonlara doğru uygulanacak; belge modelinde daha
değişiklikler (tanım tabanlı nesneler, parametreler) olacağından dosya biçimi
ondan sonra belirlenir.

**Uygulandı (2026-10-25):** araç çubuğunun sağındaki Dosya menüsü: Yeni (geri
alınabilir), Aç (Ctrl+O), Kaydet (Ctrl+S), Farklı Kaydet (Ctrl+Shift+S), görüntüyü PNG
veya SVG olarak kaydet. Biçim `document/file-format.ts`:
`{ app: 'drAW2D', format: 1, objects, view }` JSON'u; başka nesnelerin paylaştığı
nesneler (bir doğru parçasının uç noktaları) `{ "$ref": kimlik }` olarak bir kez yazılır.
Açarken türler, kimlikler ve başvurular denetlenir; tanımlar yeniden hesaplanamazsa
belge değişmez. Açmak tek geçmiş adımıdır, görünüm de geri gelir. Masaüstünde dosyalar
yerel diyaloglarla açılıp kaydedilir (`window.drAW2DDesktop.files`, `file:*` IPC; ana
süreç yalnızca diyalogda seçilen yollara yazar); Chromium tabanlı tarayıcılarda File
System Access API ile aynı dosyaya kaydedilir, diğerlerinde indirme ve dosya seçici
kullanılır (`app/files.ts`, drAW3D ile aynı). Belge her değişiklikten bir saniye sonra
ve sayfa kapanırken tarayıcıya kaydedilir; açılışta son çalışma geri yüklenir ve geçmiş
oradan başlar (`GeometryDocument.reset`). PNG tuvalin kendisidir; SVG, çizicilerin
Canvas çağrılarının SVG'ye kaydedilmesiyle (`rendering/svg-context.ts`) vektör olarak
üretilir.

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

**Uygulandı (2026-10-25):** çözüm sayısı artınca kümeye yeni adlı noktalar eklenir
(`document/point-sets.ts`, aynı geçmiş adımında; en fazla 50), azalınca fazlası `∅`
olur. `Kök`, `Ekstremum`, `Dönüm`, `Kesiştir`, `İntegral` ve `Asimptot` fonksiyon adı
yerine ifade de alır; ifade önce olağan bir fonksiyon olarak çizilir. Arama aralığı
parametre olabilir. Ekstremum ve dönüm noktası parçalı fonksiyonlarda parça parça
türevle bulunur; türevin işaret değiştirdiği yerde fonksiyon sürekliyse köşe de
sayılır (`|x|`), kutup sayılmaz (`1/x²`). `Asimptot(f)` görünür aralıktaki kutupları
ve ıraksayan tanım uçlarını düşey, ±∞'daki doğruları yatay/eğik asimptot olarak
kesikli çizer ve kartında listeler; fonksiyon değişince yeniden hesaplanır.

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

**Uygulandı (2026-10-25):** `Yansıt`, `Döndür` ve `Ötele` doğru, doğru parçası, ışın,
vektör, denklemli doğru, çember, yay ve çokgeni de dönüştürür. Görüntü aynı türden bir
nesnedir (`a'`); noktaları kaynağın noktalarının görüntüsü olan gizli, adsız
yardımcılardır (noktası olmayan doğru ve yarıçaplı çember için gizli çapa noktaları),
kartı dönüşümü gösterir (`a': Döndür(a,b,M)`) ve döndürme açısı kaydırıcıdır.
Dönüşüm araçlarında ilk tıklama bir nesneyi de seçebilir. `Vektör(A,B)` ok olarak
çizilir, kartında bileşenleri vardır; `Ötele(nesne, vektör)` ve öteleme aracı vektör
kabul eder. `DüzgünÇokgen(A,B,n)` diğer köşeleri adlı noktalar olarak kurar (n
oluşturulurken sabitlenir, 3–30). Yeni araçlar: Vektör, Düzgün Çokgen ve Merkez ve
Yarıçap ile Çember (köşe sayısını ya da yarıçapı küçük bir pencerede sorar), Merkez ve
İki Noktadan Yay (`Yay(M,A,B)`, kartında uzunluk), Alan (`Alan(çokgen | çember)`) ve
Eğim (`Eğim(doğru)`, eğim üçgeniyle). Sınır: yaya ve vektöre nokta bağlanmaz,
yaylar kesiştirilmez.

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
  sürüklenerek ötelenmez. **Uygulandı (2026-10-25):** doğrular, vektörler, çemberler,
  yaylar, çokgenler, fonksiyon grafikleri, teğetler, parçalı fonksiyonlar, eğriler ve
  kapalı eğriler de iz bırakır (`app/traces.ts`); her değişen hali düzlem
  koordinatlarında saklanır (grafikler çizildikleri çoklu çizgi olarak), nesne başına
  150 000 köşeyle sınırlıdır. Parametreye veya başka fonksiyona dayanmayan bir
  fonksiyon grafiği sürüklenince `f(x − a) + b` olur; öteleme bir piksele yuvarlanır,
  ikinci sürükleme ilk ötelemeye eklenir, başlangıca dönünce ilk denklem geri gelir.

### Daha büyük işler

- Kapalı eğriler (`x^2+y^2=4`); ayrı bir çizim algoritması gerekir.
- Parametrik eğriler (`Eğri(cos t, sin t, t, 0, 2π)`), kutupsal grafikler,
  eşitsizlik bölgeleri.

**Uygulandı (2026-10-25):** x ve y içeren, `y = f(x)` ya da `x = c` olmayan her denklem
kapalı eğridir; görünür alan 6 piksellik ızgarada marching squares ile örneklenir, kenar
kesişimleri eğrinin üstüne iyileştirilir, kutup üstündeki işaret değişimi atlanır
(`geometry/implicit.ts`). Hücreden küçük ayrıntılar ve işaret değiştirmeyen eğriler
(`(x²+y²−1)² = 0`) görünmeyebilir. `Eğri(x(t), y(t), t, a, b)` ve
`Kutupsal(r(θ), a, b)` (ya da `r = 2sin(3θ)`) yarım piksel doğrulukla uyarlamalı
örneklenir. Eşitsizlik (`y<x^2`, `x^2+y^2<=4`, `x>1`, `≤`, `≥`) bölgeyi saydam tarar;
sınır kesin eşitsizlikte kesiklidir. Tek başına y (ya da x) içeren eşitsizlikler piksel
sütunlarıyla tam taranır, diğerleri ızgarayla. Bölge yalnız sınırından seçilir, böylece
üstünde düzlem kaydırılabilir. Hepsi parametre kullanabilir ve kartta yazıldığı gibi
görünür; π girişte de yazılabilir. Sınır: bu eğrilere nokta bağlanmaz, kesiştirilmez.

## Açık küçük işler

Kart silme simgesinin Electron'da görünmeme şüphesi incelendi (2026-10-23): Vite
yolu derlemede `../img/clear.svg` olarak yeniden yazıyor, simge `file://` altında
yükleniyor. Electron kontrolü artık CSS arka plan görsellerini de denetliyor.

- Tuvalin sol altındaki mADEMatik bağlantısı (madematik.com) kaldırıldı
  (2026-10-23); ileride uygun bir yere (örneğin yardım penceresi veya bir "Hakkında"
  bölümü) geri eklenecek. Eski işaretleme ve stil Git geçmişindedir.
- ~~Derlemede math.js kaynaklı "500 kB'tan büyük parça" uyarısı; kod bölme ilk
  açılışı hızlandırabilir.~~ **Uygulandı (2026-10-25):** math.js `create(all)` yerine
  yalnız giriş dilinin fonksiyonları, ayrıştırıcı, derleyici ve türevle kurulur; ayrı
  `mathjs` parçasıdır (386 kB, gzip 107 kB; önce bütün uygulama tek parçada 807 kB'tı,
  aynı kodla bölününce 554 kB). Uyarı kalktı; uygulama kodu değişince math.js parçası
  tarayıcı önbelleğinde kalır.
- Aralarında tanımsız noktalar olan çok seyrek tanımlı fonksiyonlarda (`x^x`,
  negatif taraf) çizgi tanımsız bölgenin üstünden geçebilir; düzeltmek her
  grafiğin maliyetini ikiye katlar.
- ~~Android/iOS paketleme: platform ve dağıtım yolu (mağaza, APK, PWA) kararı
  bekliyor.~~ Android uygulandı (2026-10-25), bkz. "Android paketi"; iOS beklemede.
- ~~**Matematik klavyesinin yüksekliği sabit olmalı (2026-10-25, kullanıcı notu,
  drAW3D'nin telefon denemesinden):** Sekmeler ("123", "f(x)", "abc", "Komutlar")
  arasında geçince klavyenin yüksekliği değişiyor; uzun sekmede giriş alanının üstü
  kapanıyor. Yükseklik sabit olsun, giriş alanı açık kalsın.~~ **Uygulandı
  (2026-10-25, drAW3D ile birlikte):** Bütün sekmeler beş satır yüksekliğinde; az satırlı
  sekmelerin tuşları uzar, komutlar sayfanın içinde kayar. Dar ekranda klavye açıkken
  alt panel uzar (`clamp(42%, 440px, 80%)`), giriş alanı klavyenin üstünde kalır. Test:
  `tests/math-keyboard.spec.ts` (dokunmatik ekran).
- **Logo/simge (2026-10-25, kullanıcı notu):** Şu anki simge y = x² grafiği gibi.
  Grafik yerine drAW2D'nin "W" harfi eksenler üzerinde çizilmiş gibi tasarlanabilir.
  Karar verilmedi; drAW3D'nin simgesi için de benzer bir not var (küpün içinde "AW").
  **Uygulandı (2026-10-25, kullanıcının "drAW3D aşamasına getirelim" isteğiyle):**
  drAW3D'de seçilen E taslağının ailesinden A taslağı — noktalar ve doğru parçalarıyla
  çizilmiş mavi A ve kırmızı W, oklu eksenler ve hafif ızgaralı bir koordinat düzleminde.
  Taslaklar kullanıcının masaüstünde (`drAW2D-logo-A/B/C`): B, ortada kesişen kırmızı
  eksenler üzerinde tek W; C, A'nın mavi kâğıtlı, harfleri x ekseninde duran biçimi.
  Kaynak `public/img/app-icon.svg`; web, masaüstü paketleri ve Android simgeleri
  `scripts/icons.sh` ile ondan üretilir. **Karar (2026-10-25, kullanıcı):** A kalır.

## Akıllı tahta bulguları (2026-10-28)

Yol 1: tahta dizüstünün ikinci ekranı (HDMI, 1920×1080), güncel kod `npm run dev` ile; tahtanın
dokunmatiği bu düzende çalışmadı (drAW `docs/tahta-test-notlari.md`). Kodlama kullanıcı onayı
bekliyor.

- **Kullanıcı bulgusu — tam ekranda ekran klavyesi açılmıyor.** drAW'da Linux tahta profilinde
  metin düzenlerken ETA Klavye / Onboard'u D-Bus ile açan köprü var
  (`src/platform/ScreenKeyboardBridge.ts`, `electron/screen-keyboard.ts`); drAW2D'de yok.
  **Kullanıcı kararı (2026-10-28):** ETA Klavye köprüsü yerine drAW2D'nin kendi matematik
  klavyesi her yerde kullanılır (tam ekranda da görünür; Pardus, Windows, Android, web aynı).
  **Uygulandı (2026-10-28):** klavye odaklanan her yazı alanına yazar (komut kutusu, düzenlenen
  kart, soru penceresi, yardım araması); modal soru penceresine ve yardım penceresine taşınır,
  kapanınca panele döner; ⏎ pencerede Tamam'a basar. Dokunmatik ekranda alan odaklanınca açılır —
  fare gibi tanıtılan tahta dokunmatiği de (`any-pointer: coarse` ya da `maxTouchPoints > 0`);
  kullanıcının kapattığı alanda yeniden açılmaz. `tests/math-keyboard.spec.ts` "akıllı tahta".
- **Kullanıcı bulgusu — eksen yardımcı çizgileri (ızgara) tahtada görünmüyor.** Ekran
  görüntüsünde de çok soluk.
- **Kullanıcı değerlendirmesi:** eksen sayıları, nokta adları ve ölçü etiketleri okunuyor;
  çizgiler, kartlar ve araç simgeleri sınıfın arkasından seçiliyor. Masaüstü boyutları
  tahtada yetiyor; ayrı bir tahta görünümü şimdilik gerekmiyor.
- **Gözlem (Claude):** otomatik renklerden bazıları soluk (sinüs açık gri aldı); beyaz
  zeminde soluk renk seçilmemesi düşünülebilir.
- **Ölçüm (masaüstü sürüm, tahtada, 2026-10-28):** `src/rendering/coordinate-grid.ts` ara
  çizgiler `#e8edf2` 0,6 px → zemine göre 1,1 : 1; birim çizgiler `#c7d0da` 0,9 px → 1,3 : 1;
  eksenler `#d94b4b` 1,6 px → 3,3 : 1 (ince çizgi için önerilen en düşük 3 : 1).
- **Öneri (ızgara):** birim çizgileri yaklaşık `#8f9cab` 1,2 px (≈ 3 : 1), ara çizgileri
  `#cfd7df` 0,8 px; ya da Görünüm menüsüne "Izgara: açık / koyu" seçeneği. **Uygulandı
  (2026-10-28):** birim `#8f9cab` 1,2 px, ara `#cfd7df` 0,8 px (`coordinate-grid.ts`
  `MAJOR_LINE`/`MINOR_LINE`; ekran ve SVG dışa aktarımı aynı renkleri kullanır).
- **Ekran klavyesi bulgusu bu düzende denenemedi:** dizüstünde ETA Klavye / Onboard yok,
  GNOME ekran klavyesi kapalı ve yalnız dokunmatik girişte açılıyor; tahtanın kendi
  bilgisayarında denenecek.
- **Kullanıcı bulgusu — üç noktadan çember çizerken ilk iki nokta arasında doğru parçası
  önizlemesi çıkıyordu** (açı aracıyla ortak önizleme). **Uygulandı (2026-10-28):** yalnız çember
  önizlenir; açı aracı kollarını çizmeye devam eder (`tests/app-tools.spec.ts`).
- **Yan bulgu:** komut kutusunda `A=(1,2)` "Matematik ifadesi okunamadı" diyor; noktalar
  `(1,2)` ile adsız girilip kendiliğinden ad alıyor. drAW3D `A=(1,2,3)` kabul ediyor.
  **Öneri:** `A=(1,2)` biçimini de kabul etmek.

## Paket yeniden derlemesi (2026-10-27)

Kullanıcı kararıyla v0.1.2'nin paketleri (Linux, Windows, Android) sürüm yükseltmeden `main`'in
`ed9a4ed` commit'inden yeniden derlenip yerine kondu (Actions → Sürüm paketleri → Run workflow).
Paketlerde birim çember aracı var; `v0.1.2` etiketi ise eski kodu (`3015973`) gösteriyor. Bir sonraki
sürüm (0.1.3) bu farkı kapatır.

## Android paketi

**İstek (2026-10-25, kullanıcı):** drAW2D de drAW3D'nin aşamasına getirilsin: Android
sürümü, logo, APK imza anahtarı.

**Uygulandı (2026-10-25):** drAW3D'deki Capacitor 8 projesi `android/` olarak alındı;
kararlar drAW3D yol haritasının A2 maddesindeki gibi (yalnız GitHub Releases, ileride
Play Store'a geçilebilecek biçimde; iOS beklemede).
- Kimlik `com.madematik.draw2d` (Electron'daki `AppUserModelId` ile aynı; Play Store'da
  yayımlanınca değişmez). Sürüm adı ve kodu `package.json`'dan (0.1.1 → 101), Android
  7.0+ (minSdk 24).
- Dosyalar Android'in belge seçicileriyle açılır ve kaydedilir (izin istemez, açılan
  dosyaya Kaydet aynı dosyaya yazar), PNG ve SVG aynı yolla. Kaydetmede önce yer
  sorulur, veri sonra yazılır; belge `application/octet-stream` türüyle kaydedilir, adı
  `.drw2` kalır (drAW3D'nin telefon denemesinde bulunan iki hata baştan yok). drAW2D'de
  yazdırma olmadığı için eklentide yazdırma yok.
- `.drw2` dosyasına dokununca drAW2D ile açılır (uygulama kapalıyken ve açıkken); açmak
  geri alınabilir.
- Geri tuşu önce açık olanı kapatır: aracın sorduğu değer penceresi, araç çubuğu ya da
  Dosya menüsü, yardım, matematik klavyesi, yarım çizim ya da araç, dar ekranda alt
  panel; sonra uygulamayı arka plana alır. Arka plana geçerken belge otomatik kaydedilir.
- Sürüm iş akışı ve `release-assets.mjs` drAW3D ile yine aynı dosya: Android işi APK'yı
  üretir, imzasını denetler, `drAW2D-android.apk` olarak yayımlar; sürüm notu ve
  `SHA256SUMS.txt` APK'yı içerir. İmza ortam değişkenleri iki projede ortak adlarla
  `ANDROID_KEYSTORE*` oldu (drAW3D eski `DRAW3D_*` adlarını da okur). drAW da aynı
  dosyayı kullanır.
- Yerelde test anahtarıyla imzalı APK derlendi ve denetlendi (`apksigner`, kimlik,
  sürüm, etiket, paketteki web dosyaları).

**İmza anahtarı (2026-10-25, kullanıcı kararı):** drAW3D ile aynı anahtar kullanılır;
ortak kullanıldığı için dosyanın adı `draw3d-release.jks` iken `draw-general-release.jks`
oldu (kullanıcının `~/Belgeler/drAW-anahtar/` klasöründe, yalnız sahibi okuyabilir). Ad imzayı ve
secret'ları etkilemez. Play Store'a geçişte bu anahtar iki uygulamanın da uygulama imza
anahtarı olur (Play buna izin verir); risk, kaybolursa ya da ele geçerse iki uygulamanın
birden etkilenmesidir. Anahtar dosyası drAW2D deposuna `ANDROID_KEYSTORE_BASE64` secret'ı
olarak yüklendi.

**Bekleyen:**
- Dört imza secret'ı drAW2D deposunda (2026-10-25). Kullanıcı aynı gün anahtarın takma
  adını (alias) değiştirdi; sertifika SHA-256 aynı kaldı, anahtar dosyası secret'ı iki
  depoda yenilendi, drAW3D'nin `ANDROID_KEY_ALIAS` secret'ı da güncellendi. Parolaların
  doğruluğu ilk Android derlemesinde (yayımlamadan çalıştırılabilir) görülecek.
- Sürüm yükseltme ve yayımlama drAW de aynı aşamaya gelince yapılacak (kullanıcı kararı,
  2026-10-25).
- Telefonda deneme yapıldı (aşağıda); bulunan 3 sorun karar bekliyor.
- drAW'ın iş akışı artık Android işi olan ortak kopya (2026-10-25); CLAUDE.md'deki
  "drAW'da Android işi yok" geçici istisna notu drAW gönderilince kaldırılabilir.

### Telefonda deneme (2026-10-25)

Xiaomi 2201116TG, Android 13, MIUI 14, sistem yazı ölçeği 1,5×; test anahtarıyla imzalı
APK, USB ile kuruldu (gerçek anahtarlı APK'dan önce kaldırılmalı).

**Çalışanlar:** açılış; matematik klavyesi (sistem klavyesi açılmıyor); `x^2` ve
`sin(x)` girişi, kart ve grafik; geri tuşu sırası (matematik klavyesi → alt panel →
arka plan); uygulama kapatılıp açılınca otomatik kayıttan geri yükleme; Kaydet (belge
seçicisi, `adsız.drw2` 282 bayt, geçerli içerik); Aç (seçiciden aynı dosya geri geldi,
geri alınabilir); PNG dışa aktarma (785×1646, doğru görüntü); iki parmakla yakınlaştırma
ve kaydırma; standart görünüm; `.drw2` dosyasını "görüntüle" isteğiyle açma (Android
"Şununla aç" seçicisinde drAW2D ilk sırada, yeni simgesiyle): uygulama açıkken ve
kapalıyken belge yüklendi.

**Bulunanlar (henüz düzeltilmedi):**
1. **Sistem yazı ölçeği bütün arayüz yazılarını büyütüyor.** Android WebView, yazı boyutu
   ayarını (bu telefonda 1,5×) sayfaya uyguluyor: 100 px'lik yazı 150 px oluyor (giriş
   alanı, kartlar, menüler, yardım). drAW'da düğme yazıları taştı ve metin düzenleyici
   tuvaldeki yazıdan büyük göründü; drAW'da `MainActivity.onCreate` içinde
   `getBridge().getWebView().getSettings().setTextZoom(100)` ile düzeltildi. drAW2D ve
   drAW3D için de aynı satır önerilir (drAW3D de aynı biçimde etkilenir).
2. **Yatay ekranda üst çubuk üst üste biniyor** (839×343 CSS px, alt panel yanda sütun):
   araç grupları ile işlem düğmeleri (Dosya, Geri al, Yinele, Sil, Standart görünüm)
   aynı yere çiziliyor; Dosya çokgen grubunun, Geri al çember grubunun üstünde.
   Ekran görüntüsü kullanıcının masaüstünde: `drAW2D-yatay-ust-cubuk.png`. Dikeyde
   (392 px) yalnız etkin araç ve işlemler görünüyor, sorun yok. Bkz. "Üst çubuk önerisi".
3. **Dosya menüsü telefonda klavye kısayollarını gösteriyor** (Ctrl+O, Ctrl+S,
   Ctrl+Shift+S); dokunmatik telefonda anlamsız. Android'de (ya da klavyesiz dokunmatik
   cihazda) gizlenmeli.
4. Android'in belge seçicisi kaydedilen dosyaları "0 B" gösteriyor; dosyalar diskte dolu
   (drAW3D'ninkiler de). Android'in medya dizini boyutu geç güncelliyor; uygulama hatası
   değil, işlem gerekmiyor.

### Üst çubuk önerisi (2026-10-25, kullanıcı isteği: önce öneri, uygulanmayacak)

Kullanıcı üst çubuğun iki satır ya da başka biçimde tasarlanmasını sordu; drAW3D yol
haritasındaki Y11 notuyla aynı konu (iki uygulama `main-toolbar.ts`'yi paylaşır, birlikte
değiştirilmeli). Seçenekler: iki satır, "⋯" menüsü, alt panel düğmesini panelin
tutamacına taşımak. Kullanıcı "⋯" menüsünün denenmesini istedi.

**Denendi (2026-10-25, drAW2D'de; drAW3D'ye henüz taşınmadı):** Çubuk sığmadığında
az kullanılan işlemler (Yardım, Standart Görünüm, Temizle, bu sırayla), sonra sondaki
araç grupları "⋯" menüsüne geçer; Dosya, Geri Al, Yinele, panel düğmesi ve ilk grup
(Taşı) hep çubukta kalır. "⋯" yalnız bir şey sığmadığında görünür; menüde işlemler ve
grup başlıkları altında araçlar durur; etkin araç menüdeyse "⋯" vurgulanır. Esc, dışarı
dokunuş ve Android geri tuşu menüyü kapatır. Genişlik değişince (pencere, yan panel)
yeniden hesaplanır. Sonuç: 1600/1100 px'de değişiklik yok; 839×343'te (yatay telefon,
panel açık) üst üste binme yok, 4 grup ve 3 işlem menüde; 360 px'de Yardım ve Standart
Görünüm menüde. `tests/toolbar-overflow.spec.ts` (7 test) ve bütün testler (281) geçti;
telefonda yatayda menüyü açma, parmakla kaydırma, araç seçme ve geri tuşu denendi.
**Bekleyen:** kullanıcının değerlendirmesi; beğenilirse drAW3D'ye taşınması (aynı
`main-toolbar.ts`/`toolbar.css`, drAW3D kendi `overflowActions` listesini verir).



## Akıllı tahta testleri — yöntem (2026-10-26)

**Kullanıcı kararı:** Projelerde biraz daha ilerledikten sonra yapılacak; gerekirse üç yol sırayla
denenir:

1. **HDMI + dokunmatik USB ile tahta bilgisayara bağlı:** tahta büyük bir dokunmatik ekran olur;
   `npm run dev` ile anında deneme. Dokunma, iki parmak, araç çubuğu, kalınlık/renk görünürlüğü
   için. drAW2D'de ayrı bir tahta modu yok; dokunuş kayarsa ekran yansıtılır ya da
   dokunmatik HDMI çıkışına eşlenir. Çizimi bilgisayar yaptığı için tahtadaki gecikmeyi göstermez.
2. **Tahtanın kendi bilgisayarında, kurmadan:** `npm run dev -- --host`, tahtanın tarayıcısında
   `http://<bilgisayar-IP>:5173/`. Gerçek tahta donanımında web sürümü; gecikme için. Aynı
   ağ gerekir (okul ağı ayırıyorsa telefon paylaşımı). Electron'a özgü işleri sınamaz.
3. **Kurulu paketle (.deb / AppImage):** ETAP'a özgü maddeler (ETA Klavye, ekran alıntısı, klasör
   bağı, paket davranışı) ve sürüm öncesi son kontrol.


## Noktayı küçük karelere yapıştırma (istek ve uygulama, 2026-10-31)

**Kullanıcı isteği:** Nokta seçerken nokta, koordinat düzlemindeki küçük karelere yapışsın; tam sayıya değil.
Kullanıcı kararları: her zaman yapışır (yalnız yakınken değil); açılıp kapanır; anahtar açıksa sürüklerken de
yapışır; fare, kalem ve parmakta çalışır; varsayılan açıktır; düğmenin simgesi mıknatıstır.

**Uygulama:**
- Nokta, ekranda çizili ince çizgilerin en yakın kesişimine gelir. Adım ızgaranın kendi ara adımıdır (büyük
  aralık / 5; `coordinate-grid.ts` `snapToGrid`, çizimle aynı hesap): yakınlaştırınca incelir, x ve y ayrı
  hesaplanır, π birimli x ekseninde π'nin katlarıdır. Değerler kayan nokta gürültüsü taşımaz (1,4; 1,4000…1 değil).
- Yalnız serbest nokta yapışır. Var olan nokta seçilir; nesne üzerine konan nokta nesnede kalır. Köşede zaten bir
  nokta varsa (yakalama sınırının dışında olsa da) yenisi açılmaz, o kullanılır. Araçların aldığı noktalar ve
  önizlemeleri aynı yoldan geçer (`pointCandidate`, `ToolInput.grid`).
- Sürükleme: serbest nokta köşeye oturur; şekil sürüklenirken yakalanan yere en yakın tanım noktası oturur, şekil
  onunla kayar, boyu bozulmaz. Denklemli doğru ve grafik tam kare adımlarla kayar. Nesneye bağlı nokta ve birim
  çemberin A'sı değişmez (`ObjectDrag.anchor`).
- Seçerken titreyen el: kareye oturmamış eski bir nokta tıklanınca oynamasın diye basılan yerden 3 piksel (parmakta
  8) uzaklaşılana kadar sürükleme başlamaz. Başlangıca dönülünce nokta eski kesin değerine döner.
- Mıknatıs düğmesi (`#gridSnap`, "Karelere Yapıştır", `public/img/magnet.svg`) Yinele'nin yanındadır; açıkken mavi ve
  vurguludur, basınca kısa bir bildirim çıkar. Tercih cihaza aittir (`drAW2D.gridSnap`, localStorage), dosyaya
  yazılmaz. Dar çubukta en son "⋯" menüsüne geçer, orada işaretli görünür. Eski dosyalardaki noktalar kaymaz.

**Doğrulama:** `tests/grid-snap.spec.ts` (14 test: hesap, fare, kalem, köşedeki nokta, nesne üzerindeki nokta, araçlar,
sürükleme, titreme, anahtar, kalıcılık); parmak `touch-integration` ve `toolbar` testlerinde. Tam koordinat bekleyen 8
test yeni değerlere çekildi, keskin konuma bağlı 2 `rendering` testi anahtar kapalı çalışır. Bütün testler (319) geçti.
Masaüstü ve telefon boyutunda ekran görüntüleriyle bakıldı. Gerçek tahtada denenmedi.


## Vektör işlemleri (istek, 2026-10-31, kodlanmadı)

**Kullanıcı isteği:** Vektörlerle işlem yapılabilsin; önce nasıl yapılacağı kararlaştırılacak.

**Bugünkü durum:** `Vektör(A,B)`, kartta bileşenler ve `Ötele(nesne, vektör)` var. `u+v`, `w=u+v`, `2u`, `u=(3,2)`,
`Uzunluk(u)`, `Açı(u,v)` yazımlarının hiçbiri nesne oluşturmuyor (denendi).

**Öneri (aşamalı):** (1) yazıyla doğrusal birleşim (`w=u+v`, `u-v`, `2u`, `a*u-v`), canlı sonuç vektörü; (2) sayısal
sonuçlar: uzunluk, iç çarpım, açı; (3) araç çubuğu ve uç uca / paralelkenar gösterimi. Sonuç vektörü mevcut görüntü
nesneleri gibi gizli yardımcı noktalarla kurulur, sürüklenmez.

**Karar bekleyenler:** sonucun başlangıç noktası; kapsam; aşama sırası; `u=(3,2)` yazımı; `A+u` yazımı; adlandırma.
