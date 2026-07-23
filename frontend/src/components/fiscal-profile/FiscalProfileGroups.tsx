import React, { useState, useEffect } from 'react';
import { fiscalProfileApi, FiscalProfileGroup } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';

// ---------------------------------------------------------------------------
// Design tokens — mirrors AiChatbot.tsx so both screens read as one product.
// ---------------------------------------------------------------------------
const T = {
  ink: '#1e2258',
  inkDark: '#12153f',
  inkTint: '#eef0fb',
  gold: '#c8974a',
  goldDark: '#a97a2f',
  goldTint: '#faf3e7',
  paper: '#f6f7fb',
  line: '#e6e8f2',
  text: '#1a1c33',
  muted: '#6b7089',
};

const Icon = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  ),
  Folder: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 21 12 17.56 5.8 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  ),
  Chevron: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  ),
  Male: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <circle cx="10" cy="14" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l6-6m0 0h-5m5 0v5" />
    </svg>
  ),
  Female: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="9" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v7m-3-3h6" />
    </svg>
  ),
  Empty: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l5 0" />
    </svg>
  ),
};

const initials = (a?: string, b?: string) => `${(a || '?').charAt(0)}${(b || '').charAt(0)}`.toUpperCase();

/** Small pill used for group attributes (gender, marital status, children). */
const Pill: React.FC<{ children: React.ReactNode; tone?: 'ink' | 'gold' }> = ({ children, tone = 'ink' }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
    style={tone === 'gold' ? { background: T.goldTint, color: T.goldDark } : { background: T.inkTint, color: T.ink }}
  >
    {children}
  </span>
);

