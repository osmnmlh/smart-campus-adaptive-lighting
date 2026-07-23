#pragma once

#include <cstddef>
#include <cstdint>

#include "gateway_core/bounded_queue.hpp"
#include "gateway_core/peer_registry.hpp"
#include "smart_campus/protocol_limits.hpp"
#include "smart_campus/wire_codec.hpp"

namespace gateway_core {

enum class ReceiveError {
  NONE,
  UNKNOWN_MAC,
  SOURCE_NODE_MISMATCH,
  INVALID_FRAME,
  QUEUE_FULL,
  GATEWAY_SEQUENCE_EXHAUSTED,
};

struct AcceptedFrame {
  smart_campus::WireMessage message{};
  std::uint32_t gateway_sequence{0};
  std::uint32_t arrival_monotonic_ms{0};
};

struct ReceiveResult {
  ReceiveError error{ReceiveError::NONE};
  smart_campus::CodecError codec_error{smart_campus::CodecError::NONE};
  std::uint32_t gateway_sequence{0};
  explicit operator bool() const { return error == ReceiveError::NONE; }
};

class GatewayCore {
 public:
  explicit GatewayCore(const PeerRegistry& registry) : registry_(registry) {}
  ReceiveResult receive(const smart_campus::MacAddress& source, const std::uint8_t* bytes,
                        std::size_t length, std::uint32_t arrival_monotonic_ms);
  bool pop(AcceptedFrame& frame) { return receive_queue_.pop(frame); }
  std::size_t queued() const { return receive_queue_.size(); }
  std::uint32_t last_gateway_sequence() const { return gateway_sequence_; }
  void set_gateway_sequence_for_test(std::uint32_t value) { gateway_sequence_ = value; }

 private:
  const PeerRegistry& registry_;
  BoundedQueue<AcceptedFrame, smart_campus::kGatewayReceiveQueueCapacity> receive_queue_{};
  std::uint32_t gateway_sequence_{0};
};

}  // namespace gateway_core
