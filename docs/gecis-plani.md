# drAW2D altyapı geçişi

## İlk aşama: ortak çalışan uygulama

Geçiş aynı Git deposunda yapılır. Geçişten önceki uygulamanın geçici bir kopyası
oluşturuldu. Aynı 20 regresyon testi eski sürüm ve yeni üretim çıktısı
üzerinde çalıştırıldı; Electron açılışı da kontrol edildi. Karşılaştırma tamamlanınca
kullanıcının isteği doğrultusunda geçici kopya kaldırıldı. Geçiş öncesinde çalışma
alanında bulunan `css/styles.css` değişikliği yeni uygulamanın
`src/styles/styles.css` dosyasında korunmuştur.

Yeni uygulamanın giriş noktası `src/main.ts`, web derleyicisi Vite'dır. Araç çubuğu
ve matematik kütüphanesi yapılandırması TypeScript'tir. Mevcut geometri ve komut
yorumlama kodu `src/legacy/app.js` içinde ES modülü olarak çalışır. `allowJs: true`
mevcut JavaScript ile yeni TypeScript modüllerini birlikte kullanmamızı sağlar.
TypeScript dosyaları `strict` denetiminden geçer; JavaScript motorunun henüz bu
denetimden geçtiği iddia edilmez.

Motorun ES modülüne uyarlanmasında örtük global değişkenler açıkça tanımlanır,
HTML içindeki olay bağları `addEventListener` ile kurulur. Matematik algoritmaları,
arayüz düzeni, komutlar ve araçların davranışı korunur. math.js sürümü 15.2.0 olarak
sabitlenir; eski `log(a, b)` özelleştirmesi aynen uygulanır.

Masaüstü kabuğu `electron/main.ts` dosyasından `dist-electron/main.js` olarak
derlenir. Electron geliştirmede yerel Vite sunucusunu, üretimde `dist/index.html`
dosyasını açar. Ortak arayüze Node.js erişimi verilmez. Gerektiğinde dosya
açma/kaydetme gibi işletim sistemi işlemleri ayrı bir preload/IPC katmanından
sunulacaktır; geometri kodu doğrudan Electron'a bağlanmayacaktır.

## Sonraki taşıma sırası

Her adımda önce ilgili davranış mevcut uygulamada doğrulanır; modül taşındıktan sonra
aynı örnekler webde ve Electron'da çalıştırılır. Eski sürümden ölçülmüş test çıktıları
davranış karşılaştırmasının temelidir.

1. Geometrik nesne tipleri, kimlikler ve nesneler arası başvurular.
2. Saf geometri hesaplamaları: kesişim, uzaklık, yansıtma ve teğetler.
3. Komut yorumlayıcı, fonksiyon çözümleme ve matematik işlemleri.
4. Belge durumu ve geri al/yinele geçmişi.
5. Canvas çizimi ve koordinat/görünüm dönüşümleri.
6. Giriş olayları ve arayüz bağları; motorun kalan JavaScript kodunun kaldırılması.
7. Dokunma/kalem desteği, çoklu dokunmayla yakınlaştırma ve mobil ekran düzeni.
8. Mobil paketleme ihtiyacı netleştiğinde Android/iOS katmanı.

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
