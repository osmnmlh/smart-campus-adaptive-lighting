#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <MS5611.h>

// ==================================================
// GY-63 / MS5611 AYARLARI
// ==================================================

constexpr uint8_t SDA_PIN = 25;
constexpr uint8_t SCL_PIN = 26;

constexpr float SEA_LEVEL_PRESSURE_HPA = 1013.25F;

// ==================================================
// ESP-NOW AYARLARI
// ==================================================

// ESP8266 ile aynı kanal olmalıdır.
constexpr uint8_t ESPNOW_CHANNEL = 1;

// Paket gönderim aralığı.
constexpr unsigned long SEND_INTERVAL_MS = 1000;

// Paket tipini doğrulamak için sabit kimlik.
constexpr uint32_t PACKET_MAGIC = 0x47593633;

// BURAYI KENDI ESP8266 MAC ADRESINLE DEGISTIR.
uint8_t receiverMac[] = {
  0xC8, 0x2B, 0x96, 0x1B, 0xD0, 0xE8
};

// ==================================================
// VERI PAKETI
// ==================================================

// Bu struct ESP8266 tarafındaki struct ile birebir aynı olmalıdır.
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

SensorPacket outgoingPacket;

// ==================================================
// MS5611 NESNELERI
// ==================================================

MS5611 sensor77(0x77);
MS5611 sensor76(0x76);

MS5611* activeSensor = nullptr;

// ==================================================
// DURUM DEGISKENLERI
// ==================================================

uint32_t packetSequence = 0;
unsigned long lastSendTime = 0;

unsigned long successfulQueueCount = 0;
unsigned long failedQueueCount = 0;

// ==================================================
// YARDIMCI FONKSIYONLAR
// ==================================================

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

void stopProgram(const char* errorMessage)
{
  Serial.println();
  Serial.print("KRITIK HATA: ");
  Serial.println(errorMessage);
  Serial.println("ESP32 durduruldu.");

  while (true)
  {
    delay(1000);
  }
}

void initializeSensor()
{
  Serial.println("GY-63 / MS5611 baslatiliyor...");

  if (!Wire.begin(SDA_PIN, SCL_PIN, 100000))
  {
    stopProgram("I2C baslatilamadi.");
  }

  if (sensor77.begin())
  {
    activeSensor = &sensor77;
  }
  else if (sensor76.begin())
  {
    activeSensor = &sensor76;
  }

  if (activeSensor == nullptr)
  {
    stopProgram(
      "GY-63 bulunamadi. VCC, GND, SDA ve SCL baglantilarini kontrol et."
    );
  }

  activeSensor->setOversampling(OSR_ULTRA_HIGH);

  Serial.print("GY-63 bulundu. I2C adresi: 0x");
  Serial.println(activeSensor->getAddress(), HEX);
}

void initializeEspNow()
{
  Serial.println();
  Serial.println("ESP-NOW baslatiliyor...");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  delay(100);

  esp_err_t channelResult = esp_wifi_set_channel(
    ESPNOW_CHANNEL,
    WIFI_SECOND_CHAN_NONE
  );

  if (channelResult != ESP_OK)
  {
    stopProgram("ESP32 Wi-Fi kanali ayarlanamadi.");
  }

  Serial.print("ESP32 Station MAC adresi: ");
  Serial.println(WiFi.macAddress());

  Serial.print("ESP-NOW kanali: ");
  Serial.println(ESPNOW_CHANNEL);

  Serial.print("ESP8266 hedef MAC: ");
  printMacAddress(receiverMac);
  Serial.println();

  if (esp_now_init() != ESP_OK)
  {
    stopProgram("ESP-NOW baslatilamadi.");
  }

  esp_now_peer_info_t peerInfo = {};

  memcpy(
    peerInfo.peer_addr,
    receiverMac,
    sizeof(receiverMac)
  );

  peerInfo.channel = ESPNOW_CHANNEL;
  peerInfo.ifidx = WIFI_IF_STA;
  peerInfo.encrypt = false;

  if (esp_now_is_peer_exist(receiverMac))
  {
    esp_now_del_peer(receiverMac);
  }

  esp_err_t peerResult = esp_now_add_peer(&peerInfo);

  if (peerResult != ESP_OK)
  {
    Serial.print("Peer ekleme hata kodu: ");
    Serial.println(static_cast<int>(peerResult));

    stopProgram("ESP8266 peer olarak eklenemedi.");
  }

  Serial.println("ESP-NOW basariyla baslatildi.");
}

void sendSensorPacket()
{
  const int sensorReadResult = activeSensor->read();

  if (sensorReadResult != MS5611_READ_OK)
  {
    Serial.print("GY-63 okuma hatasi. Kod: ");
    Serial.println(sensorReadResult);
    return;
  }

  outgoingPacket.magic = PACKET_MAGIC;
  outgoingPacket.sequence = ++packetSequence;

  outgoingPacket.temperatureC =
    activeSensor->getTemperature();

  outgoingPacket.pressureHpa =
    activeSensor->getPressure();

  outgoingPacket.altitudeM =
    activeSensor->getAltitude(
      SEA_LEVEL_PRESSURE_HPA
    );

  outgoingPacket.senderMillis = millis();

  Serial.println("--------------------------------------");

  Serial.print("Paket numarasi : ");
  Serial.println(outgoingPacket.sequence);

  Serial.print("Sicaklik       : ");
  Serial.print(outgoingPacket.temperatureC, 2);
  Serial.println(" °C");

  Serial.print("Basinc         : ");
  Serial.print(outgoingPacket.pressureHpa, 2);
  Serial.println(" hPa");

  Serial.print("Tahmini irtifa : ");
  Serial.print(outgoingPacket.altitudeM, 2);
  Serial.println(" m");

  esp_err_t sendResult = esp_now_send(
    receiverMac,
    reinterpret_cast<const uint8_t*>(&outgoingPacket),
    sizeof(outgoingPacket)
  );

  if (sendResult == ESP_OK)
  {
    successfulQueueCount++;

    Serial.println(
      "ESP-NOW: Paket gonderim kuyruguna alindi."
    );
  }
  else
  {
    failedQueueCount++;

    Serial.print("ESP-NOW gonderim hata kodu: ");
    Serial.println(static_cast<int>(sendResult));
  }

  Serial.print("Kuyruga alinan : ");
  Serial.println(successfulQueueCount);

  Serial.print("Basarisiz      : ");
  Serial.println(failedQueueCount);
}

// ==================================================
// ARDUINO SETUP / LOOP
// ==================================================

void setup()
{
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("======================================");
  Serial.println("ESP32 + GY-63 + ESP-NOW GONDERICI");
  Serial.println("======================================");

  initializeSensor();
  initializeEspNow();

  Serial.println();
  Serial.println("Sistem hazir.");
  Serial.println("Olcum ve gonderim basliyor...");
}

void loop()
{
  const unsigned long currentTime = millis();

  if (currentTime - lastSendTime >= SEND_INTERVAL_MS)
  {
    lastSendTime = currentTime;
    sendSensorPacket();
  }
}