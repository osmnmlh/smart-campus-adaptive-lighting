# Visual foundation

The dashboard uses `lucide-react` version `1.25.0` as an exact dependency. This stable release explicitly supports React 19 through its peer dependency range. Lucide was selected for its small named imports, consistent stroke language, and accessible React primitives. Components import only the icons they render; there is no dynamic registry or bulk icon import.

## Status badges

`StatusBadge` keeps its visible text, `status-badge` class, and `data-tone` contract. Each tone supplies one decorative default icon:

- `ready`: `CheckCircle2`
- `pending`: `Clock`
- `neutral`: `Circle`
- `warning`: `AlertTriangle`
- `critical`: `OctagonAlert`

The icon is `aria-hidden` and non-focusable because the adjacent label owns the meaning. A caller may supply a decorative icon override without replacing the text status.

## Gauge meter

`GaugeMeter` is a responsive plain-SVG percentage/range presentation. It exposes meter semantics, minimum, maximum, current value, a visible label and unit, and a visible source when `dataSource` is supplied. The progress stroke is derived deterministically from the supplied value and maximum.

The component rejects non-finite values, a non-positive maximum, negative values, and values above the maximum. It shows an explicit unavailable state instead of silently clamping or presenting an incorrect accessible value.

Gauges are limited to metrics with a real, known maximum, such as `brightnessPercent`, `targetBrightnessPercent`, or `pwmDutyPercent`. They must not be used with an invented maximum for lux, voltage, current, power, or energy. The Overview lamp summary is the first production use and consumes each lamp's actual brightness percentage with the Overview model's actual data source.

## Provenance and accessibility

Data provenance remains visible text: `MEASURED`, `ESTIMATED`, `CALCULATED`, `SIMULATED`, or `NOMINAL`. Color does not replace the source label, and an estimated or simulated reading is never presented as measured or live.

Status icons and gauge SVG geometry are decorative and do not enter the tab order. Visible values and labels carry the meaning. Gauge stroke transitions follow the dashboard's global reduced-motion rule and are effectively disabled when the user requests reduced motion.
