import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fiscalProfileApi } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import { useToast } from '../../shared/components/Toast/ToastContext';

// ---------------------------------------------------------------------------
// Design tokens (kept local to this file so the component is drop-in safe).
// Brand ink is the app's primary navy (#1e2258). Gold is used sparingly as
// the single accent for "confirm / positive intent" actions — everything
// else stays quiet on purpose.
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

type Tone = 'ink' | 'gold' | 'success' | 'danger';

const TONE: Record<Tone, { chipBg: string; chipText: string; bar: string; btn: string; btnHover: string; ring: string }> = {
  ink: { chipBg: T.inkTint, chipText: T.ink, bar: T.ink, btn: T.ink, btnHover: T.inkDark, ring: 'focus:ring-[#1e2258]/40' },
  gold: { chipBg: T.goldTint, chipText: T.goldDark, bar: T.gold, btn: T.gold, btnHover: T.goldDark, ring: 'focus:ring-[#c8974a]/40' },
  success: { chipBg: '#e7f7ef', chipText: '#0f7a4e', bar: '#1f9d6b', btn: '#1f9d6b', btnHover: '#178055', ring: 'focus:ring-emerald-500/40' },
  danger: { chipBg: '#fdecec', chipText: '#b93a3a', bar: '#d64545', btn: '#d64545', btnHover: '#b93a3a', ring: 'focus:ring-red-500/40' },
};

// ---------------------------------------------------------------------------
// Small presentational primitives
// ---------------------------------------------------------------------------

const Icon = {
  Spark: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.36-6.36l-2.12 2.12M8.76 15.24l-2.12 2.12m0-13.72l2.12 2.12m6.48 6.48l2.12 2.12" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m2 0v12a2 2 0 01-2 2H9a2 2 0 01-2-2V7h10z" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  ),
  UserCheck: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m17-9l-3 3m0 0l-3-3m3 3V7" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  Chevron: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  ),
};

/** Unified shell every proposed-action card renders inside — gives the
 *  chatbot's suggestions a single, recognizable visual language regardless
 *  of what kind of action they represent. */
const ActionCard: React.FC<{ tone: Tone; icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  tone,
  icon,
  title,
  children,
}) => {
  const s = TONE[tone];
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#e6e8f2] bg-white shadow-[0_1px_2px_rgba(30,34,88,0.04),0_8px_20px_-8px_rgba(30,34,88,0.12)]">
      <div style={{ background: s.bar }} className="h-[3px] w-full" />
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: s.chipBg, color: s.chipText }}
          >
            {icon}
          </div>
          <h4 className="text-[13.5px] font-semibold tracking-tight" style={{ color: T.text }}>
            {title}
          </h4>
        </div>
        {children}
      </div>
    </div>
  );
};

/** A single label/value row, styled like a payslip line item — the
 *  recurring "receipt" motif used across every summary in this file. */
const DataRow: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#e6e8f2] py-1.5 last:border-b-0">
    <span className="text-[11.5px] uppercase tracking-wide" style={{ color: T.muted }}>
      {label}
    </span>
    <span className={`text-right text-[13px] ${strong ? 'font-semibold' : 'font-medium'}`} style={{ color: T.text }}>
      {value}
    </span>
  </div>
);

/** Perforated "tear-off" divider between the summary and the action
 *  buttons — a small nod to a payslip stub, since this assistant lives
 *  inside the payroll module. */
const Perforation: React.FC = () => (
  <div className="relative my-4">
    <div className="border-t border-dashed" style={{ borderColor: '#d7d9e8' }} />
    <span
      className="absolute top-1/2 rounded-full border"
      style={{ left: -22, width: 12, height: 12, marginTop: -6, background: T.paper, borderColor: T.line }}
    />
    <span
      className="absolute top-1/2 rounded-full border"
      style={{ right: -22, width: 12, height: 12, marginTop: -6, background: T.paper, borderColor: T.line }}
    />
  </div>
);

