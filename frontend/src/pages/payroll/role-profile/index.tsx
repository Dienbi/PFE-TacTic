import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../shared/components/Sidebar';
import Navbar from '../../../shared/components/Navbar';
import { RoleProfiles } from '../../../components/role-profile/RoleProfiles';

const RoleProfilePage: React.FC = () => {
  const { user, displayName } = useAuth();

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Role Profile Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage job function profiles and compensation structures</p>
          </div>
          <RoleProfiles />
        </div>
      </div>
    </div>
  );
};

export default RoleProfilePage;
