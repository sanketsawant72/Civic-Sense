import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, ShieldCheck,
  Building2, Eye, EyeOff, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import {
  fetchDepartments, createDepartment,
  updateDepartment, deleteDepartment,
} from '../../utils/api.js';
import { CATEGORIES } from '../../data/constants';
import Modal from '../../components/ui/Modal';
import './ManageDepartments.css';

const EMPTY_FORM = {
  name: '', email: '', password: '', departmentCategory: '', departmentName: '', phone: '',
};

export default function ManageDepartments() {
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);  // { type, msg }
  const [modal,    setModal]    = useState(null);  // 'create' | 'edit'
  const [editing,  setEditing]  = useState(null);  // dept object being edited
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [showPwd,  setShowPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);  // id being deleted

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchDepartments();
      setDepts(data);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowPwd(false);
    setModal('create');
  }

  function openEdit(dept) {
    setForm({
      name:               dept.name,
      email:              dept.email,
      password:           '',
      departmentCategory: dept.departmentCategory,
      departmentName:     dept.departmentName,
      phone:              dept.phone || '',
    });
    setEditing(dept);
    setShowPwd(false);
    setModal('edit');
  }

  function closeModal() { setModal(null); setEditing(null); }

  function patch(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    // Auto-fill departmentName when category selected
    if (field === 'departmentCategory') {
      const cat = CATEGORIES.find((c) => c.id === value);
      if (cat) setForm((f) => ({ ...f, departmentCategory: value, departmentName: cat.dept }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        const created = await createDepartment(form);
        setDepts((d) => [...d, created]);
        showToast('success', `Department account created for ${created.departmentName}`);
      } else {
        const payload = { name: form.name, email: form.email, phone: form.phone };
        if (form.password) payload.password = form.password;
        const updated = await updateDepartment(editing.id, payload);
        setDepts((d) => d.map((x) => (x.id === editing.id ? updated : x)));
        showToast('success', 'Department account updated');
      }
      closeModal();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(dept) {
    try {
      const updated = await updateDepartment(dept.id, { active: !dept.active });
      setDepts((d) => d.map((x) => (x.id === dept.id ? updated : x)));
      showToast('success', `Account ${updated.active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Permanently delete this department account?')) return;
    setDeleting(id);
    try {
      await deleteDepartment(id);
      setDepts((d) => d.filter((x) => x.id !== id));
      showToast('success', 'Department account deleted');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleting(null);
    }
  }

  const usedCategories = new Set(depts.map((d) => d.departmentCategory));

  return (
    <div className="manage-depts">

      {/* ── Toast ── */}
      {toast && (
        <div className={`dept-toast dept-toast--${toast.type}`} role="alert">
          {toast.type === 'success'
            ? <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
            : <AlertCircle  size={14} strokeWidth={2.5} aria-hidden="true" />
          }
          {toast.msg}
          <button className="dept-toast__close" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <p className="section-label">Admin Portal</p>
          <h1 className="page-title">Manage Departments</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> New Department
        </button>
      </div>

      <p className="dept-sub">
        Each department has one login account scoped to its civic category.
        Department users can only view and update complaints in their assigned category.
      </p>

      {/* ── Grid ── */}
      {loading ? (
        <div className="dept-loading">Loading department accounts…</div>
      ) : depts.length === 0 ? (
        <div className="empty-state">
          <Building2 size={40} strokeWidth={1.2} className="empty-state__icon" aria-hidden="true" />
          <p className="empty-state__title">No department accounts yet</p>
          <p className="empty-state__desc">Create accounts for each civic department so they can manage their complaints.</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} strokeWidth={2.5} /> Create first department
          </button>
        </div>
      ) : (
        <div className="dept-grid">
          {depts.map((dept) => {
            const cat = CATEGORIES.find((c) => c.id === dept.departmentCategory);
            return (
              <div key={dept.id} className={'dept-card' + (!dept.active ? ' dept-card--inactive' : '')}>
                <div className="dept-card__header">
                  <span className="dept-card__cat-badge" style={{ '--cat-color': cat?.color || '#64748B' }}>
                    {cat?.label.en || dept.departmentCategory}
                  </span>
                  {!dept.active && <span className="dept-card__inactive-tag">Inactive</span>}
                </div>

                <h3 className="dept-card__name">{dept.departmentName}</h3>
                <p className="dept-card__login">
                  <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
                  {dept.email}
                </p>
                {dept.phone && (
                  <p className="dept-card__phone">{dept.phone}</p>
                )}

                <div className="dept-card__actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(dept)}>
                    <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Edit
                  </button>
                  <button
                    className={'btn btn-sm ' + (dept.active ? 'btn-outline' : 'btn-secondary')}
                    onClick={() => handleToggleActive(dept)}
                    title={dept.active ? 'Deactivate account' : 'Activate account'}
                  >
                    {dept.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn btn-sm dept-card__delete"
                    onClick={() => handleDelete(dept.id)}
                    disabled={deleting === dept.id}
                    aria-label={`Delete ${dept.departmentName}`}
                  >
                    <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'New Department Account' : `Edit — ${editing?.departmentName}`}
      >
        <form className="dept-form" onSubmit={handleSave} noValidate>

          {/* Category — only on create */}
          {modal === 'create' && (
            <div className="form-group">
              <label className="form-label" htmlFor="df-cat">
                Civic Category <span className="required">*</span>
              </label>
              <select id="df-cat" className="form-input" value={form.departmentCategory}
                onChange={(e) => patch('departmentCategory', e.target.value)} required>
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} disabled={usedCategories.has(c.id)}>
                    {c.label.en}{usedCategories.has(c.id) ? ' (already assigned)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department name */}
          <div className="form-group">
            <label className="form-label" htmlFor="df-dname">
              Department Name <span className="required">*</span>
            </label>
            <input id="df-dname" type="text" className="form-input"
              placeholder="e.g. Public Works Department"
              value={form.departmentName}
              onChange={(e) => patch('departmentName', e.target.value)}
              required={modal === 'create'} readOnly={modal === 'edit'} />
          </div>

          {/* Contact name */}
          <div className="form-group">
            <label className="form-label" htmlFor="df-name">
              Officer Name <span className="required">*</span>
            </label>
            <input id="df-name" type="text" className="form-input"
              placeholder="Full name of dept officer"
              value={form.name} onChange={(e) => patch('name', e.target.value)} required />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="df-email">
              Login Email <span className="required">*</span>
            </label>
            <input id="df-email" type="email" className="form-input"
              placeholder="dept@civicsense.in"
              value={form.email} onChange={(e) => patch('email', e.target.value)} required />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="df-phone">Phone (optional)</label>
            <input id="df-phone" type="tel" className="form-input"
              placeholder="+91 98765 43210"
              value={form.phone} onChange={(e) => patch('phone', e.target.value)} />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="df-pwd">
              Password {modal === 'create' && <span className="required">*</span>}
              {modal === 'edit' && <span className="form-hint" style={{ fontWeight: 400 }}> (leave blank to keep current)</span>}
            </label>
            <div className="input-icon-wrap">
              <input
                id="df-pwd"
                type={showPwd ? 'text' : 'password'}
                className="form-input input-with-icon-right"
                placeholder={modal === 'create' ? 'Min 6 characters' : 'New password (optional)'}
                value={form.password}
                onChange={(e) => patch('password', e.target.value)}
                required={modal === 'create'}
                style={{ paddingRight: 38 }}
              />
              <button type="button" className="pwd-toggle" style={{ right: 10, position: 'absolute' }}
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}>
                {showPwd ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
              </button>
            </div>
          </div>

          <div className="dept-form-footer">
            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <span className="auth-spinner" aria-hidden="true" />
                : modal === 'create' ? <Plus size={15} strokeWidth={2.5} /> : <Pencil size={14} strokeWidth={2} />
              }
              {saving ? 'Saving…' : modal === 'create' ? 'Create Account' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
