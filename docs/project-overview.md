# Proje Genel Bakış

## Proje Adı

**IoT Tabanlı Adaptif Akıllı Kampüs Aydınlatma ve Arıza Tespit Sistemi**

İngilizce proje adı:

**IoT-Based Adaptive Smart Campus Lighting and Fault Detection System**

---

## Projenin Amacı

Bu projenin amacı; dış ortam aydınlatmasını çevresel koşullara ve hareket yoğunluğuna göre otomatik olarak ayarlayan, komşu aydınlatma düğümleriyle haberleşebilen ve temel arıza durumlarını izleyebilen bir IoT prototipi geliştirmektir.

Sistem, yalnızca hareket algılandığında tepki veren klasik sensörlü lambalardan farklı olarak hareketin yönünü de değerlendirmeyi hedeflemektedir.

Bir aydınlatma düğümü hareketi algıladığında, hareket yönündeki bir sonraki düğüme bilgi gönderir. Böylece kişi, bisikletli veya araç bir sonraki bölgeye ulaşmadan önce ilgili ışık seviyesi artırılır.

---

## Çözülmek İstenen Problem

Geleneksel dış ortam aydınlatma sistemleri çoğunlukla sabit parlaklıkta ve kullanım yoğunluğundan bağımsız olarak çalışmaktadır.

Bu durum aşağıdaki problemlere yol açabilir:

- Gereksiz enerji tüketimi
- Yüksek işletme ve bakım maliyeti
- Işık kirliliği
- Kullanılmayan bölgelerin gereksiz şekilde tam parlaklıkta tutulması
- Hareket yönünün dikkate alınmaması
- Komşu aydınlatma noktaları arasında koordinasyon bulunmaması
- Arızalı veya yanıt vermeyen ışık noktalarının geç fark edilmesi
- Kullanıcının ilerleyeceği bölgenin zamanında aydınlatılamaması

---

## Önerilen Çözüm

Sistem, ESP32 tabanlı kablosuz aydınlatma düğümlerinden oluşacaktır.

Her düğüm genel olarak şu görevleri yerine getirecektir:

- Çevresindeki hareketi algılamak
- Hareket yönünü belirlemek
- Kontrol ettiği ışıkların parlaklığını ayarlamak
- Komşu düğümlere hareket bilgisi göndermek
- Gelen komutlara göre ön aydınlatma yapmak
- Ortam ışığına göre gündüz ve gece modları arasında geçiş yapmak
- Temel çalışma ve arıza durumlarını raporlamak

Aydınlatmalar tamamen kapatılmak yerine, gece saatlerinde düşük bir güvenlik seviyesinde tutulabilecektir. Hareket algılandığında ilgili bölge ve hareket yönündeki sonraki bölge daha yüksek parlaklığa çıkarılacaktır.

---

## Hedef Kullanım Alanları

Proje yaklaşımı aşağıdaki alanlarda uygulanabilir:

- Üniversite kampüsleri
- Şehir parkları
- Yürüyüş ve bisiklet yolları
- Otoparklar
- Havaalanları
- Tren istasyonları
- Endüstriyel bölgeler
- Lojistik alanları
- Şehir içi düşük yoğunluklu yollar

Mevcut MVP çalışması üniversite kampüsü senaryosu üzerinden geliştirilecektir.

---

## MVP Kapsamı

İlk prototip aşağıdaki temel yapıdan oluşacaktır:

- 3 aktif ESP32 düğümü
- 5 bağımsız ışık noktası
- 3 yön algılama bölgesi
- Kablosuz düğümler arası haberleşme
- Ortam ışığına bağlı çalışma modu
- PWM tabanlı parlaklık kontrolü
- Hareket yönüne göre ön aydınlatma
- Gecikmeli ve kademeli parlaklık azaltma
- Temel arıza veya durum gösterimi

MVP’nin amacı gerçek bir kampüs sistemini tam ölçekte kurmak değil, temel teknik yaklaşımın çalıştığını kanıtlayan bir demonstratör ortaya çıkarmaktır.

