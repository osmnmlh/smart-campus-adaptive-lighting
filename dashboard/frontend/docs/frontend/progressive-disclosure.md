# Dashboard progressive disclosure

The dashboard uses progressive disclosure to keep operational state immediately scannable while preserving deterministic technical detail. No information, domain calculation, fixture, or control behavior is removed by this presentation change.

## Information hierarchy

- Overview always shows system mode, node health, lamp activity, active alerts, data provenance, snapshot context, lamp brightness gauges, and the active-alert summary. Node communication and ownership plus detailed lamp, PWM, and sensor quality data are available in two closed-by-default panels.
- Scenarios always shows the selector, controls, Stage, lifecycle errors, and progress. The complete read-only snapshot, including lamp states, active sensor IDs, and offline node IDs, is in a closed-by-default panel and continues to update while closed.
- Alerts uses six selector-backed summary cards for total, active, resolved, critical, warning, and latest values. Decorative icons are hidden from assistive technology. Critical rows retain visible severity text and semantic attributes; active critical rows receive stronger emphasis without changing filtering, sorting, selection, or detail behavior.
- Topology keeps the canvas, controls, legend, detail panel, and keyboard-accessible entity list visible. Communication, ownership, sensing, and ambient relationships remain in the DOM and are exposed through an operable Relationship details panel.

## DisclosurePanel

`DisclosurePanel` is a reusable native `details`/`summary` component. It supports a title, optional description, initial open state, custom classes, optional decorative icon, and optional count. Native semantics provide keyboard operation without JavaScript state, accordion rules, persistence, URL state, or storage. The chevron is decorative, and its transition is disabled under `prefers-reduced-motion`.

Always-visible information is operationally important, time-sensitive, critical, or necessary to understand provenance. Collapsible information is deterministic technical breakdown or debug detail that remains useful on demand but is not required for the first scan.

Metrics and Logs are intentionally outside this redesign. Internationalization is also deferred to a separate phase; new labels remain concise English copy. Backend, contracts, scenario engine, graph data, and alert domain behavior are unchanged.
