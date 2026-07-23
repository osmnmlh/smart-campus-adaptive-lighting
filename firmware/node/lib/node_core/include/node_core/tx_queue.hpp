#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

#include "smart_campus/protocol_limits.hpp"
#include "smart_campus/wire_protocol.hpp"

namespace node_core {

enum class Destination : std::uint8_t { GATEWAY, NODE_1, NODE_2, NODE_3 };

struct TxItem {
  std::array<std::uint8_t, smart_campus::kMaxWireBytes> bytes{};
  std::size_t length{0};
  smart_campus::MessageType message_type{
      smart_campus::MessageType::HEARTBEAT};
  std::uint32_t sequence{0};
  Destination destination{Destination::GATEWAY};
  std::uint8_t attempts{0};
  std::uint32_t insertion_order{0};
};

class TxQueue {
 public:
  static constexpr std::size_t kCapacity = 16;
  static constexpr std::uint8_t kMaxAttempts = 3;

  bool make_room(smart_campus::MessageType incoming, std::size_t required);
  bool enqueue(const std::uint8_t* bytes, std::size_t length,
               smart_campus::MessageType type, std::uint32_t sequence,
               Destination destination);
  const TxItem* begin_send();
  void mark_send_result(bool success);
  bool empty() const { return count_ == 0; }
  bool full() const { return count_ == kCapacity; }
  std::size_t size() const { return count_; }
  std::size_t available() const { return kCapacity - count_; }
  const TxItem* at(std::size_t index) const {
    return index < count_ ? &items_[index] : nullptr;
  }

 private:
  static std::uint8_t priority(smart_campus::MessageType type);
  bool evict_oldest(smart_campus::MessageType type);
  void remove(std::size_t index);

  std::array<TxItem, kCapacity> items_{};
  std::size_t count_{0};
  std::size_t active_index_{kCapacity};
  std::uint32_t next_order_{1};
};

}  // namespace node_core
