#include "gateway_core/gateway_core.hpp"

#include <limits>

namespace gateway_core {

ReceiveResult GatewayCore::receive(const smart_campus::MacAddress& source,
                                   const std::uint8_t* bytes, std::size_t length,
                                   std::uint32_t arrival_monotonic_ms) {
  if (registry_.find(source) == nullptr) return {ReceiveError::UNKNOWN_MAC, {}, 0};
  const smart_campus::DecodeResult decoded =
      smart_campus::decode_wire_message(bytes, length);
  if (!decoded) return {ReceiveError::INVALID_FRAME, decoded.error, 0};
  if (!registry_.source_matches(source, decoded.message.node_id))
    return {ReceiveError::SOURCE_NODE_MISMATCH, {}, 0};
  if (receive_queue_.full()) return {ReceiveError::QUEUE_FULL, {}, 0};
  if (gateway_sequence_ == std::numeric_limits<std::uint32_t>::max())
    return {ReceiveError::GATEWAY_SEQUENCE_EXHAUSTED, {}, 0};
  const std::uint32_t assigned = gateway_sequence_ + 1U;
  if (!receive_queue_.push({decoded.message, assigned, arrival_monotonic_ms}))
    return {ReceiveError::QUEUE_FULL, {}, 0};
  gateway_sequence_ = assigned;
  return {ReceiveError::NONE, smart_campus::CodecError::NONE, assigned};
}

}  // namespace gateway_core
