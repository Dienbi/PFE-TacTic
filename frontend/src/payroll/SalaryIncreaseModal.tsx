import React, { useState } from 'react';
import { legacyPayrollApi } from '../api/payrollApi';

interface SalaryIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SalaryIncreaseModal: React.FC<SalaryIncreaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [percentage, setPercentage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const percentageValue = parseFloat(percentage);

    if (isNaN(percentageValue) || percentageValue <= 0) {
      setError('Please enter a valid percentage greater than 0');
      return;
    }

    if (percentageValue > 100) {
      setError('Percentage cannot exceed 100%');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await legacyPayrollApi.increaseSalaries(percentageValue);
      setSuccess(`Salaries increased for ${response.data.count} employees`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to increase salaries. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPercentage('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Increase All Salaries
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This will increase the base salary for all employees with configured salaries.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 mb-1">
                Increase Percentage (%)
              </label>
              <input
                type="number"
                id="percentage"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                step="0.01"
                min="0.01"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 5.5"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a value between 0.01 and 100
              </p>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-700">
                <strong>Warning:</strong> This action will affect all employees and cannot be undone.
                Employees will be notified of the change.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !percentage}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Increase Salaries'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalaryIncreaseModal;
