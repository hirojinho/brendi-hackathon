import React from 'react';
import './ReviewProgress.css';

interface ReviewProgressProps {
  current: number;
  total: number;
  remaining: number;
}

export const ReviewProgress: React.FC<ReviewProgressProps> = ({
  current,
  total,
  remaining
}) => {
  const progressPercentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="review-progress">
      <div className="progress-header">
        <div className="progress-text">
          <span className="current-note">Note {current} of {total}</span>
          <span className="remaining-count">{remaining} remaining</span>
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="progress-details">
        <span className="progress-percentage">
          {Math.round(progressPercentage)}% complete
        </span>
      </div>
    </div>
  );
};