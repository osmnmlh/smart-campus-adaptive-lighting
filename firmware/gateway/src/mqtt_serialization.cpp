#include "mqtt_serialization.hpp"

#include <ArduinoJson.h>
#include <ctime>

#include "gateway_config.hpp"
#include "gateway_version.hpp"
#include "smart_campus/identifiers.hpp"

namespace gateway_mqtt {
namespace {

const char* sensor_id(smart_campus::SensorId value) {
  switch (value) {
    case smart_campus::SensorId::IR1: return "IR1";
    case smart_campus::SensorId::IR2: return "IR2";
    case smart_campus::SensorId::IR3: return "IR3";
    case smart_campus::SensorId::IR4: return "IR4";
    case smart_campus::SensorId::IR5: return "IR5";
  }
  return "";
}

const char* lamp_id(smart_campus::LampId value) {
  switch (value) {
    case smart_campus::LampId::L1: return "L1";
    case smart_campus::LampId::L2: return "L2";
    case smart_campus::LampId::L3: return "L3";
    case smart_campus::LampId::L4: return "L4";
    case smart_campus::LampId::L5: return "L5";
  }
  return "";
}

const char* operating_state(smart_campus::LampOperatingState value) {
  switch (value) {
    case smart_campus::LampOperatingState::OFF: return "OFF";
    case smart_campus::LampOperatingState::STANDBY: return "STANDBY";
    case smart_campus::LampOperatingState::PRE_LIGHT: return "PRE_LIGHT";
    case smart_campus::LampOperatingState::ACTIVE: return "ACTIVE";
  }
  return "";
}

const char* lamp_health(smart_campus::LampHealth value) {
  switch (value) {
    case smart_campus::LampHealth::HEALTHY: return "HEALTHY";
    case smart_campus::LampHealth::WARNING: return "WARNING";
    case smart_campus::LampHealth::FAULT: return "FAULT";
  }
  return "";
}

const char* topic_kind(smart_campus::MessageType value) {
  switch (value) {
    case smart_campus::MessageType::HEARTBEAT: return "heartbeat";
    case smart_campus::MessageType::SENSOR_EVENT:
    case smart_campus::MessageType::LAMP_STATE: return "events";
    case smart_campus::MessageType::ELECTRICAL_MEASUREMENT: return "telemetry";
  }
  return "";
}

bool finalize(JsonDocument& document, std::size_t capacity, String& output) {
  const std::size_t required = measureJson(document);
  if (required == 0 || required + 1 > capacity) return false;
  char buffer[kEnvelopeJsonCapacity]{};
  if (capacity > sizeof(buffer)) return false;
  const std::size_t written = serializeJson(document, buffer, capacity);
  if (written != required) return false;
  output = buffer;
  return true;
}

}  // namespace

bool format_utc(std::uint64_t epoch_ms, char* output, std::size_t capacity) {
  if (output == nullptr || capacity < 25 || epoch_ms < 1577836800000ULL) return false;
  const std::time_t seconds = static_cast<std::time_t>(epoch_ms / 1000ULL);
  std::tm utc{};
  if (gmtime_r(&seconds, &utc) == nullptr) return false;
  const int written = std::snprintf(
      output, capacity, "%04d-%02d-%02dT%02d:%02d:%02d.%03lluZ", utc.tm_year + 1900,
      utc.tm_mon + 1, utc.tm_mday, utc.tm_hour, utc.tm_min, utc.tm_sec,
      static_cast<unsigned long long>(epoch_ms % 1000ULL));
  return written > 0 && static_cast<std::size_t>(written) < capacity;
}

bool serialize_envelope(const gateway_core::AcceptedFrame& frame,
                        const char* gateway_boot_id, const char* received_at,
                        String& topic, String& json) {
  if (gateway_boot_id == nullptr || received_at == nullptr ||
      frame.gateway_sequence == 0)
    return false;
  const auto& message = frame.message;
  const std::string message_id =
      smart_campus::build_message_id(message.node_id, message.boot_counter, message.sequence);
  if (message_id.empty()) return false;

  topic = "smart-campus/v1/nodes/";
  topic += smart_campus::to_string(message.node_id);
  topic += "/";
  topic += topic_kind(message.message_type);

  JsonDocument document;
  document["schemaVersion"] = 1;
  document["gatewayId"] = gateway_config::kGatewayId;
  document["gatewayBootId"] = gateway_boot_id;
  document["gatewaySequence"] = frame.gateway_sequence;
  document["receivedAt"] = received_at;
  document["messageId"] = message_id.c_str();
  JsonObject node = document["nodeMessage"].to<JsonObject>();
  node["schemaVersion"] = 1;
  node["nodeId"] = smart_campus::to_string(message.node_id);
  const std::string boot_id = smart_campus::format_boot_id(message.boot_counter);
  node["bootId"] = boot_id.c_str();
  node["sequence"] = message.sequence;
  node["uptimeMs"] = message.uptime_ms;
  node["messageType"] = smart_campus::to_string(message.message_type);
  JsonObject payload = node["payload"].to<JsonObject>();

  if (const auto* value = std::get_if<smart_campus::HeartbeatPayload>(&message.payload)) {
    char version[20]{};
    std::snprintf(version, sizeof(version), "%u.%u.%u", value->firmware_major,
                  value->firmware_minor, value->firmware_patch);
    payload["firmwareVersion"] = version;
    payload["communicationChannel"] = value->communication_channel;
  } else if (const auto* value =
                 std::get_if<smart_campus::SensorEventPayload>(&message.payload)) {
    payload["sensorId"] = sensor_id(value->sensor_id);
    payload["state"] =
        value->state == smart_campus::SensorState::ACTIVE ? "ACTIVE" : "INACTIVE";
    if (value->edge != smart_campus::SensorEdge::NONE)
      payload["edge"] =
          value->edge == smart_campus::SensorEdge::RISING ? "RISING" : "FALLING";
    payload["eventUptimeMs"] = value->event_uptime_ms;
  } else if (const auto* value =
                 std::get_if<smart_campus::LampStatePayload>(&message.payload)) {
    payload["lampId"] = lamp_id(value->lamp_id);
    payload["operatingState"] = operating_state(value->operating_state);
    payload["health"] = lamp_health(value->health);
    payload["brightnessPercent"] = value->brightness_percent;
    payload["targetBrightnessPercent"] = value->target_brightness_percent;
    payload["pwmDutyPercent"] = value->pwm_duty_percent;
  } else if (const auto* value =
                 std::get_if<smart_campus::ElectricalMeasurementPayload>(&message.payload)) {
    payload["sensorId"] = "INA219_1";
    payload["scopeType"] = "LAMP";
    payload["scopeId"] = "L3";
    payload["voltageV"] = static_cast<double>(value->voltage_mv) / 1000.0;
    payload["currentA"] = static_cast<double>(value->current_ma) / 1000.0;
    payload["powerW"] = static_cast<double>(value->power_mw) / 1000.0;
    payload["energyWh"] = static_cast<double>(value->energy_mwh) / 1000.0;
    payload["dataSource"] = "MEASURED";
  } else {
    return false;
  }
  return finalize(document, kEnvelopeJsonCapacity, json);
}

bool serialize_status(const char* gateway_boot_id, const char* status,
                      std::uint32_t uptime_ms, std::uint8_t channel,
                      const char* published_at, String& json) {
  if (gateway_boot_id == nullptr || status == nullptr || published_at == nullptr ||
      channel < 1 || channel > 13)
    return false;
  JsonDocument document;
  document["schemaVersion"] = 1;
  document["gatewayId"] = gateway_config::kGatewayId;
  document["gatewayBootId"] = gateway_boot_id;
  document["status"] = status;
  document["uptimeMs"] = uptime_ms;
  document["communicationChannel"] = channel;
  document["firmwareVersion"] = SC_GATEWAY_FIRMWARE_VERSION;
  document["publishedAt"] = published_at;
  document["transportSource"] = "GATEWAY";
  return finalize(document, kStatusJsonCapacity, json);
}

}  // namespace gateway_mqtt
