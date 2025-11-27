interface ProgressBarProps {
  current: number;
  target: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  current,
  target,
  showLabel = true,
  size = "md",
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isCompleted = percentage >= 100;

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 ${sizeClasses[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted
              ? "bg-gradient-to-r from-green-500 to-emerald-400"
              : "bg-gradient-to-r from-blue-500 to-cyan-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-gray-600">
            {(current / 1000).toFixed(1)} kg / {(target / 1000).toFixed(1)} kg
          </span>
          <span
            className={`font-medium ${
              isCompleted ? "text-green-600" : "text-blue-600"
            }`}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
