import React, { useState } from 'react';
import { fiscalProfileApi, PersonalInfoChangeRequest } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';

interface ChangeRequestFormProps {
  onSuccess?: (request: PersonalInfoChangeRequest) => void;
  onCancel?: () => void;
}

export const ChangeRequestForm: React.FC<ChangeRequestFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    requested_marital_status: '',
    requested_children_count: 0,
    requested_disabled_children_count: 0,
    requested_student_children_count: 0,
    claimed_effective_date: '',
  });
  const [documents, setDocuments] = useState<{ type: string; path: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fiscalProfileApi.submitChangeRequest({
        ...formData,
        documents,
      });
      onSuccess?.(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const addDocument = () => {
    setDocuments([...documents, { type: '', path: '' }]);
  };

  const updateDocument = (index: number, field: string, value: string) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Submit Personal Info Change Request</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marital Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.requested_marital_status}
              onChange={(e) => setFormData({ ...formData, requested_marital_status: e.target.value })}
            >
              <option value="">No change</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Children Count
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.requested_children_count}
              onChange={(e) => setFormData({ ...formData, requested_children_count: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disabled Children Count
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.requested_disabled_children_count}
              onChange={(e) => setFormData({ ...formData, requested_disabled_children_count: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Non-Scholarship Children Count
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.requested_student_children_count}
              onChange={(e) => setFormData({ ...formData, requested_student_children_count: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Effective Date *
            </label>
            <input
              type="date"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={formData.claimed_effective_date}
              onChange={(e) => setFormData({ ...formData, claimed_effective_date: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Documents
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={addDocument}>
                + Add Document
              </Button>
            </div>
            
            {documents.map((doc, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  value={doc.type}
                  onChange={(e) => updateDocument(index, 'type', e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="marriage_certificate">Marriage Certificate</option>
                  <option value="divorce_judgment">Divorce Judgment</option>
                  <option value="death_certificate">Death Certificate</option>
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="disability_certificate">Disability Certificate</option>
                  <option value="school_enrollment_certificate">School Enrollment Certificate</option>
                </select>
                <input
                  type="text"
                  placeholder="File path"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  value={doc.path}
                  onChange={(e) => updateDocument(index, 'path', e.target.value)}
                />
                <Button type="button" variant="danger" size="sm" onClick={() => removeDocument(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={loading}>
              Submit Request
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};
