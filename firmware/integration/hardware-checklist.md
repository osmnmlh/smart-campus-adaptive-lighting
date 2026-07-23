# Hardware MVP checklist

## Gateway

- Confirm the board is `GW_1`; use 2.4 GHz Wi-Fi and fixed channel 6.
- Provision broker URI/port, MQTT username/password, gateway MAC, node MAC allowlist,
  PMK/LMKs, and 115200 baud serial monitoring.

## NODE_1

- IR1 GPIO25, IR2 GPIO26; L1 GPIO32 and L2 GPIO33 PWM.
- Provision the `GW_1`, `NODE_2`, and `NODE_3` peer MACs and field keys.

## NODE_2

- IR3 GPIO25; L3 GPIO32 PWM.
- BH1750 and INA219 on I2C SDA21/SCL22; INA219 measures only the L3 power path.
- Provision the `GW_1`, `NODE_1`, and `NODE_3` peer MACs and field keys.

## NODE_3

- IR4 GPIO25, IR5 GPIO26; L4 GPIO32 and L5 GPIO33 PWM.
- Provision the `GW_1`, `NODE_1`, and `NODE_2` peer MACs and field keys.

## Electrical safety

- Use common GND and a regulated ESP32 supply; never feed 12 V into an ESP32 pin.
- Verify D4184 input/output orientation and the separate LED power path.
- Put INA219 only in the L3 measurement path and confirm current direction/rating.
