import React from 'react';

interface FeedbackBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({ score, size = 'md' }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 6) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs font-medium';
      case 'lg':
        return 'px-4 py-2 text-sm font-semibold';
      default:
        return 'px-3 py-1 text-sm font-medium';
    }
  };

  const numericScore = typeof score === 'number' ? score : parseFloat(String(score));

  return (
    <span
      className={`inline-flex items-center rounded-full border ${getScoreColor(numericScore)} ${getSizeClasses(size)}`}
    >
      {isNaN(numericScore) ? 'N/A' : `${numericScore.toFixed(1)}/10`}
    </span>
  );
};

export default FeedbackBadge;
