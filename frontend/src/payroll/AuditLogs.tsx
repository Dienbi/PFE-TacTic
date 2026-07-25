import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useAllAuditLogs, useAuditLogStatistics } from '../hooks/queries/useTunisianPayroll';
import { Card, CardHeader, CardBody } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import {
  List, Filter, Calendar, User, Activity, ChevronLeft, ChevronRight,
  X, Clock, PlusCircle, Edit3, Trash2, LogIn, LogOut, Settings, Tag, FileText,
} from 'lucide-react';

const BRAND = '#1E2258';

const getEntityName = (log: any): string => {
  if (!log.details_json) return log.entity_id || '-';

  const details = log.details_json;
  const entityType = log.entity_type?.toLowerCase() || '';

  // Handle payslip-related logs
  if (entityType.includes('payslip') || entityType.includes('paie') || entityType.includes('bulletin')) {
    if (details.employee_name) return details.employee_name as string;
    if (details.employee_nom && details.employee_prenom) return `${details.employee_nom} ${details.employee_prenom}` as string;
    if (details.employee_id) return `Employee ${details.employee_id}`;
    if (details.utilisateur_id) return `Employee ${details.utilisateur_id}`;
  }

  // Handle user-related logs
  if (entityType.includes('user') || entityType.includes('utilisateur') || entityType.includes('employee') || entityType.includes('employe')) {
    if (details.nom && details.prenom) return `${details.nom} ${details.prenom}` as string;
    if (details.full_name) return details.full_name as string;
    if (details.name) return details.name as string;
    if (details.employee_name) return details.employee_name as string;
  }

  // Handle group/team-related logs
  if (entityType.includes('group') || entityType.includes('team') || entityType.includes('equipe')) {
    if (details.name) return details.name as string;
    if (details.nom) return details.nom as string;
    if (details.team_name) return details.team_name as string;
  }

  // Handle fiscal rule logs
  if (entityType.includes('fiscal') || entityType.includes('rule') || entityType.includes('regle')) {
    if (details.year) return `${details.year} Fiscal Rules` as string;
    if (details.name) return details.name as string;
  }

  // Default to entity_id if no name found
  return log.entity_id || '-';
};

// ---- Details modal helpers ---------------------------------------------

const humanizeKey = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const ID_KEY = /(^id$|_id$)/i;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

/**
 * Turns a raw details_json blob into a clean list of { label, value } rows:
 * - merges *_nom / *_prenom pairs into a single readable "Name" field
 * - drops every field that is a raw id (id, employee_id, group_id, actor_id, ...)
 *   since a human-readable name is shown instead (in the header or as a merged field)
 */
const buildDisplayRows = (details: Record<string, unknown> | null) => {
  if (!details) return [];

  const data: Record<string, unknown> = { ...details };
  const drop = new Set<string>(['id']);

  // Find every "<prefix>_nom" key and merge it with its "<prefix>_prenom" sibling
  const prefixes = new Set<string>();
  Object.keys(data).forEach((k) => {
    if (k === 'nom') prefixes.add('');
    else if (k.endsWith('_nom')) prefixes.add(k.slice(0, -4));
  });

  prefixes.forEach((prefix) => {
    const nomKey = prefix ? `${prefix}_nom` : 'nom';
    const prenomKey = prefix ? `${prefix}_prenom` : 'prenom';
    if (data[nomKey] !== undefined && data[prenomKey] !== undefined) {
      const label = prefix ? `${humanizeKey(prefix)} name` : 'Name';
      data[label] = `${data[prenomKey]} ${data[nomKey]}`;
      drop.add(nomKey);
      drop.add(prenomKey);
    }
  });

  // Never show raw id fields — the entity/actor name is already shown elsewhere
  Object.keys(data).forEach((k) => {
    if (ID_KEY.test(k)) drop.add(k);
  });

  return Object.keys(data)
    .filter((k) => !drop.has(k))
    .map((key) => ({
      key,
      label: humanizeKey(key),
      value: formatValue(data[key]),
    }));
};

const ACTION_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  create: { icon: PlusCircle, color: '#16803D', bg: '#DCFCE7' },
  update: { icon: Edit3, color: '#1D4ED8', bg: '#DBEAFE' },
  delete: { icon: Trash2, color: '#B91C1C', bg: '#FEE2E2' },
  login: { icon: LogIn, color: '#7C3AED', bg: '#EDE9FE' },
  logout: { icon: LogOut, color: '#7C3AED', bg: '#EDE9FE' },
};

const getActionMeta = (action: string) => {
  const key = Object.keys(ACTION_META).find((k) => action?.toLowerCase().includes(k));
  return key ? ACTION_META[key] : { icon: Settings, color: BRAND, bg: `${BRAND}1A` };
};

// -------------------------------------------------------------------------

