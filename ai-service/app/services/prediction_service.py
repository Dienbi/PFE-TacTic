"""
Prediction Service — computes deterministic predictions and scores from live data.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.attendance_pattern_engine import AttendancePatternEngine
from app.services.data_pipeline import DataPipeline
from app.services.matching_scorer import MatchingScorer
from app.services.performance_scorer import PerformanceScorer
from app.utils.groq_client import GroqClient

logger = logging.getLogger(__name__)


class PredictionService:
    """Computes predictions and scores from database-driven features."""

    def __init__(self, db: Session):
        self.db = db
        self.pipeline = DataPipeline(db)
        self.attendance_engine = AttendancePatternEngine(db)
        self.performance_scorer = PerformanceScorer()
        self.matching_scorer = MatchingScorer()
        self.groq = GroqClient()

    # ────────────────────────────────────────────────────────────────
    # Attendance Predictions
    # ────────────────────────────────────────────────────────────────

    def predict_attendance(self, user_id: int) -> Dict:
        """Predict next 7 days attendance for a single employee."""
        att_features = self.pipeline.build_attendance_features(user_id)
        if att_features.empty:
            raise ValueError(f"Not enough attendance data for user {user_id}")

        leave_features = self.pipeline.build_leave_features(user_id)
        att_row = att_features.iloc[0]
        leave_row = leave_features.iloc[0] if not leave_features.empty else None
        attendance_df = self.attendance_engine._load_attendance(user_id)
        att_row = self.attendance_engine.enrich_att_row(att_row, attendance_df)

        analysis = self.attendance_engine.analyze(user_id, att_row, leave_row, attendance_df)
        user = self._get_user_info(user_id)

        return {
            'utilisateur_id': user_id,
            'nom': user.get('nom', ''),
            'prenom': user.get('prenom', ''),
            'matricule': user.get('matricule', ''),
            'predictions': analysis['predictions'],
            'avg_absence_risk': analysis['avg_absence_risk'],
            'risk_level': analysis['risk_level'],
            'patterns': analysis['patterns'],
            'primary_pattern': analysis['primary_pattern'],
            'alert_dates': analysis['alert_dates'],
            'recommendation': analysis['recommendation'],
            'generated_at': datetime.now().isoformat(),
        }

    def predict_attendance_all(self) -> List[Dict]:
        """Predict next 7 days attendance for all active employees."""
        employees = self.pipeline.get_all_employees()
        att_features = self.pipeline.build_attendance_features()
        leave_features = self.pipeline.build_leave_features()
        attendance_by_user = self.attendance_engine.load_all_attendance()
        leave_dates_by_user = self.attendance_engine.load_all_future_leave_dates()

        results = []
        for uid in employees['id'].tolist():
            att_row = att_features[att_features['utilisateur_id'] == uid] if not att_features.empty else pd.DataFrame()
            if att_row.empty:
                continue

            leave_row = leave_features[leave_features['utilisateur_id'] == uid] if not leave_features.empty else pd.DataFrame()
            leave_item = leave_row.iloc[0] if not leave_row.empty else None

            try:
                attendance_df = attendance_by_user.get(int(uid), pd.DataFrame())
                enriched_row = self.attendance_engine.enrich_att_row(att_row.iloc[0], attendance_df)
                future_leaves = leave_dates_by_user.get(int(uid), set())
                analysis = self.attendance_engine.analyze(
                    int(uid),
                    enriched_row,
                    leave_item,
                    attendance_df,
                    future_leave_dates=future_leaves,
                )

                user = employees[employees['id'] == uid].iloc[0]
                results.append({
                    'utilisateur_id': int(uid),
                    'nom': user.get('nom', ''),
                    'prenom': user.get('prenom', ''),
                    'matricule': user.get('matricule', ''),
                    'avg_absence_risk': analysis['avg_absence_risk'],
                    'risk_level': analysis['risk_level'],
                    'next_day_absence_prob': analysis['next_day_absence_prob'],
                    'patterns': analysis['patterns'],
                    'primary_pattern': analysis['primary_pattern'],
                    'alert_dates': analysis['alert_dates'],
                    'recommendation': analysis['recommendation'],
                })
            except Exception as e:
                logger.warning(f"Failed to score attendance for user {uid}: {e}")

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

        chef_score = self._get_chef_score(user_id)
        scored = self.performance_scorer.score(user_row.iloc[0], chef_score)
        user = self._get_user_info(user_id)

        return {
            'utilisateur_id': user_id,
            'nom': user.get('nom', ''),
            'prenom': user.get('prenom', ''),
            'matricule': user.get('matricule', ''),
            **scored,
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
            scored = self.performance_scorer.score(row, chef_score)
            results.append({
                'utilisateur_id': uid,
                'nom': row.get('nom', ''),
                'prenom': row.get('prenom', ''),
                'matricule': row.get('matricule', ''),
                **scored,
            })

        results.sort(key=lambda x: x['performance_score'], reverse=True)
        return results

    # ────────────────────────────────────────────────────────────────
    # Job Matching
    # ────────────────────────────────────────────────────────────────

    def match_candidates(self, job_post_id: int) -> Dict:
        """Rank candidates for a job post with explainable scoring."""
        job_post = self._get_job_post(job_post_id)
        if not job_post:
            raise ValueError(f"Job post {job_post_id} not found")

        job_skills = self.pipeline.get_job_post_skills(job_post_id)
        inferred_skill_ids = []
        model_used = 'interpretable_rules'
        if job_skills.empty:
            inferred_skill_ids = self._infer_job_post_skills(job_post)
            if inferred_skill_ids:
                model_used = 'interpretable_rules+groq'

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
                'model_used': model_used,
                'generated_at': datetime.now().isoformat(),
            }

        applicant_ids = self.matching_scorer.get_applicant_ids(self.db, job_post_id)
        emp_skills = self.pipeline.get_employee_skills()
        if job_skills.empty and inferred_skill_ids:
            job_skills = self._build_job_skills_from_ids(inferred_skill_ids)

        recommendations = []
        for _, row in features_df.iterrows():
            uid = int(row['utilisateur_id'])
            user_skills_df = emp_skills[emp_skills['utilisateur_id'] == uid] if not emp_skills.empty else pd.DataFrame()
            skill_details = self._build_skill_details(user_skills_df, job_skills)
            has_applied = uid in applicant_ids

            scored = self.matching_scorer.score_row(row, skill_details, has_applied)
            if scored['score'] <= 0:
                continue

            user = self._get_user_info(uid)
            recommendations.append({
                'utilisateur_id': uid,
                'nom': user.get('nom', ''),
                'prenom': user.get('prenom', ''),
                'matricule': user.get('matricule', ''),
                'email': user.get('email', ''),
                'score': scored['score'],
                'verdict': scored['verdict'],
                'summary': scored['summary'],
                'reasons': scored['reasons'],
                'score_breakdown': scored['score_breakdown'],
                'has_applied': has_applied,
                'details': scored['details'],
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

        try:
            att_predictions = self.predict_attendance_all()
            if att_predictions:
                avg_risk = np.mean([p['avg_absence_risk'] for p in att_predictions])
                high_risk_count = sum(1 for p in att_predictions if p['risk_level'] == 'high')
                medium_risk_count = sum(1 for p in att_predictions if p['risk_level'] == 'medium')
                alert_count = sum(1 for p in att_predictions if p.get('alert_dates'))

                kpis['attendance_predictions'] = {
                    'predicted_absence_rate': round(float(avg_risk) * 100, 1),
                    'high_risk_employees': high_risk_count,
                    'medium_risk_employees': medium_risk_count,
                    'employees_with_alerts': alert_count,
                    'total_analyzed': len(att_predictions),
                    'top_at_risk': att_predictions[:5],
                }
        except Exception as e:
            logger.warning(f"Attendance predictions unavailable: {e}")
            kpis['attendance_predictions'] = {'error': str(e)}

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

    def _get_chef_score(self, user_id: int) -> Optional[float]:
        chef_reviews = self.pipeline.get_chef_reviews()
        if chef_reviews.empty:
            return None
        review_row = chef_reviews[chef_reviews['utilisateur_id'] == user_id]
        if review_row.empty:
            return None
        return float(review_row.iloc[0]['review_score'])

    def _get_user_info(self, user_id: int) -> Dict:
        query = text("""
            SELECT id, matricule, nom, prenom, email
            FROM utilisateurs WHERE id = :uid
        """)
        row = self.db.execute(query, {'uid': user_id}).fetchone()
        if row:
            return {'id': row[0], 'matricule': row[1], 'nom': row[2], 'prenom': row[3], 'email': row[4]}
        return {}

    def _get_job_post(self, job_post_id: int) -> Optional[Dict]:
        query = text("""
            SELECT id, titre, description, statut
            FROM job_posts WHERE id = :jid AND deleted_at IS NULL
        """)
        row = self.db.execute(query, {'jid': job_post_id}).fetchone()
        if row:
            return {'id': row[0], 'titre': row[1], 'description': row[2], 'statut': row[3]}
        return None

    def _build_skill_details(self, user_skills_df, job_skills_df) -> Dict:
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

    @staticmethod
    def _grade_distribution(scores: List[float]) -> Dict:
        from app.services.performance_scorer import PerformanceScorer
        dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        for s in scores:
            grade = PerformanceScorer._score_to_grade(s)
            dist[grade] += 1
        return dist
