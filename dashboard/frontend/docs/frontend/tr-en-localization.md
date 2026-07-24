# Turkish and English localization

The dashboard supports `tr` and `en` through a small typed React Context implementation. Turkish is
the deterministic default. The first server and client render therefore agree; a stored preference
may be applied immediately after hydration.

The language selector in the application header updates the UI without a page reload. The selected
locale is stored under `smart-campus.locale`, and `document.documentElement.lang` is updated at the
same time. Invalid or inaccessible storage falls back to Turkish.

Translations live in `src/features/localization/messages.ts`. English defines the canonical
`TranslationKey` union and the Turkish dictionary is required to expose the same key set. Add a key
to both dictionaries, then consume it through `t(key, values)`. Interpolation is plain text only;
there is no HTML injection or rich-text translation engine.

`displayEnumLabel` converts known domain enum values to localized presentation labels without
changing their wire or stored representation. IDs such as `NODE_1`, `GW_1`, `L1`, `IR1`,
`INA219_1`, firmware versions, `bootId`, `messageId`, MQTT topics, raw payloads, REST/WebSocket
paths, and backend error codes remain canonical.

Numbers, percentages, UTC dates, and durations use the platform `Intl` APIs with `tr-TR` or `en-US`.
Domain values and timestamps are never mutated. Invalid numeric or date inputs use a safe em dash
presentation.

There are no localized route prefixes, middleware, server locale negotiation, translation backend,
or backend localization. Switching locale does not remount the live-data provider, start a REST
fetch, open another WebSocket, reset sequence/cursor state, or change scenario state. Simulated mode
continues to perform zero network requests, and live mode keeps the existing REST/WebSocket
protocols.

MVP limitation: because hydration must remain deterministic, a stored English preference can become
visible only after the initial Turkish render has hydrated.
