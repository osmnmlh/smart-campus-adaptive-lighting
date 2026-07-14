# Smart Campus Adaptive Lighting Dashboard

Akıllı Kampüs Adaptif Aydınlatma Sistemi için geliştirilecek gerçek zamanlı izleme, hata yönetimi, enerji analizi ve kontrol dashboard’u.

> **Proje durumu:** Planlama ve sistem mimarisi belirleme aşaması
> **MVP kapsamı:** 3 aktif ESP32 node, 5 aydınlatma noktası ve mock telemetri verileri
> **Geliştirme yaklaşımı:** Local-first, cloud-ready
> **Ana dil:** Türkçe
> **Proje sahibi:** Osman Melih Gümüş
> **Öğrenci No:** 1030521449

---

## 1. Proje Hakkında

Bu dashboard, kampüs, otopark, endüstriyel alan, şehir parkı ve benzeri açık alanlarda kullanılabilecek adaptif aydınlatma sisteminin izlenmesi ve yönetilmesi amacıyla planlanmaktadır.

Sistem; hareket yönü, node sağlığı, lamba parlaklığı, haberleşme durumu, akım ölçümleri, hata kayıtları ve çalışma modları gibi bilgileri gerçek zamanlı olarak kullanıcıya sunacaktır.

Dashboard’un yalnızca bir veri görselleştirme ekranı olması hedeflenmemektedir. Sistem aynı zamanda:

* Node ve lamba sağlığını izlemeli,
* Sorunları kritiklik seviyesine göre sınıflandırmalı,
* Haberleşme problemlerini tespit etmeli,
* Enerji tüketimini ve akım dalgalanmalarını göstermeli,
* Manuel ve zamanlanmış kontrol imkânı sağlamalı,
* Güvenli çalışma modunu izlemeli,
* Bakım ve troubleshooting süreçlerine destek olmalıdır.

---

## 2. MVP Sistem Mimarisi

MVP prototipinde toplam 3 aktif ESP32 node ve 5 aydınlatma noktası bulunacaktır.

```text
Node-1                    Node-2                    Node-3
L1 ─── L2          ←→       L3       ←→          L4 ─── L5
IR1   IR2                   IR3                   IR4   IR5
```

### Node görevleri

| Node   | Kontrol ettiği lambalar | Sensörler     | Temel görev                                  |
| ------ | ----------------------- | ------------- | -------------------------------------------- |
| Node-1 | L1 ve L2                | IR1 ve IR2    | Sol bölgedeki giriş ve yön tespiti           |
| Node-2 | L3                      | IR3 ve BH1750 | Merkez geçiş doğrulama ve ortam ışığı ölçümü |
| Node-3 | L4 ve L5                | IR4 ve IR5    | Sağ bölgedeki giriş ve yön tespiti           |

Node-1 ve Node-3 hareket yönünü sensörlerin tetiklenme sırasına göre belirleyecektir.

Node-2 üzerindeki IR3 sensörü yön tespiti için değil:

* Merkez geçiş doğrulama,
* Duran nesne tespiti,
* L3 bekleme süresi yönetimi,
* Hareketin gerçekten orta bölgeye ulaşıp ulaşmadığının kontrolü

amacıyla kullanılacaktır.

---

## 3. Önerilen Teknoloji Altyapısı

| Katman                  | Teknoloji                   | Kullanım amacı                                     |
| ----------------------- | --------------------------- | -------------------------------------------------- |
| Frontend                | Next.js                     | Dashboard arayüzü ve sayfa yapısı                  |
| Programlama dili        | TypeScript                  | Frontend ve backend için tip güvenliği             |
| UI altyapısı            | React                       | İnteraktif kullanıcı arayüzü                       |
| Node topolojisi         | React Flow                  | Node ve bağlantı haritası                          |
| Grafikler               | Apache ECharts              | Akım, güç, lux ve telemetri grafikleri             |
| Backend                 | NestJS                      | API, iş kuralları, alarm motoru ve veri işleme     |
| Gerçek zamanlı iletişim | WebSocket                   | Backend ile dashboard arasında canlı veri aktarımı |
| Cihaz haberleşmesi      | MQTT                        | Gateway ve backend arasındaki telemetri aktarımı   |
| MQTT broker             | Eclipse Mosquitto           | MQTT mesajlarının dağıtılması                      |
| Veri tabanı             | PostgreSQL                  | Node, hata, telemetri, log ve kullanıcı verileri   |
| Konteyner altyapısı     | Docker Compose              | Servislerin birlikte çalıştırılması                |
| Mock veri               | TypeScript Scenario Service | Gerçek ESP32 bağlanmadan veri simülasyonu          |

