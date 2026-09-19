import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ margin: '0 auto 16px' }}>
          404
        </div>
        <h2>Page not found</h2>
        <p className="modal-text mt-2 mb-3">The page you are looking for does not exist.</p>
        <Link className="btn btn-primary" to="/">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}