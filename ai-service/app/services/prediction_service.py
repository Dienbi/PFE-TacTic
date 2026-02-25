"""
Prediction Service — uses trained models to generate predictions and scores.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.data_pipeline import DataPipeline
from app.models.attendance_model import AttendancePredictor
from app.models.performance_model import PerformanceScorer
from app.models.matching_model import ProfileMatcher

logger = logging.getLogger(__name__)


class PredictionService:
    """Uses trained AI models to generate predictions."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pipeline = DataPipeline(db)
    
    # ────────────────────────────────────────────────────────────────
    # Attendance Predictions
    # ────────────────────────────────────────────────────────────────
    
    def predict_attendance(self, user_id: int) -> Dict:
        """
        Predict next 7 days attendance for a single employee.
        
        Returns:
            dict with user info and daily predictions
        """
        predictor = AttendancePredictor()
        if not predictor.is_trained:
            raise RuntimeError("Attendance model not trained yet")
        
        # Build the most recent 30-day sequence for this user
        sequences = self.pipeline.build_attendance_sequences(sequence_length=30)
        
        if user_id not in sequences:
            raise ValueError(f"Not enough attendance data for user {user_id}")
        
        X, _ = sequences[user_id]
        # Use the most recent sequence (last one)
        last_sequence = X[-1]  # (30, 7)
        
        # Predict
        predictions = predictor.predict(last_sequence)  # (7,) probabilities of being present
        
        # Get user info
        user = self._get_user_info(user_id)
        
        # Build daily forecast
        today = datetime.now().date()
        daily_forecast = []
        for i in range(7):
            forecast_date = today + timedelta(days=i + 1)
            # Skip weekends
            while forecast_date.weekday() >= 5:
                forecast_date += timedelta(days=1)
            
            presence_prob = float(predictions[i])
            absence_prob = 1.0 - presence_prob
            
            risk_level = 'low' if absence_prob < 0.3 else ('medium' if absence_prob < 0.6 else 'high')
            
            daily_forecast.append({
                'date': forecast_date.isoformat(),
                'day_name': forecast_date.strftime('%A'),
                'presence_probability': round(presence_prob, 4),
                'absence_probability': round(absence_prob, 4),
                'risk_level': risk_level,
            })
        
        return {
            'utilisateur_id': user_id,
            'nom': user.get('nom', ''),
            'prenom': user.get('prenom', ''),
            'matricule': user.get('matricule', ''),
            'predictions': daily_forecast,
            'avg_absence_risk': round(float(np.mean(1 - predictions)), 4),
            'generated_at': datetime.now().isoformat(),
        }
    
    def predict_attendance_all(self) -> List[Dict]:
        """Predict next 7 days attendance for all active employees."""
        predictor = AttendancePredictor()
        if not predictor.is_trained:
            raise RuntimeError("Attendance model not trained yet")
        
        sequences = self.pipeline.build_attendance_sequences(sequence_length=30)
        employees = self.pipeline.get_all_employees()
        
        results = []
        for uid in employees['id'].tolist():
            if uid not in sequences:
                continue
            
            try:
                X, _ = sequences[uid]
                last_sequence = X[-1]
                predictions = predictor.predict(last_sequence)
                
                user = employees[employees['id'] == uid].iloc[0]
                avg_absence_risk = float(np.mean(1 - predictions))
                
                results.append({
                    'utilisateur_id': int(uid),
                    'nom': user.get('nom', ''),
                    'prenom': user.get('prenom', ''),
                    'matricule': user.get('matricule', ''),
                    'avg_absence_risk': round(avg_absence_risk, 4),
                    'risk_level': 'low' if avg_absence_risk < 0.3 else ('medium' if avg_absence_risk < 0.6 else 'high'),
                    'next_day_absence_prob': round(float(1 - predictions[0]), 4),
                })
            except Exception as e:
                logger.warning(f"Failed to predict for user {uid}: {e}")
        
        # Sort by risk (highest first)
        results.sort(key=lambda x: x['avg_absence_risk'], reverse=True)
        
        return results
    
    # ────────────────────────────────────────────────────────────────
    # Performance Scores
    # ────────────────────────────────────────────────────────────────
    
    def get_performance_score(self, user_id: int) -> Dict:
        """Get AI performance score for a single employee."""
        scorer = PerformanceScorer()
        if not scorer.is_trained:
            raise RuntimeError("Performance model not trained yet")
        
        emp_features = self.pipeline.build_employee_features()
        if emp_features.empty:
            raise ValueError("No employee data available")
        
        user_row = emp_features[emp_features['utilisateur_id'] == user_id]
        if user_row.empty:
            raise ValueError(f"Employee {user_id} not found")
        
        available_cols = [c for c in PerformanceScorer.FEATURE_COLS if c in emp_features.columns]
        X = user_row[available_cols].values.astype(np.float32)
        
        score = scorer.predict(X, available_cols)[0]
        
        user = self._get_user_info(user_id)
        
        # Score breakdown
        row = user_row.iloc[0]
        breakdown = {
            'attendance_rate': round(float(row.get('presence_rate', 0)) * 100, 1),
            'avg_hours_worked': round(float(row.get('avg_hours_worked', 0)), 1),
            'late_rate': round(float(row.get('late_rate', 0)) * 100, 1),
            'skill_count': int(row.get('skill_count', 0)),
            'avg_skill_level': round(float(row.get('avg_skill_level', 0)), 1),
            'tenure_months': round(float(row.get('tenure_months', 0)), 0),
            'overtime_ratio': round(float(row.get('overtime_ratio', 0)) * 100, 1),
        }
        
        return {
            'utilisateur_id': user_id,
            'nom': user.get('nom', ''),
            'prenom': user.get('prenom', ''),
            'matricule': user.get('matricule', ''),
            'performance_score': round(float(score), 2),
            'grade': self._score_to_grade(score),
            'breakdown': breakdown,
            'generated_at': datetime.now().isoformat(),
        }
    
    def get_performance_all(self) -> List[Dict]:
        """Get AI performance scores for all active employees."""
        scorer = PerformanceScorer()
        if not scorer.is_trained:
            raise RuntimeError("Performance model not trained yet")
        
        emp_features = self.pipeline.build_employee_features()
        if emp_features.empty:
            return []
        
        available_cols = [c for c in PerformanceScorer.FEATURE_COLS if c in emp_features.columns]
        X = emp_features[available_cols].values.astype(np.float32)
        
        scores = scorer.predict(X, available_cols)
        
        results = []
        for i, (_, row) in enumerate(emp_features.iterrows()):
            score = float(scores[i])
            results.append({
                'utilisateur_id': int(row['utilisateur_id']),
                'nom': row.get('nom', ''),
                'prenom': row.get('prenom', ''),
                'matricule': row.get('matricule', ''),
                'performance_score': round(score, 2),
                'grade': self._score_to_grade(score),
                'attendance_rate': round(float(row.get('presence_rate', 0)) * 100, 1),
                'skill_count': int(row.get('skill_count', 0)),
            })
        
        results.sort(key=lambda x: x['performance_score'], reverse=True)
        return results
    
    # ────────────────────────────────────────────────────────────────
    # Job Matching
    # ────────────────────────────────────────────────────────────────
    
    def match_candidates(self, job_post_id: int) -> Dict:
        """
        Use trained neural matcher to rank candidates for a job post.
        Falls back to rule-based scoring if model not trained.
        """
        matcher = ProfileMatcher()
        
        # Get job post info
        job_post = self._get_job_post(job_post_id)
        if not job_post:
            raise ValueError(f"Job post {job_post_id} not found")
        
        # Build matching features
        features_df = self.pipeline.build_matching_features(job_post_id)
        if features_df.empty:
            return {
                'job_post_id': job_post_id,
                'job_post_titre': job_post['titre'],
                'total_candidates': 0,
                'recommendations': [],
                'model_used': 'none',
                'generated_at': datetime.now().isoformat(),
            }
        
        available_cols = [c for c in ProfileMatcher.FEATURE_COLS if c in features_df.columns]
        X = features_df[available_cols].values.astype(np.float32)
        
        if matcher.is_trained:
            scores = matcher.predict(X, available_cols)
            model_used = 'neural_network'
        else:
            # Fallback: rule-based weighted scoring
            scores = self._rule_based_matching(features_df)
            model_used = 'rule_based_fallback'
        
        # Get employee details and skill match info
        emp_skills = self.pipeline.get_employee_skills()
        job_skills = self.pipeline.get_job_post_skills(job_post_id)
        
        recommendations = []
        for i, (_, row) in enumerate(features_df.iterrows()):
            uid = int(row['utilisateur_id'])
            score = float(scores[i])
            
            if score <= 0:
                continue
            
            user = self._get_user_info(uid)
            
            # Skill details
            user_skills_df = emp_skills[emp_skills['utilisateur_id'] == uid] if not emp_skills.empty else pd.DataFrame()
            skill_details = self._build_skill_details(user_skills_df, job_skills)
            
            recommendations.append({
                'utilisateur_id': uid,
                'nom': user.get('nom', ''),
                'prenom': user.get('prenom', ''),
                'matricule': user.get('matricule', ''),
                'email': user.get('email', ''),
                'score': round(score, 2),
                'details': {
                    'skill_overlap_ratio': round(float(row.get('skill_overlap_ratio', 0)) * 100, 1),
                    'weighted_skill_match': round(float(row.get('weighted_skill_match', 0)) * 100, 1),
                    'attendance_score': round(float(row.get('attendance_score', 0)) * 100, 1),
                    'tenure_years': round(float(row.get('tenure_years', 0)), 1),
                    'availability': float(row.get('availability', 0)),
                    'matching_skills': skill_details['matching'],
                    'missing_skills': skill_details['missing'],
                },
            })
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'job_post_id': job_post_id,
            'job_post_titre': job_post['titre'],
            'total_candidates': len(recommendations),
            'recommendations': recommendations,
            'model_used': model_used,
            'generated_at': datetime.now().isoformat(),
        }
    
    # ────────────────────────────────────────────────────────────────
    # Dashboard KPIs
    # ────────────────────────────────────────────────────────────────
    
    def get_dashboard_kpis(self) -> Dict:
        """Get aggregated AI-powered KPIs for the RH dashboard."""
        kpis = {
            'generated_at': datetime.now().isoformat(),
            'attendance_predictions': None,
            'performance_scores': None,
        }
        
        # Attendance KPIs
        try:
            att_predictions = self.predict_attendance_all()
            if att_predictions:
                avg_risk = np.mean([p['avg_absence_risk'] for p in att_predictions])
                high_risk_count = sum(1 for p in att_predictions if p['risk_level'] == 'high')
                medium_risk_count = sum(1 for p in att_predictions if p['risk_level'] == 'medium')
                
                kpis['attendance_predictions'] = {
                    'predicted_absence_rate': round(float(avg_risk) * 100, 1),
                    'high_risk_employees': high_risk_count,
                    'medium_risk_employees': medium_risk_count,
                    'total_analyzed': len(att_predictions),
                    'top_at_risk': att_predictions[:5],  # Top 5 at-risk employees
                }
        except Exception as e:
            logger.warning(f"Attendance predictions unavailable: {e}")
            kpis['attendance_predictions'] = {'error': str(e)}
        
        # Performance KPIs
        try:
            perf_scores = self.get_performance_all()
            if perf_scores:
                scores = [p['performance_score'] for p in perf_scores]
                kpis['performance_scores'] = {
                    'avg_performance': round(float(np.mean(scores)), 1),
                    'min_performance': round(float(np.min(scores)), 1),
                    'max_performance': round(float(np.max(scores)), 1),
                    'total_scored': len(scores),
                    'grade_distribution': self._grade_distribution(scores),
                    'top_performers': perf_scores[:5],
                    'needs_improvement': perf_scores[-5:][::-1] if len(perf_scores) >= 5 else [],
                }
        except Exception as e:
            logger.warning(f"Performance scores unavailable: {e}")
            kpis['performance_scores'] = {'error': str(e)}
        
        return kpis
    
    # ────────────────────────────────────────────────────────────────
    # Helpers
    # ────────────────────────────────────────────────────────────────
    
    def _get_user_info(self, user_id: int) -> Dict:
        """Get basic user info."""
        query = text("""
            SELECT id, matricule, nom, prenom, email
            FROM utilisateurs WHERE id = :uid
        """)
        row = self.db.execute(query, {'uid': user_id}).fetchone()
        if row:
            return {'id': row[0], 'matricule': row[1], 'nom': row[2], 'prenom': row[3], 'email': row[4]}
        return {}
    
    def _get_job_post(self, job_post_id: int) -> Optional[Dict]:
        """Get job post info."""
        query = text("""
            SELECT id, titre, description, statut
            FROM job_posts WHERE id = :jid AND deleted_at IS NULL
        """)
        row = self.db.execute(query, {'jid': job_post_id}).fetchone()
        if row:
            return {'id': row[0], 'titre': row[1], 'description': row[2], 'statut': row[3]}
        return None
    
    def _build_skill_details(self, user_skills_df, job_skills_df) -> Dict:
        """Build matching/missing skill breakdown."""
        matching = []
        missing = []
        
        if job_skills_df.empty:
            return {'matching': matching, 'missing': missing}
        
        for _, req in job_skills_df.iterrows():
            cid = req['competence_id']
            skill_name = req['nom']
            req_level = int(req['niveau_requis'])
            
            if not user_skills_df.empty:
                user_skill = user_skills_df[user_skills_df['competence_id'] == cid]
            else:
                user_skill = pd.DataFrame()
            
            if not user_skill.empty:
                cand_level = int(user_skill['niveau'].values[0])
                matching.append({
                    'nom': skill_name,
                    'niveau_requis': req_level,
                    'niveau_candidat': cand_level,
                    'match': cand_level >= req_level,
                })
            else:
                missing.append({
                    'nom': skill_name,
                    'niveau_requis': req_level,
                    'niveau_candidat': 0,
                    'match': False,
                })
        
        return {'matching': matching, 'missing': missing}
    
    def _rule_based_matching(self, features_df) -> np.ndarray:
        """Fallback rule-based matching when neural model not available."""
        scores = []
        for _, row in features_df.iterrows():
            score = (
                float(row.get('weighted_skill_match', 0)) * 60 +
                min(float(row.get('tenure_years', 0)) / 10, 1) * 20 +
                float(row.get('availability', 0)) * 10 +
                float(row.get('attendance_score', 0)) * 10
            )
            scores.append(score)
        return np.array(scores)
    
    @staticmethod
    def _score_to_grade(score: float) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 65:
            return 'C'
        elif score >= 50:
            return 'D'
        return 'F'
    
    @staticmethod
    def _grade_distribution(scores: List[float]) -> Dict:
        """Compute grade distribution."""
        dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        for s in scores:
            grade = PredictionService._score_to_grade(s)
            dist[grade] += 1
        return dist
