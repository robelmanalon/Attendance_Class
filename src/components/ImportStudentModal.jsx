import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { InlineSpinner } from './LoadingSpinner';
import { useToast } from './Toast';
import { parseStudentList, analyzeImport, generateMissingStudentNumber } from '../utils/studentParser';
import { getStudentsForClass, importStudents } from '../services/studentService';

export default function ImportStudentModal({ open, onClose, classId, onImported }) {
  const { push } = useToast();
  const [text, setText] = useState('');
  const [existing, setExisting] = useState([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [lastImported, setLastImported] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText('');
    setSummary(null);
    setLastImported(false);
    setImporting(false);
    if (!classId) return;
    getStudentsForClass(classId)
      .then(setExisting)
      .catch((err) => console.error(err));
  }, [open, classId]);

  const parsed = useMemo(() => (text.trim() ? parseStudentList(text) : { entries: [], errors: [] }), [text]);

  const analyzed = useMemo(() => {
    if (!parsed.entries.length) return [];
    return analyzeImport(parsed.entries, existing);
  }, [parsed.entries, existing]);

  const counts = useMemo(() => {
    const total = analyzed.length;
    const duplicates = analyzed.filter((e) => e.status?.duplicate).length;
    const alreadyExisting = analyzed.filter((e) => e.status?.alreadyExisting).length;
    const invalid = parsed.errors.length;
    const valid = total - duplicates - alreadyExisting;
    return { total, duplicates, alreadyExisting, invalid, valid };
  }, [analyzed, parsed.errors.length]);

  const clearAll = () => {
    setText('');
    setSummary(null);
    setLastImported(false);
  };

  const handleImport = async () => {
    if (!classId || counts.valid <= 0) return;
    setImporting(true);
    try {
      const validEntries = analyzed.filter((e) => !e.status?.duplicate && !e.status?.alreadyExisting);
      const res = await importStudents(classId, validEntries);
      setSummary(res);
      setLastImported(true);
      push(`Imported ${res.imported} student${res.imported === 1 ? '' : 's'} successfully.`, 'success');
      onImported?.(res);
      setText('');
    } catch (err) {
      console.error(err);
      push(err.message || 'Import failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const previewRows = () => {
    if (lastImported) {
      return null;
    }
    return analyzed.map((e, idx) => {
      const number = e.studentNumber || generateMissingStudentNumber(e, idx);
      let status = 'New';
      let tone = 'success';
      if (e.status?.duplicate) {
        status = 'Duplicate';
        tone = 'warning';
      } else if (e.status?.alreadyExisting) {
        status = 'Existing';
        tone = 'danger';
      }
      return (
        <tr key={idx}>
          <td className="mono">{number}</td>
          <td>{e.fullName}</td>
          <td>
            <span className={`status-pill ${tone}`}>{status}</span>
          </td>
        </tr>
      );
    });
  };

  const inputsDisabled = importing || lastImported;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Student List"
      width="720px"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={importing}>
            {lastImported ? 'Done' : 'Cancel'}
          </button>
          <button className="btn btn-ghost" onClick={clearAll} disabled={importing}>
            Clear
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing || counts.valid <= 0 || lastImported}>
            {importing ? <InlineSpinner size={14} /> : `Import Students (${counts.valid})`}
          </button>
        </>
      }
    >
      <div className="import-body">
        {!classId && (
          <div className="alert alert-warning">
            Please select a class before importing students. You can import students from the Class detail or Students page.
          </div>
        )}
        <p className="import-help">
          Paste your student list below. Supported formats:
        </p>
        <ul className="import-help">
          <li>
            <code>2026-001&#9;Juan Dela Cruz</code> (tab-separated)
          </li>
          <li>
            <code>2026-001, Juan Dela Cruz</code> (comma-separated)
          </li>
          <li>
            <code>Juan Dela Cruz</code> (name only)
          </li>
        </ul>

        <textarea
          className="import-textarea"
          rows="10"
          placeholder={'Paste student list here...\n\n2026-001\tJuan Dela Cruz\n2026-002\tMaria Santos\n2026-003\tPedro Garcia'}
          value={text}
          disabled={inputsDisabled}
          onChange={(e) => {
            setText(e.target.value);
            setLastImported(false);
            setSummary(null);
          }}
        />

        {parsed.errors.length > 0 && (
          <div className="alert alert-warning">
            <strong>{parsed.errors.length}</strong> line(s) could not be parsed:
            <ul>
              {parsed.errors.slice(0, 5).map((er, i) => (
                <li key={i}>
                  <code>{er.raw}</code> — {er.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analyzed.length > 0 && (
          <div className="import-preview">
            <div className="preview-head">
              <strong>Preview</strong>
              <span>
                {counts.total} parsed · {counts.valid} new · {counts.duplicates} duplicate · {counts.alreadyExisting} existing
              </span>
            </div>
            <div className="table-scroll" style={{ maxHeight: '260px' }}>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Student Number</th>
                    <th>Student Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>{previewRows() || <tr><td colSpan="3">Import complete.</td></tr>}</tbody>
              </table>
            </div>
          </div>
        )}

        {summary && (
          <div className="import-result">
            <h4>Import Results</h4>
            <div className="result-grid">
              <div className="result-box good">
                <strong>{summary.imported}</strong>
                <span>Successfully imported</span>
              </div>
              <div className="result-box warn">
                <strong>{summary.skippedExisting + summary.skippedDuplicates}</strong>
                <span>Duplicates skipped</span>
              </div>
              <div className="result-box bad">
                <strong>{parsed.errors.length}</strong>
                <span>Invalid entries</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}