"""
Data Pipeline — queries PostgreSQL and builds feature matrices for AI models.
"""

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
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
        Build attendance feature matrix.
        Returns one row per employee with aggregated attendance metrics.
        """
        attendance = self.get_attendance_data(user_id)
        employees = self.get_all_employees()

        if attendance.empty or employees.empty:
            return pd.DataFrame()

        features = []
        user_ids = [user_id] if user_id else employees['id'].tolist()

        for uid in user_ids:
            user_att = attendance[attendance['utilisateur_id'] == uid]
            if user_att.empty:
                continue

            total_days = len(user_att)
            present_days = user_att['heure_entree'].notna().sum()
            absent_days = total_days - present_days

            # Presence rate
            presence_rate = present_days / total_days if total_days > 0 else 0

            # Average hours worked (only present days)
            present_records = user_att[user_att['duree_travail'].notna()]
            avg_hours = present_records['duree_travail'].astype(float).mean() if not present_records.empty else 0

            # Late arrival rate (after 08:30)
            late_count = 0
            if not present_records.empty:
                for _, row in present_records.iterrows():
                    if row['heure_entree'] is not None:
                        try:
                            entry_time = pd.to_datetime(row['heure_entree'])
                            if entry_time.hour > 8 or (entry_time.hour == 8 and entry_time.minute > 30):
                                late_count += 1
                        except:
                            pass
            late_rate = late_count / present_days if present_days > 0 else 0

            # Early departure rate (before 17:00)
            early_count = 0
            if not present_records.empty:
                for _, row in present_records.iterrows():
                    if row['heure_sortie'] is not None:
                        try:
                            exit_time = pd.to_datetime(row['heure_sortie'])
                            if exit_time.hour < 17:
                                early_count += 1
                        except:
                            pass
            early_departure_rate = early_count / present_days if present_days > 0 else 0

            # Justified absence ratio
            justified = user_att[user_att['absence_justifiee'] == True]
            justified_ratio = len(justified) / absent_days if absent_days > 0 else 0

            # Day-of-week absence rates
            dow_absence = {}
            for dow in range(5):  # 0=Mon to 4=Fri
                dow_records = user_att[user_att['date'].dt.dayofweek == dow]
                if len(dow_records) > 0:
                    dow_absent = dow_records['heure_entree'].isna().sum()
                    dow_absence[f'dow_{dow}_absence_rate'] = dow_absent / len(dow_records)
                else:
                    dow_absence[f'dow_{dow}_absence_rate'] = 0

            # Attendance streak (consecutive present days)
            present_flags = user_att.sort_values('date')['heure_entree'].notna().astype(int).tolist()
            max_streak = 0
            current_streak = 0
            for flag in present_flags:
                if flag:
                    current_streak += 1
                    max_streak = max(max_streak, current_streak)
                else:
                    current_streak = 0

            # Overtime ratio (hours > 8)
            overtime_days = present_records[present_records['duree_travail'].astype(float) > 8] if not present_records.empty else pd.DataFrame()
            overtime_ratio = len(overtime_days) / present_days if present_days > 0 else 0

            feat = {
                'utilisateur_id': uid,
                'total_days': total_days,
                'present_days': present_days,
                'absent_days': absent_days,
                'presence_rate': round(presence_rate, 4),
                'avg_hours_worked': round(avg_hours, 2),
                'late_rate': round(late_rate, 4),
                'early_departure_rate': round(early_departure_rate, 4),
                'justified_absence_ratio': round(justified_ratio, 4),
                'overtime_ratio': round(overtime_ratio, 4),
                'max_attendance_streak': max_streak,
                **{k: round(v, 4) for k, v in dow_absence.items()},
            }
            features.append(feat)

        return pd.DataFrame(features)

    def build_leave_features(self, user_id: Optional[int] = None) -> pd.DataFrame:
        """
        Build leave feature matrix.
        Returns one row per employee with aggregated leave metrics.
        """
        leaves = self.get_leave_data(user_id)
        employees = self.get_all_employees()

        if leaves.empty or employees.empty:
            return pd.DataFrame()

        features = []
        user_ids = [user_id] if user_id else employees['id'].tolist()

        for uid in user_ids:
            user_leaves = leaves[leaves['utilisateur_id'] == uid]

            total_requests = len(user_leaves)
            if total_requests == 0:
                features.append({
                    'utilisateur_id': uid,
                    'total_leave_requests': 0,
                    'total_leave_days': 0,
                    'sick_leave_ratio': 0,
                    'approved_ratio': 0,
                    'rejected_ratio': 0,
                    'avg_leave_duration': 0,
                    'leave_frequency': 0,
                })
                continue

            # Total leave days (approved only)
            approved = user_leaves[user_leaves['statut'] == 'APPROUVE']
            total_days = 0
            for _, row in approved.iterrows():
                days = (row['date_fin'] - row['date_debut']).days + 1
                total_days += max(days, 0)

            # Sick leave ratio
            sick = user_leaves[user_leaves['type'] == 'MALADIE']
            sick_ratio = len(sick) / total_requests if total_requests > 0 else 0

            # Approved/rejected ratio
            approved_ratio = len(approved) / total_requests if total_requests > 0 else 0
            rejected = user_leaves[user_leaves['statut'] == 'REFUSE']
            rejected_ratio = len(rejected) / total_requests if total_requests > 0 else 0

            # Average leave duration
            durations = []
            for _, row in user_leaves.iterrows():
                d = (row['date_fin'] - row['date_debut']).days + 1
                durations.append(max(d, 0))
            avg_duration = np.mean(durations) if durations else 0

            features.append({
                'utilisateur_id': uid,
                'total_leave_requests': total_requests,
                'total_leave_days': total_days,
                'sick_leave_ratio': round(sick_ratio, 4),
                'approved_ratio': round(approved_ratio, 4),
                'rejected_ratio': round(rejected_ratio, 4),
                'avg_leave_duration': round(avg_duration, 2),
                'leave_frequency': total_requests,  # raw count over 6 months
            })

        return pd.DataFrame(features)

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
                    except:
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
