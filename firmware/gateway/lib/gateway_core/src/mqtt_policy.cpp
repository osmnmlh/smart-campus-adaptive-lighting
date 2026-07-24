#include "gateway_core/mqtt_policy.hpp"

#include <cstring>

namespace gateway_core {
namespace {

constexpr const char* kPemBegin = "-----BEGIN CERTIFICATE-----";
constexpr const char* kPemEnd = "-----END CERTIFICATE-----";

bool empty(const char* value) {
  return value == nullptr || value[0] == '\0';
}

bool starts_with(const char* value, const char* prefix) {
  return value != nullptr &&
         std::strncmp(value, prefix, std::strlen(prefix)) == 0;
}

bool contains_placeholder(const char* value) {
  return value != nullptr &&
         (std::strstr(value, "REPLACE_WITH") != nullptr ||
          std::strstr(value, "PLACEHOLDER") != nullptr ||
          std::strstr(value, "NOT_A_REAL_CERTIFICATE") != nullptr);
}

bool has_embedded_credentials(const char* uri) {
  const char* scheme_end = std::strstr(uri, "://");
  if (scheme_end == nullptr) return false;
  const char* authority = scheme_end + 3;
  const char* path = std::strchr(authority, '/');
  const char* at = std::strchr(authority, '@');
  return at != nullptr && (path == nullptr || at < path);
}

MqttPolicyError validate_ca(const char* pem) {
  if (empty(pem)) return MqttPolicyError::MISSING_CA_CERTIFICATE;
  if (contains_placeholder(pem))
    return MqttPolicyError::PLACEHOLDER_CA_CERTIFICATE;
  const char* begin = std::strstr(pem, kPemBegin);
  const char* end = std::strstr(pem, kPemEnd);
  if (begin == nullptr || end == nullptr || end <= begin + std::strlen(kPemBegin))
    return MqttPolicyError::INVALID_CA_CERTIFICATE;
  return MqttPolicyError::NONE;
}

}  // namespace

MqttPolicyResult validate_mqtt_policy(const MqttPolicyInput& input) {
  MqttPolicyResult result{};
  result.deployable = input.profile == MqttDeploymentProfile::FIELD;

  if (empty(input.uri)) {
    result.error = MqttPolicyError::MISSING_URI;
    result.deployable = false;
    return result;
  }
  if (has_embedded_credentials(input.uri)) {
    result.error = MqttPolicyError::EMBEDDED_CREDENTIALS;
    result.deployable = false;
    return result;
  }

  const bool mqtts = starts_with(input.uri, "mqtts://");
  const bool mqtt = starts_with(input.uri, "mqtt://");
  if (!mqtt && !mqtts) {
    result.error = MqttPolicyError::UNSUPPORTED_SCHEME;
    result.deployable = false;
    return result;
  }
  result.tls_enabled = mqtts;

  if (input.profile == MqttDeploymentProfile::FIELD) {
    if (!mqtts) {
      result.error = MqttPolicyError::FIELD_REQUIRES_MQTTS;
    } else if (empty(input.username)) {
      result.error = MqttPolicyError::MISSING_USERNAME;
    } else if (empty(input.password)) {
      result.error = MqttPolicyError::MISSING_PASSWORD;
    } else {
      result.error = validate_ca(input.ca_certificate_pem);
    }
  } else if (mqtts) {
    result.error = validate_ca(input.ca_certificate_pem);
  } else if (!empty(input.ca_certificate_pem)) {
    result.error = MqttPolicyError::PLAINTEXT_WITH_CA_CERTIFICATE;
  }

  if (result.error != MqttPolicyError::NONE ||
      input.profile != MqttDeploymentProfile::FIELD)
    result.deployable = false;
  return result;
}

const char* mqtt_policy_error_message(MqttPolicyError error) {
  switch (error) {
    case MqttPolicyError::NONE:
      return "gateway: MQTT configuration accepted";
    case MqttPolicyError::MISSING_URI:
      return "gateway: MQTT configuration rejected; URI is missing";
    case MqttPolicyError::UNSUPPORTED_SCHEME:
      return "gateway: MQTT configuration rejected; scheme must be mqtt or mqtts";
    case MqttPolicyError::EMBEDDED_CREDENTIALS:
      return "gateway: MQTT configuration rejected; URI credentials are forbidden";
    case MqttPolicyError::FIELD_REQUIRES_MQTTS:
      return "gateway: MQTT configuration rejected; field profile requires MQTTS";
    case MqttPolicyError::MISSING_USERNAME:
      return "gateway: MQTT configuration rejected; username is missing";
    case MqttPolicyError::MISSING_PASSWORD:
      return "gateway: MQTT configuration rejected; password is missing";
    case MqttPolicyError::MISSING_CA_CERTIFICATE:
      return "gateway: MQTT configuration rejected; CA certificate is missing";
    case MqttPolicyError::INVALID_CA_CERTIFICATE:
      return "gateway: MQTT configuration rejected; CA certificate format is invalid";
    case MqttPolicyError::PLACEHOLDER_CA_CERTIFICATE:
      return "gateway: MQTT configuration rejected; CA certificate is a placeholder";
    case MqttPolicyError::PLAINTEXT_WITH_CA_CERTIFICATE:
      return "gateway: MQTT configuration rejected; CA cannot secure plaintext MQTT";
  }
  return "gateway: MQTT configuration rejected";
}

}  // namespace gateway_core
