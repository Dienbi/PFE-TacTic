"""
Performance Scorer — attendance-focused scoring with French explanations.
"""

from __future__ import annotations

from typing import Dict, List, Optional

import pandas as pd

GRADE_LABELS = {
    'A': 'Excellent',
    'B': 'Très bien',
    'C': 'Satisfaisant',
    'D': 'À améliorer',
    'F': 'Insuffisant',
}

CHEF_FEEDBACK_WEIGHT = 0.30
ATTENDANCE_WEIGHTS = {
    'presence': 45,
    'punctuality': 30,
    'hours_consistency': 15,
    'justified_absences': 10,
}


class PerformanceScorer:
    """Compute attendance-based performance scores with explainable factors."""

    def score(self, row: pd.Series, chef_score: Optional[float] = None) -> Dict:
        presence_score = float(row.get('presence_rate', 0)) * 100
        late_rate = float(row.get('late_rate', 0))
        punctuality_score = max(0.0, (1.0 - late_rate) * 100)
        hours_consistency_score = self._hours_consistency_score(row)
        justified_ratio = float(row.get('justified_absence_ratio', 0))
        justified_score = max(0.0, (1.0 - justified_ratio * 0.5) * 100)

        attendance_component = (
            presence_score * ATTENDANCE_WEIGHTS['presence'] / 100 +
            punctuality_score * ATTENDANCE_WEIGHTS['punctuality'] / 100 +
            hours_consistency_score * ATTENDANCE_WEIGHTS['hours_consistency'] / 100 +
            justified_score * ATTENDANCE_WEIGHTS['justified_absences'] / 100
        )

        if chef_score is not None:
            final_score = attendance_component * (1 - CHEF_FEEDBACK_WEIGHT) + chef_score * CHEF_FEEDBACK_WEIGHT
            chef_included = True
        else:
            final_score = attendance_component
            chef_included = False

        final_score = max(0.0, min(100.0, final_score))
        grade = self._score_to_grade(final_score)

        score_factors = [
            self._factor('presence', 'Présence', presence_score, ATTENDANCE_WEIGHTS['presence']),
            self._factor('punctuality', 'Ponctualité', punctuality_score, ATTENDANCE_WEIGHTS['punctuality']),
            self._factor('hours_consistency', 'Régularité horaire', hours_consistency_score, ATTENDANCE_WEIGHTS['hours_consistency']),
            self._factor('justified_absences', 'Absences justifiées', justified_score, ATTENDANCE_WEIGHTS['justified_absences']),
        ]

        if chef_included:
            score_factors.append(
                self._factor('chef_feedback', 'Retour chef d\'équipe', chef_score, int(CHEF_FEEDBACK_WEIGHT * 100))
            )

        summary = self._build_summary(score_factors, final_score)
        breakdown = {
            'attendance_rate': round(presence_score, 1),
            'avg_hours_worked': round(float(row.get('avg_hours_worked', 0)), 1),
            'late_rate': round(late_rate * 100, 1),
            'skill_count': int(row.get('skill_count', 0)),
            'avg_skill_level': round(float(row.get('avg_skill_level', 0)), 1),
            'tenure_months': round(float(row.get('tenure_months', 0)), 0),
            'overtime_ratio': round(float(row.get('overtime_ratio', 0)) * 100, 1),
        }

        return {
            'performance_score': round(final_score, 2),
            'grade': grade,
            'grade_label': GRADE_LABELS.get(grade, grade),
            'score_factors': score_factors,
            'summary': summary,
            'breakdown': breakdown,
            'attendance_rate': round(presence_score, 1),
            'skill_count': int(row.get('skill_count', 0)),
        }

    def _hours_consistency_score(self, row: pd.Series) -> float:
        avg_hours = float(row.get('avg_hours_worked', 0))
        if avg_hours <= 0:
            return 50.0
        target = 8.0
        deviation = abs(avg_hours - target) / target
        return max(0.0, min(100.0, (1.0 - deviation) * 100))

    def _factor(self, key: str, label: str, score: float, weight: int) -> Dict:
        score = round(max(0.0, min(100.0, score)), 1)
        if score >= 75:
            status = 'good'
        elif score >= 50:
            status = 'average'
        else:
            status = 'poor'
        return {
            'key': key,
            'label': label,
            'score': score,
            'weight': weight,
            'status': status,
        }

    def _build_summary(self, factors: List[Dict], final_score: float) -> str:
        sorted_factors = sorted(factors, key=lambda f: f['score'])
        weakest = sorted_factors[0] if sorted_factors else None
        strongest = sorted_factors[-1] if sorted_factors else None

        if final_score >= 85:
            base = 'Excellente assiduité globale.'
        elif final_score >= 70:
            base = 'Bonne assiduité dans l\'ensemble.'
        elif final_score >= 55:
            base = 'Assiduité correcte avec des points à améliorer.'
        else:
            base = 'Assiduité insuffisante — suivi recommandé.'

        parts = [base]
        if strongest and strongest['status'] == 'good':
            parts.append(f'Point fort : {strongest["label"].lower()}.')
        if weakest and weakest['status'] == 'poor':
            parts.append(f'À améliorer : {weakest["label"].lower()}.')
        elif weakest and weakest['status'] == 'average':
            parts.append(f'Attention : {weakest["label"].lower()}.')

        return ' '.join(parts)

    @staticmethod
    def _score_to_grade(score: float) -> str:
        if score >= 90:
            return 'A'
        if score >= 80:
            return 'B'
        if score >= 65:
            return 'C'
        if score >= 50:
            return 'D'
        return 'F'
