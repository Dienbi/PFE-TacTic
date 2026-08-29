import React, { useState, useEffect, useMemo } from 'react';
import { fiscalProfileApi, FiscalProfileGroup } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import Badge from '../../shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';
import { Plus, Users2, Star, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';

const NAVY = '#1E2258';

const initials = (a?: string, b?: string) => `${(a || '?').charAt(0)}${(b || '').charAt(0)}`.toUpperCase();

export const FiscalProfileGroups: React.FC = () => {
  const [groups, setGroups] = useState<FiscalProfileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FiscalProfileGroup | null>(null);
  const [groupEmployees, setGroupEmployees] = useState<any[]>([]);

  // Pagination — same pattern as every other list in the app
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [groups.length]);

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

  const totalItems = groups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedGroups = useMemo(() => {
    const sortedGroups = [...groups].sort((a, b) => {
      // Cards with head_of_family come first, then cards without head_of_family
      if (a.head_of_family === b.head_of_family) return 0;
      return a.head_of_family ? -1 : 1;
    });
    const start = (currentPage - 1) * itemsPerPage;
    return sortedGroups.slice(start, start + itemsPerPage);
  }, [groups, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Fiscal Profile Groups</h2>
        <div className="flex items-center gap-3">
          {totalItems > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: NAVY }}>Rows per page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{ border: `1px solid ${NAVY}`, color: NAVY }}
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
          >
            New Group
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="shadow-sm border border-gray-200 animate-pulse">
              <CardBody>
                <div className="h-9 w-9 rounded-lg bg-gray-100 mb-3" />
                <div className="h-3.5 w-2/3 rounded bg-gray-100 mb-2" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <Card className="shadow-sm">
          <CardBody>
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-700">No fiscal profile groups yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Create a group to define fiscal criteria you can assign to employees.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Create Group
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedGroups.map((group) => (
              <Card
                key={group.id}
                hover
                className="shadow-md border border-gray-200 hover:shadow-xl hover:border-[#1E225830] transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
              >
                <CardBody>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold" style={{ color: NAVY }}>{group.label}</h3>
                    {group.head_of_family && (
                      <div className="flex justify-center mt-2">
                        <Badge variant="warning" style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" /> Head of family
                          </span>
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="default">{group.gender}</Badge>
                    <Badge variant="default">{group.marital_status}</Badge>
                    <Badge variant="default">
                      {group.children_count} child{group.children_count === 1 ? '' : 'ren'}
                    </Badge>
                    <Badge variant="default" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                      <span className="flex items-center gap-1">
                        <Users2 className="w-3 h-3" /> {group.employees_count}
                      </span>
                    </Badge>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleViewEmployees(group.id)}
                      className="flex items-center justify-center gap-1.5 text-sm font-medium w-full py-2 rounded-lg hover:opacity-90 transition-opacity text-white"
                      style={{ backgroundColor: NAVY }}
                    >
                      <Users2 className="w-4 h-4" />
                      View Employees
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-2 pt-4" style={{ borderTop: `1px solid ${NAVY}20` }}>
            <p className="text-sm" style={{ color: NAVY }}>
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border transition-colors"
                style={{ borderColor: NAVY, color: NAVY }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: `${NAVY}80` }}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page as number)}
                    className="min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border transition-colors"
                    style={
                      currentPage === page
                        ? { backgroundColor: NAVY, borderColor: NAVY, color: '#fff' }
                        : { borderColor: NAVY, color: NAVY }
                    }
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border transition-colors"
                style={{ borderColor: NAVY, color: NAVY }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={<span style={{ color: 'white' }}>Create Fiscal Profile Group</span>}
        >
          <CreateGroupForm onSubmit={handleCreateGroup} onCancel={() => setShowCreateModal(false)} />
        </Modal>
      )}

      {selectedGroup && (
        <Modal
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          title={<span style={{ color: 'white' }}>Employees · {selectedGroup.label}</span>}
        >
          <div className="space-y-4">
            {groupEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">No employees assigned</p>
                <p className="text-sm text-gray-500 mt-1">Assign this profile to employees from the fiscal assistant.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {groupEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-[#1E225840] transition-colors"
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${NAVY}1A`, color: NAVY }}
                    >
                      {initials(emp.nom, emp.prenom)}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-gray-900">{emp.nom} {emp.prenom}</p>
                      <p className="text-xs text-gray-500">{emp.matricule}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button
                onClick={() => setSelectedGroup(null)}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create-group form
// ---------------------------------------------------------------------------

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1 text-left';

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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Gender</label>
          <select
            className={inputClass}
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Marital Status</label>
          <select
            className={inputClass}
            value={formData.marital_status}
            onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Children Count</label>
        <input
          type="number"
          min="0"
          className={inputClass}
          value={formData.children_count}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({ ...formData, children_count: value === '' ? 0 : parseInt(value) || 0 });
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Disabled Children</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={formData.disabled_children_count}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, disabled_children_count: value === '' ? 0 : parseInt(value) || 0 });
            }}
          />
        </div>
        <div>
          <label className={labelClass}>Students, No Scholarship</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={formData.student_non_scholarship_children_count}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, student_non_scholarship_children_count: value === '' ? 0 : parseInt(value) || 0 });
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white">
          Create Group
        </Button>
      </div>
    </form>
  );
};