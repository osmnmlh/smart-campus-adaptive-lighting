#pragma once

#include <array>

#include "smart_campus/identifiers.hpp"

namespace node_core {

enum class DeploymentMode { LAB, FIELD };
enum class PeerRole : std::uint8_t { GATEWAY, NODE };

struct Peer {
  PeerRole role;
  smart_campus::NodeId node_id;
  smart_campus::MacAddress mac;
  bool encrypted;
};

enum class PeerRegistryError {
  NONE,
  INVALID_NODE,
  INVALID_MAC,
  BROADCAST_MAC,
  DUPLICATE_ROLE,
  DUPLICATE_NODE,
  DUPLICATE_MAC,
  FIELD_REQUIRES_ENCRYPTION,
};

class PeerRegistry {
 public:
  PeerRegistry(DeploymentMode mode, const std::array<Peer, 3>& peers);
  bool valid() const { return error_ == PeerRegistryError::NONE; }
  PeerRegistryError validation_error() const { return error_; }
  const Peer* find(const smart_campus::MacAddress& mac) const;
  bool node_source_matches(const smart_campus::MacAddress& mac,
                           smart_campus::NodeId claimed_node) const;

 private:
  std::array<Peer, 3> peers_;
  PeerRegistryError error_{PeerRegistryError::NONE};
};

}  // namespace node_core
