export function PulseDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
    </span>
  );
}