---

## 4. Genel Veri Akışı

```text
ESP32 Node'lar
      │
      │ ESP-NOW
      ▼
Gateway / Merkez Kontrolcü
      │
      │ MQTT
      ▼
Eclipse Mosquitto
      │
      ▼
NestJS Backend
      ├── Telemetri işleme
      ├── Alarm ve hata motoru
      ├── Node sağlık kontrolü
      ├── Zamanlama servisi
      ├── Loglama
      └── PostgreSQL
              │
              │ WebSocket
              ▼
         Next.js Dashboard
```

Planlama ve frontend geliştirme aşamasında fiziksel ESP32 cihazlarının yerine mock veri servisi kullanılacaktır.

İlk UI MVP deterministic mock data ile çalışacaktır. Gerçek ESP32 bağlantısı, production MQTT
ingestion ve PostgreSQL persistence bu aşamanın kapsamı dışındadır; bunlar için yalnızca ileride
değiştirilebilir interface ve adapter sınırları korunacaktır.

```text
Mock Scenario Service
          │
          │ MQTT
          ▼
      Mosquitto
          │
          ▼
       NestJS
          │
          │ WebSocket
          ▼
      Dashboard
```

---

## 5. Dashboard Sayfaları

### 5.1 Genel Bakış

Kullanıcı sisteme giriş yaptığında tüm sistemi tek bakışta anlayabilmelidir.

Ana ekranda gösterilecek bilgiler:

* Sistem çalışma modu
* Toplam node sayısı
* Online ve offline node sayısı
* Sağlıklı, uyarı ve kritik durumdaki node sayısı
* Aktif hata sayısı
* En kritik sorunlar
* L1-L5 parlaklık seviyeleri
* Son algılanan hareket yönü
* Aktif aydınlatma koridoru
* Anlık toplam akım
* Tahmini güç tüketimi
* Son telemetri zamanı
* Son sistem olayları

Örnek özet:

```text
Sistem Modu          AUTO_ADAPTIVE
Node Durumu           3 / 3 Online
Kritik Hata           0
Aktif Uyarı           2
Anlık Akım            0.84 A
Son Hareket           Soldan sağa
```

---

### 5.2 Topoloji ve Node İzleme

Node’lar ve lambalar yatay bir saha topolojisi üzerinde gösterilecektir.

```text
L1 ─── L2 ─── L3 ─── L4 ─── L5
```

Node bağlantıları üzerinde şu bilgiler görselleştirilecektir:

* Bağlantının sağlıklı olup olmadığı
* Aktif mesaj aktarımı
* Son mesajın yönü
* Paket kaybı
* Gecikme
* Heartbeat durumu
* CRC veya checksum hatası
* Node’un son görülme zamanı

Bağlantı çizgileri:

| Gösterim      | Anlam                     |
| ------------- | ------------------------- |
| Düz çizgi     | Bağlantı sağlıklı         |
| Kesikli çizgi | Bağlantı kararsız         |
| Kopuk çizgi   | Haberleşme yok            |
| Hareketli ok  | Aktif veri aktarımı       |
| Uyarı simgesi | Paket veya gecikme sorunu |

---

### 5.3 Node Hover Bilgileri

Kullanıcı bir node veya lambanın üzerine geldiğinde kısa bilgi kartı gösterilecektir.

Örnek:

```text
L3 / Node-2

Durum: Sağlıklı
Parlaklık: %60
Mod: Ön aydınlatma
Son hareket: 4 saniye önce
Sensör: Pasif
Son paket: Node-1'den alındı
Akım: 0.18 A
```

Hover kartı yalnızca hızlı özet bilgileri içerecektir.

---

### 5.4 Node Detay ve Komşuluk Görünümü

Kullanıcı bir node’a tıkladığında ayrıntı paneli açılacaktır.

Örneğin L3 seçildiğinde:

