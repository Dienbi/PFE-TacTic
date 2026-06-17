"""Unit tests for interpretable AI scorers."""

import pandas as pd
import pytest
from unittest.mock import MagicMock

from app.services.performance_scorer import PerformanceScorer, GRADE_LABELS
from app.services.matching_scorer import MatchingScorer
from app.services.attendance_pattern_engine import (
    AttendancePatternEngine,
    ALERT_PROB_THRESHOLD,
)


class TestPerformanceScorer:
    def test_attendance_weighted_score_without_chef_feedback(self):
        scorer = PerformanceScorer()
        row = pd.Series({
            'presence_rate': 0.9,
            'late_rate': 0.1,
            'avg_hours_worked': 8.0,
            'justified_absence_ratio': 0.2,
            'skill_count': 3,
            'avg_skill_level': 3,
            'tenure_months': 24,
            'overtime_ratio': 0.05,
        })

        result = scorer.score(row)

        assert 0 <= result['performance_score'] <= 100
        assert result['grade'] in GRADE_LABELS
        assert result['grade_label'] == GRADE_LABELS[result['grade']]
        assert len(result['score_factors']) == 4
        assert result['summary']
        assert result['score_factors'][0]['key'] == 'presence'

    def test_chef_feedback_blends_when_provided(self):
        scorer = PerformanceScorer()
        row = pd.Series({
            'presence_rate': 0.8,
            'late_rate': 0.1,
            'avg_hours_worked': 8.0,
            'justified_absence_ratio': 0.1,
        })

        without = scorer.score(row)
        with_chef = scorer.score(row, chef_score=95.0)

        assert with_chef['performance_score'] > without['performance_score']
        assert any(f['key'] == 'chef_feedback' for f in with_chef['score_factors'])


class TestMatchingScorer:
    def test_weighted_score_and_reasons(self):
        scorer = MatchingScorer()
        row = pd.Series({
            'weighted_skill_match': 0.8,
            'attendance_score': 0.92,
            'tenure_years': 3.5,
            'availability': 1.0,
            'skill_overlap_ratio': 0.8,
        })
        skill_details = {
            'matching': [
                {'nom': 'Python', 'niveau_requis': 3, 'niveau_candidat': 5, 'match': True},
            ],
            'missing': [
                {'nom': 'Docker', 'niveau_requis': 3, 'niveau_candidat': 0, 'match': False},
            ],
        }

        result = scorer.score_row(row, skill_details, has_applied=True)

        assert result['score'] > 0
        assert result['verdict'] == 'Très bon profil'
        assert len(result['reasons']) >= 3
        assert any('Python' in r for r in result['reasons'])
        assert result['has_applied'] is True
        assert result['score_breakdown']['attendance'] > 0

    def test_partial_profile_verdict(self):
        scorer = MatchingScorer()
        row = pd.Series({
            'weighted_skill_match': 0.2,
            'attendance_score': 0.5,
            'tenure_years': 0.5,
            'availability': 0.5,
            'skill_overlap_ratio': 0.2,
        })

        result = scorer.score_row(row, {'matching': [], 'missing': []})

        assert result['verdict'] == 'Profil partiel'


class TestAttendancePatternEngine:
    def test_risk_level_thresholds(self):
        engine = AttendancePatternEngine(MagicMock())
        assert engine.risk_level(0.2) == 'low'
        assert engine.risk_level(0.45) == 'medium'
        assert engine.risk_level(0.7) == 'high'

    def test_alert_dates_exclude_planned_leave(self):
        engine = AttendancePatternEngine(MagicMock())
        daily_forecast = [
            {
                'date': '2026-06-20',
                'day_name': 'Friday',
                'day_name_fr': 'vendredi',
                'absence_probability': 0.9,
                'reason': 'Congé approuvé',
                'is_planned_leave': True,
            },
            {
                'date': '2026-06-19',
                'day_name': 'Thursday',
                'day_name_fr': 'jeudi',
                'absence_probability': 0.6,
                'reason': 'Absent régulièrement le jeudi',
                'is_planned_leave': False,
            },
        ]

        alerts = engine._build_alert_dates(daily_forecast, [{'type': 'recurring_jeudi'}], True, set())

        assert len(alerts) == 1
        assert alerts[0]['date'] == '2026-06-19'
        assert alerts[0]['absence_probability'] >= ALERT_PROB_THRESHOLD

    def test_recommendation_suggests_contact_when_alerts_exist(self):
        engine = AttendancePatternEngine(MagicMock())
        alerts = [{
            'date': '2026-06-19',
            'day_name_fr': 'jeudi',
            'day_name': 'Thursday',
            'absence_probability': 0.6,
            'reason': 'test',
        }]
        rec = engine._build_recommendation([], alerts, pd.Series({'presence_rate': 0.7}))
        assert 'Contacter' in rec

    def test_detect_declining_attendance_pattern(self):
        engine = AttendancePatternEngine(MagicMock())
        today = pd.Timestamp.today()
        prior_dates = pd.bdate_range(end=today - pd.Timedelta(days=15), periods=30)
        recent_dates = pd.bdate_range(end=today, periods=14)
        rows = []
        for d in prior_dates:
            rows.append({
                'utilisateur_id': 1,
                'date': d,
                'heure_entree': '08:00',
                'heure_sortie': '17:00',
                'duree_travail': 8.0,
            })
        for d in recent_dates:
            rows.append({
                'utilisateur_id': 1,
                'date': d,
                'heure_entree': None,
                'heure_sortie': None,
                'duree_travail': 0,
            })
        df = pd.DataFrame(rows)
        trend = engine._compute_recent_trend(df)
        assert trend < -0.5
