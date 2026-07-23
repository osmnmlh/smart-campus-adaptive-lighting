#include "node_core/peer_registry.hpp"

#include <algorithm>

namespace node_core {
namespace {

bool all_bytes(const smart_campus::MacAddress& mac, std::uint8_t value) {
  return std::all_of(mac.begin(), mac.end(),
                     [value](std::uint8_t byte) { return byte == value; });
}

}  // namespace

PeerRegistry::PeerRegistry(DeploymentMode mode,
                           const std::array<Peer, 3>& peers)
    : peers_(peers) {
  std::size_t gateway_count = 0;
  for (std::size_t index = 0; index < peers_.size(); ++index) {
    const Peer& peer = peers_[index];
    if (peer.role == PeerRole::GATEWAY) {
      ++gateway_count;
    } else if (!smart_campus::is_valid(peer.node_id)) {
      error_ = PeerRegistryError::INVALID_NODE;
      return;
    }
    if (all_bytes(peer.mac, 0)) {
      error_ = PeerRegistryError::INVALID_MAC;
      return;
    }
    if (all_bytes(peer.mac, 0xFFU)) {
      error_ = PeerRegistryError::BROADCAST_MAC;
      return;
    }
    if (mode == DeploymentMode::FIELD && !peer.encrypted) {
      error_ = PeerRegistryError::FIELD_REQUIRES_ENCRYPTION;
      return;
    }
    for (std::size_t previous = 0; previous < index; ++previous) {
      if (peers_[previous].mac == peer.mac) {
        error_ = PeerRegistryError::DUPLICATE_MAC;
        return;
      }
      if (peer.role == PeerRole::NODE &&
          peers_[previous].role == PeerRole::NODE &&
          peers_[previous].node_id == peer.node_id) {
        error_ = PeerRegistryError::DUPLICATE_NODE;
        return;
      }
    }
  }
  if (gateway_count != 1) error_ = PeerRegistryError::DUPLICATE_ROLE;
}

const Peer* PeerRegistry::find(
    const smart_campus::MacAddress& mac) const {
  if (!valid()) return nullptr;
  for (const Peer& peer : peers_) {
    if (peer.mac == mac) return &peer;
  }
  return nullptr;
}

bool PeerRegistry::node_source_matches(
    const smart_campus::MacAddress& mac,
    smart_campus::NodeId claimed_node) const {
  const Peer* peer = find(mac);
  return peer != nullptr && peer->role == PeerRole::NODE &&
         peer->node_id == claimed_node;
}

}  // namespace node_core