const AuditLogs: React.FC = () => {
  const { user, displayName } = useAuth();
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    actor_id: '',
    date_from: '',
    date_to: '',
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { data: logs, isLoading, refetch } = useAllAuditLogs(filters);
  const { data: statistics, refetch: refetchStats } = useAuditLogStatistics({
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const logsList = logs || [];
  const totalItems = logsList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 whenever filters/logs change
  useEffect(() => {
    setCurrentPage(1);
  }, [logs]);

  // Clamp currentPage if data shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return logsList.slice(start, start + itemsPerPage);
  }, [logsList, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Generate page numbers with ellipsis for large sets
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    refetch();
    refetchStats();
  };

  const handleResetFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      actor_id: '',
      date_from: '',
      date_to: '',
    });
    refetch();
    refetchStats();
  };

  const detailRows = selectedLog ? buildDisplayRows(selectedLog.details_json) : [];
  const actionMeta = selectedLog ? getActionMeta(selectedLog.action) : null;
  const ActionIcon = actionMeta?.icon || Settings;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="audit-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Audit Logs</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">View audit trails and activity history</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {statistics?.total_logs || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <List className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Actions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(statistics?.by_action || {}).length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Entities</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(statistics?.by_entity_type || {}).length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Actors</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Object.keys(statistics?.by_actor || {}).length}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6" data-tour="audit-filtering">
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <input
                    type="text"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    placeholder="e.g., create, update, delete"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <input
                    type="text"
                    value={filters.entity_type}
                    onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                    placeholder="e.g., FiscalRuleSet, Payslip"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actor ID</label>
                  <input
                    type="text"
                    value={filters.actor_id}
                    onChange={(e) => handleFilterChange('actor_id', e.target.value)}
                    placeholder="User ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  leftIcon={<Filter className="w-4 h-4" />}
                  className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                >
                  Apply Filters
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Audit Logs Table */}
          <Card data-tour="audit-details">
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
                {totalItems > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm" style={{ color: BRAND }}>Rows per page</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2"
                      style={{ border: `1px solid ${BRAND}`, color: BRAND }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : paginatedLogs.length > 0 ? (
                <>
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[14%]" />
                      <col className="w-[13%]" />
                      <col className="w-[23%]" />
                      <col className="w-[16%]" />
                      <col className="w-[16%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${BRAND}` }}>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Timestamp</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Actor</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Action</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Entity Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold truncate" style={{ color: BRAND }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log: any) => (
                        <tr
                          key={log.id}
                          className="border-b"
                          style={{ borderColor: `${BRAND}1A` }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${BRAND}0D`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td className="py-3 px-4 text-sm text-left truncate overflow-hidden">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-left truncate overflow-hidden">
                            {log.actor ? `${log.actor.nom} ${log.actor.prenom}` : log.actor_id}
                          </td>
                          <td className="py-3 px-4 text-left overflow-hidden">
                            <span title={log.action} className="inline-block max-w-full truncate align-middle">
                              <Badge variant="default" className="inline-block">
                                {log.action}
                              </Badge>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-left truncate overflow-hidden">{log.entity_type}</td>
                          <td className="py-3 px-4 text-sm font-medium text-left truncate overflow-hidden" title={getEntityName(log)}>
                            {getEntityName(log)}
                          </td>
                          <td className="py-3 px-4 text-sm text-left overflow-hidden">
                            {log.details_json ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewDetails(log)}
                                style={{ color: BRAND, borderColor: BRAND }}
                              >
                                View Details
                              </Button>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${BRAND}20` }}>
                    <p className="text-sm" style={{ color: BRAND }}>
                      Showing {(currentPage - 1) * itemsPerPage + 1}
                      {' '}-{' '}
                      {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: `1px solid ${BRAND}`, color: BRAND }}
                        onMouseEnter={(e) => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = `${BRAND}15`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {getPageNumbers().map((page, idx) =>
                        page === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: `${BRAND}80` }}>
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => goToPage(page as number)}
                            className="min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium"
                            style={
                              currentPage === page
                                ? { backgroundColor: BRAND, border: `1px solid ${BRAND}`, color: '#fff' }
                                : { border: `1px solid ${BRAND}`, color: BRAND }
                            }
                            onMouseEnter={(e) => { if (currentPage !== page) e.currentTarget.style.backgroundColor = `${BRAND}15`; }}
                            onMouseLeave={(e) => { if (currentPage !== page) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: `1px solid ${BRAND}`, color: BRAND }}
                        onMouseEnter={(e) => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = `${BRAND}15`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No audit logs found matching the filters
                </div>
              )}
            </CardBody>
          </Card>

          {/* Details Modal — redesigned */}
          {isDetailsModalOpen && selectedLog && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsDetailsModalOpen(false)}
            >
              <div
                className="w-full max-w-lg max-h-[85vh] rounded-xl shadow-2xl bg-white flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ backgroundColor: BRAND }}>
                  <div className="flex items-start gap-3 text-left">
                    <div className="text-left">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white">
                        {selectedLog.action}
                      </p>
                      <h2 className="text-base font-semibold text-white">
                        {selectedLog.entity_type}
                      </h2>
                      <p className="text-sm text-white/80 mt-0.5">{getEntityName(selectedLog)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="p-1.5 rounded-lg text-white hover:text-white hover:bg-white/20 shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-5 py-4 space-y-6">
                  {/* Overview section */}
                  <div className="text-left">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: `${BRAND}99` }}
                    >
                      Overview
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-left">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BRAND }} />
                        <div className="text-left">
                          <p className="text-xs text-gray-500">Timestamp</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(selectedLog.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BRAND }} />
                        <div className="text-left">
                          <p className="text-xs text-gray-500">Performed by</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedLog.actor
                              ? `${selectedLog.actor.prenom} ${selectedLog.actor.nom}`
                              : 'Unknown user'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <Tag className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BRAND }} />
                        <div className="text-left">
                          <p className="text-xs text-gray-500">Affected item</p>
                          <p className="text-sm font-medium text-gray-900">{getEntityName(selectedLog)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changes / details section */}
                  {detailRows.length > 0 && (
                    <div className="text-left">
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-2"
                        style={{ color: `${BRAND}99` }}
                      >
                        Details
                      </p>
                      <div className="rounded-lg border border-gray-100">
                        <div className="grid grid-cols-2 gap-0">
                          {detailRows.map((row) => (
                            <div key={row.key} className="border-b border-r border-gray-100 last:border-r-0 px-3 py-2">
                              <div className="flex items-start gap-2">
                                <p className="text-xs font-medium text-gray-700 shrink-0">{row.label}:</p>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                  {row.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <PayrollTourTooltip />
    </div>
  );
};

export default AuditLogs;