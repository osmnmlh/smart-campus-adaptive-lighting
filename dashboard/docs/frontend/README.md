# Frontend Scaffold

`@smart-campus/frontend`, Smart Campus Adaptive Lighting Dashboard için minimal Next.js frontend
çalışma alanıdır. App Router, React ve strict TypeScript kullanır.

Shared domain schema ve tipleri yalnızca `@smart-campus/contracts` package root üzerinden import
edilir; contracts kaynakları frontend içinde kopyalanmaz veya internal yollarla tüketilmez.

Public frontend yapılandırması aşağıdaki değişkenlerle sağlanır:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

Bu scaffold yalnızca app shell, durum placeholder'ları, test ve lint/build altyapısını kapsar.
Backend, API ve WebSocket bağlantısı içermez. Dashboard feature'ları sonraki bağımsız branch'lerde
uygulanacaktır.
