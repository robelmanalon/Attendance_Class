export default function DashboardCard({ label, value, icon, tone = 'indigo', sub }) {
  return (
    <div className={`dash-card tone-${tone}`}>
      <div className="dash-icon">{icon}</div>
      <div className="dash-info">
        <span className="dash-label">{label}</span>
        <strong className="dash-value">{value}</strong>
        {sub ? <span className="dash-sub">{sub}</span> : null}
      </div>
    </div>
  );
}