# Interactive topology

Topology ekranı, deterministic simulated snapshot üzerinden 3 ESP32 controller node, 5 lamp ve
6 sensor arasındaki presentation ilişkilerini gösterir. NODE_1, L1/L2'yi; NODE_2, L3'ü; NODE_3 ise
L4/L5'i kontrol eder. Communication edge'leri yalnız NODE_1 ↔ NODE_2 ve NODE_2 ↔ NODE_3
arasındadır. IR1–IR5 kendi lighting segmentlerine bağlanır; BH1750 domain ownership uydurulmadan
system ambient sensor olarak konumlandırılır.

Graph, `@xyflow/react` ile render edilir. L3 seçimi L2–L3–L4 segmentlerini, NODE_2 owner'ını ve IR3
sensorünü odaklar. React Flow canvas'a ek olarak aynı selection state'ini paylaşan, keyboard ile
seçilebilir görünür bir **Topology List** bulunur.

Veri, Overview ile aynı `SystemSnapshotSchema` tarafından doğrulanmış sabit fixture'dan türetilir.
Gerçek API, WebSocket veya production telemetry bağlantısı yoktur. Drag/save layout, command
gönderimi ve persistence kapsam dışıdır. Bu görünüm fiziksel production deployment şeması değildir.
