# Paket simgeleri

Linux PNG dosyaları ve Windows `icon.ico`, uygulamanın mevcut
`public/img/favicon.svg` simgesinden rasterleştirildi. Yeni bir logo tasarlanmadı.
Bu dosyalar kaynak kontrolünde tutulur; normal derleme ImageMagick gerektirmez.

Simge değiştirildiğinde ImageMagick ile yeniden üretme örneği:

```sh
magick -background none public/img/favicon.svg -resize 512x512 build/icons/512x512.png
for size in 16 24 32 48 64 128 256; do
  magick build/icons/512x512.png -resize "${size}x${size}" "build/icons/${size}x${size}.png"
done
magick build/icons/256x256.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
cp build/icons/512x512.png public/img/app-icon.png
```
