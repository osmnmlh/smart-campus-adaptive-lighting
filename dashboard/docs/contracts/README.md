# Shared Domain Contracts

`@smart-campus/contracts`, frontend and backend payloads için ortak Zod runtime schema'larını ve
bu schema'lardan türetilen TypeScript type'larını sağlar. Contract'lar elle yazılmış paralel
interface'lerle çoğaltılmaz.

Telemetry değerleri kaynaklarını açıkça belirtir:

- `MEASURED`: Fiziksel sensörden ölçülen veri.
- `CALCULATED`: Başka değerlerden matematiksel olarak üretilen veri.
- `ESTIMATED`: Bir baseline veya model kullanılarak tahmin edilen veri.
- `SIMULATED`: Deterministic mock tarafından üretilen veri.
- `NOMINAL`: Yapılandırılmış referans veya katalog değeri.

`brightnessPercent`, lambanın kullanıcıya gösterilen 0–100 parlaklığını; `pwmDutyPercent`, MVP'de
kullanılan 0–100 PWM duty oranını ifade eder. Ham PWM değeri bu contract sürümünün parçası değildir.

İlk schema sürümü `schemaVersion: 1` değerini kullanır. Consumer'lar internal dosya yolları yerine
yalnızca `@smart-campus/contracts` package root'undan import yapmalıdır.
