#include "gateway_core/outbox.hpp"

namespace gateway_core {

std::uint8_t Outbox::priority(smart_campus::MessageType type) {
  switch (type) {
    case smart_campus::MessageType::SENSOR_EVENT: return 4;
    case smart_campus::MessageType::LAMP_STATE: return 3;
    case smart_campus::MessageType::ELECTRICAL_MEASUREMENT: return 2;
    case smart_campus::MessageType::HEARTBEAT: return 1;
  }
  return 0;
}

bool Outbox::enqueue(const PublishItem& item) {
  if (full() || item.gateway_sequence == 0 || item.topic.empty() || item.payload.empty())
    return false;
  for (std::size_t index = 0; index < used_.size(); ++index) {
    if (!used_[index]) {
      values_[index] = item;
      used_[index] = true;
      ++size_;
      return true;
    }
  }
  return false;
}

PublishItem* Outbox::next() {
  PublishItem* selected = nullptr;
  for (std::size_t index = 0; index < used_.size(); ++index) {
    if (!used_[index] || values_[index].awaiting_ack ||
        values_[index].attempts >= smart_campus::kMaxPublishAttempts)
      continue;
    if (selected == nullptr || priority(values_[index].message_type) >
                                   priority(selected->message_type) ||
        (priority(values_[index].message_type) == priority(selected->message_type) &&
         values_[index].gateway_sequence < selected->gateway_sequence))
      selected = &values_[index];
  }
  return selected;
}

bool Outbox::mark_sent(std::uint32_t gateway_sequence, std::uint32_t packet_id) {
  for (std::size_t index = 0; index < used_.size(); ++index) {
    auto& item = values_[index];
    if (used_[index] && item.gateway_sequence == gateway_sequence && !item.awaiting_ack &&
        item.attempts < smart_campus::kMaxPublishAttempts && packet_id != 0) {
      ++item.attempts;
      item.packet_id = packet_id;
      item.awaiting_ack = true;
      return true;
    }
  }
  return false;
}

bool Outbox::mark_failed(std::uint32_t gateway_sequence) {
  for (std::size_t index = 0; index < used_.size(); ++index) {
    auto& item = values_[index];
    if (used_[index] && item.gateway_sequence == gateway_sequence) {
      item.awaiting_ack = false;
      item.packet_id = 0;
      return item.attempts < smart_campus::kMaxPublishAttempts;
    }
  }
  return false;
}

bool Outbox::mark_rejected(std::uint32_t gateway_sequence) {
  for (std::size_t index = 0; index < used_.size(); ++index) {
    auto& item = values_[index];
    if (used_[index] && item.gateway_sequence == gateway_sequence &&
        !item.awaiting_ack && item.attempts < smart_campus::kMaxPublishAttempts) {
      ++item.attempts;
      return item.attempts < smart_campus::kMaxPublishAttempts;
    }
  }
  return false;
}

void Outbox::release_unacknowledged() {
  for (std::size_t index = 0; index < used_.size(); ++index) {
    if (used_[index] && values_[index].awaiting_ack) {
      values_[index].awaiting_ack = false;
      values_[index].packet_id = 0;
    }
  }
}

bool Outbox::acknowledge(std::uint32_t packet_id) {
  if (packet_id == 0) return false;
  for (std::size_t index = 0; index < used_.size(); ++index) {
    if (used_[index] && values_[index].awaiting_ack &&
        values_[index].packet_id == packet_id) {
      used_[index] = false;
      --size_;
      return true;
    }
  }
  return false;
}

}  // namespace gateway_core
