# mungo

Abidin ile okuma günlüğü. Bu klasörün tamamı GitHub Pages'e yüklenir.

## Dosyalar

- `index.html`: uygulamanın kendisi
- `manifest.webmanifest`: telefona "uygulama olarak kur" bilgisi (ad, renk, ikonlar)
- `sw.js`: uygulamanın internetsiz açılmasını sağlayan service worker
- `icons/`: ana ekran ikonları

## Güncelleme yaparken

`index.html` her değiştiğinde `sw.js` dosyasının en üstündeki `VERSION` satırındaki numarayı bir artır (örneğin `mungo-v22` → `mungo-v23`). Böylece telefonlar yeni sürümü indirir.

Kullanıcı verileri (kitaplar, kayıtlar, notlar) sunucuda değil, her kullanıcının kendi tarayıcısında durur. Yeni sürüm yüklemek bu verileri silmez.
