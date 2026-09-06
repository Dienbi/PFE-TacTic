from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime

router = APIRouter()

# Word-to-number mapping for natural language processing
WORD_TO_NUMBER = {
    'zero': 0, 'no': 0, 'none': 0,
    'one': 1, 'a': 1, 'an': 1, 'single': 1,
    'two': 2, 'couple': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10
}

def extract_number_from_text(text: str) -> int:
    """Extract a number from text, handling both digits and number words."""
    import re
    
    # First try to find a digit
    digit_match = re.search(r'\d+', text)
    if digit_match:
        return int(digit_match.group(0))
    
    # Then try to find number words
    for word, number in WORD_TO_NUMBER.items():
        if re.search(r'\b' + word + r'\b', text.lower()):
            return number
    
    return 0

# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str
    content: str
    proposed_action: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    auth_token: Optional[str] = None  # JWT token for authenticated requests

class ChatResponse(BaseModel):
    session_id: str
    ai_message: ChatMessage

class RoleProfile(BaseModel):
    name: str
    horaire_type: str
    salary_type: str
    weekly_hours: Optional[int] = None
    overtime_eligible: Optional[bool] = None
    overtime_rate_multiplier: Optional[float] = None
    base_salary_min: Optional[float] = None
    base_salary_max: Optional[float] = None
    cnss_regime: Optional[str] = None

class EmployeeMatchCriteria(BaseModel):
    role_profile_id: Optional[str] = None
    role_profile_name: Optional[str] = None

class BulkAssignment(BaseModel):
    role_profile_id: str
    employee_ids: List[int]
    effective_from: str

# Laravel backend API URL (from environment or default)
LARAVEL_API_URL = "http://127.0.0.1:8000/api/payroll"

@router.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """
    Process chat messages for role profile management.
    This service proposes actions that must be confirmed by HR before execution.
    """
    print(f"Received message: {request.message}")
    print(f"Auth token present: {request.auth_token is not None}")
    print(f"Auth token length: {len(request.auth_token) if request.auth_token else 0}")
    
    # Parse the user's message to determine intent
    intent = parse_intent(request.message)
    
    # Generate appropriate response based on intent
    response = await generate_response(intent, request.message, request.session_id, request.auth_token)
    return response

def parse_intent(message: str) -> Dict[str, Any]:
    """
    Parse user message to determine intent and extract parameters.
    This is a simplified implementation - in production, use NLP/LLM.
    """
    message_lower = message.lower()
    
    # Intent: Confirm action (yes/proceed)
    if message_lower in ["yes", "y", "proceed", "confirm", "ok", "sure", "do it"]:
        return {
            "intent": "confirm",
            "params": {}
        }
    
    # Intent: Reject action (no/cancel)
    if message_lower in ["no", "n", "cancel", "stop", "don't", "no thanks"]:
        return {
            "intent": "reject",
            "params": {}
        }
    
    # Intent: Create role profile
    if "create" in message_lower and ("role" in message_lower or "profile" in message_lower):
        return {
            "intent": "create_profile",
            "params": extract_role_profile_params(message)
        }
    
    # Intent: Find employees by role profile
    if "find" in message_lower or "search" in message_lower or "list" in message_lower or "show" in message_lower:
        if "employee" in message_lower or "employees" in message_lower:
            return {
                "intent": "find_employees",
                "params": extract_employee_criteria(message)
            }
    
    # Intent: Assign employee to role profile
    if "assign" in message_lower and ("role" in message_lower or "profile" in message_lower):
        return {
            "intent": "assign_profile",
            "params": extract_assignment_params(message)
        }
    
    # Intent: Reassign employee to different role profile
    if "reassign" in message_lower or "move" in message_lower:
        return {
            "intent": "reassign_profile",
            "params": extract_assignment_params(message)
        }
    
    # Intent: Bulk assign
    if "bulk" in message_lower and "assign" in message_lower:
        return {
            "intent": "bulk_assign",
            "params": extract_assignment_params(message)
        }
    
    # Default: General query
    return {
        "intent": "general",
        "params": {}
    }

