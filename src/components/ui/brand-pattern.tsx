type BrandPatternProps = {
  pattern: "dots-green" | "dots-dark" | "scanlines" | "diagonal";
  className?: string;
  children?: React.ReactNode;
};

const patternClasses = {
  "dots-green": "ps-pattern-dots-green",
  "dots-dark": "ps-pattern-dots-dark",
  scanlines: "ps-pattern-scanlines",
  diagonal: "ps-pattern-diagonal",
};

export function BrandPattern({ pattern, className = "", children }: BrandPatternProps) {
  return (
    <div className={`${patternClasses[pattern]} ${className}`}>
      {children}
    </div>
  );
}