```text
L2 ←→ L3 ←→ L4
```

Aşağıdaki bilgiler gösterilecektir:

* Seçilen node’un ayrıntılı sağlık durumu
* Kontrol ettiği lambalar
* Mevcut ve hedef parlaklık
* Sensör durumu
* Son hareket zamanı
* Son alınan mesaj
* Son gönderilen mesaj
* L2-L3 bağlantı sağlığı
* L3-L4 bağlantı sağlığı
* Paket kaybı
* Ortalama gecikme
* Son heartbeat
* Akım ve güç bilgileri
* Aktif hata ve uyarılar
* Son node logları

Kullanıcı bütün sistemi görmek yerine yalnızca seçilen node ve yakın komşularına odaklanabilecektir.

---

### 5.5 Hatalar ve Sorunlar

Hatalar için ayrı bir sayfa bulunacaktır.

Ana sayfada da aktif kritik hata ve uyarılar görünmeye devam edecektir.

Her hata kaydında aşağıdaki alanlar bulunmalıdır:

* Hata ID
* Hata kodu
* Kritiklik seviyesi
* İlgili node
* İlgili lamba
* Hata açıklaması
* İlk görülme zamanı
* Son görülme zamanı
* Tekrar sayısı
* Mevcut durum
* Olası neden
* Önerilen işlem
* Çözülme zamanı
* Çözüm açıklaması

#### Kritiklik seviyeleri

| Seviye | Açıklama                                  |
| ------ | ----------------------------------------- |
| Bilgi  | Normal sistem olayı                       |
| Uyarı  | Sistem çalışıyor ancak izlenmeli          |
| Kritik | Node, sensör veya lamba düzgün çalışmıyor |
| Acil   | Güvenli çalışma garanti edilemiyor        |

Örnek hata:

```text
Kritiklik: Kritik
Node: Node-3
Lamba: L5
Hata: CURRENT_TOO_LOW
Açıklama: %100 parlaklık komutuna rağmen akım algılanamadı.
Olası neden: LED, MOSFET veya kablo bağlantısı.
Önerilen işlem: L5 güç ve MOSFET hattını kontrol edin.
```

---

### 5.6 Enerji ve Akım İzleme

Akım sensöründen gelen değerler zaman serisi grafikleriyle gösterilecektir.

Gösterilecek veriler:

* Anlık akım
* Minimum akım
* Maksimum akım
* Ortalama akım
* Anlık gerilim
* Anlık güç
* Beklenen minimum akım
* Beklenen maksimum akım
* Akım dalgalanması
* Son akım anomalisi
* Akım kesilmesi
* Beklenmeyen yüksek akım
* Parlaklık ve akım ilişkisi

Örnek:

```text
L3 Parlaklık: %100
Beklenen Akım: 0.15-0.22 A
Ölçülen Akım: 0.03 A
Durum: Kritik
```

Grafikte gerçek ölçüm ile beklenen alt ve üst sınırlar birlikte gösterilecektir.

---

### 5.7 Olay ve Sistem Logları

Log kayıtları yapılandırılmış şekilde tutulacaktır.

Her log kaydında:

* Log ID
* Zaman
* Node ID
* Lamba ID
* Olay türü
* Kritiklik
* Açıklama
* Önceki değer
* Yeni değer
* Mesaj kaynağı
* Hata kodu
* İşlemi gerçekleştiren kullanıcı
* Otomatik veya manuel işlem bilgisi

bulunacaktır.

Log filtreleri:

* Tarih aralığı
* Node
* Lamba
* Kritiklik
* Olay tipi
* Aktif veya çözülmüş
* Otomatik veya manuel işlem

Örnek:

```text
14:32:08
Node-2 / L3
LIGHT_STATE_CHANGE
Bilgi
Parlaklık %30'dan %60'a yükseltildi.
Kaynak: Node-1 PRE_LIGHT mesajı
```

---

### 5.8 Kontrol ve Zamanlama

Kullanıcı otomatik sistemi geçici olarak devre dışı bırakabilmelidir.

Kontrol seçenekleri:

* Otomatik adaptif mod
* Manuel kontrol
* Zamanlanmış çalışma
* Bakım modu
* Güvenli çalışma modu
* Bütün lambaları aç
* Bütün lambaları kapat
* Tek lamba parlaklığı belirleme
* Belirli süreli manuel override

