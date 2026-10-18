# Geçiş regresyon kontrolleri

İki temel Chromium testi arayüzü, Canvas çizimini ve geçmişi kontrol eder.
Ek komut matrisi; doğru, doğru parçası, çember, açı, uzaklık, yansıtma, kesişim,
limit, bileşke, teğet çeşitleri, dizi ve logaritma komutlarını bağımsız sayfalarda
çalıştırır. Beklenen kart metinleri değiştirilmemiş önceki uygulama sürümünden
ölçüldü. Rastgele nesne renkleri nedeniyle sabit ekran görüntüsü kullanılmaz;
Canvas içeriğinin çizimle değişmesi ve temizlemeyle başlangıca dönmesi denetlenir.

Matris mevcut davranışı korur. Örneğin eski sürümde `TeğetC(a,(3,2))` iki teğet
noktasına aynı `C` adını verir; fixture bu mevcut adlandırmayı aynen kaydeder.
Bu geçiş kontrolleri matematik motorunun doğruluğuna ilişkin yeni kurallar koymaz.

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
