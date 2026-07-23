# Firmware workspace

This directory contains the portable gateway foundation and the common three-profile
lighting-node firmware. The gateway is a fourth ESP32 (`GW_1`); no lighting node
doubles as the gateway. The old `smart_lighting_node` sketch remains only as historical
prototype material; `node/` is the canonical node firmware.

## Reproducible toolchain

- Python 3.13
- PlatformIO Core `6.1.19` from `requirements-dev.txt`
- `platformio/espressif32@7.0.1`
- `bblanchon/ArduinoJson@7.4.3`
- Native CI compiler: GCC `16.1.0`, MinGW-w64 `14.0.0`, UCRT/POSIX WinLibs release 3

Create the ignored environment from the repository root:

```powershell
python -m venv .venv-firmware
.\.venv-firmware\Scripts\python.exe -m pip install -r firmware\requirements-dev.txt
```

On Windows, PlatformIO native tests require `gcc`/`g++`. The build first uses
`SC_NATIVE_TOOLCHAIN_BIN` when provided, then the ignored
`.toolchains/winlibs/mingw64/bin` location. The verified portable archive is
`winlibs-x86_64-posix-seh-gcc-16.1.0-mingw-w64ucrt-14.0.0-r3.7z`, SHA-256
`69445c900db5237656bef65b41cc28123c7203e8ae17d69a284c4c2c841220f2`.
The compiler is a local test dependency and is never committed.

## Validation

```powershell
.\.venv-firmware\Scripts\pio.exe test -d firmware/gateway -e native
.\.venv-firmware\Scripts\pio.exe run -d firmware/gateway -e esp32dev-ci
.\.venv-firmware\Scripts\pio.exe test -d firmware/node -e native
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node1-ci
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node2-ci
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node3-ci
```

These commands compile and test only. They do not flash a board or open a serial port.
Field mode deliberately fails to compile until the ignored
`firmware/gateway/include/gateway_secrets.hpp` or
`firmware/node/include/node_secrets.hpp` has been provisioned for the selected
project.

The compact ESP-NOW wire frames, including CRC, are 28 bytes for heartbeat, 31 bytes
for sensor events, 30 bytes for lamp state, and 40 bytes for electrical measurements.
All remain below the 220-byte hard limit. MQTT JSON is a separate bounded
serialization step and is validated by the TypeScript contract fixtures in
`firmware/test-vectors`.
