"""
Attendance Pattern Engine — interpretable absence forecasting with French explanations.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Set

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

DAY_NAMES_FR = {
    0: 'lundi',
    1: 'mardi',
    2: 'mercredi',
    3: 'jeudi',
    4: 'vendredi',
    5: 'samedi',
    6: 'dimanche',
}

DAY_NAMES_EN = {
    0: 'Monday',
    1: 'Tuesday',
    2: 'Wednesday',
    3: 'Thursday',
    4: 'Friday',
    5: 'Saturday',
    6: 'Sunday',
}

ALERT_PROB_THRESHOLD = 0.55
ALERT_PATTERN_PROB_THRESHOLD = 0.40


class AttendancePatternEngine:
    """Explainable attendance pattern analysis and 7-day absence forecasting."""

    def __init__(self, db: Session):
        self.db = db

    def analyze(
        self,
        user_id: int,
        att_row: pd.Series,
        leave_row: Optional[pd.Series],
        attendance_df: Optional[pd.DataFrame] = None,
        future_leave_dates: Optional[Set[date]] = None,
    ) -> Dict:
        if attendance_df is None:
            attendance_df = self._load_attendance(user_id)

        if future_leave_dates is None:
            future_leave_dates = self._get_future_approved_leave_dates(user_id)
        patterns = self._detect_patterns(user_id, att_row, attendance_df)
        has_pattern = len(patterns) > 0

        daily_forecast = self._build_forecast(att_row, leave_row, future_leave_dates, patterns)
        alert_dates = self._build_alert_dates(daily_forecast, patterns, has_pattern, future_leave_dates)
        avg_absence_risk = (
            float(np.mean([d['absence_probability'] for d in daily_forecast]))
            if daily_forecast
            else 0.0
        )
        primary_pattern = patterns[0]['label'] if patterns else None
        recommendation = self._build_recommendation(patterns, alert_dates, att_row)

        return {
            'predictions': daily_forecast,
            'avg_absence_risk': round(avg_absence_risk, 4),
            'risk_level': self.risk_level(avg_absence_risk),
            'patterns': patterns,
            'primary_pattern': primary_pattern,
            'alert_dates': alert_dates[:3],
            'recommendation': recommendation,
            'next_day_absence_prob': (
                round(float(daily_forecast[0]['absence_probability']), 4) if daily_forecast else 0.0
            ),
        }

    def risk_level(self, absence_prob: float) -> str:
        if absence_prob < 0.3:
            return 'low'
        if absence_prob < 0.6:
            return 'medium'
        return 'high'

    @staticmethod
    def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
        return max(min_value, min(max_value, value))

    def _load_attendance(self, user_id: int) -> pd.DataFrame:
        start = datetime.now() - timedelta(days=180)
        query = text("""
            SELECT p.utilisateur_id, p.date, p.heure_entree, p.heure_sortie, p.duree_travail
            FROM pointages p
            WHERE p.utilisateur_id = :uid AND p.date >= :start_date
            ORDER BY p.date
        """)
        rows = self.db.execute(
            query,
            {'uid': user_id, 'start_date': start.strftime('%Y-%m-%d')},
        ).fetchall()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows, columns=[
            'utilisateur_id', 'date', 'heure_entree', 'heure_sortie', 'duree_travail',
        ])
        df['date'] = pd.to_datetime(df['date'])
        return df

    def load_all_attendance(self) -> Dict[int, pd.DataFrame]:
        """Load recent attendance for all employees in one query."""
        start = datetime.now() - timedelta(days=180)
        query = text("""
            SELECT p.utilisateur_id, p.date, p.heure_entree, p.heure_sortie, p.duree_travail
            FROM pointages p
            WHERE p.date >= :start_date
            ORDER BY p.utilisateur_id, p.date
        """)
        rows = self.db.execute(query, {'start_date': start.strftime('%Y-%m-%d')}).fetchall()
        if not rows:
            return {}

        df = pd.DataFrame(rows, columns=[
            'utilisateur_id', 'date', 'heure_entree', 'heure_sortie', 'duree_travail',
        ])
        df['date'] = pd.to_datetime(df['date'])

        grouped: Dict[int, pd.DataFrame] = {}
        for uid, group in df.groupby('utilisateur_id'):
            grouped[int(uid)] = group.reset_index(drop=True)
        return grouped

    def load_all_future_leave_dates(self) -> Dict[int, Set[date]]:
        """Load approved future leave dates for all employees in one query."""
        today = datetime.now().date()
        query = text("""
            SELECT utilisateur_id, date_debut, date_fin
            FROM conges
            WHERE statut = 'APPROUVE'
              AND date_fin >= :today
        """)
        rows = self.db.execute(query, {'today': today.isoformat()}).fetchall()
        result: Dict[int, Set[date]] = {}
        for row in rows:
            uid = int(row[0])
            if uid not in result:
                result[uid] = set()
            start = pd.to_datetime(row[1]).date()
            end = pd.to_datetime(row[2]).date()
            current = start
            while current <= end:
                result[uid].add(current)
                current += timedelta(days=1)
        return result

    def _get_future_approved_leave_dates(self, user_id: int) -> Set[date]:
        today = datetime.now().date()
        query = text("""
            SELECT date_debut, date_fin
            FROM conges
            WHERE utilisateur_id = :uid
              AND statut = 'APPROUVE'
              AND date_fin >= :today
        """)
        rows = self.db.execute(query, {'uid': user_id, 'today': today.isoformat()}).fetchall()
        leave_dates: Set[date] = set()
        for row in rows:
            start = pd.to_datetime(row[0]).date()
            end = pd.to_datetime(row[1]).date()
            current = start
            while current <= end:
                leave_dates.add(current)
                current += timedelta(days=1)
        return leave_dates

    def _detect_patterns(
        self,
        user_id: int,
        att_row: pd.Series,
        attendance_df: pd.DataFrame,
    ) -> List[Dict]:
        patterns: List[Dict] = []

        for dow in range(5):
            dow_rate = float(att_row.get(f'dow_{dow}_absence_rate', 0))
            if dow_rate >= 0.4:
                absences_on_dow = self._count_recent_weekday_absences(attendance_df, dow, weeks=8)
                if absences_on_dow >= 3:
                    day_fr = DAY_NAMES_FR[dow]
                    patterns.append({
                        'type': f'recurring_{day_fr}',
                        'label': (
                            f'Absent régulièrement le {day_fr} '
                            f'({absences_on_dow} fois sur 8 semaines)'
                        ),
                        'confidence': round(min(dow_rate + absences_on_dow * 0.05, 1.0), 2),
                    })

        recent_trend = self._compute_recent_trend(attendance_df)
        if recent_trend < -0.1:
            patterns.append({
                'type': 'declining_attendance',
                'label': 'Assiduité en baisse ces 2 dernières semaines',
                'confidence': round(min(abs(recent_trend) * 2, 1.0), 2),
            })

        streak = self._count_recent_consecutive_absences(attendance_df)
        if streak >= 2:
            patterns.append({
                'type': 'absence_streak',
                'label': f'{streak} absences consécutives récentes',
                'confidence': round(min(0.5 + streak * 0.15, 1.0), 2),
            })

        late_rate = float(att_row.get('late_rate', 0))
        if late_rate >= 0.25:
            patterns.append({
                'type': 'frequent_late',
                'label': 'Retards fréquents le matin',
                'confidence': round(min(late_rate * 1.5, 1.0), 2),
            })

        patterns.sort(key=lambda p: p['confidence'], reverse=True)
        return patterns[:4]

    def _count_recent_weekday_absences(
        self,
        attendance_df: pd.DataFrame,
        dow: int,
        weeks: int = 8,
    ) -> int:
        if attendance_df.empty:
            return 0
        cutoff = datetime.now() - timedelta(weeks=weeks)
        subset = attendance_df[
            (attendance_df['date'] >= cutoff) & (attendance_df['date'].dt.dayofweek == dow)
        ]
        if subset.empty:
            return 0
        return int(subset['heure_entree'].isna().sum())

    def _compute_recent_trend(self, attendance_df: pd.DataFrame) -> float:
        if attendance_df.empty:
            return 0.0
        today = datetime.now()
        recent_cutoff = today - timedelta(days=14)
        prior_cutoff = today - timedelta(days=44)

        recent = attendance_df[attendance_df['date'] >= recent_cutoff]
        prior = attendance_df[
            (attendance_df['date'] >= prior_cutoff) & (attendance_df['date'] < recent_cutoff)
        ]
        if recent.empty or prior.empty:
            return 0.0

        recent_rate = float(recent['heure_entree'].notna().mean())
        prior_rate = float(prior['heure_entree'].notna().mean())
        return recent_rate - prior_rate

    def _count_recent_consecutive_absences(self, attendance_df: pd.DataFrame) -> int:
        if attendance_df.empty:
            return 0
        cutoff = datetime.now() - timedelta(days=30)
        subset = attendance_df[attendance_df['date'] >= cutoff].sort_values('date', ascending=False)
        streak = 0
        for _, row in subset.iterrows():
            if pd.isna(row['heure_entree']):
                streak += 1
            else:
                break
        return streak

    def _build_forecast(
        self,
        att_row: pd.Series,
        leave_row: Optional[pd.Series],
        future_leave_dates: Set[date],
        patterns: List[Dict],
    ) -> List[Dict]:
        today = datetime.now().date()
        recent_trend = float(att_row.get('recent_trend', 0))
        pattern_boost = 0.08 if patterns else 0.0
        daily_forecast: List[Dict] = []
        day_offset = 1

        while len(daily_forecast) < 7:
            forecast_date = today + timedelta(days=day_offset)
            day_offset += 1
            if forecast_date.weekday() >= 5:
                continue

            dow = forecast_date.weekday()
            weekday_baseline = float(att_row.get(f'dow_{dow}_absence_rate', 0.2))
            trend_factor = max(0.0, -recent_trend) * 0.5
            behavior_penalty = self._behavior_penalty(att_row, leave_row)

            absence_prob = (
                weekday_baseline * 0.5 +
                trend_factor * 0.3 +
                behavior_penalty * 0.2 +
                pattern_boost
            )

            if forecast_date in future_leave_dates:
                absence_prob = 0.95
                reason = 'Congé approuvé'
            else:
                reason = self._forecast_reason(dow, weekday_baseline, patterns)

            absence_prob = self._clamp(absence_prob)
            presence_prob = 1.0 - absence_prob

            daily_forecast.append({
                'date': forecast_date.isoformat(),
                'day_name': DAY_NAMES_EN[dow],
                'day_name_fr': DAY_NAMES_FR[dow],
                'presence_probability': round(presence_prob, 4),
                'absence_probability': round(absence_prob, 4),
                'risk_level': self.risk_level(absence_prob),
                'reason': reason,
                'is_planned_leave': forecast_date in future_leave_dates,
            })

        return daily_forecast

    def _behavior_penalty(self, att_row: pd.Series, leave_row: Optional[pd.Series]) -> float:
        late_rate = float(att_row.get('late_rate', 0))
        early_rate = float(att_row.get('early_departure_rate', 0))
        justified_ratio = float(att_row.get('justified_absence_ratio', 0))
        leave_frequency = float(leave_row.get('leave_frequency', 0)) if leave_row is not None else 0
        sick_ratio = float(leave_row.get('sick_leave_ratio', 0)) if leave_row is not None else 0
        streak = float(att_row.get('max_attendance_streak', 0))

        penalty = late_rate * 0.25 + early_rate * 0.15 + justified_ratio * 0.1
        penalty += min(leave_frequency / 6.0, 1.0) * 0.15 + sick_ratio * 0.1
        penalty -= min(streak / 30.0, 1.0) * 0.1
        return self._clamp(penalty)

    def _forecast_reason(self, dow: int, weekday_baseline: float, patterns: List[Dict]) -> str:
        day_fr = DAY_NAMES_FR[dow]
        for pattern in patterns:
            if f'recurring_{day_fr}' in pattern['type']:
                return pattern['label']
        if weekday_baseline >= 0.35:
            return f'Taux d\'absence élevé le {day_fr} ({int(weekday_baseline * 100)}%)'
        for pattern in patterns:
            if pattern['type'] == 'declining_attendance':
                return pattern['label']
        return 'Risque modéré selon l\'historique récent'

    def _build_alert_dates(
        self,
        daily_forecast: List[Dict],
        patterns: List[Dict],
        has_pattern: bool,
        future_leave_dates: Set[date],
    ) -> List[Dict]:
        alerts: List[Dict] = []
        for day in daily_forecast:
            forecast_date = date.fromisoformat(day['date'])
            if day.get('is_planned_leave') or forecast_date in future_leave_dates:
                continue

            prob = float(day['absence_probability'])
            is_alert = prob >= ALERT_PROB_THRESHOLD or (
                has_pattern and prob >= ALERT_PATTERN_PROB_THRESHOLD
            )
            if not is_alert:
                continue

            alerts.append({
                'date': day['date'],
                'day_name': day['day_name'],
                'day_name_fr': day.get('day_name_fr', day['day_name']),
                'absence_probability': prob,
                'reason': day.get('reason', 'Risque d\'absence détecté'),
            })

        alerts.sort(key=lambda a: a['absence_probability'], reverse=True)
        return alerts

    def _build_recommendation(
        self,
        patterns: List[Dict],
        alert_dates: List[Dict],
        att_row: pd.Series,
    ) -> str:
        if not alert_dates and not patterns:
            presence = float(att_row.get('presence_rate', 0)) * 100
            if presence >= 90:
                return 'Assiduité stable — aucune action requise.'
            return 'Surveiller l\'assiduité lors des prochaines semaines.'

        if alert_dates:
            first = alert_dates[0]
            day_fr = first.get('day_name_fr', first['day_name'])
            return (
                f'Contacter l\'employé avant le {day_fr} '
                f'({first["date"]}) pour prévenir une absence probable.'
            )

        if patterns:
            return f'Entretien préventif recommandé : {patterns[0]["label"]}.'

        return 'Surveiller l\'assiduité lors des prochaines semaines.'

    def enrich_att_row(self, att_row: pd.Series, attendance_df: pd.DataFrame) -> pd.Series:
        """Add recent_trend to attendance row for forecasting."""
        row = att_row.copy()
        row['recent_trend'] = self._compute_recent_trend(attendance_df)
        return row
