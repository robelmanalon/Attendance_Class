import { useState } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import { IconFileText, IconDownload, IconPrinter } from './icons';

export default function ExportButtons({ onExport, busyKey = null }) {
  const [busy, setBusy] = useState(null);

  const handle = async (type) => {
    if (busy) return;
    setBusy(type);
    try {
      await onExport(type);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const config = {
    pdf: { label: 'Export PDF', icon: IconFileText, cls: 'btn-dark' },
    excel: { label: 'Excel', icon: IconDownload, cls: 'btn-success' },
    csv: { label: 'CSV', icon: IconDownload, cls: 'btn-info' },
    print: { label: 'Print', icon: IconPrinter, cls: 'btn-ghost' },
  };

  return (
    <div className="export-buttons">
      {Object.entries(config).map(([type, cfg]) => (
        <button key={type} className={`btn ${cfg.cls} btn-with-icon`} onClick={() => handle(type)} disabled={busy !== null}>
          {busy === type ? <InlineSpinner size={14} /> : (
            <>
              <cfg.icon size={14} />
              <span>{cfg.label}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}