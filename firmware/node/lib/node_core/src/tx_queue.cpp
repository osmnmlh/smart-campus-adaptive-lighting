#include "node_core/tx_queue.hpp"

#include <cstring>

namespace node_core {

std::uint8_t TxQueue::priority(smart_campus::MessageType type) {
  using smart_campus::MessageType;
  switch (type) {
    case MessageType::SENSOR_EVENT: return 4;
    case MessageType::LAMP_STATE: return 3;
    case MessageType::ELECTRICAL_MEASUREMENT: return 2;
    case MessageType::HEARTBEAT: return 1;
  }
  return 0;
}

void TxQueue::remove(std::size_t index) {
  if (index >= count_) return;
  for (std::size_t next = index + 1; next < count_; ++next)
    items_[next - 1] = items_[next];
  --count_;
  active_index_ = kCapacity;
}

bool TxQueue::evict_oldest(smart_campus::MessageType type) {
  std::size_t selected = kCapacity;
  std::uint32_t order = 0;
  for (std::size_t index = 0; index < count_; ++index) {
    if (items_[index].message_type != type) continue;
    if (selected == kCapacity || items_[index].insertion_order < order) {
      selected = index;
      order = items_[index].insertion_order;
    }
  }
  if (selected == kCapacity) return false;
  remove(selected);
  return true;
}

bool TxQueue::make_room(smart_campus::MessageType incoming,
                        std::size_t required) {
  if (required > kCapacity) return false;
  while (available() < required) {
    if (evict_oldest(smart_campus::MessageType::HEARTBEAT)) continue;
    if (priority(incoming) >
            priority(smart_campus::MessageType::ELECTRICAL_MEASUREMENT) &&
        evict_oldest(smart_campus::MessageType::ELECTRICAL_MEASUREMENT))
      continue;
    return false;
  }
  return true;
}

bool TxQueue::enqueue(const std::uint8_t* bytes, std::size_t length,
                      smart_campus::MessageType type, std::uint32_t sequence,
                      Destination destination) {
  if (bytes == nullptr || length == 0 ||
      length > smart_campus::kMaxWireBytes || sequence == 0 || full())
    return false;
  TxItem item{};
  std::memcpy(item.bytes.data(), bytes, length);
  item.length = length;
  item.message_type = type;
  item.sequence = sequence;
  item.destination = destination;
  item.insertion_order = next_order_++;
  items_[count_++] = item;
  return true;
}

const TxItem* TxQueue::begin_send() {
  if (active_index_ < count_) return &items_[active_index_];
  if (empty()) return nullptr;
  active_index_ = 0;
  for (std::size_t index = 1; index < count_; ++index) {
    const std::uint8_t candidate = priority(items_[index].message_type);
    const std::uint8_t selected = priority(items_[active_index_].message_type);
    if (candidate > selected ||
        (candidate == selected &&
         items_[index].insertion_order <
             items_[active_index_].insertion_order))
      active_index_ = index;
  }
  return &items_[active_index_];
}

void TxQueue::mark_send_result(bool success) {
  if (active_index_ >= count_) return;
  if (success) {
    remove(active_index_);
    return;
  }
  TxItem& item = items_[active_index_];
  ++item.attempts;
  if (item.attempts >= kMaxAttempts)
    remove(active_index_);
  else
    active_index_ = kCapacity;
}

}  // namespace node_core