def extract_role_profile_params(message: str) -> Dict[str, Any]:
    """Extract parameters for role profile operations."""
    params = {}
    message_lower = message.lower()
    
    import re
    
    # Extract profile name
    # Try to find quoted text first
    quoted_match = re.search(r'"([^"]+)"', message)
    if quoted_match:
        params["name"] = quoted_match.group(1)
    else:
        # Extract name from patterns like "create a [name] role profile"
        name_pattern = r'create\s+(?:a\s+)?(?:role\s+)?profile\s+(?:called\s+)?["\']?([^"\']+?)["\']?(?:\s+(?:with|for|that|who)?)?$'
        match = re.search(name_pattern, message_lower)
        if match:
            name = match.group(1).strip()
            # Clean up common trailing words
            name = re.sub(r'\s+(profile|role)\s*$', '', name, flags=re.IGNORECASE)
            params["name"] = name
    
    # Extract horaire_type (fixed/flexible)
    if "fixed" in message_lower:
        params["horaire_type"] = "fixed"
    elif "flexible" in message_lower:
        params["horaire_type"] = "flexible"
    else:
        params["horaire_type"] = "fixed"  # default
    
    # Extract salary_type (fixed_monthly/hourly)
    if "hourly" in message_lower:
        params["salary_type"] = "hourly"
    elif "monthly" in message_lower or "fixed" in message_lower:
        params["salary_type"] = "fixed_monthly"
    else:
        params["salary_type"] = "fixed_monthly"  # default
    
    # Extract weekly_hours
    hours_match = re.search(r'(\d+)\s*hours?', message_lower)
    if hours_match:
        params["weekly_hours"] = int(hours_match.group(1))
    else:
        params["weekly_hours"] = 40  # default
    
    # Extract overtime_eligible
    if "overtime" in message_lower:
        params["overtime_eligible"] = True
    else:
        params["overtime_eligible"] = False  # default
    
    # Extract cnss_regime
    if "cnss" in message_lower:
        cnss_match = re.search(r'cnss\s+(\w+)', message_lower)
        if cnss_match:
            params["cnss_regime"] = cnss_match.group(1)
    
    print(f"DEBUG: Extracted role profile params: {params}")
    return params

def extract_employee_criteria(message: str) -> Dict[str, Any]:
    """Extract criteria for finding employees."""
    criteria = {}
    message_lower = message.lower()
    
    import re
    
    # Extract role profile name
    quoted_match = re.search(r'"([^"]+)"', message)
    if quoted_match:
        criteria["role_profile_name"] = quoted_match.group(1)
    else:
        # Extract from patterns like "employees with [profile] profile"
        profile_pattern = r'(?:employees|employee)\s+(?:with|in|having)\s+(?:the\s+)?(.+?)(?:\s+profile)?$'
        match = re.search(profile_pattern, message_lower)
        if match:
            profile_name = match.group(1).strip()
            criteria["role_profile_name"] = profile_name
    
    print(f"DEBUG: Extracted employee criteria: {criteria}")
    return criteria

def extract_assignment_params(message: str) -> Dict[str, Any]:
    """Extract parameters for assignment operations."""
    params = {}
    message_lower = message.lower()
    
    import re
    
    # Extract employee identifier (name or matricule)
    matricule_match = re.search(r'EMP\d{5}', message, re.IGNORECASE)
    if matricule_match:
        params["employee_id"] = matricule_match.group(0)
    else:
        # Pattern: "assign [name] to [profile]"
        assign_pattern = r'assign\s+(.+?)\s+to\s+'
        assign_match = re.search(assign_pattern, message_lower)
        if assign_match:
            employee_name = assign_match.group(1).strip()
            # Clean up common trailing words
            employee_name = re.sub(r'\s+(employee|profile|role)\s*$', '', employee_name, flags=re.IGNORECASE)
            params["employee_name"] = employee_name
    
    # Extract role profile name
    quoted_match = re.search(r'"([^"]+)"', message)
    if quoted_match:
        params["role_profile_name"] = quoted_match.group(1)
    else:
        # Pattern: "to [profile] role profile" or "to [profile]"
        profile_pattern = r'to\s+(?:the\s+)?(.+?)(?:\s+role\s+profile|$)'
        profile_match = re.search(profile_pattern, message_lower)
        if profile_match:
            profile_name = profile_match.group(1).strip()
            # Clean up trailing words
            profile_name = re.sub(r'\s+(profile|role)\s*$', '', profile_name, flags=re.IGNORECASE)
            params["role_profile_name"] = profile_name
    
    # Extract effective date
    date_match = re.search(r'effective\s+(?:from\s+)?(\d{4}-\d{2}-\d{2})', message_lower)
    if date_match:
        params["effective_from"] = date_match.group(1)
    
    print(f"DEBUG: Extracted assignment params: {params}")
    return params