Örnek zamanlama:

```text
19:00 → Bütün lambaları %30 seviyesinde aç
23:00 → Adaptif moda geç
06:30 → Lambaları kapat
```

Manuel override seçenekleri:

* 15 dakika
* 30 dakika
* 1 saat
* Bir sonraki programa kadar
* Kullanıcı kapatana kadar

Her manuel işlem audit log’a kaydedilmelidir.

---

### 5.9 Ayarlar

Ayarlar sayfasında aşağıdaki sistem parametreleri yönetilebilecektir:

* Gündüz/gece lux eşikleri
* Bekleme parlaklığı
* Ön aydınlatma parlaklığı
* Aktif aydınlatma parlaklığı
* Hold süresi
* Fade süresi
* Sensör timeout süresi
* Heartbeat aralığı
* Node offline timeout süresi
* Paket tekrar sayısı
* Akım alt sınırı
* Akım üst sınırı
* Alarm eşikleri
* Fail-safe davranışları

---

## 6. Node Sağlık Durumları

Node durumları yalnızca renkle gösterilmeyecektir.

Her durum:

* Renk,
* Simge,
* Yazılı etiket,
* Çerçeve biçimi

ile birlikte gösterilecektir.

| Durum    | Renk              | Simge           | Etiket       |
| -------- | ----------------- | --------------- | ------------ |
| Sağlıklı | Yeşil veya mavi   | Onay işareti    | Sağlıklı     |
| Uyarı    | Sarı veya turuncu | Ünlem           | Uyarı        |
| Kritik   | Kırmızı           | Çarpı           | Kritik       |
| Offline  | Gri               | Kopuk bağlantı  | Bağlantı yok |
| Bakım    | Mor veya mavi     | Anahtar simgesi | Bakım        |

Renk körlüğü olan kullanıcılar için sistem yalnızca yeşil-sarı-kırmızı renk ayrımına bağlı olmayacaktır.

---

## 7. Haberleşme Bütünlüğü

Checksum veya CRC kontrolü tek başına yeterli kabul edilmeyecektir.

Haberleşme sağlığı aşağıdaki mekanizmalarla izlenecektir:

### CRC veya Checksum

Paket içeriğinin aktarım sırasında bozulup bozulmadığını kontrol eder.

### Sequence Number

Her mesaja artan bir sıra numarası verilir.

```text
1521
1522
1523
```

Sıra atlaması paket kaybı göstergesi olarak değerlendirilebilir.

### Heartbeat

Her node belirli aralıklarla çevrimiçi olduğunu bildiren mesaj gönderir.

### Timeout

Belirlenen süre içerisinde heartbeat alınmayan node offline kabul edilir.

### ACK

Kritik kontrol mesajlarının alındığı karşı node tarafından doğrulanır.

### Retry

ACK alınmadığında mesaj belirlenen sayıda tekrar gönderilir.

### Timestamp

Mesajın üretildiği zamanı belirtir.

### TTL veya Hop Count

Mesajın ağ üzerinde gereksiz şekilde sürekli aktarılmasını engeller.

Dashboard’da gösterilecek haberleşme verileri:

* Gönderilen paket sayısı
* Alınan paket sayısı
* Paket kayıp oranı
* CRC/checksum hata sayısı
* Tekrar gönderim sayısı
* Ortalama gecikme
* Son başarılı iletişim
* Son başarısız iletişim
* Son heartbeat
* Bağlantı sağlığı yüzdesi
* Sequence number
* RSSI veya sinyal kalitesi

---

## 8. Çalışma Modları

### AUTO_ADAPTIVE

Normal çalışma modudur.

* Lux ölçülür.
* Hareket sensörleri izlenir.
* Node’lar haberleşir.
* Adaptif parlaklık kontrolü uygulanır.

### SCHEDULED

Işıklar belirlenen zaman çizelgesine göre çalıştırılır.

### MANUAL

Kullanıcı otomatik sistemi geçici olarak devre dışı bırakarak lambaları manuel kontrol eder.

### MAINTENANCE

Sensör, node, MOSFET ve lambaların bakım veya test işlemleri için kullanılır.

### FAIL_SAFE

