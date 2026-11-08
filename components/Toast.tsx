export function Toast({ message }: { message: string }) {
  return (
    <div className={`toast ${message ? "is-show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