async def generate_response(intent: Dict[str, Any], user_message: str, session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Generate AI response based on parsed intent."""
    intent_type = intent["intent"]
    params = intent["params"]
    
    if intent_type == "create_profile":
        return await handle_create_profile(params, session_id, auth_token)
    elif intent_type == "find_employees":
        return await handle_find_employees(params, session_id, auth_token)
    elif intent_type == "bulk_assign":
        return handle_bulk_assign(params, session_id, auth_token)
    elif intent_type == "assign_profile":
        return await handle_assign_profile(params, session_id, auth_token)
    elif intent_type == "reassign_profile":
        return await handle_reassign_profile(params, session_id, auth_token)
    elif intent_type == "confirm":
        return handle_confirm_action(session_id, auth_token)
    elif intent_type == "reject":
        return handle_reject_action(session_id)
    else:
        return handle_general_query(session_id)

async def handle_create_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle create role profile intent."""
    # Check if profile already exists by name
    profile_name = params.get("name")
    if profile_name:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{LARAVEL_API_URL}/role-profiles/search",
                    params={"q": profile_name}
                )
                if response.status_code == 200:
                    profiles = response.json()
                    if profiles and len(profiles) > 0:
                        existing_profile = profiles[0]
                        return ChatResponse(
                            session_id=session_id or "new",
                            ai_message=ChatMessage(
                                role="ai",
                                content=f"A role profile named '{profile_name}' already exists. Would you like me to show you the details or help you create a different one?",
                                proposed_action={
                                    "type": "view_existing_profile",
                                    "profile_id": existing_profile.get("id"),
                                    "profile_name": existing_profile.get("name")
                                }
                            )
                        )
            except Exception as e:
                pass
    
    # Propose creating new profile with natural language
    profile_details = []
    if params.get("name"):
        profile_details.append(f"Name: {params['name']}")
    if params.get("horaire_type"):
        profile_details.append(f"Schedule: {params['horaire_type']}")
    if params.get("salary_type"):
        profile_details.append(f"Salary type: {params['salary_type']}")
    if params.get("weekly_hours"):
        profile_details.append(f"Hours per week: {params['weekly_hours']}")
    if params.get("overtime_eligible"):
        profile_details.append(f"Overtime eligible: {'Yes' if params['overtime_eligible'] else 'No'}")
    if params.get("cnss_regime"):
        profile_details.append(f"CNSS regime: {params['cnss_regime']}")
    
    details_text = ", ".join(profile_details) if profile_details else "default settings"
    
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"I'll create a new role profile with {details_text}. Does this look right?",
            proposed_action={
                "type": "create_profile",
                "params": params,
                "requires_confirmation": True
            }
        )
    )

