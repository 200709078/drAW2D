# GeoMatik2D

Tarayıcıda çalışan, kurulum gerektirmeyen **2B geometri ve fonksiyon çizim** uygulaması.

made by **mADEMatik** — [madematik.com](https://www.madematik.com)

İlgili proje: [GeoMatik3D](https://github.com/200709078/GeoMatik3D)

## Özellikler

- **Geometrik araçlar**: nokta, doğru, doğru parçası, çember (merkez + nokta / üç nokta), teğet çember, açı, yay ölçüsü
- **İşlemler**: kesiştir, yansıt (nokta), uzaklık ölç
- **Fonksiyon çizimi**: trigonometrik (`sin`, `cos`, `tan`, `cot`), üstel, logaritmik, parçalı fonksiyonlar
- **Analiz komutları**: `Türev`, `Limit`, `Bileşke`, `Teğet` / `TeğetH` / `TeğetX` / `TeğetC`, `Dizi`
- **İfade birleştirme**: daha önce çizilmiş fonksiyonlarla işlem (`2f/(1-3x)`, `3f-4g`, ...)
- **Geri al / yinele**, temizleme, standart görünüm
- **Radyal (dairesel) araç çubuğu** ve katlanır sağ panel
- **Yardım penceresi**: uygulama içi komut referansı

## Giriş dili örnekleri

```
(-1, 2)                      # nokta
2x-3                         # eğimli doğru
x=2                          # dik doğru
Doğru((-1,0),(1,1))          # iki noktadan doğru
Çember((0,0),(0,-2),(-2,0))  # üç noktadan çember
Uzaklık((-2,1),(-1,2))       # iki nokta arası uzaklık
YansıtNokta((1,2),(0,0))     # yansıtma
Kesiştir(f,g)                # iki nesnenin kesişimi
Türev(sin(x+1))              # türev
Limit(sin(2x-1),2)           # limit
Teğet(sin(2x-1),2)           # teğet doğrusu
Dizi(1/n,1,7)                # dizi değerleri
2x+1,x<0; x^2,x>=0           # parçalı fonksiyon
```

## Çalıştırma

 saf HTML/CSS/JS'tir; derleme adımı yoktur.

```bash
python3 -m http.server 8080
# veya
npx serve .
```

Sonra tarayıcıda `http://localhost:8080` adresini açın. `index.html` dosyasını doğrudan açmak da çalışır.

## Proje yapısı

```
GeoMatik2D/
├── index.html        # Arayüz kabuğu, yardım penceresi
├── js/
│   ├── app.js        # Çizim motoru ve komut yorumlayıcı
│   └── toolbar.js    # Radyal araç çubuğu tanımları
├── css/              # styles.css, toolbar.css
├── img/              # SVG araç simgeleri, favicon
├── sound/            # clear.mp3
└── vendor/           # math.js (yerel kopya)
```

## Teknoloji

- Vanilla JavaScript + `<canvas>`
- [math.js](https://mathjs.org/) — ifade çözümleme ve analiz (yerel kopya, `vendor/math.js`)
- Harici sunucu/CDN bağımlılığı yok, çevrimdışı çalışır.
