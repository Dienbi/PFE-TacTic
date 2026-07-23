import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import client from '../../../api/client';

interface User {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string;
}

interface MultiUserSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiUserSelect: React.FC<MultiUserSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select employees',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchTerm.length < 2) {
        // Try to fetch all users if search term is empty (for RH role)
        try {
          setLoading(true);
          const response = await client.get('/utilisateurs?all=true');
          setUsers(response.data.data || response.data || []);
        } catch (error) {
          console.error('Failed to fetch users:', error);
          setUsers([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await client.get(`/utilisateurs/search?q=${searchTerm}`);
        setUsers(response.data.data || response.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    if (value.length > 0) {
      const fetchSelectedUsers = async () => {
        try {
          const userPromises = value.map(id => client.get(`/utilisateurs/${id}`));
          const responses = await Promise.all(userPromises);
          const selected = responses.map(response => response.data.data || response.data).filter(Boolean);
          setSelectedUsers(selected);
        } catch (error) {
          console.error('Failed to fetch selected users:', error);
        }
      };
      fetchSelectedUsers();
    } else {
      setSelectedUsers([]);
    }
  }, [value]);

  const handleToggle = (user: User) => {
    const isSelected = value.includes(user.id);
    if (isSelected) {
      const newValue = value.filter((id) => id !== user.id);
      onChange(newValue);
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      const newValue = [...value, user.id];
      onChange(newValue);
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSelectAll = () => {
    if (users.length === 0) return;
    
    const allSelected = users.every((user: User) => value.includes(user.id));
    if (allSelected) {
      const newValue = value.filter((id) => !users.some((user: User) => user.id === id));
      onChange(newValue);
      setSelectedUsers(selectedUsers.filter((u) => !users.some((user: User) => user.id === u.id)));
    } else {
      const newIds = users.map((user: User) => user.id);
      const newValue = Array.from(new Set([...value, ...newIds]));
      onChange(newValue);
      const newUsers = [...selectedUsers, ...users.filter((u: User) => !value.includes(u.id))];
      setSelectedUsers(newUsers);
    }
  };

  const handleClear = () => {
    onChange([]);
    setSelectedUsers([]);
  };

  const displayName = selectedUsers.length > 0
    ? `${selectedUsers.length} employee${selectedUsers.length > 1 ? 's' : ''} selected`
    : '';

  const allSelected = users.length > 0 && users.every((user: User) => value.includes(user.id));
  const someSelected = users.some((user: User) => value.includes(user.id));

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selectedUsers.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
          {displayName || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={users.length === 0}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">
                ({selectedUsers.length} selected)
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or matricule..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="p-2">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchTerm.length < 2 ? 'Type to search...' : 'No users found'}
              </div>
            ) : (
              users.map((user: User) => {
                const isSelected = value.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleToggle(user)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {user.prenom} {user.nom}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.matricule}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiUserSelect;
