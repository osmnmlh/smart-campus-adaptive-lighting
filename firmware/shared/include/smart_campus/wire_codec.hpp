#pragma once

#include <cstddef>
#include <cstdint>

#include "smart_campus/protocol_limits.hpp"
#include "smart_campus/wire_protocol.hpp"

namespace smart_campus {

enum class CodecError {
  NONE,
  NULL_ARGUMENT,
  BUFFER_TOO_SMALL,
  OVERSIZED_FRAME,
  TRUNCATED_FRAME,
  TRAILING_BYTES,
  BAD_MAGIC,
  UNSUPPORTED_VERSION,
  INVALID_NODE,
  INVALID_MESSAGE_TYPE,
  INVALID_BOOT_COUNTER,
  INVALID_SEQUENCE,
  INVALID_PAYLOAD_LENGTH,
  INVALID_PAYLOAD,
  OWNERSHIP_VIOLATION,
  CRC_MISMATCH,
};

struct EncodeResult {
  CodecError error{CodecError::NONE};
  std::size_t bytes_written{0};
  explicit operator bool() const { return error == CodecError::NONE; }
};

struct DecodeResult {
  CodecError error{CodecError::NONE};
  WireMessage message{};
  explicit operator bool() const { return error == CodecError::NONE; }
};

std::size_t encoded_size(const WireMessage& message);
EncodeResult encode_wire_message(const WireMessage& message, std::uint8_t* output,
                                 std::size_t capacity);
DecodeResult decode_wire_message(const std::uint8_t* input, std::size_t length);

}  // namespace smart_campus
