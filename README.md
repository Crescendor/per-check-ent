# Ofis Giriş & Yoklama Paneli (Tablet Kiosk)

Bu proje; ofis girişlerinde konumlandırılan bir tablet aracılığıyla çalışanların giriş ve çıkışlarını NFC kartlar üzerinden takip etmeyi sağlayan, modern ve şık bir tablet kiosk ve yoklama yönetim sistemidir.

---

## 🌟 Öne Çıkan Özellikler

- **Modern Glassmorphism Dark Arayüz:** Göze hoş gelen derin karanlık tema ve buzlu cam efektleri.
- **NFC Kart Entegrasyonu:** Gerçek Web NFC API (`NDEFReader`) desteği.
- **Akıllı Karşılama Ekranı:** Giriş/çıkış yapan çalışanlar için 7 saniye süreli, geriye sayım animasyonlu karşılama ekranı.
- **Web Audio API Ses Desteği:** Giriş, çıkış ve hata durumları için sentezlenmiş melodi ve sesli bildirimler.
- **Çoklu Sekme Eşzamanlaması (Real-time Sync):** Kiosk ekranında kart okutulduğunda, diğer sekmelerde açık olan Lider veya Admin panellerinin sayfa yenilenmeden anlık güncellenmesi.
- **Yönetici (Admin) Paneli:**
  - Çalışan Ekleme / Düzenleme / Silme
  - NFC Kart Eşleştirme Akışı (Çalışana kart atama)
  - Takım (Departman) Yönetimi
  - Takım Lideri Hesapları Tanımlama
  - Giriş / Çıkış Log Dökümü
- **Lider Paneli:**
  - Liderlerin sadece kendi takımlarının anlık ofiste bulunma durumunu canlı (yeşil/gri halkalarla) takip edebilmesi.

---

## 🚀 Kurulum ve Çalıştırma

### Yerel Ortamda Çalıştırma

1. Proje dizininde bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
3. Tarayıcınızdan terminalde belirtilen adresi (varsayılan: `http://localhost:5173`) açın.

### Canlı Ortamda Çalıştırma (Production)

Proje, herhangi bir sunucuda kolayca barındırılabilmesi için yerleşik bir Node.js HTTP sunucusu (`server.js`) barındırır.
1. Sunucuyu başlatmak için:
   ```bash
   npm start
   ```

---

## ☁️ Bulut Yayını (Railway vb.)

Uygulama, Railway ve benzeri bulut platformlarında çalışmaya hazır şekilde yapılandırılmıştır. Projeyi doğrudan GitHub deponuza bağlayıp Railway üzerinde **"New Project" -> "Deploy from GitHub repo"** adımlarını izleyerek yayına alabilirsiniz. Railway, `package.json` içindeki `start` scriptini otomatik olarak algılayacaktır.
