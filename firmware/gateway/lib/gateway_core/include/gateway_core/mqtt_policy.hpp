#pragma once

namespace gateway_core {

enum class MqttDeploymentProfile {
  LAB,
  FIELD,
  CI,
};

enum class MqttPolicyError {
  NONE,
  MISSING_URI,
  UNSUPPORTED_SCHEME,
  EMBEDDED_CREDENTIALS,
  FIELD_REQUIRES_MQTTS,
  MISSING_USERNAME,
  MISSING_PASSWORD,
  MISSING_CA_CERTIFICATE,
  INVALID_CA_CERTIFICATE,
  PLACEHOLDER_CA_CERTIFICATE,
  PLAINTEXT_WITH_CA_CERTIFICATE,
};

struct MqttPolicyInput {
  MqttDeploymentProfile profile{MqttDeploymentProfile::LAB};
  const char* uri{nullptr};
  const char* username{nullptr};
  const char* password{nullptr};
  const char* ca_certificate_pem{nullptr};
};

struct MqttPolicyResult {
  MqttPolicyError error{MqttPolicyError::NONE};
  bool tls_enabled{false};
  bool deployable{false};

  explicit operator bool() const { return error == MqttPolicyError::NONE; }
};

MqttPolicyResult validate_mqtt_policy(const MqttPolicyInput& input);
const char* mqtt_policy_error_message(MqttPolicyError error);

}  // namespace gateway_core