Sistem güvenli karar veremediğinde aydınlatmayı güvenli seviyeye getirir.

Türkçe kullanıcı etiketi:

```text
Güvenli Çalışma Modu
```

---

## 9. Fail-Safe Yaklaşımı

Sistem belirsizlik veya arıza durumunda enerji tasarrufundan önce güvenliği önceliklendirecektir.

### Yerel güvenli çalışma

Tek sensör veya lamba sorunu oluştuğunda ilgili node ve yakın lambalar tam parlaklığa getirilebilir.

Örnek:

```text
IR3 arızası:
L2, L3 ve L4 → %100
```

### Bölgesel güvenli çalışma

Bir node offline olduğunda ilgili bölge ve komşu lambalar tam parlaklığa getirilebilir.

Örnek:

```text
Node-2 offline:
L2, L3 ve L4 → %100
```

### Sistem geneli güvenli çalışma

Aşağıdaki durumlarda bütün lambalar %100 seviyesine getirilebilir:

* Birden fazla node offline olduğunda,
* Haberleşme ağı tamamen koptuğunda,
* Birden fazla sensör arızalandığında,
* Sistem hareket yönünü güvenilir şekilde belirleyemediğinde,
* Merkezi kontrol bilgisi güvenilir olmadığında,
* Kullanıcı acil aydınlatma komutu verdiğinde.

---

## 10. Mod Öncelikleri

Çakışan komutlarda aşağıdaki öncelik sırası kullanılacaktır:

```text
1. Acil durum / Fail-Safe
2. Manuel güvenlik komutu
3. Bakım modu
4. Zamanlanmış çalışma
5. Adaptif otomatik mod
6. Enerji tasarruf modu
```

Fail-safe modu aktifken zamanlama veya enerji tasarrufu kuralları lambaları kısamayacaktır.

---

## 11. Mock Data ve Senaryo Motoru

İlk dashboard sürümü gerçek ESP32 verisi yerine hareketli mock data ile çalışacaktır.

Mock veriler tamamen rastgele üretilmeyecektir. Sistem davranışını temsil eden kontrollü senaryolar kullanılacaktır.

### Planlanan senaryolar

#### Normal soldan sağa geçiş

```text
IR1 → IR2 → IR3 → IR4 → IR5
```

#### Normal sağdan sola geçiş

```text
IR5 → IR4 → IR3 → IR2 → IR1
```

#### L3 altında duran nesne

IR3 belirli süre aktif kalır ve L3 %100 parlaklıkta tutulur.

#### Node bağlantı kaybı

Node-2 heartbeat göndermeyi bırakır.

#### Paket kaybı

Sequence number değerlerinden biri atlanır.

#### CRC hatası

Gönderilen veri paketinin bütünlük kontrolü başarısız olur.

#### Lamba arızası

L4 %100 komutu alır ancak akım sıfır veya beklenen değerin altında kalır.

#### Sensör arızası

IR2 sürekli aktif veya sürekli pasif durumda kalır.

#### Akım anomalisi

Akım değeri beklenen üst veya alt sınırın dışına çıkar.

#### Fail-safe geçişi

Birden fazla node veya sensör arızası oluşturularak sistem güvenli çalışma moduna geçirilir.

#### Zamanlanmış çalışma

Saat 19.00 senaryosu oluşturularak bütün lambalar %30 seviyesinde açılır.

Mock senaryolar:

* Otomatik döngüyle,
* Kullanıcı tarafından manuel tetiklenerek,
* Belirli zaman aralıklarıyla

çalıştırılabilecektir.

---

## 12. Planlanan Veri Modeli

Başlangıç için PostgreSQL üzerinde aşağıdaki veri grupları planlanmaktadır:

```text
users
nodes
lamps
sensors
telemetry
node_health
events
faults
fault_history
schedules
manual_commands
communication_logs
audit_logs
system_settings
```

### Temel varlık ilişkileri

```text
Node
 ├── Lamps
 ├── Sensors
 ├── Health Records
 ├── Telemetry
 ├── Communication Logs
 └── Faults
```

---

## 13. Planlanan Proje Yapısı

```text
dashboard/
│
├── frontend/
├── backend/
├── packages/
├── infrastructure/
├── docs/
├── package.json
├── package-lock.json
├── .gitignore
├── .editorconfig
├── .prettierrc.json
├── .prettierignore
├── .env.example
├── AGENTS.md
└── README.md
```