---

## MVP Kapsamı Dışında Olanlar

Aşağıdaki özellikler mevcut MVP kapsamına dahil değildir:

- Gerçek kampüs veya şehir saha kurulumu
- 220/230 V gerçek sokak lambası kontrolü
- Endüstriyel dış ortam kabini
- IP koruma sınıfına sahip mekanik tasarım
- LoRaWAN veya hücresel ağ altyapısı
- Gelişmiş merkezi yönetim platformu
- Yapay zekâ tabanlı araç veya yaya sınıflandırması
- Radar tabanlı hız ölçümü
- Seri üretim ve sertifikasyon çalışmaları

Bu konular gelecekteki geliştirme aşamalarında ele alınabilir.

---

## Temel Teknik Yaklaşım

Projede aşağıdaki teknolojilerin kullanılması planlanmaktadır:

- **ESP32:** Ana kontrol ve haberleşme
- **ESP-NOW:** Düğümler arası kablosuz iletişim
- **IR sensörler:** Hareket ve yön algılama
- **BH1750:** Ortam ışığı ölçümü
- **MOSFET sürücü:** LED parlaklık kontrolü
- **PWM:** Kademeli dimming
- **INA219 veya yazılımsal simülasyon:** Temel arıza ve akım izleme

Detaylı donanım bağlantıları ve pin tanımları `hardware/` klasöründe, haberleşme detayları ise ilgili teknik dokümantasyon dosyalarında tutulacaktır.

---

## Beklenen Sonuç

Proje sonunda aşağıdaki davranışların gösterilmesi hedeflenmektedir:

- Işıkların bağımsız olarak dim edilebilmesi
- Hareket yönünün belirlenebilmesi
- Hareket bilgisinin komşu düğüme aktarılması
- Bir sonraki ışığın kullanıcı gelmeden önce artırılması
- Hareket sona erdiğinde ışığın kademeli olarak azaltılması
- Duran kullanıcı veya araç durumunda ışığın açık kalması
- Ortam ışığına göre gündüz ve gece modlarının değişmesi
- En az bir temel arıza durumunun raporlanması

---

## Proje Durumu

**Mevcut aşama:** Proje planlama ve tek düğüm donanım doğrulama

- [x] Proje konusu belirlendi
- [x] MVP kapsamı belirlendi
- [x] Başlangıç bileşen listesi hazırlandı
- [x] Repository yapısı oluşturuldu
- [ ] ESP32 temel kart testi
- [ ] PWM LED testi
- [ ] Ortam ışığı sensörü testi
- [ ] Yön algılama testi
- [ ] ESP-NOW haberleşme testi
- [ ] Tek düğüm entegrasyonu
- [ ] Çoklu düğüm entegrasyonu
- [ ] Arıza izleme
- [ ] Final sistem testi

---

## İlgili Dokümantasyon

Detaylı bilgiler aşağıdaki dosyalarda tutulacaktır:

| Konu | Dosya |
|---|---|
| Sistem mimarisi | `docs/system-architecture.md` |
| ESP-NOW mesaj yapısı | `docs/communication-protocol.md` |
| Durum makinesi | `docs/state-machine.md` |
| Arıza tespiti | `docs/fault-detection.md` |
| Güç mimarisi | `docs/power-architecture.md` |
| Test planı | `docs/test-plan.md` |
| Riskler | `docs/risk-register.md` |
| Günlük staj çalışmaları | `docs/internship-log/` |
| Pin bağlantıları | `hardware/pinout/` |
| Devre ve kablolama | `hardware/schematics/` ve `hardware/wiring-diagrams/` |
| Satın alma listesi | `hardware/bom/` |
| Test sonuçları | `tests/` |

---

## Proje Sahibi

**Osman Melih Gümüş**  
**Öğrenci Numarası:** 1030521449  
**Bölüm:** Bilgisayar Mühendisliği  
**Proje Türü:** Donanım Stajı / Gömülü Sistemler ve IoT Projesi

---

**Son Güncelleme:** 13 Temmuz 2026