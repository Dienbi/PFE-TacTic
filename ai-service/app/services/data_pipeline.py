"""
Data Pipeline — queries PostgreSQL and builds feature matrices for AI models.
"""

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class DataPipeline:
    """Extracts and transforms data from the database into ML-ready features."""

    def __init__(self, db: Session):
        self.db = db

    # ──────────────────────────────────────────────────────────────────
    # Raw data loaders
    # ──────────────────────────────────────────────────────────────────

    def get_all_employees(self) -> pd.DataFrame:
        """Get all active employees."""
        query = text("""
            SELECT id, matricule, nom, prenom, email, date_embauche,
                   type_contrat, salaire_base, status, role, actif, equipe_id
            FROM utilisateurs
            WHERE actif = true AND deleted_at IS NULL AND role = 'EMPLOYE'
            ORDER BY id
        """)
        rows = self.db.execute(query).fetchall()
        if not rows:
            return pd.DataFrame()
        cols = ['id', 'matricule', 'nom', 'prenom', 'email', 'date_embauche',
                'type_contrat', 'salaire_base', 'status', 'role', 'actif', 'equipe_id']
        return pd.DataFrame(rows, columns=cols)

    def get_attendance_data(self, user_id: Optional[int] = None,
                            months: int = 6) -> pd.DataFrame:
        """Get attendance records for the last N months."""
        start = datetime.now() - timedelta(days=months * 30)
        params = {'start_date': start.strftime('%Y-%m-%d')}

        where_user = ""
        if user_id:
            where_user = "AND p.utilisateur_id = :user_id"
            params['user_id'] = user_id

        query = text(f"""
            SELECT p.id, p.utilisateur_id, p.date, p.heure_entree, p.heure_sortie,
                   p.duree_travail, p.absence_justifiee
            FROM pointages p
            WHERE p.date >= :start_date {where_user}
            ORDER BY p.utilisateur_id, p.date
        """)
        rows = self.db.execute(query, params).fetchall()
        if not rows:
            return pd.DataFrame()
        cols = ['id', 'utilisateur_id', 'date', 'heure_entree', 'heure_sortie',
                'duree_travail', 'absence_justifiee']
        df = pd.DataFrame(rows, columns=cols)
        df['date'] = pd.to_datetime(df['date'])
        return df

    def get_leave_data(self, user_id: Optional[int] = None,
                       months: int = 6) -> pd.DataFrame:
        """Get leave requests for the last N months."""
        start = datetime.now() - timedelta(days=months * 30)
        params = {'start_date': start.strftime('%Y-%m-%d')}

        where_user = ""
        if user_id:
            where_user = "AND c.utilisateur_id = :user_id"
            params['user_id'] = user_id

        query = text(f"""
            SELECT c.id, c.utilisateur_id, c.type, c.date_debut, c.date_fin,
                   c.statut, c.motif
            FROM conges c
            WHERE c.date_debut >= :start_date {where_user}
            ORDER BY c.utilisateur_id, c.date_debut
        """)
        rows = self.db.execute(query, params).fetchall()
        if not rows:
            return pd.DataFrame()
        cols = ['id', 'utilisateur_id', 'type', 'date_debut', 'date_fin', 'statut', 'motif']
        df = pd.DataFrame(rows, columns=cols)
        df['date_debut'] = pd.to_datetime(df['date_debut'])
        df['date_fin'] = pd.to_datetime(df['date_fin'])
        return df

    def get_employee_skills(self, user_id: Optional[int] = None) -> pd.DataFrame:
        """Get skills for employees."""
        where_user = ""
        params = {}
        if user_id:
            where_user = "WHERE uc.utilisateur_id = :user_id"
            params['user_id'] = user_id

        query = text(f"""
            SELECT uc.utilisateur_id, uc.competence_id, c.nom, uc.niveau
            FROM utilisateur_competence uc
            JOIN competences c ON uc.competence_id = c.id
            {where_user}
            ORDER BY uc.utilisateur_id
        """)
        rows = self.db.execute(query, params).fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=['utilisateur_id', 'competence_id', 'nom', 'niveau'])

    def get_job_post_skills(self, job_post_id: int) -> pd.DataFrame:
        """Get required skills for a job post."""
        query = text("""
            SELECT jpc.competence_id, c.nom, jpc.niveau_requis
            FROM job_post_competence jpc
            JOIN competences c ON jpc.competence_id = c.id
            WHERE jpc.job_post_id = :job_post_id
        """)
        rows = self.db.execute(query, {'job_post_id': job_post_id}).fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=['competence_id', 'nom', 'niveau_requis'])

    # ──────────────────────────────────────────────────────────────────
    # Feature engineering
    # ──────────────────────────────────────────────────────────────────

    def build_attendance_features(self, user_id: Optional[int] = None) -> pd.DataFrame:
        """
        Build attendance feature matrix. Vectorized version.
        Returns one row per employee with aggregated attendance metrics.
        """
        attendance = self.get_attendance_data(user_id)
        if attendance.empty:
            return pd.DataFrame()

        # Vectorized calculations for all employees at once
        attendance['is_present'] = attendance['heure_entree'].notna()
        attendance['is_absent'] = attendance['heure_entree'].isna()

        # Group by user
        groups = attendance.groupby('utilisateur_id')

        counts = groups.agg(
            total_days=('id', 'count'),
            present_days=('is_present', 'sum'),
            absent_days=('is_absent', 'sum'),
            avg_hours_worked=('duree_travail', 'mean')
        ).reset_index()

        counts['presence_rate'] = (counts['present_days'] / counts['total_days']).fillna(0).round(4)

        # Late and Early features (vectorized)
        attendance['entry_dt'] = pd.to_datetime(attendance['heure_entree'], errors='coerce')
        attendance['exit_dt'] = pd.to_datetime(attendance['heure_sortie'], errors='coerce')

        attendance['is_late'] = (attendance['entry_dt'].dt.hour > 8) | \
                                ((attendance['entry_dt'].dt.hour == 8) & (attendance['entry_dt'].dt.minute > 30))

        attendance['is_early'] = (attendance['exit_dt'].dt.hour < 17) & (attendance['exit_dt'].notna())

        late_counts = groups.agg(
            late_count=('is_late', 'sum'),
            early_count=('is_early', 'sum'),
            justified_count=('absence_justifiee', 'sum')
        ).reset_index()

        counts = counts.merge(late_counts, on='utilisateur_id')
        counts['late_rate'] = (counts['late_count'] / counts['present_days']).fillna(0).round(4)
        counts['early_departure_rate'] = (counts['early_count'] / counts['present_days']).fillna(0).round(4)
        counts['justified_absence_ratio'] = (counts['justified_count'] / counts['absent_days']).fillna(0).round(4)

        # Overtime
        attendance['is_overtime'] = attendance['duree_travail'].astype(float) > 8
        overtime = groups.agg(overtime_count=('is_overtime', 'sum')).reset_index()
        counts = counts.merge(overtime, on='utilisateur_id')
        counts['overtime_ratio'] = (counts['overtime_count'] / counts['present_days']).fillna(0).round(4)

        # Day of week absence rates (vectorized)
        attendance['dow'] = attendance['date'].dt.dayofweek
        for dow in range(5):
            dow_mask = (attendance['dow'] == dow)
            dow_data = attendance[dow_mask].groupby('utilisateur_id').agg(
                dow_total=('id', 'count'),
                dow_absent=('is_absent', 'sum')
            ).reset_index()
            dow_data[f'dow_{dow}_absence_rate'] = (dow_data['dow_absent'] / dow_data['dow_total']).fillna(0).round(4)
            counts = counts.merge(dow_data[['utilisateur_id', f'dow_{dow}_absence_rate']], on='utilisateur_id', how='left').fillna(0)

        # Attendance streak (requires loop but only once per user, still more efficient than original)
        streaks = []
        for uid, user_att in groups:
            present_flags = user_att.sort_values('date')['is_present'].astype(int).tolist()
            max_streak = 0
            current_streak = 0
            for flag in present_flags:
                if flag:
                    current_streak += 1
                    max_streak = max(max_streak, current_streak)
                else:
                    current_streak = 0
            streaks.append({'utilisateur_id': uid, 'max_attendance_streak': max_streak})

        counts = counts.merge(pd.DataFrame(streaks), on='utilisateur_id')

        return counts.drop(columns=['late_count', 'early_count', 'justified_count', 'overtime_count'])

    def build_leave_features(self, user_id: Optional[int] = None) -> pd.DataFrame:
        """
        Build leave feature matrix. Vectorized version.
        Returns one row per employee with aggregated leave metrics.
        """
        leaves = self.get_leave_data(user_id)
        if leaves.empty:
            return pd.DataFrame()

        leaves['duration'] = ((leaves['date_fin'] - leaves['date_debut']).dt.days + 1).clip(lower=0)
        leaves['is_approved'] = leaves['statut'] == 'APPROUVE'
        leaves['is_rejected'] = leaves['statut'] == 'REFUSE'
        leaves['is_sick'] = leaves['type'] == 'MALADIE'

        groups = leaves.groupby('utilisateur_id')

        feats = groups.agg(
            total_leave_requests=('id', 'count'),
            sick_count=('is_sick', 'sum'),
            approved_count=('is_approved', 'sum'),
            rejected_count=('is_rejected', 'sum'),
            avg_leave_duration=('duration', 'mean')
        ).reset_index()

        # Approved duration sum
        approved_only = leaves[leaves['is_approved']].groupby('utilisateur_id')['duration'].sum().reset_index()
        approved_only.columns = ['utilisateur_id', 'total_leave_days']

        feats = feats.merge(approved_only, on='utilisateur_id', how='left').fillna(0)

        feats['sick_leave_ratio'] = (feats['sick_count'] / feats['total_leave_requests']).round(4)
        feats['approved_ratio'] = (feats['approved_count'] / feats['total_leave_requests']).round(4)
        feats['rejected_ratio'] = (feats['rejected_count'] / feats['total_leave_requests']).round(4)
        feats['leave_frequency'] = feats['total_leave_requests']
        feats['avg_leave_duration'] = feats['avg_leave_duration'].round(2)

        return feats.drop(columns=['sick_count', 'approved_count', 'rejected_count'])

    def build_employee_features(self) -> pd.DataFrame:
        """
        Build complete employee feature matrix combining:
        - Attendance features
        - Leave features
        - Skill features  
        - Tenure / contract info
        """
        employees = self.get_all_employees()
        if employees.empty:
            return pd.DataFrame()

        att_features = self.build_attendance_features()
        leave_features = self.build_leave_features()
        skills = self.get_employee_skills()

        # Skill aggregates per employee
        skill_features = []
        for uid in employees['id'].tolist():
            user_skills = skills[skills['utilisateur_id'] == uid] if not skills.empty else pd.DataFrame()
            skill_features.append({
                'utilisateur_id': uid,
                'skill_count': len(user_skills),
                'avg_skill_level': round(user_skills['niveau'].astype(float).mean(), 2) if not user_skills.empty else 0,
                'max_skill_level': int(user_skills['niveau'].max()) if not user_skills.empty else 0,
            })
        skill_df = pd.DataFrame(skill_features)

        # Tenure in months
        now = datetime.now()
        employees['tenure_months'] = employees['date_embauche'].apply(
            lambda d: max((now - pd.to_datetime(d)).days / 30.0, 0) if d else 0
        ).round(1)

        # Merge all features
        result = employees[['id', 'matricule', 'nom', 'prenom', 'salaire_base', 'status', 'equipe_id', 'tenure_months']].copy()
        result = result.rename(columns={'id': 'utilisateur_id'})

        if not att_features.empty:
            result = result.merge(att_features, on='utilisateur_id', how='left')
        if not leave_features.empty:
            result = result.merge(leave_features, on='utilisateur_id', how='left')
        result = result.merge(skill_df, on='utilisateur_id', how='left')

        # Fill NaN
        result = result.fillna(0)

        return result

    def build_attendance_sequences(self, sequence_length: int = 30) -> Dict[int, np.ndarray]:
        """
        Build daily attendance sequences for LSTM model.
        Returns dict: user_id -> array of shape (num_sequences, sequence_length, num_features)
        
        Features per day:
        - was_present (0/1)
        - hours_worked (normalized 0-1)
        - was_late (0/1)
        - day_of_week (0-4, normalized)
        - is_on_leave (0/1)
        - month_sin, month_cos (cyclical encoding)
        """
        attendance = self.get_attendance_data()
        leaves = self.get_leave_data()
        employees = self.get_all_employees()

        if attendance.empty or employees.empty:
            return {}

        # Build leave date sets per user
        leave_dates = {}
        if not leaves.empty:
            approved_leaves = leaves[leaves['statut'] == 'APPROUVE']
            for _, row in approved_leaves.iterrows():
                uid = row['utilisateur_id']
                if uid not in leave_dates:
                    leave_dates[uid] = set()
                start = row['date_debut']
                end = row['date_fin']
                for d in pd.date_range(start, end):
                    leave_dates[uid].add(d.date())

        sequences = {}
        for uid in employees['id'].tolist():
            user_att = attendance[attendance['utilisateur_id'] == uid].sort_values('date')
            if len(user_att) < sequence_length + 7:  # need enough data
                continue

            daily_features = []
            for _, row in user_att.iterrows():
                date = row['date']
                was_present = 1.0 if pd.notna(row['heure_entree']) else 0.0

                hours = float(row['duree_travail']) if pd.notna(row['duree_travail']) else 0.0
                hours_norm = min(hours / 12.0, 1.0)  # normalize to [0, 1]

                was_late = 0.0
                if pd.notna(row['heure_entree']):
                    try:
                        entry = pd.to_datetime(row['heure_entree'])
                        if entry.hour > 8 or (entry.hour == 8 and entry.minute > 30):
                            was_late = 1.0
                    except Exception:
                        pass

                dow = date.weekday() / 4.0 if hasattr(date, 'weekday') else pd.to_datetime(date).weekday() / 4.0
                
                on_leave = 0.0
                d = date.date() if hasattr(date, 'date') else pd.to_datetime(date).date()
                if uid in leave_dates and d in leave_dates[uid]:
                    on_leave = 1.0

                month = date.month if hasattr(date, 'month') else pd.to_datetime(date).month
                month_sin = np.sin(2 * np.pi * month / 12.0)
                month_cos = np.cos(2 * np.pi * month / 12.0)

                daily_features.append([
                    was_present, hours_norm, was_late, dow, on_leave, month_sin, month_cos
                ])

            daily_arr = np.array(daily_features, dtype=np.float32)

            # Create sliding window sequences
            # Input: sequence_length days, Target: next 7 days presence
            seqs = []
            for i in range(len(daily_arr) - sequence_length - 6):
                seq_input = daily_arr[i:i + sequence_length]
                seq_target = daily_arr[i + sequence_length:i + sequence_length + 7, 0]  # was_present
                seqs.append((seq_input, seq_target))

            if seqs:
                X = np.array([s[0] for s in seqs], dtype=np.float32)
                y = np.array([s[1] for s in seqs], dtype=np.float32)
                sequences[uid] = (X, y)

        return sequences

    def build_matching_features(self, job_post_id: int) -> pd.DataFrame:
        """
        Build feature vectors for (employee, job_post) pairs for the matching model.
        """
        employees = self.get_all_employees()
        if employees.empty:
            return pd.DataFrame()

        job_skills = self.get_job_post_skills(job_post_id)
        emp_skills = self.get_employee_skills()
        att_features = self.build_attendance_features()
        leave_features = self.build_leave_features()

        features = []
        for _, emp in employees.iterrows():
            uid = emp['id']

            # Skill overlap
            if not job_skills.empty and not emp_skills.empty:
                user_skills = emp_skills[emp_skills['utilisateur_id'] == uid]
                required_ids = set(job_skills['competence_id'].tolist())
                candidate_ids = set(user_skills['competence_id'].tolist()) if not user_skills.empty else set()

                overlap = required_ids.intersection(candidate_ids)
                skill_overlap_ratio = len(overlap) / len(required_ids) if required_ids else 0

                # Average skill gap for overlapping skills
                gaps = []
                for cid in overlap:
                    req_level = job_skills[job_skills['competence_id'] == cid]['niveau_requis'].values[0]
                    cand_level = user_skills[user_skills['competence_id'] == cid]['niveau'].values[0]
                    gaps.append(max(0, int(req_level) - int(cand_level)) / 5.0)
                avg_skill_gap = np.mean(gaps) if gaps else 1.0

                # Weighted skill match (considering levels)
                total_score = 0
                for cid in required_ids:
                    req_level = int(job_skills[job_skills['competence_id'] == cid]['niveau_requis'].values[0])
                    cand_row = user_skills[user_skills['competence_id'] == cid]
                    if not cand_row.empty:
                        cand_level = int(cand_row['niveau'].values[0])
                        total_score += min(cand_level / req_level, 1.0) if req_level > 0 else 1.0
                weighted_skill_match = total_score / len(required_ids) if required_ids else 0
            else:
                skill_overlap_ratio = 0
                avg_skill_gap = 1.0
                weighted_skill_match = 0

            # Attendance score from features
            attendance_score = 0
            if not att_features.empty:
                user_att = att_features[att_features['utilisateur_id'] == uid]
                if not user_att.empty:
                    attendance_score = float(user_att['presence_rate'].values[0])

            # Leave load
            leave_load = 0
            if not leave_features.empty:
                user_leave = leave_features[leave_features['utilisateur_id'] == uid]
                if not user_leave.empty:
                    leave_load = min(float(user_leave['total_leave_days'].values[0]) / 30.0, 1.0)

            # Tenure
            tenure = max((datetime.now() - pd.to_datetime(emp['date_embauche'])).days / 365.0, 0) if emp['date_embauche'] else 0

            # Availability
            avail = 1.0 if emp['status'] == 'DISPONIBLE' else (0.5 if emp['status'] == 'AFFECTE' else 0.0)

            features.append({
                'utilisateur_id': uid,
                'skill_overlap_ratio': round(skill_overlap_ratio, 4),
                'avg_skill_gap': round(avg_skill_gap, 4),
                'weighted_skill_match': round(weighted_skill_match, 4),
                'attendance_score': round(attendance_score, 4),
                'leave_load': round(leave_load, 4),
                'tenure_years': round(tenure, 2),
                'availability': avail,
            })

        return pd.DataFrame(features)

    def compute_performance_labels(self) -> pd.DataFrame:
        """
        Compute pseudo-labels for performance model training.
        Composite score: attendance(40%) + skills(30%) + tenure(20%) + overtime(10%)
        """
        emp_features = self.build_employee_features()
        if emp_features.empty:
            return pd.DataFrame()

        labels = []
        for _, row in emp_features.iterrows():
            att_score = float(row.get('presence_rate', 0)) * 100
            skill_score = min(float(row.get('avg_skill_level', 0)) * 20, 100)
            tenure_score = min(float(row.get('tenure_months', 0)) / 60 * 100, 100)
            overtime_score = min(float(row.get('overtime_ratio', 0)) * 200, 100)

            composite = (att_score * 0.4 + skill_score * 0.3 +
                         tenure_score * 0.2 + overtime_score * 0.1)

            labels.append({
                'utilisateur_id': row['utilisateur_id'],
                'performance_label': round(min(composite, 100), 2),
            })

        return pd.DataFrame(labels)
