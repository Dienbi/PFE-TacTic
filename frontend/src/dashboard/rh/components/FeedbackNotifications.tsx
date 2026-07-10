import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, User, Star } from 'lucide-react';
import { performanceReviewsApi, PerformanceReview } from '../../../api/performanceReviews';
import FeedbackBadge from '../../../shared/components/ui/FeedbackBadge';
import './FeedbackNotifications.css';

const FeedbackNotifications: React.FC = () => {
  const [recentFeedback, setRecentFeedback] = useState<PerformanceReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentFeedback = async () => {
      try {
        setIsLoading(true);
        const allFeedback = await performanceReviewsApi.getAllFeedback();
        // Get feedback from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recent = allFeedback.filter(feedback => 
          new Date(feedback.created_at) >= sevenDaysAgo
        ).slice(0, 10); // Show max 10 recent feedback
        
        setRecentFeedback(recent);
      } catch (error) {
        console.error('Failed to load recent feedback:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentFeedback();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="feedback-notifications-container">
        <div className="loading-state">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="feedback-notifications-container">
      <div className="feedback-notifications-header">
        <h3 className="section-title">
          <Star size={20} />
          Recent Feedback
        </h3>
      </div>

      {recentFeedback.length === 0 ? (
        <div className="empty-feedback">
          <Star size={48} className="empty-icon" />
          <p>No recent feedback</p>
        </div>
      ) : (
        <div className="feedback-notifications-list">
          {recentFeedback.map((feedback) => {
            const isHighScore = feedback.score >= 7.0;
            const Icon = isHighScore ? TrendingUp : TrendingDown;
            const alertType = isHighScore ? 'success' : 'warning';
            
            return (
              <div key={feedback.id} className={`feedback-notification-item ${alertType}`}>
                <div className="feedback-notification-icon">
                  <Icon size={20} />
                </div>
                
                <div className="feedback-notification-content">
                  <div className="feedback-notification-header">
                    <div className="feedback-employee-info">
                      <span className="employee-name">
                        {feedback.employee?.prenom} {feedback.employee?.nom}
                      </span>
                      <FeedbackBadge score={feedback.score} size="sm" />
                    </div>
                    <span className="feedback-time">{formatDate(feedback.created_at)}</span>
                  </div>
                  
                  <div className="feedback-notification-details">
                    <div className="feedback-manager">
                      <User size={14} />
                      <span>
                        by {feedback.chef?.prenom} {feedback.chef?.nom}
                      </span>
                    </div>
                    <div className="feedback-date">
                      <Calendar size={14} />
                      <span>{new Date(feedback.review_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackNotifications;
