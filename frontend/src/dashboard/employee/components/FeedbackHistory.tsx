import React, { useEffect, useState } from 'react';
import { MessageSquare, Calendar, User, Star } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { performanceReviewsApi, PerformanceReview } from '../../../api/performanceReviews';
import FeedbackBadge from '../../../shared/components/ui/FeedbackBadge';
import './FeedbackHistory.css';

const FeedbackHistory: React.FC = () => {
  const { user } = useAuth();
  const [feedbackHistory, setFeedbackHistory] = useState<PerformanceReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeedbackHistory = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const history = await performanceReviewsApi.getEmployeeHistory(user.id);
        setFeedbackHistory(history);
      } catch (error) {
        console.error('Failed to load feedback history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedbackHistory();
  }, [user]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="feedback-history-container">
        <div className="loading-state">Loading feedback history...</div>
      </div>
    );
  }

  return (
    <div className="feedback-history-container">
      <div className="feedback-history-header">
        <h3 className="section-title">
          <MessageSquare size={20} />
          Feedback History
        </h3>
      </div>

      {feedbackHistory.length === 0 ? (
        <div className="empty-feedback">
          <MessageSquare size={48} className="empty-icon" />
          <p>No feedback received yet</p>
        </div>
      ) : (
        <div className="feedback-list">
          {feedbackHistory.map((feedback) => (
            <div key={feedback.id} className="feedback-item">
              <div className="feedback-item-header">
                <div className="feedback-meta">
                  <div className="feedback-manager">
                    <User size={16} />
                    <span>
                      {feedback.chef?.prenom} {feedback.chef?.nom}
                    </span>
                  </div>
                  <div className="feedback-date">
                    <Calendar size={16} />
                    <span>{formatDate(feedback.review_date)}</span>
                  </div>
                </div>
                <FeedbackBadge score={feedback.score} size="sm" />
              </div>

              <div className="feedback-message">
                <p>{feedback.message}</p>
              </div>

              <div className="feedback-footer">
                <div className="feedback-score-display">
                  <Star size={16} className="star-icon" />
                  <span className="score-value">
                    {typeof feedback.score === 'number' 
                      ? feedback.score.toFixed(1) 
                      : parseFloat(String(feedback.score)).toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackHistory;
