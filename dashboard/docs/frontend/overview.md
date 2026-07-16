# Overview dashboard

Overview ekranı, Smart Campus Adaptive Lighting sisteminin node, lamp, sensor, active alert,
system mode ve data source özetlerini tek bir operasyon görünümünde sunar.

Bu fazdaki veri kaynağı sabit zaman damgalı, deterministic bir `SIMULATED` fixture'dır. Fixture
`SystemSnapshotSchema` ile doğrulanır ve shared contract'lar yalnızca `@smart-campus/contracts`
package root üzerinden kullanılır. Frontend gerçek backend'e bağlı değildir; API, fetch veya
WebSocket bağlantısı kurulmaz. Arayüzde bu durum **Mock Data** etiketiyle açıkça belirtilir.

Lamp health ile lamp operating state ayrı kavramlar olarak gösterilir. Simüle edilmiş dahi olsa
enerji tasarrufu, watt, kWh, maliyet veya karbon değerleri overview ekranında gösterilmez. Bu ekran
production telemetry ekranı değildir.

React Flow topolojisi ve ECharts grafikleri sonraki fazlara bırakılmıştır.
