from datetime import datetime, date
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MatchingService:
    """
    AI-based candidate matching service
    
    Scoring algorithm:
    - Skill Match: 60% (required skills vs candidate skills)
    - Experience: 20% (years since hire date)
    - Availability: 10% (DISPONIBLE status preferred)
    - Workload: 10% (team workload consideration)
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Scoring weights
        self.SKILL_WEIGHT = 0.60
        self.EXPERIENCE_WEIGHT = 0.20
        self.AVAILABILITY_WEIGHT = 0.10
        self.WORKLOAD_WEIGHT = 0.10
    
    def match_candidates(self, job_post_id: int) -> Dict:
        """
        Main matching function
        Returns dictionary with job post info and ranked candidates
        """
        # Get job post details
        job_post = self._get_job_post(job_post_id)
        if not job_post:
            raise ValueError(f"Job post {job_post_id} not found")
        
        # Get required skills for the job
        required_skills = self._get_required_skills(job_post_id)
        if not required_skills:
            logger.warning(f"No required skills defined for job post {job_post_id}")
        
        # Get all available employees (role = 'employe')
        candidates = self._get_candidates()
        
        # Score each candidate
        recommendations = []
        for candidate in candidates:
            score_data = self._score_candidate(candidate, required_skills)
            
            if score_data['score'] > 0:  # Only include candidates with some match
                recommendations.append({
                    'utilisateur_id': candidate['id'],
                    'nom': candidate['nom'],
                    'prenom': candidate['prenom'],
                    'matricule': candidate['matricule'],
                    'email': candidate['email'],
                    'score': round(score_data['score'], 2),
                    'details': score_data['details']
                })
        
        # Sort by score descending
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'job_post_id': job_post_id,
            'job_post_titre': job_post['titre'],
            'total_candidates': len(recommendations),
            'recommendations': recommendations
        }
    
    def _get_job_post(self, job_post_id: int) -> Optional[Dict]:
        """Get job post details"""
        query = text("""
            SELECT id, titre, description, statut
            FROM job_posts
            WHERE id = :job_post_id AND deleted_at IS NULL
        """)
        
        result = self.db.execute(query, {'job_post_id': job_post_id}).fetchone()
        
        if result:
            return {
                'id': result[0],
                'titre': result[1],
                'description': result[2],
                'statut': result[3]
            }
        return None
    
    def _get_required_skills(self, job_post_id: int) -> List[Dict]:
        """Get required skills for a job post"""
        query = text("""
            SELECT jpc.competence_id, c.nom, jpc.niveau_requis
            FROM job_post_competence jpc
            JOIN competences c ON jpc.competence_id = c.id
            WHERE jpc.job_post_id = :job_post_id
        """)
        
        result = self.db.execute(query, {'job_post_id': job_post_id}).fetchall()
        
        return [
            {
                'competence_id': row[0],
                'nom': row[1],
                'niveau_requis': row[2]
            }
            for row in result
        ]
    
    def _get_candidates(self) -> List[Dict]:
        """Get all employee candidates"""
        query = text("""
            SELECT 
                u.id, 
                u.nom, 
                u.prenom, 
                u.matricule, 
                u.email,
                u.date_embauche,
                u.status,
                u.equipe_id,
                e.nom as equipe_nom
            FROM utilisateurs u
            LEFT JOIN equipes e ON u.equipe_id = e.id
            WHERE u.role = 'employe' 
                AND u.actif = true 
                AND u.deleted_at IS NULL
        """)
        
        result = self.db.execute(query).fetchall()
        
        return [
            {
                'id': row[0],
                'nom': row[1],
                'prenom': row[2],
                'matricule': row[3],
                'email': row[4],
                'date_embauche': row[5],
                'status': row[6],
                'equipe_id': row[7],
                'equipe_nom': row[8]
            }
            for row in result
        ]
    
    def _get_candidate_skills(self, utilisateur_id: int) -> List[Dict]:
        """Get skills for a candidate"""
        query = text("""
            SELECT uc.competence_id, c.nom, uc.niveau
            FROM utilisateur_competence uc
            JOIN competences c ON uc.competence_id = c.id
            WHERE uc.utilisateur_id = :utilisateur_id
        """)
        
        result = self.db.execute(query, {'utilisateur_id': utilisateur_id}).fetchall()
        
        return [
            {
                'competence_id': row[0],
                'nom': row[1],
                'niveau': row[2]
            }
            for row in result
        ]
    
    def _get_team_workload(self, equipe_id: Optional[int]) -> int:
        """Get current team workload (number of active members)"""
        if not equipe_id:
            return 0
        
        query = text("""
            SELECT COUNT(*)
            FROM utilisateurs
            WHERE equipe_id = :equipe_id 
                AND actif = true 
                AND deleted_at IS NULL
        """)
        
        result = self.db.execute(query, {'equipe_id': equipe_id}).fetchone()
        return result[0] if result else 0
    
    def _score_candidate(self, candidate: Dict, required_skills: List[Dict]) -> Dict:
        """
        Score a single candidate
        Returns score (0-100) and detailed breakdown
        """
        # Get candidate's skills
        candidate_skills = self._get_candidate_skills(candidate['id'])
        candidate_skills_dict = {
            skill['competence_id']: skill['niveau'] 
            for skill in candidate_skills
        }
        
        # 1. Skill Match Score (60%)
        skill_score, matching_skills, missing_skills = self._calculate_skill_match(
            required_skills, 
            candidate_skills_dict
        )
        
        # 2. Experience Score (20%)
        experience_score, years_exp = self._calculate_experience_score(
            candidate['date_embauche']
        )
        
        # 3. Availability Score (10%)
        availability_score = self._calculate_availability_score(
            candidate['status']
        )
        
        # 4. Workload Score (10%)
        team_members = self._get_team_workload(candidate['equipe_id'])
        workload_score = self._calculate_workload_score(team_members)
        
        # Calculate final weighted score
        final_score = (
            skill_score * self.SKILL_WEIGHT +
            experience_score * self.EXPERIENCE_WEIGHT +
            availability_score * self.AVAILABILITY_WEIGHT +
            workload_score * self.WORKLOAD_WEIGHT
        )
        
        # Prepare details
        details = {
            'skill_match_percentage': round(skill_score, 2),
            'experience_score': round(experience_score, 2),
            'availability_score': round(availability_score, 2),
            'workload_score': round(workload_score, 2),
            'years_experience': round(years_exp, 1),
            'matching_skills': matching_skills,
            'missing_skills': missing_skills,
            'current_team': candidate['equipe_nom'],
            'team_current_members': team_members
        }
        
        return {
            'score': final_score,
            'details': details
        }
    
    def _calculate_skill_match(
        self, 
        required_skills: List[Dict], 
        candidate_skills: Dict[int, int]
    ) -> tuple:
        """
        Calculate skill match percentage
        Returns (score, matching_skills, missing_skills)
        """
        if not required_skills:
            return (100.0, [], [])
        
        matching_skills = []
        missing_skills = []
        total_match_score = 0
        
        for req_skill in required_skills:
            comp_id = req_skill['competence_id']
            req_level = req_skill['niveau_requis']
            
            skill_detail = {
                'competence_id': comp_id,
                'competence_nom': req_skill['nom'],
                'niveau_requis': req_level,
                'niveau_candidat': candidate_skills.get(comp_id),
                'match': False
            }
            
            if comp_id in candidate_skills:
                cand_level = candidate_skills[comp_id]
                skill_detail['niveau_candidat'] = cand_level
                
                # Score: 100% if level >= required, proportional if lower
                if cand_level >= req_level:
                    match_score = 100
                    skill_detail['match'] = True
                else:
                    match_score = (cand_level / req_level) * 100
                
                total_match_score += match_score
                matching_skills.append(skill_detail)
            else:
                # Missing skill = 0 score
                missing_skills.append(skill_detail)
        
        # Average skill match percentage
        avg_skill_match = total_match_score / len(required_skills) if required_skills else 0
        
        return (avg_skill_match, matching_skills, missing_skills)
    
    def _calculate_experience_score(self, date_embauche: Optional[date]) -> tuple:
        """
        Calculate experience score based on years of experience
        Returns (score, years)
        """
        if not date_embauche:
            return (0.0, 0.0)
        
        today = date.today()
        years_exp = (today - date_embauche).days / 365.25
        
        # Score: max 100 at 10+ years, linear scaling
        if years_exp >= 10:
            score = 100
        else:
            score = (years_exp / 10) * 100
        
        return (score, years_exp)
    
    def _calculate_availability_score(self, status: str) -> float:
        """
        Calculate availability score
        DISPONIBLE = 100, AFFECTE = 50, EN_CONGE = 0
        """
        status_scores = {
            'disponible': 100,
            'affecte': 50,
            'en_conge': 0
        }
        
        return status_scores.get(status.lower(), 50)
    
    def _calculate_workload_score(self, team_members: int) -> float:
        """
        Calculate workload score based on team size
        Smaller teams = lower score (more workload)
        Larger teams = higher score (less workload per person)
        """
        # Ideal team size: 5-10 members
        if team_members >= 10:
            return 100
        elif team_members >= 5:
            return 80
        elif team_members >= 3:
            return 60
        elif team_members >= 1:
            return 40
        else:
            return 100  # No team = available
