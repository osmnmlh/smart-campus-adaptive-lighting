#pragma once

#include <array>

#include "smart_campus/identifiers.hpp"

namespace gateway_core {

enum class DeploymentMode { LAB, FIELD };

struct Peer {
  smart_campus::NodeId node_id;
  smart_campus::MacAddress mac;
  bool encrypted;
};

enum class PeerRegistryError {
  NONE,
  INVALID_NODE,
  INVALID_MAC,
  BROADCAST_MAC,
  DUPLICATE_NODE,
  DUPLICATE_MAC,
  FIELD_REQUIRES_ENCRYPTION,
};

class PeerRegistry {
 public:
  PeerRegistry(DeploymentMode mode, const std::array<Peer, 3>& peers);
  PeerRegistryError validation_error() const { return validation_error_; }
  bool valid() const { return validation_error_ == PeerRegistryError::NONE; }
  const Peer* find(const smart_campus::MacAddress& mac) const;
  bool source_matches(const smart_campus::MacAddress& mac,
                      smart_campus::NodeId claimed_node) const;

 private:
  DeploymentMode mode_;
  std::array<Peer, 3> peers_;
  PeerRegistryError validation_error_;
};

bool is_zero_mac(const smart_campus::MacAddress& mac);
bool is_broadcast_mac(const smart_campus::MacAddress& mac);

}  // namespace gateway_core
