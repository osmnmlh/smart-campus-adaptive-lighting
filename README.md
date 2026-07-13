# Smart Campus Adaptive Lighting System

ESP32-based adaptive smart lighting prototype with directional
motion detection, ESP-NOW node communication, PWM dimming and
basic fault monitoring.

## Project Status

Current phase: Hardware and single-node validation.

## MVP Scope

- 3 ESP32 nodes
- 5 dimmable lighting points
- 3 directional detection zones
- ESP-NOW communication
- Ambient light sensing
- Basic fault monitoring

## Repository Structure

- `firmware/`: ESP32 source code and module tests
- `hardware/`: pinouts, wiring and component documentation
- `docs/`: architecture and internship documentation
- `tests/`: test cases and measured results
- `dashboard/`: monitoring interface
- `reports/`: internship and MVP reports

## Safety

The prototype uses low-voltage 12V DC lighting.
ESP32 boards must not be powered directly from 12V.