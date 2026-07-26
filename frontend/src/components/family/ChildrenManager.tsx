import React, { useState, useEffect } from 'react';
import { Plus, X, Upload, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Child, getChildren, createChild, updateChild, deleteChild, CreateChildRequest, UpdateChildRequest } from '../../api/familyInfo';

interface ChildrenManagerProps {
  readonly?: boolean;
}

const ChildrenManager: React.FC<ChildrenManagerProps> = ({ readonly = false }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<CreateChildRequest>({
    nom: '',
    prenom: '',
    date_naissance: '',
    status: 'healthy',
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const data = await getChildren();
      setChildren(data);
    } catch (err) {
      console.error('Failed to load children', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      if (!file.type.match(/^(image\/(jpeg|jpg|png)|application\/pdf)$/)) {
        setError('Only PDF, JPG, JPEG, and PNG files are supported');
        return;
      }
      setDocumentFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log('Submitting child data:', formData);
    console.log('Document file:', documentFile);

    try {
      const submitData: CreateChildRequest = {
        ...formData,
        document: documentFile || undefined,
      };

      console.log('Submit data:', submitData);

      if (editingChild) {
        await updateChild(editingChild.id, submitData as UpdateChildRequest);
        setSuccess('Child updated successfully!');
      } else {
        await createChild(submitData);
        setSuccess('Child added successfully!');
      }

      await loadChildren();
      resetForm();
    } catch (err: any) {
      console.error('Error saving child:', err);
      setError(err.response?.data?.message || 'Failed to save child. Please try again.');
    }
  };

  const handleEdit = (child: Child) => {
    setEditingChild(child);
    setFormData({
      nom: child.nom,
      prenom: child.prenom,
      date_naissance: child.date_naissance,
      status: child.status,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this child?')) {
      return;
    }

    try {
      await deleteChild(id);
      setSuccess('Child deleted successfully!');
      await loadChildren();
    } catch (err) {
      setError('Failed to delete child. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      date_naissance: '',
      status: 'healthy',
    });
    setDocumentFile(null);
    setEditingChild(null);
    setShowAddForm(false);
    setError('');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'disabled': return 'Disabled';
      case 'university': return 'University Student';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'disabled': return 'bg-yellow-100 text-yellow-800';
      case 'university': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="children-manager">
      <div className="section-header">
        <h3>Children Information</h3>
        {!readonly && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="edit-profile-btn"
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            {showAddForm ? 'Cancel' : 'Add Child'}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            color: '#EF4444',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#FEE2E2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: '#065F46',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#D1FAE5',
            borderRadius: '8px',
          }}
        >
          {success}
        </div>
      )}

      {showAddForm && !readonly && (
        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '1rem' }}>{editingChild ? 'Edit Child' : 'Add New Child'}</h4>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>First Name</label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Last Name</label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Date of Birth</label>
              <input
                type="date"
                name="date_naissance"
                value={formData.date_naissance}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                }}
              >
                <option value="healthy">Healthy</option>
                <option value="disabled">Disabled</option>
                <option value="university">University Student</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              {formData.status === 'disabled' ? 'Medical Certificate' : 'Birth Certificate'} 
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Required)</span>
            </label>
            <div style={{ border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', backgroundColor: 'white' }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="child-document-input"
              />
              <label
                htmlFor="child-document-input"
                style={{
                  display: 'block',
                  padding: '1rem',
                  cursor: 'pointer',
                  color: '#6B7280',
                }}
              >
                <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                <div>{documentFile ? documentFile.name : 'Click to upload or drag and drop'}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>PDF, JPG, JPEG, PNG (max 5MB)</div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                backgroundColor: '#4F46E5',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {editingChild ? 'Update' : 'Add Child'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {children.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
          No children added yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {children.map((child) => (
            <div
              key={child.id}
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {child.prenom} {child.nom}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Born: {new Date(child.date_naissance).toLocaleDateString()}
                </div>
                <span
                  style={{
                    fontSize: ' 0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: '500',
                  }}
                  className={getStatusColor(child.status)}
                >
                  {getStatusLabel(child.status)}
                </span>
              </div>
              {!readonly && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(child)}
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(child.id)}
                    style={{
                      backgroundColor: '#FEE2E2',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#EF4444',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildrenManager;
