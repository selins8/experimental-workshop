# WebXR Quest 3 · 1:70 Hand Tracking Locomotion

Meta Quest 3 (WebXR Native Hand Tracking) ve masaüstü tarayıcılar (MediaPipe Hand Landmarker) için geliştirilmiş, build gerektirmeyen, GitHub Pages uyumlu 1:70 mimari ölçekli VR navigasyon sistemi.

## 1:70 Ölçek ve Birinci Şahıs Perspektifi Nasıl Çalışır?

- **Ölçek oranı:** `1 / 70`
- **Referans insan boyu / göz yüksekliği:** `1.70 m` / `1.60 m`
- **1:70 maket biriminde göz yüksekliği:** `1.60 / 70 ≈ 0.02286` birim

WebXR'da kamerayı veya head pose verisini `1/70` ile çarpmak, kullanıcının gerçek gözler arası mesafesini (IPD) ve fiziksel baş hareketlerini bozar. Bunun yerine:
1. `playerRig` ve XR kamerası **1:1 gerçek dünya metrelerinde** tutulur (Quest 3'ün doğal `local-floor` baş takibi ve göz yüksekliği aynen korunur).
2. 1:70 ölçekli mimari maketi taşıyan `modelRoot` grubu `70×` büyütülür (`modelRoot.scale.setScalar(70)`).
3. Böylece 1:70 maket içindeki 3 metrelik bir mekan (`0.04286` birim), VR gözlüğünde tam olarak 3 metre yüksekliğinde ve doğal insan gözü perspektifinde deneyimlenir.

## El Hareketleri (VR & Masaüstü Ortak)

- **Başparmak + İşaret Parmağı Pinch:** İleri yürüme (başın yatay bakış yönünde)
- **Başparmak + Serçe Parmak Pinch:** Sağa dönüş (Dünya Y ekseni)
- **Başparmak + Yüzük Parmağı Pinch:** Sola dönüş (Dünya Y ekseni)
- **Pinch Bırakma / El Kaybı:** Anında durma

## GitHub Pages Üzerinden Yayınlama

1. Depoyu GitHub'a yükleyin (`index.html` kök dizinde olacak şekilde).
2. GitHub repo ayarlarından **Settings → Pages → Build and deployment** bölümünde `Deploy from a branch` ve `main / (root)` seçin.
3. Oluşan `https://<kullanici>.github.io/<repo>/` bağlantısını açın.