async def handle_find_employees(criteria: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle find employees intent."""
    role_profile_name = criteria.get("role_profile_name")
    
    if not role_profile_name:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="Please specify which role profile you want to search for employees in.\n\nExample: \"show employees in the developer role profile\""
            )
        )
    
    # Prepare headers with auth token
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    # First, find the role profile by name
    async with httpx.AsyncClient() as client:
        try:
            print(f"Searching for role profile: {role_profile_name}")
            print(f"Using auth token: {auth_token[:20] if auth_token else None}...")
            
            search_response = await client.get(
                f"{LARAVEL_API_URL}/role-profiles/search",
                params={"q": role_profile_name},
                headers=headers,
                timeout=30.0
            )
            
            print(f"Search response status: {search_response.status_code}")
            print(f"Search response body: {search_response.text[:200]}")
            
            if search_response.status_code != 200:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Error searching for role profile: {search_response.status_code}"
                    )
                )
            
            profiles = search_response.json()
            if not profiles or len(profiles) == 0:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"No role profile found matching '{role_profile_name}'. Please check the name and try again."
                    )
                )
            
            # Use the first matching profile
            profile = profiles[0]
            profile_id = profile.get("id")
            profile_name = profile.get("name")
            
            # Get employees for this profile
            employees_response = await client.get(
                f"{LARAVEL_API_URL}/role-profiles/{profile_id}/employees",
                headers=headers,
                timeout=30.0
            )
            
            if employees_response.status_code != 200:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Error fetching employees: {employees_response.status_code}"
                    )
                )
            
            employees = employees_response.json()
            employee_count = len(employees)
            
            if employee_count == 0:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"No employees are currently assigned to the '{profile_name}' role profile."
                    )
                )
            
            employee_names = [f"{emp['nom']} {emp['prenom']} ({emp['matricule']})" for emp in employees[:5]]
            more_text = f" and {employee_count - 5} more" if employee_count > 5 else ""
            
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"Found {employee_count} employees in the '{profile_name}' role profile:\n{', '.join(employee_names)}{more_text}",
                    proposed_action={
                        "type": "employee_list",
                        "employees": employees,
                        "count": employee_count,
                        "profile_id": profile_id,
                        "profile_name": profile_name
                    }
                )
            )
            
        except httpx.ConnectError as e:
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"Cannot connect to Laravel backend at {LARAVEL_API_URL}. Connection error: {str(e)}"
                )
            )
        except Exception as e:
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"I encountered an error: {type(e).__name__}: {str(e)}"
                )
            )

def handle_bulk_assign(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle bulk assignment intent."""
    employee_ids = params.get("employee_ids", [])
    role_profile_name = params.get("role_profile_name")
    count = len(employee_ids)
    
    if not employee_ids:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="No employees found for bulk assignment. Please search for employees first.",
            )
        )
    
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"I found {count} employees. I can assign them to the '{role_profile_name}' role profile.",
            proposed_action={
                "type": "bulk_assign_confirm",
                "employee_ids": employee_ids,
                "count": count,
                "role_profile_name": role_profile_name,
                "effective_from": datetime.now().strftime("%Y-%m-%d"),
                "requires_confirmation": True
            }
        )
    )

async def handle_assign_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle assign profile intent."""
    employee_identifier = params.get("employee_id") or params.get("employee_name")
    role_profile_name = params.get("role_profile_name")
    effective_from = params.get("effective_from", datetime.now().strftime("%Y-%m-%d"))
    
    if not employee_identifier:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="Please specify which employee you want to assign.\n\nExample: \"assign John to the developer role profile\""
            )
        )
    
    if not role_profile_name:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="Please specify which role profile to assign.\n\nExample: \"assign John to the developer role profile\""
            )
        )
    
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"Ready to assign employee '{employee_identifier}' to the '{role_profile_name}' role profile, effective from {effective_from}.",
            proposed_action={
                "type": "assign_profile",
                "employee_identifier": employee_identifier,
                "role_profile_name": role_profile_name,
                "effective_from": effective_from,
                "requires_confirmation": True
            }
        )
    )

async def handle_reassign_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle reassign profile intent."""
    employee_identifier = params.get("employee_id") or params.get("employee_name")
    role_profile_name = params.get("role_profile_name")
    
    if not employee_identifier or not role_profile_name:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="To reassign an employee, please provide:\n1. The employee name or ID\n2. The target role profile\n\nExample: \"reassign John from developer to senior developer\""
            )
        )
    
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"Ready to reassign employee '{employee_identifier}' to the '{role_profile_name}' role profile.",
            proposed_action={
                "type": "reassign_profile",
                "employee_identifier": employee_identifier,
                "role_profile_name": role_profile_name,
                "effective_from": datetime.now().strftime("%Y-%m-%d"),
                "requires_confirmation": True
            }
        )
    )

def handle_confirm_action(session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle confirm action."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="Action confirmed. Please use the Confirm button in the interface to execute the action.",
            proposed_action={
                "type": "confirmed"
            }
        )
    )

def handle_reject_action(session_id: Optional[str]) -> ChatResponse:
    """Handle reject action."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="Action cancelled. How else can I help you with role profile management?"
        )
    )

def handle_general_query(session_id: Optional[str]) -> ChatResponse:
    """Handle general query."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="I can help you with role profile management. Here are some things you can ask:\n\n"
            + "- \"Create a role profile for full-time employees with 40 hours\"\n"
            + "- \"Create a developer role with hourly salary and overtime\"\n"
            + "- \"Assign John to the manager role profile\"\n"
            + "- \"Reassign Ahmed from developer to senior developer\"\n"
            + "- \"Show all employees with the manager role profile\"\n"
            + "- \"List employees in the developer profile\""
        )
    )
