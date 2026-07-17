export const formatScenarioDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const formatScenarioTimestamp = (elapsedMs: number): string =>
  new Date(Date.parse('2026-06-15T20:30:00.000Z') + elapsedMs).toISOString();

export const formatEventType = (type: string): string =>
  type
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
