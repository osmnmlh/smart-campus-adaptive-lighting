# 📋 Proje Genel Teknik Şartnamesi & Kapsam
### IoT Tabanlı Adaptif Akıllı Kampüs Aydınlatma ve Arıza Tespit Sistemi
*(IoT-Based Adaptive Smart Campus Lighting and Fault Detection System)*

---

## 1. Projenin Amacı ve Çözülen Problem

Geleneksel açık alan aydınlatma sistemleri (sokak, otopark, kampüs yolları) genellikle gece boyunca sabit parlaklıkta çalışır. Bu durum:
- Ciddi oranda gereksiz enerji tüketimine,
- Işık kirliliğine ve yüksek karbon ayak izine,
- Erken lamba yıpranmasına ve yüksek bakım maliyetlerine yol açar.

Ayrıca klasik PIR sensörlü aydınlatmalar yalnızca sensörün tam altına girildiğinde lambayı aniden yakar; kullanıcının hareket yönünü kestiremediği için önündeki yol karanlık kalır ve güvenlik riskleri doğurur.

**Bu projenin amacı:**
Kullanıcı hareketinin yönünü tespit ederek **ilerleme istikametindeki lambaları önceden devreye alan (pre-lighting)**, ortam ışığına göre gündüz/gece modları arasında yumuşak geçiş yapan, elektriksel akım/güç ölçümüyle lamba arızalarını anında tespit eden ve merkezi ağa bağımlı kalmadan otonom çalışan bir IoT aydınlatma prototipi geliştirmektir.

---

## 2. Temel Sistem Gereksinimleri

- **Dağıtık ve Otonom Karar (Edge Autonomy):** Düğümler arasındaki yön bilgisi alışverişi internet veya Wi-Fi erişim noktası olmasa bile doğrudan **ESP-NOW** protokolü ile gerçekleşmelidir.
- **Yumuşak Parlaklık Geçişi (Soft PWM Dimming):** Lambalar aniden açılıp kapanmak yerine kademeli ve gözü yormayan yumuşak PWM geçişleri (fading) yapmalıdır.
- **Arıza Tespiti & Güç Analitiği:** Fiziksel bir akım sensörü (INA219) ile çekilen akım izlenmeli; açık devre (lamba patlaması/kopukluk) veya aşırı akım (kısa devre) durumları anında tespit edilerek bildirilmelidir.
- **Dijital İkiz & Canlı İzleme:** Web arayüzü üzerinden kampüs topolojisi, her bir lambanın anlık PWM seviyesi ve sistem arızaları WebSocket ile gecikmesiz görüntülenebilmelidir.

---

## 3. Sistem Mimarisi ve Katmanlar

Sistem dört ana katmandan oluşur:

1. **Saha Katmanı (Physical Edge Nodes):**
   - 3 adet ESP32 saha düğümü (`NODE_1`, `NODE_2`, `NODE_3`)
   - 5 adet bağımsız dimlenebilir 12V LED aydınlatma noktası (`L1` - `L5`)
   - 5 adet yön belirleyici kızılötesi hareket sensörü (`IR1` - `IR5`)
   - 1 adet I2C ortam ışığı sensörü (`BH1750`)
   - 1 adet I2C DC akım ve güç ölçüm sensörü (`INA219`)
2. **Ağ Geçidi Katmanı (Dedicated Gateway - `GW_1`):**
   - 4. bağımsız ESP32 kartı.
   - ESP-NOW üzerinden gelen little-endian sıkı binary paketleri çözer ve CRC-32 doğrulaması yapar.
   - SNTP ile UTC saat bilgisi ekleyerek MQTTS ile broker'a aktarır.
3. **Mesajlaşma ve Backend Katmanı (Broker & Application Server):**
   - Eclipse Mosquitto MQTT Broker (QoS 1, güvenli topic yapısı)
   - NestJS backend mimarisi (Deduplication motoru, liveness sweep, normalize domain olayları)
4. **Sunum Katmanı (Web Dashboard & Simulation):**
   - Next.js 15, React 19, modern CSS ile geliştirilmiş interaktif harita ve kontrol merkezi.

---

## 4. İlgili Belgeler ve Bağlantılar

| Doküman | Açıklama |
|---|---|
| [Ana README.md](../README.md) | Proje vitrini, ekran görüntüleri, mimari ve hızlı başlangıç |
| [Donanım Kılavuzu](../hardware/README.md) | Pin bağlantı şemaları, malzeme listesi ve elektriksel kurallar |
| [Firmware Dokümantasyonu](../firmware/README.md) | Gateway ve Node C++ PlatformIO derleme ve test rehberi |
| [Mimari Kararlar (ADR)](../dashboard/docs/architecture/) | Sistem mimarisi kararları (ADR-0001 - ADR-0005) |

---

**Proje Sahibi:** Osman Melih Gümüş  
**Bölüm:** Bilgisayar Mühendisliği  
**Odak Alanı:** Gömülü Sistemler, IoT Mimarileri ve Dağıtık Ağlar
