export default function Monogram({ className = "w-32" }: { className?: string }) {
  return <div role="img" aria-label="J and D monogram" className={`monogram ${className}`} />;
}
