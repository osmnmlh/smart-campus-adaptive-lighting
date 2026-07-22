export const NODE_ORIGIN_WIRE_BUDGET_BYTES = 220 as const;

export const getUtf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;
