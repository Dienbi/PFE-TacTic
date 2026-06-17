"""
Matching Scorer — weighted candidate ranking with plain French explanations.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Set

import pandas as pd

WEIGHTS = {
    'skills': 50,
    'attendance': 25,
    'tenure': 15,
    'availability': 10,
}


class MatchingScorer:
    """Score and explain job-candidate matches."""

    def score_row(
        self,
        row: pd.Series,
        skill_details: Dict,
        has_applied: bool = False,
    ) -> Dict:
        skill_component = float(row.get('weighted_skill_match', 0)) * WEIGHTS['skills']
        attendance_component = float(row.get('attendance_score', 0)) * WEIGHTS['attendance']
        tenure_component = min(float(row.get('tenure_years', 0)) / 10.0, 1.0) * WEIGHTS['tenure']
        availability_component = float(row.get('availability', 0)) * WEIGHTS['availability']

        total = skill_component + attendance_component + tenure_component + availability_component
        total = round(max(0.0, min(100.0, total)), 2)

        matching_skills = skill_details.get('matching', [])
        missing_skills = skill_details.get('missing', [])
        required_count = len(matching_skills) + len(missing_skills)
        matched_count = sum(1 for s in matching_skills if s.get('match'))

        reasons = self._build_reasons(
            row, matching_skills, missing_skills, required_count, matched_count, has_applied
        )
        summary = self._build_summary(total, matched_count, required_count, row, has_applied)
        verdict = self._verdict(total)

        return {
            'score': total,
            'score_breakdown': {
                'skills': round(skill_component, 1),
                'attendance': round(attendance_component, 1),
                'tenure': round(tenure_component, 1),
                'availability': round(availability_component, 1),
            },
            'reasons': reasons,
            'summary': summary,
            'verdict': verdict,
            'has_applied': has_applied,
            'details': {
                'skill_overlap_ratio': round(float(row.get('skill_overlap_ratio', 0)) * 100, 1),
                'weighted_skill_match': round(float(row.get('weighted_skill_match', 0)) * 100, 1),
                'attendance_score': round(float(row.get('attendance_score', 0)) * 100, 1),
                'tenure_years': round(float(row.get('tenure_years', 0)), 1),
                'availability': float(row.get('availability', 0)),
                'matching_skills': matching_skills,
                'missing_skills': missing_skills,
            },
        }

    def get_applicant_ids(self, db, job_post_id: int) -> Set[int]:
        from sqlalchemy import text
        query = text("""
            SELECT DISTINCT utilisateur_id
            FROM job_applications
            WHERE job_post_id = :jid
        """)
        rows = db.execute(query, {'jid': job_post_id}).fetchall()
        return {int(row[0]) for row in rows}

    def _build_reasons(
        self,
        row: pd.Series,
        matching_skills: List[Dict],
        missing_skills: List[Dict],
        required_count: int,
        matched_count: int,
        has_applied: bool,
    ) -> List[str]:
        reasons: List[str] = []

        if required_count > 0:
            reasons.append(
                f'{matched_count} compétence{"s" if matched_count != 1 else ""} '
                f'sur {required_count} requise{"s" if required_count != 1 else ""} correspondent'
            )

        for skill in matching_skills[:3]:
            if skill.get('match'):
                reasons.append(
                    f'{skill["nom"]} : niveau {skill["niveau_candidat"]} '
                    f'(requis {skill["niveau_requis"]})'
                )
            else:
                reasons.append(
                    f'{skill["nom"]} : niveau {skill["niveau_candidat"]} '
                    f'— en dessous du requis ({skill["niveau_requis"]})'
                )

        for skill in missing_skills[:2]:
            reasons.append(f'Compétence manquante : {skill["nom"]} (niveau {skill["niveau_requis"]} requis)')

        attendance_pct = round(float(row.get('attendance_score', 0)) * 100)
        if attendance_pct >= 90:
            reasons.append(f'Assiduité excellente ({attendance_pct}%)')
        elif attendance_pct >= 75:
            reasons.append(f'Bonne assiduité ({attendance_pct}%)')
        elif attendance_pct > 0:
            reasons.append(f'Assiduité à surveiller ({attendance_pct}%)')

        tenure = float(row.get('tenure_years', 0))
        if tenure >= 3:
            reasons.append(f'{round(tenure, 1)} ans d\'ancienneté dans l\'entreprise')
        elif tenure >= 1:
            reasons.append(f'{round(tenure, 1)} an{"s" if tenure >= 2 else ""} d\'ancienneté')

        availability = float(row.get('availability', 0))
        if availability >= 1.0:
            reasons.append('Disponible immédiatement')
        elif availability >= 0.5:
            reasons.append('Partiellement disponible (affecté à un projet)')

        if has_applied:
            reasons.insert(0, 'A déjà postulé pour ce poste')

        return reasons[:6]

    def _build_summary(
        self,
        score: float,
        matched_count: int,
        required_count: int,
        row: pd.Series,
        has_applied: bool,
    ) -> str:
        verdict = self._verdict(score)
        parts = [verdict]

        if required_count > 0:
            parts.append(f'{matched_count}/{required_count} compétences alignées')

        attendance_pct = round(float(row.get('attendance_score', 0)) * 100)
        if attendance_pct >= 80:
            parts.append('bonne assiduité')

        if has_applied:
            parts.append('candidature reçue')

        return ' — '.join(parts) + '.'

    @staticmethod
    def _verdict(score: float) -> str:
        if score >= 70:
            return 'Très bon profil'
        if score >= 40:
            return 'Profil intéressant'
        return 'Profil partiel'
