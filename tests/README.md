# Geçiş regresyon kontrolleri

`geometry-models.spec.ts`, tarayıcı açmadan TypeScript modellerinin
geçici nesne kimlik/adlandırma davranışını, paylaşılan başvurularla geri alma
kopyalarını ve metin koordinatlarla kesişim bilgilerinin korunmasını denetler.

İki temel Chromium testi arayüzü, Canvas çizimini ve geçmişi kontrol eder.
Ek komut matrisi; doğru, doğru parçası, çember, açı, uzaklık, yansıtma, kesişim,
limit, bileşke, teğet çeşitleri, dizi ve logaritma komutlarını bağımsız sayfalarda
çalıştırır. Beklenen kart metinleri değiştirilmemiş önceki uygulama sürümünden
ölçüldü. Rastgele nesne renkleri nedeniyle sabit ekran görüntüsü kullanılmaz;
Canvas içeriğinin çizimle değişmesi ve temizlemeyle başlangıca dönmesi denetlenir.

Matris ilk geçişte kaydedilen örnekleri denetler. Örneğin eski sürümde `TeğetC(a,(3,2))` iki teğet
noktasına aynı `C` adını verir; fixture bu mevcut adlandırmayı aynen kaydeder.
Bu eski davranışlar zorunlu hedef değildir; doğruluk veya kullanım iyileştirmelerinde
beklentiler gerekçesiyle güncellenebilir.

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
