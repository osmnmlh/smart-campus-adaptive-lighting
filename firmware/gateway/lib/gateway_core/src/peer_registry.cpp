#include "gateway_core/peer_registry.hpp"

#include <algorithm>

namespace gateway_core {

bool is_zero_mac(const smart_campus::MacAddress& mac) {
  return std::all_of(mac.begin(), mac.end(), [](std::uint8_t value) { return value == 0; });
}

bool is_broadcast_mac(const smart_campus::MacAddress& mac) {
  return std::all_of(mac.begin(), mac.end(),
                     [](std::uint8_t value) { return value == 0xFFU; });
}

PeerRegistry::PeerRegistry(DeploymentMode mode, const std::array<Peer, 3>& peers)
    : mode_(mode), peers_(peers), validation_error_(PeerRegistryError::NONE) {
  for (std::size_t index = 0; index < peers_.size(); ++index) {
    const auto& peer = peers_[index];
    if (!smart_campus::is_valid(peer.node_id)) {
      validation_error_ = PeerRegistryError::INVALID_NODE;
      return;
    }
    if (is_zero_mac(peer.mac)) {
      validation_error_ = PeerRegistryError::INVALID_MAC;
      return;
    }
    if (is_broadcast_mac(peer.mac)) {
      validation_error_ = PeerRegistryError::BROADCAST_MAC;
      return;
    }
    if (mode_ == DeploymentMode::FIELD && !peer.encrypted) {
      validation_error_ = PeerRegistryError::FIELD_REQUIRES_ENCRYPTION;
      return;
    }
    for (std::size_t previous = 0; previous < index; ++previous) {
      if (peers_[previous].node_id == peer.node_id) {
        validation_error_ = PeerRegistryError::DUPLICATE_NODE;
        return;
      }
      if (peers_[previous].mac == peer.mac) {
        validation_error_ = PeerRegistryError::DUPLICATE_MAC;
        return;
      }
    }
  }
}

const Peer* PeerRegistry::find(const smart_campus::MacAddress& mac) const {
  if (!valid()) return nullptr;
  for (const auto& peer : peers_) {
    if (peer.mac == mac) return &peer;
  }
  return nullptr;
}

bool PeerRegistry::source_matches(const smart_campus::MacAddress& mac,
                                  smart_campus::NodeId claimed_node) const {
  const Peer* peer = find(mac);
  return peer != nullptr && peer->node_id == claimed_node;
}

}  // namespace gateway_core
