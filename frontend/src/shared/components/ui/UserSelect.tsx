import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import client from '../../../api/client';

interface User {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select an employee',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
    if (value) {
      const fetchSelectedUser = async () => {
        try {
          const response = await client.get(`/utilisateurs/${value}`);
          setSelectedUser(response.data.data || response.data);
        } catch (error) {
          console.error('Failed to fetch selected user:', error);
        }
      };
      fetchSelectedUser();
    } else {
      setSelectedUser(null);
    }
  }, [value]);

  const handleSelect = (user: User) => {
    onChange(user.id);
    setSelectedUser(user);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSelectedUser(null);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const displayName = selectedUser 
    ? `${selectedUser.prenom} ${selectedUser.nom} (${selectedUser.matricule})`
    : searchTerm;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={displayName}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {selectedUser && (
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchTerm.length < 2 ? 'Type to search...' : 'No users found'}
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {user.prenom} {user.nom}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.matricule}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSelect;
