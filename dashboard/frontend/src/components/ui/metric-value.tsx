type MetricValueProps = Readonly<{
  value: string | number;
  label: string;
}>;

export function MetricValue({ value, label }: MetricValueProps) {
  return (
    <span className="metric-value">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}
