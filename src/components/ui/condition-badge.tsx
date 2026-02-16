type ConditionBadgeProps = {
  grade: "A" | "B" | "C";
  className?: string;
};

const gradeConfig = {
  A: { label: "Som ny", color: "bg-green-eco text-white" },
  B: { label: "Meget god", color: "bg-green-light text-white" },
  C: { label: "OK stand", color: "bg-gray text-white" },
};

export function ConditionBadge({ grade, className = "" }: ConditionBadgeProps) {
  const config = gradeConfig[grade];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