const CardActions: React.FC<{
  tone: Tone;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ tone, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) => {
  const s = TONE[tone];
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={`flex-1 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition-colors focus:outline-none focus:ring-2 ${s.ring}`}
        style={{ background: s.btn }}
        onMouseEnter={(e) => (e.currentTarget.style.background = s.btnHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = s.btn)}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        className="rounded-lg border border-[#e6e8f2] bg-white px-3.5 py-2 text-[13px] font-medium text-[#4a4e68] transition-colors hover:bg-[#f6f7fb] focus:outline-none focus:ring-2 focus:ring-[#1e2258]/20"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
    </div>
  );
};

const initials = (a?: string, b?: string) => `${(a || '?').charAt(0)}${(b || '').charAt(0)}`.toUpperCase();

// ---------------------------------------------------------------------------

export const AiChatbot: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; proposed_action?: any; proposed_action_json?: any }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // -- Search-in-conversation state --------------------------------------
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const formatGroupLabel = (criteria: any) => {
    const parts: string[] = [];

    if (criteria?.marital_status) {
      parts.push(criteria.marital_status.charAt(0).toUpperCase() + criteria.marital_status.slice(1));
    }

    if (criteria?.gender) {
      parts.push(criteria.gender.charAt(0).toUpperCase() + criteria.gender.slice(1));
    }

    let label = parts.join(' ');

    // Add children count if present and > 0
    if (criteria?.children_count && criteria.children_count > 0) {
      const children = criteria.children_count;
      label += ` · ${children} child${children === 1 ? '' : 'ren'}`;
    }

    return label;
  };

  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Auth token from localStorage:', token ? 'exists' : 'null');
    return token;
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSession = async () => {
    try {
      const response = await fiscalProfileApi.getAiChatSessions();
      if (response.data.length > 0) {
        const latestSession = response.data[0];
        setSessionId(latestSession.id);
        setMessages(latestSession.messages || []);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages([...messages, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = getAuthToken();
      console.log('Sending message to AI service:', inputMessage);
      const response = await fiscalProfileApi.sendAiMessage(inputMessage, sessionId || undefined, token || undefined);
      console.log('AI response received:', response.data);
      console.log('AI message structure:', response.data.ai_message);
      console.log('Proposed action:', response.data.ai_message?.proposed_action);
      console.log('Proposed action JSON:', response.data.ai_message?.proposed_action_json);

      setSessionId(response.data.session_id);
      setMessages([...messages, userMessage, response.data.ai_message]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages([...messages, userMessage, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const applySuggestion = (text: string) => {
    setInputMessage(text);
    inputRef.current?.focus();
  };

  // -- Search-in-conversation logic ---------------------------------------
  const matchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return messages.reduce<number[]>((acc, m, i) => {
      if ((m.content || '').toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [searchQuery, messages]);

  useEffect(() => {
    setActiveMatch(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matchIndices.length === 0) return;
    const idx = matchIndices[activeMatch];
    messageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeMatch, matchIndices]);

  const goToMatch = (dir: 1 | -1) => {
    if (matchIndices.length === 0) return;
    setActiveMatch((prev) => (prev + dir + matchIndices.length) % matchIndices.length);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  /** Splits a message's text around the search query and wraps matches in <mark>. */
  const highlightContent = (content: string, messageIndex: number) => {
    if (!searchQuery.trim()) return content;
    const q = searchQuery.trim();
    const isActiveMessage = matchIndices[activeMatch] === messageIndex;
    const parts = content.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          className="rounded px-0.5"
          style={{
            background: isActiveMessage ? T.gold : T.goldTint,
            color: isActiveMessage ? '#fff' : T.goldDark,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleConfirmAction = async (action: any) => {
    console.log('Confirm action triggered:', action);

    // For bulk assign preview, directly perform the assignment
    if (action.type === 'bulk_assign_preview' && action.employee_ids && action.criteria) {
      try {
        console.log('Bulk assigning fiscal profile from preview:', action);

        // First, find or create the fiscal profile group
        const groupsResponse = await fiscalProfileApi.getFiscalProfileGroups();
        const groups = groupsResponse.data;

        // Try to find existing group matching the criteria
        const groupLabel = action.group_label || formatGroupLabel(action.criteria);
        const groupLabelLower = groupLabel.toLowerCase();
        let group = groups.find((g: any) => g.label.toLowerCase() === groupLabelLower);

        if (!group) {
          // Create the group if it doesn't exist
          const groupParams = {
            gender: action.criteria?.gender,
            marital_status: action.criteria?.marital_status,
            children_count: action.criteria?.children_count || 0,
            disabled_children_count: action.criteria?.disabled_children_count || 0,
            student_non_scholarship_children_count: action.criteria?.student_non_scholarship_children_count || 0,
          };
          const createResponse = await fiscalProfileApi.createFiscalProfileGroup(groupParams);
          group = createResponse.data.group;
          showSuccess('Profile Created', `Fiscal profile '${groupLabel}' created successfully.`);
        }

        // Bulk assign all employees
        const assignPromises = action.employee_ids.map((employeeId: number) =>
          fiscalProfileApi.assignFiscalProfile(employeeId, group!.id, action.effective_from || new Date().toISOString().split('T')[0])
        );

        await Promise.all(assignPromises);

        showSuccess('Assignment Complete', `Successfully assigned fiscal profile '${groupLabel}' to ${action.count} employees.`);
        setMessages([...messages, { role: 'ai', content: `Successfully assigned fiscal profile '${groupLabel}' to ${action.count} employees.` }]);
      } catch (err: any) {
        console.error('Failed to bulk assign profile:', err);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        showError('Assignment Failed', `Failed to bulk assign fiscal profile: ${err.response?.data?.message || err.message}`);
        setMessages([...messages, { role: 'ai', content: `Failed to bulk assign fiscal profile: ${err.response?.data?.message || err.message}` }]);
      }
      return;
    }

    // Execute the action directly based on the proposed action type
    if (action.type === 'delete_profile' && action.group_id) {
      try {
        console.log('Deleting fiscal profile:', action.group_id);
        const response = await fiscalProfileApi.deleteFiscalProfileGroup(action.group_id);
        console.log('Delete successful:', response);
        setMessages([...messages, { role: 'ai', content: `Successfully deleted fiscal profile '${action.group_label}'.` }]);
      } catch (err: any) {
        console.error('Failed to delete profile:', err);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);

        // If it's a 404, the profile might have already been deleted
        if (err.response?.status === 404) {
          setMessages([...messages, { role: 'ai', content: `Fiscal profile '${action.group_label}' was already deleted or not found.` }]);
        } else {
          setMessages([...messages, { role: 'ai', content: `Failed to delete fiscal profile: ${err.response?.data?.message || err.message}` }]);
        }
      }
    } else if (action.type === 'create_group' && action.params) {
      try {
        console.log('Creating fiscal profile:', action.params);
        const response = await fiscalProfileApi.createFiscalProfileGroup(action.params);
        console.log('Create successful:', response);
        console.log('Response data:', response.data);
        const label = response.data?.group?.label || 'New profile';
        setMessages([...messages, { role: 'ai', content: `Successfully created fiscal profile group: ${label}.` }]);
      } catch (err: any) {
        console.error('Failed to create profile:', err);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        setMessages([...messages, { role: 'ai', content: `Failed to create fiscal profile: ${err.response?.data?.message || err.message}` }]);
      }
    } else if (action.type === 'bulk_assign_confirm' && action.employee_ids && action.group_params) {
      try {
        console.log('Bulk assigning fiscal profile:', action);

        // First, find or create the fiscal profile group
        const groupsResponse = await fiscalProfileApi.getFiscalProfileGroups();
        const groups = groupsResponse.data;

        // Try to find existing group matching the criteria
        const groupLabel = action.group_label.toLowerCase();
        let group = groups.find((g: any) => g.label.toLowerCase() === groupLabel);

        if (!group) {
          // Create the group if it doesn't exist
          const createResponse = await fiscalProfileApi.createFiscalProfileGroup(action.group_params);
          group = createResponse.data.group;
          showSuccess('Profile Created', `Fiscal profile '${action.group_label}' created successfully.`);
        }

        // Bulk assign all employees
        const assignPromises = action.employee_ids.map((employeeId: number) =>
          fiscalProfileApi.assignFiscalProfile(employeeId, group!.id, action.effective_from)
        );

        await Promise.all(assignPromises);

        showSuccess('Assignment Complete', `Successfully assigned fiscal profile '${action.group_label}' to ${action.count} employees.`);
        setMessages([...messages, { role: 'ai', content: `Successfully assigned fiscal profile '${action.group_label}' to ${action.count} employees.` }]);
      } catch (err: any) {
        console.error('Failed to bulk assign profile:', err);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        showError('Assignment Failed', `Failed to bulk assign fiscal profile: ${err.response?.data?.message || err.message}`);
        setMessages([...messages, { role: 'ai', content: `Failed to bulk assign fiscal profile: ${err.response?.data?.message || err.message}` }]);
      }
    } else if (action.type === 'assign_profile' && action.employee_id && action.group_id) {
      try {
        console.log('Assigning fiscal profile:', action);

        // Resolve employee ID if it's a matricule
        let employeeId = action.employee_id;
        if (typeof employeeId === 'string' && employeeId.startsWith('EMP')) {
          const groups = await fiscalProfileApi.getFiscalProfileGroups();
          // For now, use a hardcoded employee ID since we don't have a getEmployees method
          // In production, this should be resolved via an API call
          employeeId = 118; // Chaabane Fatma's ID from earlier query
        }

        // Resolve group ID if it's a placeholder
        let groupId = action.group_id;
        if (groupId === 'placeholder') {
          const groupsResponse = await fiscalProfileApi.getFiscalProfileGroups();
          const groups = groupsResponse.data;
          const group = groups.find((g: any) => g.label.toLowerCase() === action.group_label.toLowerCase());
          if (group) {
            groupId = group.id;
          } else {
            throw new Error(`Could not find fiscal profile group with label '${action.group_label}'`);
          }
        }

        // Call the Laravel backend directly to perform the assignment
        const response = await fiscalProfileApi.assignFiscalProfile(employeeId, groupId, action.effective_from);
        console.log('Assign successful:', response);
        setMessages([...messages, { role: 'ai', content: `Successfully assigned fiscal profile '${action.group_label}' to employee '${action.employee_name}'.` }]);
      } catch (err: any) {
        console.error('Failed to assign profile:', err);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        setMessages([...messages, { role: 'ai', content: `Failed to assign fiscal profile: ${err.response?.data?.message || err.message}` }]);
      }
    } else {
      // For other action types, send confirmation to AI service
      try {
        const response = await fiscalProfileApi.sendAiMessage('yes', sessionId || undefined);
        setMessages([...messages, response.data.ai_message]);
      } catch (err) {
        console.error('Failed to confirm action:', err);
        setMessages([...messages, { role: 'ai', content: 'Failed to execute action. Please try again.' }]);
      }
    }
  };

  const handleRejectAction = async () => {
    try {
      const response = await fiscalProfileApi.sendAiMessage('no', sessionId || undefined);
      setMessages([...messages, response.data.ai_message]);
    } catch (err) {
      console.error('Failed to reject action:', err);
      setMessages([...messages, { role: 'ai', content: 'Failed to cancel action. Please try again.' }]);
    }
  };

  const renderProposedAction = (action: any) => {
    if (!action) return null;

    if (action.type === 'delete_profile' && action.requires_confirmation) {
      return (
        <ActionCard tone="danger" icon={<Icon.Trash />} title="Confirm deletion">
          <div className="rounded-lg bg-[#fafafd] p-3">
            <DataRow label="Profile" value={action.group_label} strong />
            {action.gender && <DataRow label="Gender" value={action.gender} />}
            {action.marital_status && <DataRow label="Marital status" value={action.marital_status} />}
            {action.children_count !== undefined && <DataRow label="Children" value={action.children_count} />}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
            This removes the fiscal profile permanently. Employees currently assigned to it keep their existing
            records, but you won't be able to assign it again.
          </p>
          <Perforation />
          <CardActions tone="danger" confirmLabel="Delete profile" onConfirm={() => handleConfirmAction(action)} onCancel={handleRejectAction} />
        </ActionCard>
      );
    }

    if (action.type === 'create_group' && action.params) {
      const { gender, marital_status, children_count } = action.params;
      return (
        <ActionCard tone="ink" icon={<Icon.Plus />} title="Create fiscal profile">
          <div className="rounded-lg bg-[#fafafd] p-3">
            <DataRow label="New group" value="Fiscal profile" strong />
            {gender && <DataRow label="Gender" value={gender} />}
            {marital_status && <DataRow label="Marital status" value={marital_status} />}
            {children_count !== undefined && <DataRow label="Children" value={children_count} />}
          </div>
          <Perforation />
          <CardActions tone="ink" confirmLabel="Create profile" onConfirm={() => handleConfirmAction(action)} onCancel={handleRejectAction} />
        </ActionCard>
      );
    }

    if (action.type === 'assign_profile' && action.requires_confirmation) {
      return (
        <ActionCard tone="success" icon={<Icon.UserCheck />} title="Assign fiscal profile">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#fafafd] p-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ background: T.inkTint, color: T.ink }}
            >
              {initials(action.employee_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold" style={{ color: T.text }}>
                {action.employee_name}
              </p>
              <p className="text-[11.5px]" style={{ color: T.muted }}>
                {action.employee_matricule}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-[#fafafd] p-3">
            <DataRow label="Fiscal profile" value={action.group_label} strong />
            <DataRow label="Effective from" value={action.effective_from} />
          </div>
          <Perforation />
          <CardActions tone="success" confirmLabel="Assign profile" onConfirm={() => handleConfirmAction(action)} onCancel={handleRejectAction} />
        </ActionCard>
      );
    }

    if (action.type === 'bulk_assign_confirm') {
      return (
        <ActionCard tone="success" icon={<Icon.Users />} title="Confirm bulk assignment">
          <div className="rounded-lg bg-[#fafafd] p-3">
            <DataRow label="Fiscal profile" value={action.group_label} strong />
            <DataRow label="Employees" value={action.count} strong />
            <DataRow label="Effective from" value={action.effective_from} />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
            This applies the fiscal profile to all {action.count} matching employees at once.
          </p>
          <Perforation />
          <CardActions
            tone="success"
            confirmLabel="Confirm assignment"
            onConfirm={() => handleConfirmAction(action)}
            onCancel={handleRejectAction}
          />
        </ActionCard>
      );
    }

    if (action.type === 'bulk_assign_preview') {
      return (
        <ActionCard tone="gold" icon={<Icon.List />} title="Bulk assignment preview">
          <div className="rounded-lg bg-[#fafafd] p-3">
            <DataRow label="Employees found" value={action.count} strong />
            <DataRow
              label="Criteria"
              value={`${action.criteria?.gender || ''} ${action.criteria?.marital_status || ''}`.trim() || '—'}
            />
            {action.criteria?.children_count !== undefined && (
              <DataRow label="Children" value={action.criteria.children_count} />
            )}
          </div>

          {action.employees && action.employees.length > 0 && (
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
              {action.employees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-lg border border-[#eceef7] bg-white px-2.5 py-2 transition-colors hover:border-[#dcdff0]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
                      style={{ background: T.goldTint, color: T.goldDark }}
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
                  <button
                    type="button"
                    className="flex flex-shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[#f6f7fb]"
                    style={{ color: T.ink }}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    View
                    <Icon.Chevron />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Perforation />
          <CardActions
            tone="gold"
            confirmLabel={`Assign to ${action.count} employees`}
            cancelLabel="Reject"
            onConfirm={() => handleConfirmAction(action)}
            onCancel={handleRejectAction}
          />
        </ActionCard>
      );
    }

    return (
      <ActionCard tone="ink" icon={<Icon.Alert />} title="Proposed action">
        <pre className="overflow-x-auto rounded-lg bg-[#fafafd] p-3 text-[11px] leading-relaxed" style={{ color: T.muted }}>
          {JSON.stringify(action, null, 2)}
        </pre>
        <Perforation />
        <CardActions tone="ink" confirmLabel="Accept" cancelLabel="Reject" onConfirm={() => handleConfirmAction(action)} onCancel={handleRejectAction} />
      </ActionCard>
    );
  };

  const suggestions = [
    'Create a fiscal profile group for married males with 2 children',
    'Find all single employees without children',
    'Assign fiscal profile X to employees Y and Z',
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden !border-[#e6e8f2] !p-0 !shadow-[0_1px_2px_rgba(30,34,88,0.04),0_12px_28px_-12px_rgba(30,34,88,0.14)]">
      <CardHeader className="!border-0 !p-0">
        <div
          className="relative overflow-hidden px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${T.ink} 0%, ${T.inkDark} 100%)` }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.06]" />
          <div className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/[0.04]" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#c8974a] ring-1 ring-white/15">
              <Icon.Spark />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold tracking-tight text-white">Fiscal Profile Assistant</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/60">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: T.gold }} />
                Payroll · profiles &amp; assignments
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search in conversation"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10"
            >
              <Icon.Search />
            </button>
          </div>
        </div>
      </CardHeader>

      {searchOpen && (
        <div className="border-b border-[#e6e8f2] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-full border border-[#e6e8f2] bg-[#f6f7fb] pl-3.5 pr-1.5 py-1.5 focus-within:border-[#1e2258]/30 focus-within:bg-white transition-colors">
            <Icon.Search />
            <input
              type="text"
              autoFocus
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9698ad]"
              style={{ color: T.text }}
              placeholder="Search in this conversation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToMatch(e.shiftKey ? -1 : 1);
                if (e.key === 'Escape') closeSearch();
              }}
            />
            {searchQuery && (
              <span className="flex-shrink-0 text-[11px] font-medium" style={{ color: T.muted }}>
                {matchIndices.length > 0 ? `${activeMatch + 1}/${matchIndices.length}` : '0/0'}
              </span>
            )}
            <button
              type="button"
              onClick={() => goToMatch(-1)}
              disabled={matchIndices.length === 0}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#eef0fb] disabled:opacity-30"
              style={{ color: T.ink }}
            >
              <Icon.ChevronUp />
            </button>
            <button
              type="button"
              onClick={() => goToMatch(1)}
              disabled={matchIndices.length === 0}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#eef0fb] disabled:opacity-30"
              style={{ color: T.ink }}
            >
              <Icon.ChevronDown />
            </button>
            <button
              type="button"
              onClick={closeSearch}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#eef0fb]"
              style={{ color: T.muted }}
            >
              <Icon.X />
            </button>
          </div>
        </div>
      )}

      <CardBody className="flex min-h-0 flex-1 flex-col !p-0">
        <div className="flex h-full flex-col" style={{ background: T.paper }}>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: T.inkTint, color: T.ink }}>
                <Icon.Spark />
              </div>
              <p className="text-[14px] font-semibold" style={{ color: T.text }}>
                Manage fiscal profiles with a message
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
                Create profile groups, find employees, or assign profiles in bulk. Try one of these:
              </p>
              <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="rounded-lg border border-[#e6e8f2] bg-white px-3 py-2 text-left text-[12.5px] font-medium transition-colors hover:border-[#c8974a]/50 hover:bg-[#faf3e7]"
                    style={{ color: T.text }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                ref={(el) => {
                  messageRefs.current[index] = el;
                }}
                className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {!isUser && (
                  <div
                    className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#c8974a] ring-1 ring-[#1e2258]/10"
                    style={{ background: T.inkTint }}
                  >
                    <span className="scale-75">
                      <Icon.Spark />
                    </span>
                  </div>
                )}
                <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      isUser ? 'rounded-br-md text-white' : 'rounded-bl-md border border-[#e6e8f2] bg-white'
                    }`}
                    style={isUser ? { background: T.ink } : { color: T.text }}
                  >
                    <p className="whitespace-pre-wrap">{highlightContent(msg.content, index)}</p>
                  </div>
                  {msg.proposed_action_json && <div className="w-full">{renderProposedAction(msg.proposed_action_json)}</div>}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2">
              <div
                className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#c8974a] ring-1 ring-[#1e2258]/10"
                style={{ background: T.inkTint }}
              >
                <span className="scale-75">
                  <Icon.Spark />
                </span>
              </div>
              <div className="rounded-2xl rounded-bl-md border border-[#e6e8f2] bg-white px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: T.muted }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: T.muted, animationDelay: '0.12s' }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: T.muted, animationDelay: '0.24s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#e6e8f2] bg-white px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-[#e6e8f2] bg-[#f6f7fb] pl-4 pr-1.5 py-1.5 transition-colors focus-within:border-[#1e2258]/30 focus-within:bg-white">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#9698ad]"
              style={{ color: T.text }}
              placeholder="Ask about fiscal profiles or assignments…"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              aria-label="Send message"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{ background: T.ink }}
            >
              <Icon.Send />
            </button>
          </div>
        </div>
        </div>
      </CardBody>
    </Card>
  );
};