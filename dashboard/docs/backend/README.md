# Dashboard Backend Scaffold

`@smart-campus/backend`, dashboard için gelecekteki sunucu modüllerine temel sağlayan minimal
NestJS paketidir. NestJS; modüler yapı, dependency injection ve test edilebilir HTTP katmanı
sağladığı için seçilmiştir.

Backend ESM olarak çalışır ve strict TypeScript kullanır. Shared domain tipleri ve runtime
şemaları yalnızca `@smart-campus/contracts` paket kökünden import edilir; kaynak veya `dist`
iç yolları kullanılmaz.

`GET /health`, yalnızca servisin çalıştığını ve contracts schema sürümünü bildiren küçük bir
yanıt döndürür. Database, MQTT veya diğer entegrasyonların hazır olduğunu iddia etmez.

Backend environment değerleri public değildir. Örnek geliştirme değerleri
`backend/.env.example` dosyasındadır; varsayılan bind adresi `127.0.0.1`, port `3001` ve CORS
erişimi açık bir allowlist ile sınırlıdır. `DASHBOARD_DEV_TOKEN` yalnızca ilerideki command
authorization fazı için boş placeholder'dır ve bu scaffold içinde kullanılmaz.

Bu faz MQTT, PostgreSQL, WebSocket, scenario engine, telemetry, alerts, commands veya
authentication içermez. Bu özellikler ihtiyaç duyuldukça ayrı branch'lerde eklenecektir.
