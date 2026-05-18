"""
Prediction Service — computes deterministic predictions and scores from live data.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.data_pipeline import DataPipeline
from app.utils.groq_client import GroqClient

logger = logging.getLogger(__name__)


class PredictionService:
    """Computes predictions and scores from database-driven features."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pipeline = DataPipeline(db)
        self.groq = GroqClient()
    
    # ────────────────────────────────────────────────────────────────
    # Attendance Predictions
    # ────────────────────────────────────────────────────────────────
    
    def predict_attendance(self, user_id: int) -> Dict:
        """
        Predict next 7 days attendance for a single employee.
        
        Returns:
            dict with user info and daily predictions
        """
        att_features = self.pipeline.build_attendance_features(user_id)
        if att_features.empty:
            raise ValueError(f"Not enough attendance data for user {user_id}")

        leave_features = self.pipeline.build_leave_features(user_id)
        att_row = att_features.iloc[0]
        leave_row = leave_features.iloc[0] if not leave_features.empty else None

        daily_forecast = self._build_attendance_forecast(att_row, leave_row)
        avg_absence_risk = np.mean([d['absence_probability'] for d in daily_forecast]) if daily_forecast else 0

        user = self._get_user_info(user_id)

        return {
            'utilisateur_id': user_id,
            'nom': user.get('nom', ''),
            'prenom': user.get('prenom', ''),
            'matricule': user.get('matricule', ''),
            'predictions': daily_forecast,
            'avg_absence_risk': round(float(avg_absence_risk), 4),
            'generated_at': datetime.now().isoformat(),
        }
    
    def predict_attendance_all(self) -> List[Dict]:
        """Predict next 7 days attendance for all active employees."""
        employees = self.pipeline.get_all_employees()
        att_features = self.pipeline.build_attendance_features()
        leave_features = self.pipeline.build_leave_features()
        
        results = []
        for uid in employees['id'].tolist():
            att_row = att_features[att_features['utilisateur_id'] == uid] if not att_features.empty else pd.DataFrame()
            if att_row.empty:
                continue

            leave_row = leave_features[leave_features['utilisateur_id'] == uid] if not leave_features.empty else pd.DataFrame()
            leave_item = leave_row.iloc[0] if not leave_row.empty else None

            try:
                daily_forecast = self._build_attendance_forecast(att_row.iloc[0], leave_item)
                avg_absence_risk = np.mean([d['absence_probability'] for d in daily_forecast]) if daily_forecast else 0

                user = employees[employees['id'] == uid].iloc[0]
                next_day_absence_prob = daily_forecast[0]['absence_probability'] if daily_forecast else 0

                results.append({
                    'utilisateur_id': int(uid),
                    'nom': user.get('nom', ''),
                    'prenom': user.get('prenom', ''),
                    'matricule': user.get('matricule', ''),
                    'avg_absence_risk': round(float(avg_absence_risk), 4),
                    'risk_level': self._risk_level(avg_absence_risk),
                    'next_day_absence_prob': round(float(next_day_absence_prob), 4),
                })
            except Exception as e:
                logger.warning(f"Failed to score attendance for user {uid}: {e}")
        
        # Sort by risk (highest first)
        results.sort(key=lambda x: x['avg_absence_risk'], reverse=True)
        
        return results
    
    # ────────────────────────────────────────────────────────────────
    # Performance Scores
    # ────────────────────────────────────────────────────────────────
    
    def get_performance_score(self, user_id: int) -> Dict:
        """Get AI performance score for a single employee."""
        emp_features = self.pipeline.build_employee_features()
        if emp_features.empty:
            raise ValueError("No employee data available")
        
        user_row = emp_features[emp_features['utilisateur_id'] == user_id]
        if user_row.empty:
            raise ValueError(f"Employee {user_id} not found")
        
        chef_reviews = self.pipeline.get_chef_reviews()
        chef_score = None
        if not chef_reviews.empty:
            review_row = chef_reviews[chef_reviews['utilisateur_id'] == user_id]
            if not review_row.empty:
                chef_score = float(review_row.iloc[0]['review_score'])
        
        row = user_row.iloc[0]
        score = self._compute_performance_score(row, chef_score)
        
        user = self._get_user_info(user_id)
        
        # Score breakdown
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
        emp_features = self.pipeline.build_employee_features()
        if emp_features.empty:
            return []

        chef_reviews = self.pipeline.get_chef_reviews()
        chef_lookup = {}
        if not chef_reviews.empty:
            chef_lookup = {
                int(row['utilisateur_id']): float(row['review_score'])
                for _, row in chef_reviews.iterrows()
            }
        
        results = []
        for _, row in emp_features.iterrows():
            uid = int(row['utilisateur_id'])
            chef_score = chef_lookup.get(uid)
            score = self._compute_performance_score(row, chef_score)
            results.append({
                'utilisateur_id': uid,
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
        # Get job post info
        job_post = self._get_job_post(job_post_id)
        if not job_post:
            raise ValueError(f"Job post {job_post_id} not found")
        
        job_skills = self.pipeline.get_job_post_skills(job_post_id)
        inferred_skill_ids = []
        model_used = 'deterministic_rules'
        if job_skills.empty:
            inferred_skill_ids = self._infer_job_post_skills(job_post)
            if inferred_skill_ids:
                model_used = 'deterministic_rules+groq'
        
        features_df = self.pipeline.build_matching_features(
            job_post_id,
            required_skill_ids=inferred_skill_ids if inferred_skill_ids else None,
        )
        if features_df.empty:
            return {
                'job_post_id': job_post_id,
                'job_post_titre': job_post['titre'],
                'total_candidates': 0,
                'recommendations': [],
                'model_used': 'deterministic_rules',
                'generated_at': datetime.now().isoformat(),
            }
        
        scores = self._rule_based_matching(features_df)
        
        # Get employee details and skill match info
        emp_skills = self.pipeline.get_employee_skills()
        if job_skills.empty and inferred_skill_ids:
            job_skills = self._build_job_skills_from_ids(inferred_skill_ids)
        
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

    def _build_job_skills_from_ids(self, skill_ids: List[int]) -> pd.DataFrame:
        if not skill_ids:
            return pd.DataFrame()
        catalog = self.pipeline.get_competences()
        if catalog.empty:
            return pd.DataFrame()
        filtered = catalog[catalog['id'].isin(skill_ids)]
        if filtered.empty:
            return pd.DataFrame()
        filtered = filtered.rename(columns={'id': 'competence_id'})
        filtered['niveau_requis'] = 3
        return filtered[['competence_id', 'nom', 'niveau_requis']]

    def _infer_job_post_skills(self, job_post: Dict) -> List[int]:
        if not self.groq.is_configured:
            return []
        text_blob = " ".join([job_post.get('titre', ''), job_post.get('description', '')]).strip()
        if not text_blob:
            return []

        catalog = self.pipeline.get_competences()
        if catalog.empty:
            return []

        skill_names = catalog['nom'].dropna().astype(str).tolist()
        extracted = self.groq.extract_skills(text_blob, skill_names)
        if not extracted:
            return []

        normalized = {name.strip().lower(): int(cid) for cid, name in catalog[['id', 'nom']].values}
        result = []
        for skill in extracted:
            skill_id = normalized.get(skill.strip().lower())
            if skill_id:
                result.append(skill_id)
        return list(dict.fromkeys(result))
    
    def _rule_based_matching(self, features_df) -> np.ndarray:
        """Fallback rule-based matching when neural model not available."""
        scores = []
        for _, row in features_df.iterrows():
            score = (
                float(row.get('weighted_skill_match', 0)) * 70 +
                min(float(row.get('tenure_years', 0)) / 10, 1) * 20 +
                float(row.get('availability', 0)) * 10
            )
            scores.append(score)
        return np.array(scores)

    @staticmethod
    def _risk_level(absence_prob: float) -> str:
        if absence_prob < 0.3:
            return 'low'
        if absence_prob < 0.6:
            return 'medium'
        return 'high'

    @staticmethod
    def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
        return max(min_value, min(max_value, value))

    def _compute_absence_components(self, att_row: pd.Series, leave_row: Optional[pd.Series]) -> Dict:
        presence_rate = float(att_row.get('presence_rate', 0))
        late_rate = float(att_row.get('late_rate', 0))
        early_rate = float(att_row.get('early_departure_rate', 0))
        justified_ratio = float(att_row.get('justified_absence_ratio', 0))
        streak = float(att_row.get('max_attendance_streak', 0))

        leave_frequency = float(leave_row.get('leave_frequency', 0)) if leave_row is not None else 0
        sick_leave_ratio = float(leave_row.get('sick_leave_ratio', 0)) if leave_row is not None else 0

        base_risk = 1 - presence_rate
        behavior_penalty = late_rate * 0.2 + early_rate * 0.15 + justified_ratio * 0.05
        leave_penalty = min(leave_frequency / 6.0, 1.0) * 0.15 + sick_leave_ratio * 0.1
        streak_bonus = min(streak / 30.0, 1.0) * 0.1

        return {
            'base_risk': base_risk,
            'behavior_penalty': behavior_penalty,
            'leave_penalty': leave_penalty,
            'streak_bonus': streak_bonus,
        }

    def _compute_daily_absence_prob(self, att_row: pd.Series, leave_row: Optional[pd.Series], dow: int) -> float:
        comps = self._compute_absence_components(att_row, leave_row)
        base_risk = comps['base_risk']
        dow_rate = float(att_row.get(f'dow_{dow}_absence_rate', base_risk))

        absence_prob = (
            base_risk * 0.6 +
            dow_rate * 0.4 +
            comps['behavior_penalty'] * 0.5 +
            comps['leave_penalty'] * 0.5 -
            comps['streak_bonus']
        )

        return self._clamp(absence_prob)

    def _build_attendance_forecast(self, att_row: pd.Series, leave_row: Optional[pd.Series]) -> List[Dict]:
        today = datetime.now().date()
        daily_forecast = []
        day_offset = 1

        while len(daily_forecast) < 7:
            forecast_date = today + timedelta(days=day_offset)
            day_offset += 1
            if forecast_date.weekday() >= 5:
                continue

            dow = forecast_date.weekday()
            absence_prob = self._compute_daily_absence_prob(att_row, leave_row, dow)
            presence_prob = 1.0 - absence_prob

            daily_forecast.append({
                'date': forecast_date.isoformat(),
                'day_name': forecast_date.strftime('%A'),
                'presence_probability': round(presence_prob, 4),
                'absence_probability': round(absence_prob, 4),
                'risk_level': self._risk_level(absence_prob),
            })

        return daily_forecast

    def _compute_performance_score(self, row: pd.Series, chef_score: Optional[float]) -> float:
        attendance_score = float(row.get('presence_rate', 0)) * 100
        if chef_score is not None:
            score = attendance_score * 0.6 + chef_score * 0.4
        else:
            skill_score = min(float(row.get('avg_skill_level', 0)) * 20, 100)
            tenure_score = min(float(row.get('tenure_months', 0)) / 60 * 100, 100)
            overtime_score = min(float(row.get('overtime_ratio', 0)) * 200, 100)
            score = attendance_score * 0.5 + skill_score * 0.2 + tenure_score * 0.2 + overtime_score * 0.1

        return max(0, min(100, score))
    
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
