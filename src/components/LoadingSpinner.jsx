export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="spinner-wrap" role="status" aria-label={label}>
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function InlineSpinner({ size = 18 }) {
  return <span className="spinner inline" style={{ width: size, height: size }} aria-hidden="true" />;
}