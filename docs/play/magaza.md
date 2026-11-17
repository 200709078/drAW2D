# drAW2D — Google Play mağaza kaydı

Play Console'a girilecek metinler ve görseller. Görseller `npm run play:gorseller` ile yeniden üretilir
(uygulamanın görünüşü değişince). Sınırlar Play'in sınırlarıdır; `node scripts/play/sinirlar.mjs` metinlerin
sığdığını denetler.

## Ayrıntılar

- **Uygulama adı** (en çok 30 karakter):

<!-- ad -->
drAW2D: Geometri ve Grafik
<!-- /ad -->

- **Kısa açıklama** (en çok 80 karakter):

<!-- kisa -->
Fonksiyon grafikleri, geometri ve vektörler; Türkçe komutlarla. Reklamsız.
<!-- /kisa -->

- **Tam açıklama** (en çok 4000 karakter):

<!-- tam -->
drAW2D, matematik derslerinde fonksiyon grafiği ve geometri çizimi için tasarlanmış bir uygulamadır. Telefonda, tablette ve sınıftaki akıllı tahtada çalışır. Reklam yoktur, hesap istemez, hiçbir veri toplamaz.

• Fonksiyonlar: x^2-2x-3 ya da 2sin(x) yazın, grafik hemen çizilsin. Kökler, ekstremum ve dönüm noktaları, kesişimler, türev, teğet, belirli integral ve limit.
• Parçalı fonksiyonlar, kapalı eğriler (x²+y²=4), eşitsizlik bölgeleri, parametrik ve kutupsal eğriler.
• Geometri: nokta, doğru, doğru parçası, ışın, çokgen, düzgün çokgen, çember, yay; dik ve paralel doğru, orta dikme, açıortay, orta nokta, açı, uzaklık ve alan.
• Dönüşümler: yansıtma, döndürme ve öteleme.
• Vektörler: toplama, çıkarma, sayıyla çarpma, uzunluk, iç çarpım, açı ve bileşenlere ayırma.
• Birim çember: açıyı sürükleyin, sinüs, kosinüs ve tanjant değerlerini görün.
• Kaydırıcılar: a=2 yazın, kaydırıcıyla değiştirin; ona bağlı her şey anında güncellenir.
• Türkçe komutlar: Çember((0,0),2), Kesiştir(f,g), Kök(f)… Matematik klavyesi ve komut önerileri yazmayı kolaylaştırır.
• Araç çubuğu: çizimleri dokunarak ya da fareyle de kurabilirsiniz; ızgaraya yapışma, geri al ve yinele.
• Dosyalar: çizimi .drw2 olarak kaydedin, PNG ya da SVG görüntü olarak dışa aktarın. Çalışmanız kendiliğinden saklanır.
• İki parmakla yakınlaştırın ve kaydırın.

Gizliliğiniz önce gelir
Çizimleriniz yalnızca cihazınızda işlenir; hiçbir şey internete ya da bir sunucuya gönderilmez.

Her yerde aynı uygulama
drAW2D'nin Linux (Pardus dahil) ve Windows sürümleri ile tarayıcıda çalışan web sürümü de vardır: madematik.com/drAW2D
Kardeşleri: drAW (akıllı tahta ve çizim) ve drAW3D (3B geometri ve cisim açınımları).

drAW2D ücretsizdir. Öneri ve sorunlar için: destek@madematik.com
<!-- /tam -->

## Kategori ve iletişim

- **Uygulama mı, oyun mu:** Uygulama
- **Ücretli mi, ücretsiz mi:** Ücretsiz
- **Kategori:** Eğitim
- **Etiketler (öneri):** Eğitim, Araçlar, Verimlilik (Play'in listesinden en yakınları seçilir). (Play'in listesinden en yakınları seçilir).
- **E-posta (herkese açık):** destek@madematik.com
- **Web sitesi:** https://madematik.com
- **Telefon:** boş bırakılır (isteğe bağlı).
- **Gizlilik politikası:** https://madematik.com/drAW2D/gizlilik.html (kaynağı `public/gizlilik.html`)

## Uygulama içeriği beyanları (öneri; awPDF'te verilen cevaplarla aynı mantık)

- **Veri güvenliği:** Veri toplanmıyor, paylaşılmıyor. Paket yalnız Capacitor'ın standart internet iznini taşır;
  uygulama ağa veri göndermez (yalnız Hakkında'daki bağlantılar tarayıcıda açılır).
- **Reklam:** Reklam yok.
- **Uygulama erişimi:** Bütün işlevler herhangi bir giriş olmadan kullanılabilir.
- **İçerik derecelendirmesi:** Anket "eğitim / araç" uygulaması olarak doldurulur; şiddet, kumar, kullanıcılar arası
  iletişim yok.
- **Hedef kitle:** awPDF'te seçilenle aynı yaş grupları.
- **Satıcı statüsü:** Hesap düzeyinde "tacir değil" olarak zaten beyan edildi (2026-11-07, awPDF).
- **Yapay zekâ beyanı:** awPDF'te seçilenle aynı.

## Sürüm notları ("Bu sürümdeki yenilikler", en çok 500 karakter)

Play Console'da sürüm oluşturulurken `<tr-TR>` ile `</tr-TR>` arasına yazılır. En yenisi üstte.

### 0.1.8

<!-- not-0.1.8 -->
Formüller kartlarda kitaptaki gibi yazılırken ilk harf dokunmatik ekranda renk düğmesinin altında kalıyordu; düzeltildi. Fare tekerleğiyle uzaklaşınca x ekseni artık e'nin katlarına geçmez, iki eksen aynı adımlarla ilerler.
<!-- /not-0.1.8 -->

### 0.1.7

<!-- not-0.1.7 -->
Google Play'deki ilk sürüm. Fonksiyon grafikleri, kökler ve kesişimler, geometri çizimleri, dönüşümler, vektörler ve birim çember; Türkçe komutlar ve matematik klavyesi. Reklam yok, hiçbir veri toplanmaz.
<!-- /not-0.1.7 -->

## Görseller (`docs/play/`)

| Play alanı | Dosya | Ölçü |
|---|---|---|
| Uygulama simgesi | `simge-512.png` | 512×512 |
| Öne çıkan görsel | `one-cikan-1024x500.png` | 1024×500 |
| Telefon ekran görüntüleri | `ekran/telefon-1…4-*.png` | 1080×2160 |
| 7 inç tablet ekran görüntüleri | `ekran/tablet7-1…3-*.png` | 1200×1920 |
| 10 inç tablet ekran görüntüleri | `ekran/tablet10-1…3-*.png` | 2560×1600 |

Ekran görüntülerindeki çizimler betiğin giriş satırına yazdığı komutlarla kurulur (`scripts/play/gorseller.mjs`);
kullanıcının çizimleri kullanılmaz.
