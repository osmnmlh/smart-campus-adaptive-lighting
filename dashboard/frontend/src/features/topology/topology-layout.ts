import type { XYPosition } from '@xyflow/react';

const positions: Readonly<Record<string, XYPosition>> = {
  'sensor:sensor-bh1750-1': { x: 520, y: 0 },
  'sensor:sensor-ir-1': { x: 40, y: 150 },
  'sensor:sensor-ir-2': { x: 280, y: 150 },
  'sensor:sensor-ir-3': { x: 520, y: 150 },
  'sensor:sensor-ir-4': { x: 760, y: 150 },
  'sensor:sensor-ir-5': { x: 1000, y: 150 },
  'lamp:lamp-1': { x: 40, y: 350 },
  'lamp:lamp-2': { x: 280, y: 350 },
  'lamp:lamp-3': { x: 520, y: 350 },
  'lamp:lamp-4': { x: 760, y: 350 },
  'lamp:lamp-5': { x: 1000, y: 350 },
  'controller:node-1': { x: 150, y: 570 },
  'controller:node-2': { x: 520, y: 570 },
  'controller:node-3': { x: 890, y: 570 },
};

export function topologyPosition(entityId: string): XYPosition {
  const position = positions[entityId];
  if (!position) throw new Error(`Missing deterministic topology position: ${entityId}`);
  return { ...position };
}

export function topologyLayoutEntries(): readonly Readonly<[string, XYPosition]>[] {
  return Object.entries(positions).map(([id, position]) => [id, { ...position }] as const);
}