export const FiscalProfileGroups: React.FC = () => {
  const [groups, setGroups] = useState<FiscalProfileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FiscalProfileGroup | null>(null);
  const [groupEmployees, setGroupEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fiscalProfileApi.getFiscalProfileGroups();
      setGroups(response.data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data: any) => {
    try {
      await fiscalProfileApi.createFiscalProfileGroup(data);
      setShowCreateModal(false);
      loadGroups();
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleViewEmployees = async (groupId: string) => {
    try {
      const response = await fiscalProfileApi.getGroupEmployees(groupId);
      setGroupEmployees(response.data);
      setSelectedGroup(groups.find((g) => g.id === groupId) || null);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="!border-[#e6e8f2] !p-0 overflow-hidden !shadow-[0_1px_2px_rgba(30,34,88,0.04),0_12px_28px_-12px_rgba(30,34,88,0.14)]">
        <CardHeader className="!border-0 !p-0">
          <div
            className="relative overflow-hidden px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${T.ink} 0%, ${T.inkDark} 100%)` }}
          >
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.06]" />
            <div className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/[0.04]" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#c8974a] ring-1 ring-white/15">
                  <Icon.Folder />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-white">Fiscal profile groups</h2>
                  <p className="mt-0.5 text-[12px] text-white/60">
                    {loading ? 'Loading…' : `${groups.length} group${groups.length === 1 ? '' : 's'} configured`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors"
                style={{ background: T.gold }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.goldDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
              >
                <Icon.Plus />
                New group
              </button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="!p-0">
          <div style={{ background: T.paper }} className="!p-5">
            {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-[#e6e8f2] bg-white p-4">
                  <div className="mb-3 h-9 w-9 rounded-lg bg-[#eef0fb]" />
                  <div className="mb-2 h-3.5 w-2/3 rounded bg-[#eef0fb]" />
                  <div className="h-3 w-1/2 rounded bg-[#f1f2f9]" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: T.inkTint, color: T.ink }}>
                <Icon.Empty />
              </div>
              <p className="text-[14px] font-semibold" style={{ color: T.text }}>
                No fiscal profile groups yet
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
                Create a group to define fiscal criteria you can assign to employees.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors"
                style={{ background: T.ink }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.inkDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.ink)}
              >
                <Icon.Plus />
                Create group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="group flex flex-col rounded-2xl border border-[#e6e8f2] bg-white p-4 transition-all hover:border-[#c8974a]/40 hover:shadow-[0_8px_20px_-10px_rgba(30,34,88,0.18)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: T.inkTint, color: T.ink }}
                    >
                      {group.gender === 'female' ? <Icon.Female /> : <Icon.Male />}
                    </div>
                    {group.head_of_family && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: T.goldTint, color: T.goldDark }}
                      >
                        <Icon.Star />
                        Head of family
                      </span>
                    )}
                  </div>

                  <h3 className="text-[13.5px] font-semibold" style={{ color: T.text }}>
                    {group.label}
                  </h3>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Pill>{group.gender}</Pill>
                    <Pill>{group.marital_status}</Pill>
                    <Pill tone="gold">
                      {group.children_count} child{group.children_count === 1 ? '' : 'ren'}
                    </Pill>
                  </div>

                  <div className="mt-4 border-t border-dashed border-[#e6e8f2] pt-3">
                    <button
                      type="button"
                      onClick={() => handleViewEmployees(group.id)}
                      className="flex items-center gap-1 text-[12.5px] font-medium transition-colors"
                      style={{ color: T.ink }}
                    >
                      <Icon.Users />
                      View employees
                      <Icon.Chevron />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </CardBody>
      </Card>

      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create fiscal profile group">
          <CreateGroupForm onSubmit={handleCreateGroup} onCancel={() => setShowCreateModal(false)} />
        </Modal>
      )}

      {selectedGroup && (
        <Modal isOpen={!!selectedGroup} onClose={() => setSelectedGroup(null)} title={`Employees · ${selectedGroup.label}`}>
          <div className="space-y-4">
            {groupEmployees.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: T.inkTint, color: T.ink }}>
                  <Icon.Users />
                </div>
                <p className="text-[13px] font-medium" style={{ color: T.text }}>
                  No employees assigned
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: T.muted }}>
                  Assign this profile to employees from the fiscal assistant.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {groupEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2.5 rounded-lg border border-[#eceef7] bg-white px-3 py-2 transition-colors hover:border-[#dcdff0]"
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
                      style={{ background: T.inkTint, color: T.ink }}
                    >
                      {initials(emp.nom, emp.prenom)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium" style={{ color: T.text }}>
                        {emp.nom} {emp.prenom}
                      </p>
                      <p className="text-[11px]" style={{ color: T.muted }}>
                        {emp.matricule}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end border-t border-[#e6e8f2] pt-3">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors"
                style={{ background: T.ink }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.inkDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.ink)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Field primitives for the create-group form
// ---------------------------------------------------------------------------

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: T.text }}>
      {label}
    </label>
    {children}
    {hint && (
      <p className="mt-1 text-[11px]" style={{ color: T.muted }}>
        {hint}
      </p>
    )}
  </div>
);

const inputClass =
  'w-full rounded-lg border border-[#e6e8f2] bg-[#f6f7fb] px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#1e2258]/40 focus:bg-white focus:ring-2 focus:ring-[#1e2258]/10';

const CreateGroupForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    gender: 'male',
    marital_status: 'single',
    children_count: 0,
    disabled_children_count: 0,
    student_non_scholarship_children_count: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender">
          <select
            className={inputClass}
            style={{ color: T.text }}
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>

        <Field label="Marital status">
          <select
            className={inputClass}
            style={{ color: T.text }}
            value={formData.marital_status}
            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </Field>
      </div>

      <Field label="Children count">
        <input
          type="number"
          min="0"
          className={inputClass}
          style={{ color: T.text }}
          value={formData.children_count}
          onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Disabled children" hint="Included in the total above">
          <input
            type="number"
            min="0"
            className={inputClass}
            style={{ color: T.text }}
            value={formData.disabled_children_count}
            onChange={(e) => setFormData({ ...formData, disabled_children_count: parseInt(e.target.value) || 0 })}
          />
        </Field>

        <Field label="Students, no scholarship">
          <input
            type="number"
            min="0"
            className={inputClass}
            style={{ color: T.text }}
            value={formData.student_non_scholarship_children_count}
            onChange={(e) =>
              setFormData({ ...formData, student_non_scholarship_children_count: parseInt(e.target.value) || 0 })
            }
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-[#e6e8f2] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#e6e8f2] bg-white px-4 py-2 text-[12.5px] font-medium transition-colors hover:bg-[#f6f7fb]"
          style={{ color: T.text }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors"
          style={{ background: T.ink }}
          onMouseEnter={(e) => (e.currentTarget.style.background = T.inkDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = T.ink)}
        >
          Create group
        </button>
      </div>
    </form>
  );
};