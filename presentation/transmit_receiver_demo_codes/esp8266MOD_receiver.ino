#include <Arduino.h>
#include <ESP8266WiFi.h>

extern "C"
{
  #include <espnow.h>
  #include <user_interface.h>
}

// ESP32 ile aynı kanal kullanılmalıdır.
constexpr uint8_t ESPNOW_CHANNEL = 1;

// NodeMCU üzerindeki D1 pini GPIO5'tir.
constexpr uint8_t LED_PIN = D1;

// LED her paket geldiğinde kaç milisaniye yanacak?
constexpr unsigned long LED_PULSE_MS = 250;

// Yanlış veya başka tip paketleri ayırt etmek için sabit kimlik.
constexpr uint32_t PACKET_MAGIC = 0x47593633;

// ESP32 tarafındaki struct ile birebir aynı olmalıdır.
struct __attribute__((packed)) SensorPacket
{
  uint32_t magic;
  uint32_t sequence;

  float temperatureC;
  float pressureHpa;
  float altitudeM;

  uint32_t senderMillis;
};

static_assert(
  sizeof(SensorPacket) == 24,
  "SensorPacket boyutu beklenenden farkli!"
);

SensorPacket receivedPacket;
volatile bool packetReady = false;

bool ledIsOn = false;
unsigned long ledTurnOffTime = 0;

unsigned long validPacketCount = 0;
unsigned long invalidPacketCount = 0;
unsigned long lastPacketTime = 0;

// MAC adresini okunabilir biçimde yazdırır.
void printMacAddress(const uint8_t* mac)
{
  for (uint8_t i = 0; i < 6; i++)
  {
    if (mac[i] < 0x10)
    {
      Serial.print("0");
    }

    Serial.print(mac[i], HEX);

    if (i < 5)
    {
      Serial.print(":");
    }
  }
}

// ESP-NOW paketi geldiğinde çalışır.
//
// Callback içerisinde uzun Serial işlemleri yapmıyoruz.
// Yalnızca veriyi kontrol edip ana döngüye aktarıyoruz.
void onDataReceived(
  uint8_t* senderMac,
  uint8_t* incomingData,
  uint8_t incomingLength
)
{
  if (incomingLength != sizeof(SensorPacket))
  {
    invalidPacketCount++;
    return;
  }

  SensorPacket temporaryPacket;

  memcpy(
    &temporaryPacket,
    incomingData,
    sizeof(temporaryPacket)
  );

  if (temporaryPacket.magic != PACKET_MAGIC)
  {
    invalidPacketCount++;
    return;
  }

  memcpy(
    &receivedPacket,
    &temporaryPacket,
    sizeof(receivedPacket)
  );

  packetReady = true;
}

void stopWithError(const char* errorMessage)
{
  Serial.println();
  Serial.print("HATA: ");
  Serial.println(errorMessage);

  while (true)
  {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(900);
  }
}

void setup()
{
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("======================================");
  Serial.println("ESP8266 ESP-NOW ALICI");
  Serial.println("======================================");

  // Kayıtlı Wi-Fi bilgilerini otomatik kullanmaması için.
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  delay(100);

  // ESP32 ile aynı Wi-Fi kanalına geç.
  wifi_set_channel(ESPNOW_CHANNEL);

  Serial.print("ESP8266 Station MAC adresi: ");
  Serial.println(WiFi.macAddress());

  Serial.print("ESP-NOW Wi-Fi kanali: ");
  Serial.println(wifi_get_channel());

  Serial.print("LED pini: GPIO");
  Serial.println(LED_PIN);

  if (esp_now_init() != 0)
  {
    stopWithError("ESP-NOW baslatilamadi.");
  }

  esp_now_set_self_role(ESP_NOW_ROLE_SLAVE);

  if (esp_now_register_recv_cb(onDataReceived) != 0)
  {
    stopWithError("Alma callback fonksiyonu kaydedilemedi.");
  }

  Serial.println();
  Serial.println("ESP-NOW basariyla baslatildi.");
  Serial.println("ESP32'den veri bekleniyor...");
  Serial.println();
}

void loop()
{
  if (packetReady)
  {
    SensorPacket packetCopy;

    // Callback ile loop aynı veriye aynı anda erişmesin.
    noInterrupts();

    memcpy(
      &packetCopy,
      &receivedPacket,
      sizeof(packetCopy)
    );

    packetReady = false;

    interrupts();

    validPacketCount++;
    lastPacketTime = millis();

    Serial.println("--------------------------------------");

    Serial.print("Paket numarasi : ");
    Serial.println(packetCopy.sequence);

    Serial.print("Sicaklik       : ");
    Serial.print(packetCopy.temperatureC, 2);
    Serial.println(" °C");

    Serial.print("Basinc         : ");
    Serial.print(packetCopy.pressureHpa, 2);
    Serial.println(" hPa");

    Serial.print("Tahmini irtifa : ");
    Serial.print(packetCopy.altitudeM, 2);
    Serial.println(" m");

    Serial.print("ESP32 calisma  : ");
    Serial.print(packetCopy.senderMillis);
    Serial.println(" ms");

    Serial.print("Gecerli paket  : ");
    Serial.println(validPacketCount);

    Serial.print("Gecersiz paket : ");
    Serial.println(invalidPacketCount);

    // LED'i yak.
    digitalWrite(LED_PIN, HIGH);
    ledIsOn = true;
    ledTurnOffTime = millis() + LED_PULSE_MS;
  }

  // Süre dolduğunda LED'i kapat.
  if (
    ledIsOn &&
    static_cast<long>(millis() - ledTurnOffTime) >= 0
  )
  {
    digitalWrite(LED_PIN, LOW);
    ledIsOn = false;
  }

  // En az bir paket aldıktan sonra iletişim kesilirse uyar.
  static unsigned long lastWarningTime = 0;

  if (
    validPacketCount > 0 &&
    millis() - lastPacketTime > 5000 &&
    millis() - lastWarningTime > 5000
  )
  {
    lastWarningTime = millis();

    Serial.println();
    Serial.println("UYARI: Son 5 saniyede veri alinmadi.");
  }

  yield();
}