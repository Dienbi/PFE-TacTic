import React, { useState } from 'react';
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
import { List, Filter, Calendar, User, Activity } from 'lucide-react';

const formatDetails = (details: Record<string, unknown> | null, action: string, entityType: string) => {
  if (!details) return null;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="mt-2 space-y-2">
      {Object.keys(details).filter(key => key !== 'id').map((key) => (
        <div key={key} className="flex items-start gap-2 text-xs">
          <span className="font-medium text-gray-700 min-w-[120px]">{formatLabel(key)}:</span>
          <span className="text-gray-600 break-all">{formatValue(details[key])}</span>
        </div>
      ))}
    </div>
  );
};

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

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="audit-overview">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
              <p className="text-sm text-gray-600 mt-1">View audit trails and activity history</p>
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
              <div className="flex gap-2 mt-4">
                <Button onClick={handleApplyFilters} leftIcon={<Filter className="w-4 h-4" />}>
                  Apply Filters
                </Button>
                <Button variant="secondary" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Audit Logs Table */}
          <Card data-tour="audit-details">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : logs && logs.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Entity Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Entity ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {log.actor ? `${log.actor.nom} ${log.actor.prenom}` : log.actor_id}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default">{log.action}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">{log.entity_type}</td>
                        <td className="py-3 px-4 text-sm font-medium">{log.entity_id}</td>
                        <td className="py-3 px-4 text-sm">
                          {log.details_json ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewDetails(log)}
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
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No audit logs found matching the filters
                </div>
              )}
            </CardBody>
          </Card>

          {/* Details Modal */}
          {isDetailsModalOpen && selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsDetailsModalOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Timestamp</p>
                        <p className="text-sm text-gray-600">{new Date(selectedLog.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Actor</p>
                        <p className="text-sm text-gray-600">
                          {selectedLog.actor ? `${selectedLog.actor.nom} ${selectedLog.actor.prenom}` : selectedLog.actor_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Action</p>
                        <Badge variant="default">{selectedLog.action}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Entity Type</p>
                        <p className="text-sm text-gray-600">{selectedLog.entity_type}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-700">Entity ID</p>
                        <p className="text-sm text-gray-600 break-all">{selectedLog.entity_id}</p>
                      </div>
                    </div>
                    {selectedLog.details_json && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Details</p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {formatDetails(selectedLog.details_json, selectedLog.action, selectedLog.entity_type)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
      <PayrollTourTooltip />
    </div>
  );
};

export default AuditLogs;
