import React, { useState, useEffect } from 'react';
import { fiscalProfileApi, EmployeeFiscalProfileAssignment } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';

interface EmployeeFiscalProfileProps {
  employeeId: number;
}

export const EmployeeFiscalProfile: React.FC<EmployeeFiscalProfileProps> = ({ employeeId }) => {
  const [currentProfile, setCurrentProfile] = useState<EmployeeFiscalProfileAssignment | null>(null);
  const [history, setHistory] = useState<EmployeeFiscalProfileAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [employeeId]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        fiscalProfileApi.getEmployeeCurrentFiscalProfile(employeeId),
        fiscalProfileApi.getEmployeeFiscalHistory(employeeId),
      ]);
      setCurrentProfile(currentRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Current Fiscal Profile</h2>
        </CardHeader>
        <CardBody>
          {currentProfile ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Group:</span>
                <span className="font-medium">{currentProfile.fiscal_profile_group?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Effective From:</span>
                <span>{new Date(currentProfile.effective_from).toLocaleDateString()}</span>
              </div>
              {currentProfile.fiscal_profile_group && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm">
                    <span className="font-medium">Gender:</span> {currentProfile.fiscal_profile_group.gender}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Marital Status:</span> {currentProfile.fiscal_profile_group.marital_status}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Children:</span> {currentProfile.fiscal_profile_group.children_count}
                  </p>
                  {currentProfile.fiscal_profile_group.head_of_family && (
                    <p className="text-sm text-green-600 font-medium">Head of Family</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">No fiscal profile assigned</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Fiscal Profile History</h2>
        </CardHeader>
        <CardBody>
          {history.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No history available</div>
          ) : (
            <div className="space-y-3">
              {history.map((assignment) => (
                <div key={assignment.id} className="border-l-2 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{assignment.fiscal_profile_group?.label}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(assignment.effective_from).toLocaleDateString()}
                        {assignment.effective_to && ` - ${new Date(assignment.effective_to).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
