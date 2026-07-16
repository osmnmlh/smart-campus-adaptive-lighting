# Metrics dashboard

`/metrics`, deterministic simulated telemetry için Apache ECharts tabanlı bir presentation
ekranıdır. Seçili lamba için `brightnessPercent`, `targetBrightnessPercent` ve `pwmDutyPercent`;
BH1750 için ambient light; IR1–IR5 için active/inactive timeline gösterir. Sabit 5, 15 ve 60
dakikalık pencereler fixture bitiş zamanına göre filtrelenir.

Kaynak ve quality değerleri (`SIMULATED`, `GOOD`, `STALE`, `INVALID`) hem özetlerde hem görünür
erişilebilir tabloda yer alır. Grafikler animasyonsuzdur ve aynı verinin semantic tablo alternatifi
bulunur. INA219 current, voltage ve power değerleri fixture'da olmadığı için elektrik metrikleri
`not available` olarak gösterilir; enerji tasarrufu, kWh, maliyet veya karbon değeri üretilmez.

Ekran gerçek API, WebSocket, MQTT veya production telemetry bağlantısı kurmaz. Veriler 61 sabit UTC
noktadan oluşur ve Overview/Topology ile aynı doğrulanmış snapshot'ın son durumuyla tutarlıdır. Bu
görünüm production telemetry kanıtı değildir.
