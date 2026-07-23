#pragma once

#include <array>
#include <cstddef>

namespace gateway_core {

template <typename T, std::size_t Capacity>
class BoundedQueue {
 public:
  bool push(const T& value) {
    if (size_ == Capacity) return false;
    values_[tail_] = value;
    tail_ = (tail_ + 1U) % Capacity;
    ++size_;
    return true;
  }

  bool pop(T& value) {
    if (size_ == 0) return false;
    value = values_[head_];
    head_ = (head_ + 1U) % Capacity;
    --size_;
    return true;
  }

  std::size_t size() const { return size_; }
  constexpr std::size_t capacity() const { return Capacity; }
  bool empty() const { return size_ == 0; }
  bool full() const { return size_ == Capacity; }

 private:
  std::array<T, Capacity> values_{};
  std::size_t head_{0};
  std::size_t tail_{0};
  std::size_t size_{0};
};

}  // namespace gateway_core
