#pragma once

#include "smart_campus/identifiers.hpp"

namespace smart_campus {

constexpr bool owns_sensor(NodeId node, SensorId sensor) {
  return (node == NodeId::NODE_1 && (sensor == SensorId::IR1 || sensor == SensorId::IR2)) ||
         (node == NodeId::NODE_2 && sensor == SensorId::IR3) ||
         (node == NodeId::NODE_3 && (sensor == SensorId::IR4 || sensor == SensorId::IR5));
}

constexpr bool owns_lamp(NodeId node, LampId lamp) {
  return (node == NodeId::NODE_1 && (lamp == LampId::L1 || lamp == LampId::L2)) ||
         (node == NodeId::NODE_2 && lamp == LampId::L3) ||
         (node == NodeId::NODE_3 && (lamp == LampId::L4 || lamp == LampId::L5));
}

constexpr bool owns_electrical_measurement(NodeId node) {
  return node == NodeId::NODE_2;
}

}  // namespace smart_campus
