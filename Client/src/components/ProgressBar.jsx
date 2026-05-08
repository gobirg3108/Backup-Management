function ProgressBar({ percent, message, status = "running" }) {
  const colors = {
    running: "bg-blue-500",
    done: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };

  const barColor = colors[status] || colors.running;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 truncate pr-2">{message}</span>
        <span className="text-sm font-bold text-gray-800 shrink-0">
          {percent}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
