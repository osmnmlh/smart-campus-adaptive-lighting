# 🛠️ Donanım Mimarisi ve Bağlantı Kılavuzu
### *Smart Campus Adaptive Lighting - Hardware & Pinout Guide*

Bu doküman, **IoT Tabanlı Adaptif Akıllı Kampüs Aydınlatma ve Arıza Tespit Sistemi**'nin fiziksel donanım katmanını, pin bağlantılarını, elektriksel güvenlik kurallarını ve prototip fotoğraflarını içerir.

---

## 📸 Prototip ve Donanım Fotoğrafları

Aşağıda laboratuvar ortamında kurulan çok düğümlü donanım prototipi ve sensör test düzenekleri yer almaktadır:

### 1. Çalışma Masası ve Çok Düğümlü Test Düzeneği (Workbench Prototype)
![Çalışma Masası ve Çok Düğümlü Test Düzeneği](../assets/hardware/prototype-workbench.jpg)

### 2. ESP32 Düğüm Ağı ve Kablolama (Multi-Node Setup)
![ESP32 Düğüm Ağı ve Kablolama](../assets/hardware/esp32-nodes-setup.jpg)

### 3. Sensör ve Ölçüm Katmanı Yakın Çekim (Sensors & Circuit Detail)
![Sensör ve Ölçüm Devresi (BH1750, INA219, IR)](../assets/hardware/sensors-circuit-detail.jpg)

### 4. İlk Breadboard Doğrulama ve Sinyal Testi (Initial Breadboard Test)
![İlk Breadboard Doğrulama](../assets/hardware/breadboard-prototype.jpg)

---

## 🧰 Malzeme Listesi (Bill of Materials - BOM)

| Bileşen | Adet | Görevi / Kullanım Amacı | Teknik Detay |
|---|---|---|---|
| **ESP32 DevKit V1** | 4 | 3x Aydınlatma Düğümü (`NODE_1`, `NODE_2`, `NODE_3`) + 1x Ağ Geçidi (`GW_1`) | Çift çekirdekli Xtensa 32-bit LX6, 2.4 GHz Wi-Fi & ESP-NOW |
| **12V LED Aydınlatma Modülleri** | 5 | Bağımsız kontrol edilen kampüs sokak/yol lambaları (`L1` - `L5`) | 12V DC, dimlenebilir yüksek verimli LED |
| **IR Engel/Hareket Sensörleri** | 5 | Giriş-çıkış yönü ve yaya/araç algılama (`IR1` - `IR5`) | Dijital çıkış (High/Low), ayarlanabilir algılama mesafesi |
| **BH1750 I2C Işık Sensörü** | 1 | Kampüs ortam ışık şiddeti ölçümü (Lüks / Day-Night geçişi) | `NODE_2` üzerinde, 1 - 65535 lx algılama aralığı |
| **INA219 I2C Akım & Güç Sensörü** | 1 | `L3` hattının gerçek akım, gerilim ve güç tüketimini izleme | `NODE_2` üzerinde, 0-26V DC, ±3.2A yüksek hassasiyet |
| **D4184 / IRLZ44N MOSFET Modülü** | 5 | ESP32 PWM sinyalleriyle 12V LED parlaklık kontrolü | Logic-level optokuplörlü / doğrudan gate tetiklemeli |
| **DC-DC Buck Converter (Mini360/LM2596)** | 1 | 12V beslemeden ESP32 ve sensörler için 5V/3.3V üretimi | Yüksek verimli regülatör |
| **12V DC Regüle Güç Kaynağı** | 1 | LED hatlarının ana güç beslemesi | 12V DC, min 3A stabil besleme |

---

## 📌 Pin Bağlantı ve Dağıtım Tablosu (Pinout Mapping)

### Ağ Geçidi (`GW_1` - Gateway)
* **Görevi:** ESP-NOW üzerinden gelen paketleri yakalar, IEEE CRC-32 doğrulaması yapar, SNTP üzerinden UTC zaman damgası ekler ve MQTTS protokolü ile Mosquitto broker'a aktarır.
* **Haberleşme:** 2.4 GHz Wi-Fi (Kanal 6 sabit) + ESP-NOW.

