import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeClasses, createClass, updateClass, deleteClass } from '../services/classService';
import { subscribeAllStudents } from '../services/studentService';
import ClassCard from '../components/ClassCard';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { IconPlus } from '../components/icons';

const emptyForm = {
  subjectName: '',
  section: '',
  instructor: '',
  schoolYear: '',
  semester: '',
  schedule: '',
  room: '',
};

export default function Classes() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubs = [];
    unsubs.push(subscribeClasses((data) => setClasses(data)));
    const u2 = subscribeAllStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    unsubs.push(u2);
    return () => unsubs.forEach((u) => u?.());
  }, []);

  const studentsByClass = useMemo(() => {
    const map = {};
    for (const s of students) map[s.classId] = (map[s.classId] || 0) + 1;
    return map;
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.subjectName?.toLowerCase().includes(q) ||
        c.section?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q) ||
        c.room?.toLowerCase().includes(q)
    );
  }, [classes, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (cls) => {
    setEditing(cls);
    setForm({
      subjectName: cls.subjectName || '',
      section: cls.section || '',
      instructor: cls.instructor || '',
      schoolYear: cls.schoolYear || '',
      semester: cls.semester || '',
      schedule: cls.schedule || '',
      room: cls.room || '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subjectName.trim()) {
      push('Subject name is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateClass(editing.id, form);
        push('Class updated.', 'success');
      } else {
        await createClass(form);
        push('Class created.', 'success');
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to save class.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteClass(deleting.id);
      push('Class deleted.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to delete class.', 'error');
    }
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (loading) return <LoadingSpinner label="Loading classes..." />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Classes</h2>
          <p>Manage your classes, sections, and schedules.</p>
        </div>
        <div className="page-head-actions">
          <input
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <button className="btn btn-primary btn-with-icon" onClick={openCreate}>
            <IconPlus size={15} />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🏫"
            title={search ? 'No matching classes' : 'No classes yet'}
            message={search ? 'Try a different search term.' : 'Create your first class to begin.'}
            action={!search && (
              <button className="btn btn-primary btn-with-icon" onClick={openCreate}>
                <IconPlus size={15} />
                <span>Add Class</span>
              </button>
            )}
          />
        </div>
      ) : (
        <div className="class-grid">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              stats={{ studentCount: studentsByClass[cls.id] || 0 }}
              actions={
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cls)}>
                    Edit
                  </button>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => setDeleting(cls)}>
                    Delete
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/students/${cls.id}`)}>
                    Students
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Class' : 'Add Class'}
        width="600px"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Class'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-grid" style={{ gridColumn: '1 / -1' }}>
            <label className="field">
              <span>Subject Name *</span>
              <input
                type="text"
                required
                placeholder="e.g. Information Management"
                value={form.subjectName}
                onChange={set('subjectName')}
                autoFocus
              />
            </label>
            <label className="field">
              <span>Section</span>
              <input
                type="text"
                placeholder="e.g. BSIT 3F2"
                value={form.section}
                onChange={set('section')}
              />
            </label>
          </div>
          <label className="field">
            <span>Instructor</span>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={form.instructor}
              onChange={set('instructor')}
            />
          </label>
          <label className="field">
            <span>School Year</span>
            <input
              type="text"
              placeholder="e.g. 2026-2027"
              value={form.schoolYear}
              onChange={set('schoolYear')}
            />
          </label>
          <label className="field">
            <span>Semester</span>
            <select value={form.semester} onChange={set('semester')}>
              <option value="">Select...</option>
              <option>1st Semester</option>
              <option>2nd Semester</option>
              <option>Summer</option>
            </select>
          </label>
          <label className="field">
            <span>Room</span>
            <input
              type="text"
              placeholder="e.g. Laboratory 1"
              value={form.room}
              onChange={set('room')}
            />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Schedule</span>
            <input
              type="text"
              placeholder="e.g. Monday 8:00 AM - 10:00 AM"
              value={form.schedule}
              onChange={set('schedule')}
            />
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this class?"
        message={`This will permanently delete "${deleting?.subjectName}" and all of its students and attendance records. This cannot be undone.`}
        confirmLabel="Delete Class"
      />
    </div>
  );
}