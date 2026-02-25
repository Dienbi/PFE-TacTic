"""
Training Service — orchestrates training of all AI models.
"""

import logging
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session

from app.services.data_pipeline import DataPipeline
from app.models.attendance_model import AttendancePredictor
from app.models.performance_model import PerformanceScorer
from app.models.matching_model import ProfileMatcher

logger = logging.getLogger(__name__)


class TrainingService:
    """Orchestrates training of all AI models."""
    
    # Track training history
    _training_history: Dict[str, dict] = {}
    
    def __init__(self, db: Session):
        self.db = db
        self.pipeline = DataPipeline(db)
    
    def train_attendance_model(self, epochs: int = 50) -> dict:
        """Train the attendance LSTM model."""
        logger.info("=" * 60)
        logger.info("Training Attendance LSTM Model")
        logger.info("=" * 60)
        
        start = datetime.now()
        
        # Build sequences
        sequences = self.pipeline.build_attendance_sequences(sequence_length=30)
        
        if not sequences:
            msg = "No attendance sequences available for training"
            logger.warning(msg)
            return {'model': 'attendance_lstm', 'status': 'skipped', 'reason': msg}
        
        logger.info(f"Built sequences for {len(sequences)} employees")
        
        # Train
        predictor = AttendancePredictor()
        metrics = predictor.train(sequences, epochs=epochs)
        
        duration = (datetime.now() - start).total_seconds()
        metrics['duration_seconds'] = round(duration, 2)
        metrics['trained_at'] = datetime.now().isoformat()
        metrics['status'] = 'success'
        
        self.__class__._training_history['attendance_lstm'] = metrics
        
        logger.info(f"Attendance model trained in {duration:.1f}s | "
                    f"Accuracy: {metrics.get('final_accuracy', 'N/A')}")
        
        return metrics
    
    def train_performance_model(self, epochs: int = 100) -> dict:
        """Train the performance FFN model."""
        logger.info("=" * 60)
        logger.info("Training Performance FFN Model")
        logger.info("=" * 60)
        
        start = datetime.now()
        
        # Build features and labels
        employee_features = self.pipeline.build_employee_features()
        performance_labels = self.pipeline.compute_performance_labels()
        
        if employee_features.empty or performance_labels.empty:
            msg = "No employee data available for training"
            logger.warning(msg)
            return {'model': 'performance_ffn', 'status': 'skipped', 'reason': msg}
        
        logger.info(f"Built features for {len(employee_features)} employees")
        
        # Train
        scorer = PerformanceScorer()
        metrics = scorer.train(employee_features, performance_labels, epochs=epochs)
        
        duration = (datetime.now() - start).total_seconds()
        metrics['duration_seconds'] = round(duration, 2)
        metrics['trained_at'] = datetime.now().isoformat()
        metrics['status'] = 'success'
        
        self.__class__._training_history['performance_ffn'] = metrics
        
        logger.info(f"Performance model trained in {duration:.1f}s | MAE: {metrics.get('final_mae', 'N/A')}")
        
        return metrics
    
    def train_matching_model(self, epochs: int = 80) -> dict:
        """Train the matching neural network."""
        logger.info("=" * 60)
        logger.info("Training Matching Neural Network")
        logger.info("=" * 60)
        
        start = datetime.now()
        
        # Get all published job posts
        from sqlalchemy import text
        query = text("""
            SELECT id FROM job_posts
            WHERE statut = 'publiee' AND deleted_at IS NULL
            LIMIT 10
        """)
        job_posts = self.db.execute(query).fetchall()
        
        if not job_posts:
            msg = "No published job posts available for training"
            logger.warning(msg)
            return {'model': 'matching_nn', 'status': 'skipped', 'reason': msg}
        
        # Build matching features for each job post
        matching_features_list = []
        for (jp_id,) in job_posts:
            features = self.pipeline.build_matching_features(jp_id)
            if not features.empty:
                matching_features_list.append(features)
        
        if not matching_features_list:
            msg = "No matching features could be computed"
            logger.warning(msg)
            return {'model': 'matching_nn', 'status': 'skipped', 'reason': msg}
        
        logger.info(f"Built matching features from {len(matching_features_list)} job posts")
        
        # Train
        matcher = ProfileMatcher()
        metrics = matcher.train(matching_features_list, epochs=epochs)
        
        duration = (datetime.now() - start).total_seconds()
        metrics['duration_seconds'] = round(duration, 2)
        metrics['trained_at'] = datetime.now().isoformat()
        metrics['status'] = 'success'
        
        self.__class__._training_history['matching_nn'] = metrics
        
        logger.info(f"Matching model trained in {duration:.1f}s")
        
        return metrics
    
    def train_all(self) -> dict:
        """Train all models sequentially."""
        logger.info("*" * 60)
        logger.info("TRAINING ALL AI MODELS")
        logger.info("*" * 60)
        
        start = datetime.now()
        
        results = {
            'attendance': self.train_attendance_model(),
            'performance': self.train_performance_model(),
            'matching': self.train_matching_model(),
        }
        
        total_duration = (datetime.now() - start).total_seconds()
        results['total_duration_seconds'] = round(total_duration, 2)
        results['completed_at'] = datetime.now().isoformat()
        
        logger.info(f"All models trained in {total_duration:.1f}s")
        
        return results
    
    @classmethod
    def get_training_status(cls) -> dict:
        """Get the last training status for all models."""
        return {
            'models': cls._training_history,
            'last_checked': datetime.now().isoformat(),
        }
