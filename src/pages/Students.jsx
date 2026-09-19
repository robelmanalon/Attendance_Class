import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { subscribeClasses } from '../services/classService';
import {
  subscribeAllStudents,
  subscribeStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../services/studentService';
import ImportStudentModal from '../components/ImportStudentModal';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/format';
import { exportStudentMasterlistPDF } from '../utils/pdfExport';
import { IconPlus, IconDownload, IconUpload } from '../components/icons';

const emptyForm = { studentNumber: '', fullName: '', email: '', status: 'active' };

export default function Students() {
  const { classId } = useParams();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState(classId || '');
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [exporting, setExporting] = useState(false);

  const effectiveClass = filterClass || (classes.length === 1 ? classes[0].id : '');

  useEffect(() => {
    const unsubClasses = subscribeClasses((data) => {
      setClasses(data);
      if (data.length === 0) setLoading(false);
    });
    let unsubStudents = null;
    if (effectiveClass) {
      unsubStudents = subscribeStudents(effectiveClass, (data) => {
        setStudents(data);
        setLoading(false);
      });
    } else {
      unsubStudents = subscribeAllStudents((data) => {
        setStudents(data);
        setLoading(false);
      });
    }
    return () => {
      unsubClasses?.();
      unsubStudents?.();
    };
  }, [effectiveClass]);

  const classById = useMemo(() => {
    const map = {};
    for (const c of classes) map[c.id] = c;
    return map;
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentNumber?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditing(null);
    setTargetClassId(effectiveClass || classes[0]?.id || '');
    setFormOpen(true);
  };

  const openEdit = (st) => {
    setEditing(st);
    setForm({
      studentNumber: st.studentNumber || '',
      fullName: st.fullName || '',
      email: st.email || '',
      status: st.status || 'active',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editing) {
      if (!form.fullName.trim()) {
        push('Student name is required.', 'warning');
        return;
      }
      setSaving(true);
      try {
        await updateStudent(editing.id, form);
        push('Student updated.', 'success');
        setFormOpen(false);
      } catch (err) {
        console.error(err);
        push(err.message || 'Failed to update student.', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!targetClassId) {
      push('Select a class for this student.', 'warning');
      return;
    }
    if (!form.fullName.trim()) {
      push('Student name is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await createStudent({ ...form, classId: targetClassId });
      push('Student added.', 'success');
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to add student.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!filtered.length) {
      push('No students to export.', 'warning');
      return;
    }
    setExporting(true);
    try {
      const groups = {};
      for (const s of filtered) {
        const cls = classById[s.classId];
        const key = cls ? cls.id : '__none__';
        if (!groups[key]) {
          groups[key] = {
            label: cls ? `${cls.subjectName} · ${cls.section || ''}`.replace(/·\s*$/, '').trim() : 'Unassigned',
            students: [],
          };
        }
        groups[key].students.push({ studentNumber: s.studentNumber || '', studentName: s.fullName || '' });
      }
      const sections = Object.values(groups);
      const cls = filterClass ? classById[filterClass] : null;
      const meta = {
        subjectName: cls?.subjectName || 'All Subjects',
        section: cls?.section || 'All Sections',
        instructor: cls?.instructor || '',
        schoolYear: cls?.schoolYear || '',
        semester: cls?.semester || '',
        room: cls?.room || '',
      };
      const safe = (s) => String(s || 'All').replace(/[^\w-]+/g, '_');
      await exportStudentMasterlistPDF({
        sections,
        meta,
        fileName: `Student_Masterlist_${safe(cls?.section)}.pdf`,
      });
      push('Student masterlist exported.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading students..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Students</h2>
          <p>Search, manage, and import students across your classes.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-with-icon" onClick={openAdd}>
            <IconPlus size={15} />
            <span>Add Student</span>
          </button>
          <button className="btn btn-ghost btn-with-icon" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : (
              <>
                <IconDownload size={15} />
                <span>Export PDF</span>
              </>
            )}
          </button>
          <button className="btn btn-primary btn-with-icon" onClick={() => setImportOpen(true)}>
            <IconUpload size={15} />
            <span>Import List</span>
          </button>
        </div>
      </div>

      <div className="filter-bar card">
        <div className="filter-grid">
          <label className="field">
            <span>Search</span>
            <input
              placeholder="Search by name, number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Filter by Class</span>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subjectName} · {c.section || ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="👥"
            title="No students found"
            message={
              effectiveClass
                ? 'This class has no students yet. Import a student list to add them in bulk.'
                : 'Create a class first, then import its student list.'
            }
            action={
              effectiveClass && (
                <button className="btn btn-primary btn-sm" onClick={() => setImportOpen(true)}>
                  📥 Import Student List
                </button>
              )
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="🔍" title="No matches" message="No students match your search." />
        </div>
      ) : (
        <div className="card table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Class</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((st) => {
                const cls = classById[st.classId];
                return (
                  <tr key={st.id}>
                    <td className="mono">{st.studentNumber || '—'}</td>
                    <td>
                      <Link to={`/students/detail/${st.id}`}>{st.fullName}</Link>
                    </td>
                    <td className="muted">{st.email || '—'}</td>
                    <td>
                      {cls ? (
                        <Link to={`/classes/${cls.id}`}>
                          {cls.subjectName}
                          {cls.section ? ` · ${cls.section}` : ''}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${st.status === 'active' ? 'present' : 'default'}`}>
                        {st.status || 'active'}
                      </span>
                    </td>
                    <td className="nowrap muted">{formatDate(st.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-ghost btn-sm" to={`/students/detail/${st.id}`}>
                          View
                        </Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(st)}>
                          Edit
                        </button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => setDeleting(st)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ImportStudentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        classId={effectiveClass}
        onImported={() => push('Student list imported.', 'success')}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Student' : 'Add Student'}
        width="520px"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Student'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="form-grid">
          {!editing && (
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>Class</span>
              <select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
                <option value="">Select a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} · {c.section || ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Student Number</span>
            <input
              type="text"
              placeholder="e.g. 2026-001"
              value={form.studentNumber}
              onChange={(e) => setForm((p) => ({ ...p, studentNumber: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Full Name *</span>
            <input
              type="text"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              autoFocus={!editing}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="student@school.edu"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await deleteStudent(deleting.id);
            push('Student deleted.', 'success');
          } catch (err) {
            console.error(err);
            push(err.message || 'Failed to delete student.', 'error');
          }
        }}
        title="Delete this student?"
        message={`This will permanently remove "${deleting?.fullName}" and their attendance records.`}
        confirmLabel="Delete Student"
      />
    </div>
  );
}