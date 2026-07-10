import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import ScoreSlider from '../../../shared/components/ui/ScoreSlider';
import { performanceReviewsApi, CreatePerformanceReviewRequest, UpdatePerformanceReviewRequest, PerformanceReview } from '../../../api/performanceReviews';
import { useToast } from '../../../shared/components/Toast';

interface FeedbackFormProps {
  employeeId: number;
  employeeName: string;
  existingReview?: PerformanceReview;
  onClose: () => void;
  onSuccess: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  employeeId,
  employeeName,
  existingReview,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [score, setScore] = useState(existingReview?.score || 7.0);
  const [message, setMessage] = useState(existingReview?.message || '');
  const [reviewDate, setReviewDate] = useState(
    existingReview?.review_date || new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setCharacterCount(message.length);
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: CreatePerformanceReviewRequest | UpdatePerformanceReviewRequest = {
        utilisateur_id: employeeId,
        score,
        message,
        review_date: reviewDate,
      };

      if (existingReview) {
        await performanceReviewsApi.update(existingReview.id, data);
        showToast('success', 'Success', 'Feedback updated successfully');
      } else {
        await performanceReviewsApi.create(data as CreatePerformanceReviewRequest);
        showToast('success', 'Success', 'Feedback created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save feedback';
      showToast('error', 'Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      await performanceReviewsApi.delete(existingReview.id);
      showToast('success', 'Success', 'Feedback deleted successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete feedback';
      showToast('error', 'Error', errorMessage);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative z-[101]">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingReview ? 'Edit Feedback' : 'Give Feedback'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <p className="text-gray-900 font-medium">{employeeName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Date
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score (1-10)
            </label>
            <ScoreSlider value={score} onChange={setScore} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter your feedback message..."
              required
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">Max 500 characters</span>
              <span className={`text-xs ${characterCount > 450 ? 'text-red-500' : 'text-gray-500'}`}>
                {characterCount}/500
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting || message.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : existingReview ? 'Update' : 'Submit'}
            </button>
          </div>

          {existingReview && (
            <div className="pt-4 border-t">
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this feedback? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      disabled={isDeleting || isSubmitting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting || isSubmitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  {isDeleting ? 'Deleting...' : 'Delete Feedback'}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