Dashboard workspace package manager olarak npm workspaces kullanır. Bütün workspace'ler tek root
`package-lock.json` dosyasını paylaşır; child lockfile oluşturulmaz.

---

## 14. Ortam Değişkenleri

Gerçek kullanıcı adı ve parolalar repoya eklenmeyecektir.

Planlanan `.env.example` değişkenleri:

```text
NODE_ENV=
WEB_PORT=
API_PORT=

DATABASE_HOST=
DATABASE_PORT=
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=

MQTT_HOST=
MQTT_PORT=
MQTT_USERNAME=
MQTT_PASSWORD=

WEBSOCKET_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WEBSOCKET_URL=

JWT_SECRET=
JWT_EXPIRES_IN=

MOCK_SCENARIO_ENABLED=
MOCK_SCENARIO_INTERVAL=
```

---

## 15. Local Network Çalışma Modeli

MVP geliştirme aşamasında sistem aynı yerel ağ üzerinde çalıştırılacaktır.

Örnek yapı:

```text
Geliştirme Bilgisayarı
├── Next.js
├── NestJS
├── Mosquitto
├── PostgreSQL
└── Mock Scenario Service
```

Aynı Wi-Fi veya Ethernet ağına bağlı cihazlar dashboard’a bilgisayarın yerel IP adresi üzerinden erişebilecektir.

Örnek erişim biçimi:

```text
http://YEREL_IP_ADRESI:3000
```

ESP32 gateway veya mock publisher MQTT broker’a aynı yerel IP üzerinden bağlanacaktır.

```text
mqtt://YEREL_IP_ADRESI:1883
```

### Local network yaklaşımının avantajları

* İnternet bağlantısı gerektirmez.
* ESP32 ve gateway entegrasyonu daha kolay test edilir.
* MQTT broker internete açık olmaz.
* Gecikme düşük olur.
* Donanım geliştirme sırasında kurulum daha sade olur.
* Bulut servis maliyeti oluşmaz.
* Staj ortamında demo yapılabilir.

### Local network sınırlamaları

* Dashboard’a yalnızca aynı ağdaki kullanıcılar erişebilir.
* Uzaktan yatırımcı demosu yapılamaz.
* Bilgisayar veya yerel sunucu kapandığında sistem çalışmaz.
* Ağ IP adresi değişirse bağlantı ayarları güncellenebilir.

---

## 16. Vercel ve Canlıya Alma Stratejisi

İlk MVP aşamasında sistemin canlıya alınması zorunlu değildir.

### Önerilen ilk aşama

```text
Next.js             Local Docker
NestJS              Local Docker
PostgreSQL          Local Docker
Mosquitto           Local Docker
Mock Simulator      Local Docker
```

### Uzaktan demo gerektiğinde önerilen hibrit yapı

```text
Next.js Frontend       → Vercel
NestJS Backend         → Kalıcı çalışan sunucu
PostgreSQL             → Yönetilen veri tabanı veya sunucu
Mosquitto MQTT         → Kalıcı çalışan sunucu veya yönetilen broker
ESP32 Gateway          → MQTT üzerinden backend altyapısı
```

Vercel yalnızca frontend ve uygun web fonksiyonları için kullanılmalıdır.

Mosquitto broker ve sürekli MQTT mesajı dinleyen NestJS backend servisi kalıcı çalışan bir altyapıda tutulmalıdır.

### Alternatif tam self-hosted yapı

```text
Next.js
NestJS
Mosquitto
PostgreSQL
Reverse Proxy
```

servislerinin tamamı aynı VPS veya kurumsal sunucuda Docker Compose ile çalıştırılabilir.

---

## 17. Güvenlik İlkeleri

* MQTT broker internete kimlik doğrulamasız açılmamalıdır.
* Varsayılan MQTT kullanıcı adı ve parolaları kullanılmamalıdır.
* İnternet erişiminde TLS kullanılmalıdır.
* Dashboard kontrol komutları yetkilendirilmelidir.
* Kritik komutlar audit log’a kaydedilmelidir.
* Manuel override işlemlerinde kullanıcı kimliği tutulmalıdır.
* Ortam değişkenleri Git repository’ye eklenmemelidir.
* PostgreSQL portu doğrudan internete açılmamalıdır.
* Fail-safe komutları normal kullanıcı komutlarından daha yüksek öncelikli olmalıdır.
* Local network kullanımı güvenliği tamamen garanti etmez; ağ erişimi sınırlandırılmalıdır.

