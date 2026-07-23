#include "smart_campus/wire_codec.hpp"

#include <cstring>

#include "smart_campus/crc32.hpp"
#include "smart_campus/ownership.hpp"

namespace smart_campus {
namespace {

constexpr std::size_t kHeartbeatBytes = 4;
constexpr std::size_t kSensorBytes = 7;
constexpr std::size_t kLampBytes = 6;
constexpr std::size_t kElectricalBytes = 16;

void put_u16(std::uint8_t* out, std::uint16_t value) {
  out[0] = static_cast<std::uint8_t>(value);
  out[1] = static_cast<std::uint8_t>(value >> 8U);
}

void put_u32(std::uint8_t* out, std::uint32_t value) {
  for (std::uint8_t shift = 0; shift < 4; ++shift) {
    out[shift] = static_cast<std::uint8_t>(value >> (8U * shift));
  }
}

std::uint16_t get_u16(const std::uint8_t* in) {
  return static_cast<std::uint16_t>(in[0]) |
         (static_cast<std::uint16_t>(in[1]) << 8U);
}

std::uint32_t get_u32(const std::uint8_t* in) {
  return static_cast<std::uint32_t>(in[0]) |
         (static_cast<std::uint32_t>(in[1]) << 8U) |
         (static_cast<std::uint32_t>(in[2]) << 16U) |
         (static_cast<std::uint32_t>(in[3]) << 24U);
}

std::size_t payload_size(MessageType type) {
  switch (type) {
    case MessageType::HEARTBEAT: return kHeartbeatBytes;
    case MessageType::SENSOR_EVENT: return kSensorBytes;
    case MessageType::LAMP_STATE: return kLampBytes;
    case MessageType::ELECTRICAL_MEASUREMENT: return kElectricalBytes;
  }
  return 0;
}

CodecError validate(const WireMessage& message) {
  if (!is_valid(message.node_id)) return CodecError::INVALID_NODE;
  if (!is_valid(message.message_type)) return CodecError::INVALID_MESSAGE_TYPE;
  if (message.boot_counter == 0 || message.boot_counter > 99999999U)
    return CodecError::INVALID_BOOT_COUNTER;
  if (message.sequence == 0) return CodecError::INVALID_SEQUENCE;
  switch (message.message_type) {
    case MessageType::HEARTBEAT: {
      const auto* value = std::get_if<HeartbeatPayload>(&message.payload);
      if (value == nullptr || value->communication_channel < 1 ||
          value->communication_channel > 13)
        return CodecError::INVALID_PAYLOAD;
      return CodecError::NONE;
    }
    case MessageType::SENSOR_EVENT: {
      const auto* value = std::get_if<SensorEventPayload>(&message.payload);
      if (value == nullptr || value->sensor_id < SensorId::IR1 ||
          value->sensor_id > SensorId::IR5 ||
          value->state > SensorState::ACTIVE || value->edge > SensorEdge::FALLING_EDGE)
        return CodecError::INVALID_PAYLOAD;
      return owns_sensor(message.node_id, value->sensor_id)
                 ? CodecError::NONE
                 : CodecError::OWNERSHIP_VIOLATION;
    }
    case MessageType::LAMP_STATE: {
      const auto* value = std::get_if<LampStatePayload>(&message.payload);
      if (value == nullptr || value->lamp_id < LampId::L1 || value->lamp_id > LampId::L5 ||
          value->operating_state > LampOperatingState::ACTIVE ||
          value->health > LampHealth::FAULT || value->brightness_percent > 100 ||
          value->target_brightness_percent > 100 || value->pwm_duty_percent > 100)
        return CodecError::INVALID_PAYLOAD;
      return owns_lamp(message.node_id, value->lamp_id)
                 ? CodecError::NONE
                 : CodecError::OWNERSHIP_VIOLATION;
    }
    case MessageType::ELECTRICAL_MEASUREMENT:
      if (std::get_if<ElectricalMeasurementPayload>(&message.payload) == nullptr)
        return CodecError::INVALID_PAYLOAD;
      return owns_electrical_measurement(message.node_id)
                 ? CodecError::NONE
                 : CodecError::OWNERSHIP_VIOLATION;
  }
  return CodecError::INVALID_MESSAGE_TYPE;
}

}  // namespace

std::size_t encoded_size(const WireMessage& message) {
  const std::size_t payload = payload_size(message.message_type);
  return payload == 0 ? 0 : kWireHeaderBytes + payload + kWireCrcBytes;
}

EncodeResult encode_wire_message(const WireMessage& message, std::uint8_t* output,
                                 std::size_t capacity) {
  if (output == nullptr) return {CodecError::NULL_ARGUMENT, 0};
  const CodecError validation = validate(message);
  if (validation != CodecError::NONE) return {validation, 0};
  const std::size_t payload_bytes = payload_size(message.message_type);
  const std::size_t total = kWireHeaderBytes + payload_bytes + kWireCrcBytes;
  if (total > kMaxWireBytes) return {CodecError::OVERSIZED_FRAME, 0};
  if (capacity < total) return {CodecError::BUFFER_TOO_SMALL, 0};

  std::memset(output, 0, total);
  output[0] = 'S';
  output[1] = 'C';
  output[2] = kWireVersion;
  output[3] = static_cast<std::uint8_t>(message.node_id);
  output[4] = static_cast<std::uint8_t>(message.message_type);
  put_u32(output + 6, message.boot_counter);
  put_u32(output + 10, message.sequence);
  put_u32(output + 14, message.uptime_ms);
  put_u16(output + 18, static_cast<std::uint16_t>(payload_bytes));
  std::uint8_t* payload = output + kWireHeaderBytes;

  if (const auto* value = std::get_if<HeartbeatPayload>(&message.payload)) {
    payload[0] = value->firmware_major;
    payload[1] = value->firmware_minor;
    payload[2] = value->firmware_patch;
    payload[3] = value->communication_channel;
  } else if (const auto* value = std::get_if<SensorEventPayload>(&message.payload)) {
    payload[0] = static_cast<std::uint8_t>(value->sensor_id);
    payload[1] = static_cast<std::uint8_t>(value->state);
    payload[2] = static_cast<std::uint8_t>(value->edge);
    put_u32(payload + 3, value->event_uptime_ms);
  } else if (const auto* value = std::get_if<LampStatePayload>(&message.payload)) {
    payload[0] = static_cast<std::uint8_t>(value->lamp_id);
    payload[1] = static_cast<std::uint8_t>(value->operating_state);
    payload[2] = static_cast<std::uint8_t>(value->health);
    payload[3] = value->brightness_percent;
    payload[4] = value->target_brightness_percent;
    payload[5] = value->pwm_duty_percent;
  } else if (const auto* value = std::get_if<ElectricalMeasurementPayload>(&message.payload)) {
    put_u32(payload, value->voltage_mv);
    put_u32(payload + 4, value->current_ma);
    put_u32(payload + 8, value->power_mw);
    put_u32(payload + 12, value->energy_mwh);
  }
  put_u32(output + total - kWireCrcBytes, crc32(output, total - kWireCrcBytes));
  return {CodecError::NONE, total};
}

DecodeResult decode_wire_message(const std::uint8_t* input, std::size_t length) {
  if (input == nullptr) return {CodecError::NULL_ARGUMENT, {}};
  if (length > kMaxWireBytes) return {CodecError::OVERSIZED_FRAME, {}};
  if (length < kWireHeaderBytes + kWireCrcBytes)
    return {CodecError::TRUNCATED_FRAME, {}};
  if (input[0] != 'S' || input[1] != 'C') return {CodecError::BAD_MAGIC, {}};
  if (input[2] != kWireVersion) return {CodecError::UNSUPPORTED_VERSION, {}};
  const std::size_t payload_bytes = get_u16(input + 18);
  const std::size_t expected = kWireHeaderBytes + payload_bytes + kWireCrcBytes;
  if (expected > kMaxWireBytes) return {CodecError::OVERSIZED_FRAME, {}};
  if (length < expected) return {CodecError::TRUNCATED_FRAME, {}};
  if (length > expected) return {CodecError::TRAILING_BYTES, {}};
  if (get_u32(input + expected - kWireCrcBytes) !=
      crc32(input, expected - kWireCrcBytes))
    return {CodecError::CRC_MISMATCH, {}};

  WireMessage message{};
  message.node_id = static_cast<NodeId>(input[3]);
  message.message_type = static_cast<MessageType>(input[4]);
  message.boot_counter = get_u32(input + 6);
  message.sequence = get_u32(input + 10);
  message.uptime_ms = get_u32(input + 14);
  const std::size_t required_payload = payload_size(message.message_type);
  if (required_payload == 0) return {CodecError::INVALID_MESSAGE_TYPE, {}};
  if (payload_bytes != required_payload) return {CodecError::INVALID_PAYLOAD_LENGTH, {}};
  const std::uint8_t* payload = input + kWireHeaderBytes;

  switch (message.message_type) {
    case MessageType::HEARTBEAT:
      message.payload = HeartbeatPayload{payload[0], payload[1], payload[2], payload[3]};
      break;
    case MessageType::SENSOR_EVENT:
      message.payload = SensorEventPayload{static_cast<SensorId>(payload[0]),
                                           static_cast<SensorState>(payload[1]),
                                           static_cast<SensorEdge>(payload[2]),
                                           get_u32(payload + 3)};
      break;
    case MessageType::LAMP_STATE:
      message.payload = LampStatePayload{
          static_cast<LampId>(payload[0]),
          static_cast<LampOperatingState>(payload[1]),
          static_cast<LampHealth>(payload[2]), payload[3], payload[4], payload[5]};
      break;
    case MessageType::ELECTRICAL_MEASUREMENT:
      message.payload = ElectricalMeasurementPayload{
          get_u32(payload), get_u32(payload + 4), get_u32(payload + 8),
          get_u32(payload + 12)};
      break;
  }
  const CodecError validation = validate(message);
  return validation == CodecError::NONE ? DecodeResult{CodecError::NONE, message}
                                        : DecodeResult{validation, {}};
}

}  // namespace smart_campus