### Düğüm 1 (`NODE_1`)
| Pin (ESP32) | Bağlı Bileşen | İşlev | Yön / Tip |
|---|---|---|---|
| **GPIO 25** | `IR1` Sensörü | Bölge Giriş Hareket Algılama | Dijital Giriş (Pull-down / Interrupt) |
| **GPIO 26** | `IR2` Sensörü | Bölge Çıkış Hareket Algılama | Dijital Giriş (Pull-down / Interrupt) |
| **GPIO 32** | `L1` MOSFET Gate | Lamba 1 PWM Dimming (0-100%) | PWM Çıkış (LEDC, 5 kHz) |
| **GPIO 33** | `L2` MOSFET Gate | Lamba 2 PWM Dimming (0-100%) | PWM Çıkış (LEDC, 5 kHz) |

### Düğüm 2 (`NODE_2` - Master Ölçüm Düğümü)
| Pin (ESP32) | Bağlı Bileşen | İşlev | Yön / Tip |
|---|---|---|---|
| **GPIO 25** | `IR3` Sensörü | Orta Bölge Hareket Algılama | Dijital Giriş (Pull-down / Interrupt) |
| **GPIO 32** | `L3` MOSFET Gate | Lamba 3 PWM Dimming (0-100%) | PWM Çıkış (LEDC, 5 kHz) |
| **GPIO 21 (SDA)** | `BH1750` & `INA219` | I2C Veri Hattı | Çift Yönlü I2C Veri |
| **GPIO 22 (SCL)** | `BH1750` & `INA219` | I2C Saat Hattı | I2C Saat Sinyali |

> **Önemli Not:** `INA219` modülü yalnızca `L3` hattının güç yoluna seri bağlanmıştır; bu sayede donanım katmanında gerçek `MEASURED` enerji tüketimi ve arıza (aşırı akım / açık devre) tespiti sağlanır.

### Düğüm 3 (`NODE_3`)
| Pin (ESP32) | Bağlı Bileşen | İşlev | Yön / Tip |
|---|---|---|---|
| **GPIO 25** | `IR4` Sensörü | Bölge Giriş Hareket Algılama | Dijital Giriş (Pull-down / Interrupt) |
| **GPIO 26** | `IR5` Sensörü | Bölge Çıkış Hareket Algılama | Dijital Giriş (Pull-down / Interrupt) |
| **GPIO 32** | `L4` MOSFET Gate | Lamba 4 PWM Dimming (0-100%) | PWM Çıkış (LEDC, 5 kHz) |
| **GPIO 33** | `L5` MOSFET Gate | Lamba 5 PWM Dimming (0-100%) | PWM Çıkış (LEDC, 5 kHz) |

---

## ⚡ Elektriksel Güvenlik ve Güç Mimarisi (Electrical Safety)

1. **Ortak Toprak (Common Ground):** 12V güç kaynağının GND hattı ile ESP32 kartlarının GND hatları birbirine bağlanmalıdır; aksi takdirde MOSFET gate tetikleme eşikleri kayar ve sinyal gürültüsü oluşur.
2. **Voltaj İzolasyonu:** ESP32 GPIO pinleri maksimum 3.3V toleranslıdır. 12V LED besleme gerilimi kesinlikle doğrudan mikrodenetleyici pinlerine temas etmemelidir.
3. **Ters Akım ve Gürültü Filtreleme:** PWM anahtarlama frekansı 5 kHz olarak ayarlanmıştır; MOSFET girişlerine pull-down dirençleri (10kΩ) bağlanarak başlatma anında lambaların kontrolsüz yanması engellenmiştir.
4. **Güvenli Akım Ölçümü:** INA219 High-Side akım ölçümü yapar. Akım yönü güç kaynağından lambaya doğru olmalı ve maksimum 3.2A sınırını aşmamalıdır.