---

## 18. MVP Kapsamında Yapılmayacaklar

İlk dashboard sürümünde aşağıdaki özellikler zorunlu değildir:

* Gerçek üretim ölçeğinde çoklu müşteri mimarisi
* Mobil uygulama
* Yapay zekâ ile arıza tahmini
* Kamera tabanlı insan/araç sınıflandırması
* Harita servisleriyle gerçek şehir entegrasyonu
* Çok sayıda saha gateway’i
* Yüzlerce node için yüksek ölçek optimizasyonu
* Gerçek karbon sertifikasyonu
* Üretim seviyesinde ödeme ve abonelik sistemi

Bu özellikler ürünleşme aşamasında değerlendirilebilir.

---

## 19. MVP Başarı Kriterleri

Dashboard MVP’si aşağıdaki koşullar sağlandığında başarılı kabul edilecektir:

* L1-L5 lambaları topoloji üzerinde görüntülenebilmelidir.
* Node sağlık durumları canlı olarak değişebilmelidir.
* Node hover kartı çalışmalıdır.
* Node seçildiğinde yakın komşuları gösterilebilmelidir.
* Parlaklık değişimleri animasyonlu gösterilebilmelidir.
* Akım verisi zaman grafiğinde izlenebilmelidir.
* Haberleşme hataları oluşturulabilmelidir.
* Hatalar kritiklik seviyesine göre sıralanabilmelidir.
* Ana sayfada kritik sorunlar görülebilmelidir.
* Sistem logları filtrelenebilmelidir.
* Manuel ve zamanlanmış modlar arayüzde temsil edilmelidir.
* Fail-safe senaryosu dashboard üzerinde gözlemlenebilmelidir.
* Mock data daha sonra gerçek MQTT verisiyle değiştirilebilir yapıda olmalıdır.
* Sistem local network üzerinde başka bir cihazdan açılabilmelidir.

---

## 20. Geliştirme Aşamaları

### Aşama 1 — Planlama

* Dashboard gereksinimleri
* Sayfa yapısı
* Veri modeli
* MQTT topic yapısı
* Node durum modeli
* Hata kodları
* Mock senaryolar
* Erişilebilirlik kuralları

### Aşama 2 — Statik Arayüz

* Genel bakış
* Topoloji
* Node detay paneli
* Hata sayfası
* Grafik sayfası
* Log sayfası
* Kontrol ve ayarlar

### Aşama 3 — Mock Telemetri

* Hareket senaryoları
* Parlaklık geçişleri
* Akım dalgalanmaları
* Node offline senaryoları
* Paket kaybı
* CRC hatası
* Fail-safe modu

### Aşama 4 — Backend Entegrasyonu

* NestJS API
* WebSocket
* MQTT
* PostgreSQL
* Alarm motoru
* Loglama

### Aşama 5 — ESP32 Entegrasyonu

* Gateway mesajları
* Gerçek node telemetrisi
* Sensör değerleri
* PWM bilgileri
* Akım ölçümleri
* Gerçek hata senaryoları

### Aşama 6 — Dağıtım

* Local network kurulumu
* Docker Compose
* Uzaktan demo ihtiyacının değerlendirilmesi
* Vercel veya self-hosted dağıtım kararı

---

## 21. Mimari Karar

Bu proje için başlangıçta aşağıdaki yaklaşım kullanılacaktır:

> **Local-first, cloud-ready**

İlk MVP bütün servislerin local network üzerinde çalıştığı Docker Compose mimarisiyle geliştirilecektir.

Uzaktan erişim veya yatırımcı demosu gerektiğinde Next.js frontend Vercel’e taşınabilecek; NestJS, PostgreSQL ve MQTT servisleri kalıcı çalışan bir backend altyapısında barındırılacaktır.

Bu sayede MVP geliştirme sürecinde gereksiz deployment karmaşıklığı oluşturulmadan, ileride buluta taşınabilecek bir mimari korunacaktır.
