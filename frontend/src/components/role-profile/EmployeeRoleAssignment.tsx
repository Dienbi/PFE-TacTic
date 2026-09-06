import React, { useState, useEffect } from 'react';
import { roleProfileApi, EmployeeRoleAssignment, RoleProfile } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';
import Badge from '../../shared/components/ui/Badge';
import { Calendar, Building2, Clock, ChevronRight } from 'lucide-react';

const NAVY = '#1E2258';

interface EmployeeRoleAssignmentProps {
  employeeId: number;
  employeeName?: string;
}

export const EmployeeRoleAssignmentComponent: React.FC<EmployeeRoleAssignmentProps> = ({ 
  employeeId, 
  employeeName 
}) => {
  const [currentAssignment, setCurrentAssignment] = useState<EmployeeRoleAssignment | null>(null);
  const [history, setHistory] = useState<EmployeeRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<RoleProfile[]>([]);

  useEffect(() => {
    loadAssignmentData();
    loadProfiles();
  }, [employeeId]);

  const loadAssignmentData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        roleProfileApi.getCurrentRoleAssignment(employeeId),
        roleProfileApi.getRoleAssignmentHistory(employeeId),
      ]);
      setCurrentAssignment(currentRes.data);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : [historyRes.data].filter(Boolean));
    } catch (err) {
      console.error('Failed to load assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await roleProfileApi.getRoleProfiles();
      setAvailableProfiles(response.data);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleAssignRole = async (data: any) => {
    try {
      await roleProfileApi.assignRole(employeeId, data);
      setShowAssignModal(false);
      loadAssignmentData();
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  const handleReassignRole = async (data: any) => {
    try {
      await roleProfileApi.reassignRole(employeeId, data);
      setShowAssignModal(false);
      loadAssignmentData();
    } catch (err) {
      console.error('Failed to reassign role:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Current Role Assignment</h2>
          <Button
            onClick={() => setShowAssignModal(true)}
            leftIcon={<Building2 className="w-4 h-4" />}
            className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
            size="sm"
          >
            {currentAssignment ? 'Reassign' : 'Assign'}
          </Button>
        </CardHeader>
        <CardBody>
          {currentAssignment ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">Role Profile:</span>
                <span className="font-medium">{currentAssignment.role_profile?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">Effective From:</span>
                <span>{new Date(currentAssignment.effective_from).toLocaleDateString()}</span>
              </div>
              {currentAssignment.role_profile && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{currentAssignment.role_profile.horaire_type}</Badge>
                    <Badge variant="default">{currentAssignment.role_profile.salary_type}</Badge>
                    {currentAssignment.role_profile.weekly_hours && (
                      <Badge variant="default" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {currentAssignment.role_profile.weekly_hours}h
                        </span>
                      </Badge>
                    )}
                  </div>
                  {currentAssignment.role_profile.base_salary_min && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Salary Range:</span> {currentAssignment.role_profile.base_salary_min} - {currentAssignment.role_profile.base_salary_max}
                    </div>
                  )}
                  {currentAssignment.role_profile.overtime_eligible && (
                    <Badge variant="success">Overtime Eligible</Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-700">No role profile assigned</p>
              <p className="text-sm text-gray-500 mt-1">Assign a role profile to define job function and compensation.</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Role Assignment History</h2>
        </CardHeader>
        <CardBody>
          {history.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-700">No assignment history</p>
              <p className="text-sm text-gray-500 mt-1">Role assignments will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{assignment.role_profile?.name}</p>
                        <Badge variant="default" className="text-xs">
                          {assignment.role_profile?.horaire_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(assignment.effective_from).toLocaleDateString()}
                          {assignment.effective_to && ` - ${new Date(assignment.effective_to).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title={<span style={{ color: 'white' }}>
            {currentAssignment ? 'Reassign Role' : 'Assign Role'}
            {employeeName && ` to ${employeeName}`}
          </span>}
        >
          <AssignRoleForm
            availableProfiles={availableProfiles}
            onSubmit={currentAssignment ? handleReassignRole : handleAssignRole}
            onCancel={() => setShowAssignModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Assign-role form
// ---------------------------------------------------------------------------

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1 text-left';

const AssignRoleForm: React.FC<{
  availableProfiles: RoleProfile[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ availableProfiles, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    role_profile_id: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Role Profile</label>
        <select
          className={inputClass}
          value={formData.role_profile_id}
          onChange={(e) => setFormData({ ...formData, role_profile_id: e.target.value })}
          required
        >
          <option value="">Select a role profile...</option>
          {availableProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} - {profile.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Effective From</label>
        <input
          type="date"
          className={inputClass}
          value={formData.effective_from}
          onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white">
          {formData.role_profile_id ? 'Assign Role' : 'Select Profile'}
        </Button>
      </div>
    </form>
  );
};
