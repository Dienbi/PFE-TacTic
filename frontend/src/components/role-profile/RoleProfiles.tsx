import React, { useState, useEffect, useMemo } from 'react';
import { roleProfileApi, RoleProfile } from '../../api/fiscalProfile';
import apiClient from '../../api/client';
import Button from '../../shared/components/ui/Button';
import Badge from '../../shared/components/ui/Badge';
import { Card, CardBody } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';
import { Plus, Users2, ChevronLeft, ChevronRight, FolderOpen, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NAVY = '#1E2258';

export const RoleProfiles: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<RoleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<RoleProfile | null>(null);
  const [profileEmployees, setProfileEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignEmployeeModal, setShowAssignEmployeeModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchingEmployees, setSearchingEmployees] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [profiles.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await roleProfileApi.getRoleProfiles();
      setProfiles(response.data);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (data: any) => {
    try {
      await roleProfileApi.createRoleProfile(data);
      setShowCreateModal(false);
      loadProfiles();
    } catch (err) {
      console.error('Failed to create profile:', err);
    }
  };

  const handleViewEmployees = async (profileId: string) => {
    try {
      const response = await roleProfileApi.getRoleProfileEmployees(profileId);
      setProfileEmployees(response.data);
      setSelectedProfile(profiles.find((p) => p.id === profileId) || null);
      // Load all employees for assignment
      loadAllEmployees();
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadAllEmployees = async () => {
    try {
      const response = await apiClient.get('/utilisateurs');
      setAllEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load all employees:', err);
    }
  };

  const searchEmployees = async (query: string) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query || query.length < 2) {
      loadAllEmployees();
      return;
    }

    setSearchingEmployees(true);

    // Set new timeout for debouncing
    const timeout = setTimeout(async () => {
      try {
        const response = await apiClient.get('/utilisateurs/search', { params: { q: query } });
        setAllEmployees(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to search employees:', err);
      } finally {
        setSearchingEmployees(false);
      }
    }, 300); // 300ms debounce delay

    setSearchTimeout(timeout);
  };

  const handleAssignEmployee = async (employeeId: number) => {
    if (!selectedProfile) return;
    try {
      await roleProfileApi.assignRole(employeeId, {
        role_profile_id: selectedProfile.id,
        effective_from: new Date().toISOString().split('T')[0],
      });
      // Refresh employees list
      handleViewEmployees(selectedProfile.id);
      setShowAssignEmployeeModal(false);
      setSelectedEmployeeId(null);
    } catch (err) {
      console.error('Failed to assign employee:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const response = await roleProfileApi.searchRoleProfiles(query);
        setProfiles(response.data);
      } catch (err) {
        console.error('Failed to search profiles:', err);
      }
    } else if (query.length === 0) {
      loadProfiles();
    }
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    return profiles.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  const totalItems = filteredProfiles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProfiles.slice(start, start + itemsPerPage);
  }, [filteredProfiles, currentPage, itemsPerPage]);

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
        <h2 className="text-lg font-semibold text-gray-900">Role Profiles</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            New Profile
          </Button>
          <Button
            onClick={() => navigate('/payroll/role-profile-chatbot')}
            leftIcon={<MessageSquare className="w-4 h-4" />}
            variant="ghost"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            AI Assistant
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
              <p className="font-medium text-gray-700">No role profiles yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Create role profiles to define job functions and compensation structures.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Create Profile
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProfiles.map((profile) => (
              <Card
                key={profile.id}
                hover
                className="shadow-md border border-gray-200 hover:shadow-xl hover:border-[#1E225830] transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
              >
                <CardBody>
                  <div className="mb-3">
                    <h3 className="text-base font-semibold" style={{ color: NAVY }}>{profile.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{profile.label}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="default">{profile.horaire_type}</Badge>
                    <Badge variant="default">{profile.salary_type}</Badge>
                    {profile.weekly_hours && (
                      <Badge variant="default" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {profile.weekly_hours}h
                        </span>
                      </Badge>
                    )}
                    {profile.overtime_eligible && (
                      <Badge variant="success">Overtime Eligible</Badge>
                    )}
                  </div>

                  {profile.base_salary_min && (
                    <div className="flex items-center gap-1.5 mb-4 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>{profile.base_salary_min} - {profile.base_salary_max}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleViewEmployees(profile.id)}
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
          title={<span style={{ color: 'white' }}>Create Role Profile</span>}
        >
          <CreateProfileForm onSubmit={handleCreateProfile} onCancel={() => setShowCreateModal(false)} />
        </Modal>
      )}

      {selectedProfile && (
        <Modal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          title={<span style={{ color: 'white' }}>Employees · {selectedProfile.name}</span>}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {profileEmployees.length} employee(s) assigned
              </p>
              <Button
                onClick={() => setShowAssignEmployeeModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Assign Employee
              </Button>
            </div>
            
            {profileEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">No employees assigned</p>
                <p className="text-sm text-gray-500 mt-1">Assign this role profile to employees.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {profileEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-[#1E225840] transition-colors"
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${NAVY}1A`, color: NAVY }}
                    >
                      {emp.nom?.charAt(0)}{emp.prenom?.charAt(0)}
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
                onClick={() => setSelectedProfile(null)}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showAssignEmployeeModal && selectedProfile && (
        <Modal
          isOpen={showAssignEmployeeModal}
          onClose={() => setShowAssignEmployeeModal(false)}
          title={<span style={{ color: 'white' }}>Assign Employee to {selectedProfile.name}</span>}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Employees</label>
              <input
                type="text"
                placeholder="Search by name or matricule..."
                value={employeeSearchQuery}
                onChange={(e) => {
                  setEmployeeSearchQuery(e.target.value);
                  searchEmployees(e.target.value);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {searchingEmployees ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Searching...
                </div>
              ) : allEmployees
                .filter(emp => !profileEmployees.find((pe) => pe.id === emp.id))
                .map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      selectedEmployeeId === emp.id 
                        ? 'border-[#1E2258] bg-[#1E2258]5' 
                        : 'border-gray-200 bg-white hover:border-[#1E225840]'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${NAVY}1A`, color: NAVY }}
                    >
                      {emp.nom?.charAt(0)}{emp.prenom?.charAt(0)}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-gray-900">{emp.nom} {emp.prenom}</p>
                      <p className="text-xs text-gray-500">{emp.matricule}</p>
                    </div>
                  </div>
                ))}
              {allEmployees.filter(emp => !profileEmployees.find((pe) => pe.id === emp.id)).length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No available employees to assign
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                onClick={() => setShowAssignEmployeeModal(false)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedEmployeeId && handleAssignEmployee(selectedEmployeeId)}
                disabled={!selectedEmployeeId}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white disabled:opacity-50"
              >
                Assign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create-profile form
// ---------------------------------------------------------------------------

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1 text-left';

const CreateProfileForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    horaire_type: 'fixed',
    salary_type: 'fixed_monthly',
    weekly_hours: 40,
    overtime_eligible: true,
    overtime_rate_multiplier: 1.5,
    base_salary_min: 0,
    base_salary_max: 0,
    cnss_regime: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Profile Name</label>
        <input
          type="text"
          className={inputClass}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Software Engineer"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Work Schedule Type</label>
          <select
            className={inputClass}
            value={formData.horaire_type}
            onChange={(e) => setFormData({ ...formData, horaire_type: e.target.value })}
          >
            <option value="fixed">Fixed</option>
            <option value="shift">Shift</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Salary Type</label>
          <select
            className={inputClass}
            value={formData.salary_type}
            onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
          >
            <option value="fixed_monthly">Fixed Monthly</option>
            <option value="hourly">Hourly</option>
            <option value="commission">Commission</option>
            <option value="piece_rate">Piece Rate</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Weekly Hours</label>
          <input
            type="number"
            min="0"
            max="168"
            className={inputClass}
            value={formData.weekly_hours}
            onChange={(e) => setFormData({ ...formData, weekly_hours: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>CNSS Regime</label>
          <input
            type="text"
            className={inputClass}
            value={formData.cnss_regime}
            onChange={(e) => setFormData({ ...formData, cnss_regime: e.target.value })}
            placeholder="e.g., CNSS1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Base Salary Min</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={formData.base_salary_min}
            onChange={(e) => setFormData({ ...formData, base_salary_min: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Base Salary Max</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={formData.base_salary_max}
            onChange={(e) => setFormData({ ...formData, base_salary_max: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overtime_eligible"
            checked={formData.overtime_eligible}
            onChange={(e) => setFormData({ ...formData, overtime_eligible: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="overtime_eligible" className={labelClass + ' mb-0'}>Overtime Eligible</label>
        </div>
        {formData.overtime_eligible && (
          <div>
            <label className={labelClass}>Overtime Rate Multiplier</label>
            <input
              type="number"
              min="1"
              step="0.1"
              className={inputClass}
              value={formData.overtime_rate_multiplier}
              onChange={(e) => setFormData({ ...formData, overtime_rate_multiplier: parseFloat(e.target.value) || 1 })}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white">
          Create Profile
        </Button>
      </div>
    </form>
  );
};
