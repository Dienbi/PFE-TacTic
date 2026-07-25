import React, { useState } from 'react';
import { fiscalProfileApi, PersonalInfoChangeRequest } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';

const NAVY = '#1E2258';

interface ChangeRequestFormProps {
  onSuccess?: (request: PersonalInfoChangeRequest) => void;
  onCancel?: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1 text-left';

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

  const addDocument = () => setDocuments([...documents, { type: '', path: '' }]);

  const updateDocument = (index: number, field: string, value: string) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    setDocuments(updated);
  };

  const removeDocument = (index: number) => setDocuments(documents.filter((_, i) => i !== index));

  return (
    <Card className="shadow-md border border-gray-200 bg-gradient-to-br from-white to-gray-50">
      <CardHeader>
        <h2 className="text-lg font-semibold text-left" style={{ color: NAVY }}>
          Submit Personal Info Change Request
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-left">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marital Status</label>
              <select
                className={inputClass}
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
              <label className={labelClass}>Effective Date *</label>
              <input
                type="date"
                required
                className={inputClass}
                value={formData.claimed_effective_date}
                onChange={(e) => setFormData({ ...formData, claimed_effective_date: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Children Count</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.requested_children_count}
                onChange={(e) =>
                  setFormData({ ...formData, requested_children_count: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <label className={labelClass}>Disabled Children Count</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.requested_disabled_children_count}
                onChange={(e) =>
                  setFormData({ ...formData, requested_disabled_children_count: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Student Non-Scholarship Children Count</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.requested_student_children_count}
                onChange={(e) =>
                  setFormData({ ...formData, requested_student_children_count: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 text-left">Documents</label>
              <Button
                type="button"
                size="sm"
                onClick={addDocument}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                + Add Document
              </Button>
            </div>

            {documents.map((doc, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  className={inputClass}
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
                  className={inputClass}
                  value={doc.path}
                  onChange={(e) => updateDocument(index, 'path', e.target.value)}
                />
                <Button type="button" variant="danger" size="sm" onClick={() => removeDocument(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              isLoading={loading}
              className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};