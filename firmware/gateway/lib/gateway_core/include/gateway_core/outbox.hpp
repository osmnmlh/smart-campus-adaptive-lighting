#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>

#include "smart_campus/identifiers.hpp"
#include "smart_campus/protocol_limits.hpp"

namespace gateway_core {

struct PublishItem {
  std::uint32_t packet_id{0};
  std::uint32_t gateway_sequence{0};
  smart_campus::MessageType message_type{smart_campus::MessageType::HEARTBEAT};
  std::string topic{};
  std::string payload{};
  std::uint8_t attempts{0};
  bool awaiting_ack{false};
};

class Outbox {
 public:
  bool enqueue(const PublishItem& item);
  PublishItem* next();
  bool mark_sent(std::uint32_t gateway_sequence, std::uint32_t packet_id);
  bool mark_rejected(std::uint32_t gateway_sequence);
  bool mark_failed(std::uint32_t gateway_sequence);
  void release_unacknowledged();
  bool acknowledge(std::uint32_t packet_id);
  std::size_t size() const { return size_; }
  bool full() const { return size_ == values_.size(); }

 private:
  static std::uint8_t priority(smart_campus::MessageType type);
  std::array<PublishItem, smart_campus::kGatewayOutboxCapacity> values_{};
  std::array<bool, smart_campus::kGatewayOutboxCapacity> used_{};
  std::size_t size_{0};
};

}  // namespace gateway_core
