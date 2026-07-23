from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime

router = APIRouter()

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

class FiscalProfileGroup(BaseModel):
    gender: str
    marital_status: str
    children_count: int
    disabled_children_count: int = 0
    student_non_scholarship_children_count: int = 0

class EmployeeMatchCriteria(BaseModel):
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    children_count: Optional[int] = None
    disabled_children_count: Optional[int] = None
    student_children_count: Optional[int] = None
    exclude_group_id: Optional[str] = None

class BulkAssignment(BaseModel):
    group_id: str
    employee_ids: List[int]
    effective_from: str

# Laravel backend API URL (from environment or default)
# Laravel Herd is serving the backend on http://backend.test
LARAVEL_API_URL = "http://backend.test/api/payroll"

@router.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """
    Process chat messages for fiscal profile management.
    This service can execute actions when provided with an auth token.
    """
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
    
    # Intent: Create fiscal profile group
    if "create" in message_lower and ("group" in message_lower or "profile" in message_lower):
        return {
            "intent": "create_group",
            "params": extract_group_params(message)
        }
    
    # Intent: Find employees
    if "find" in message_lower or "search" in message_lower or "employees" in message_lower:
        return {
            "intent": "find_employees",
            "params": extract_employee_criteria(message)
        }
    
    # Intent: Assign fiscal profile to employee
    if "assign" in message_lower and ("profile" in message_lower or "fiscal" in message_lower):
        return {
            "intent": "assign_profile",
            "params": extract_assignment_params(message)
        }
    
    # Intent: Reassign employee to different fiscal profile
    if "reassign" in message_lower or "move" in message_lower:
        return {
            "intent": "reassign_profile",
            "params": extract_assignment_params(message)
        }
    
    # Intent: Edit fiscal profile
    if "edit" in message_lower or "update" in message_lower or "modify" in message_lower:
        return {
            "intent": "edit_profile",
            "params": extract_group_params(message)
        }
    
    # Intent: Delete fiscal profile
    if "delete" in message_lower and ("profile" in message_lower or "group" in message_lower):
        return {
            "intent": "delete_profile",
            "params": extract_group_params(message)
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

def extract_group_params(message: str) -> Dict[str, Any]:
    """Extract parameters for fiscal profile group operations."""
    params = {}
    message_lower = message.lower()
    
    # Check if this is a delete/edit operation (need label) or create operation (need attributes)
    if "delete" in message_lower or "edit" in message_lower or "update" in message_lower or "modify" in message_lower:
        # Extract label/name for delete/edit operations
        import re
        # Try to find quoted text first
        quoted_match = re.search(r'"([^"]+)"', message)
        if quoted_match:
            params["label"] = quoted_match.group(1)
        else:
            # Try to extract from patterns like "delete [name]" or "edit [name]"
            # Stop at common stop words like "profile", "group", "fiscal"
            name_pattern = r'(?:delete|edit|update|modify)\s+(?:fiscal\s+profile\s+)?(?:group\s+)?["\']?([^"\']+?)["\']?(?:\s+(?:profile|group|fiscal|effective|from|with|to|with\s+\d+\s+children)?)?$'
            match = re.search(name_pattern, message_lower)
            if match:
                label = match.group(1).strip()
                # Clean up common trailing words
                label = re.sub(r'\s+(profile|group|fiscal)\s*$', '', label, flags=re.IGNORECASE)
                params["label"] = label
    else:
        # Extract attributes for create operations
        print(f"DEBUG: Extraction for create operation, message: {message_lower}")
        if "female" in message_lower:
            params["gender"] = "female"
            print(f"DEBUG: Extracted gender=female")
        elif "male" in message_lower:
            params["gender"] = "male"
            print(f"DEBUG: Extracted gender=male")
        else:
            params["gender"] = "male"  # default
            print(f"DEBUG: Using default gender=male")
        
        if "married" in message_lower:
            params["marital_status"] = "married"
        elif "single" in message_lower:
            params["marital_status"] = "single"
        elif "divorced" in message_lower:
            params["marital_status"] = "divorced"
        elif "widowed" in message_lower:
            params["marital_status"] = "widowed"
        else:
            params["marital_status"] = "single"  # default
        
        # Extract children count
        import re
        children_match = re.search(r'(\d+)\s*children?', message_lower)
        if children_match:
            params["children_count"] = int(children_match.group(1))
        else:
            params["children_count"] = 0
    
    print(f"DEBUG: Extracted group params: {params}")
    return params

def extract_employee_criteria(message: str) -> Dict[str, Any]:
    """Extract criteria for finding employees."""
    criteria = {}
    message_lower = message.lower()
    
    print(f"DEBUG: Extracting criteria from message: {message}")
    
    # Check for female first to avoid "female" matching "male" substring
    if "female" in message_lower:
        criteria["gender"] = "female"
        print(f"DEBUG: Found gender=female")
    elif "male" in message_lower:
        criteria["gender"] = "male"
        print(f"DEBUG: Found gender=male")
    
    if "married" in message_lower:
        criteria["marital_status"] = "married"
    elif "single" in message_lower:
        criteria["marital_status"] = "single"
    elif "divorced" in message_lower:
        criteria["marital_status"] = "divorced"
    elif "widowed" in message_lower:
        criteria["marital_status"] = "widowed"
    
    import re
    children_match = re.search(r'(\d+)\s*children?', message_lower)
    if children_match:
        criteria["children_count"] = int(children_match.group(1))
    
    if "without" in message_lower and "children" in message_lower:
        criteria["children_count"] = 0
    
    print(f"DEBUG: Extracted criteria: {criteria}")
    return criteria

def extract_assignment_params(message: str) -> Dict[str, Any]:
    """Extract parameters for assignment operations."""
    params = {}
    message_lower = message.lower()
    
    # Extract employee identifier (name or matricule)
    import re
    # Try to find matricule pattern (EMP00000)
    matricule_match = re.search(r'EMP\d{5}', message, re.IGNORECASE)
    if matricule_match:
        params["employee_id"] = matricule_match.group(0)
    else:
        # Try to extract employee name from patterns like "to employee John Doe"
        name_pattern = r'(?:to|for)\s+(?:employee\s+)?["\']?([A-Za-z\s]+?)["\']?(?:\s+(?:effective|from|with|to|profile|fiscal|group)?)?$'
        name_match = re.search(name_pattern, message_lower)
        if name_match:
            employee_name = name_match.group(1).strip()
            # Clean up common trailing words
            employee_name = re.sub(r'\s+(effective|from|with|to|profile|fiscal|group)\s*$', '', employee_name, flags=re.IGNORECASE)
            params["employee_name"] = employee_name
    
    # Extract fiscal profile label or attributes
    # Try to find quoted label first
    quoted_match = re.search(r'"([^"]+)"', message)
    if quoted_match:
        params["group_label"] = quoted_match.group(1)
    else:
        # Try to extract from pattern like "profile Single Female"
        profile_pattern = r'(?:profile|fiscal\s+profile\s+|group\s+)?["\']?([A-Za-z\s]+?)["\']?(?:\s+(?:to|for|employee|effective|from)?)?$'
        profile_match = re.search(profile_pattern, message_lower)
        if profile_match:
            group_label = profile_match.group(1).strip()
            # Clean up common trailing words
            group_label = re.sub(r'\s+(to|for|employee|effective|from)\s*$', '', group_label, flags=re.IGNORECASE)
            params["group_label"] = group_label
    
    # Extract fiscal profile attributes (gender, marital_status, children_count)
    if "female" in message_lower:
        params["gender"] = "female"
    elif "male" in message_lower:
        params["gender"] = "male"
    
    if "married" in message_lower:
        params["marital_status"] = "married"
    elif "single" in message_lower:
        params["marital_status"] = "single"
    elif "divorced" in message_lower:
        params["marital_status"] = "divorced"
    elif "widowed" in message_lower:
        params["marital_status"] = "widowed"
    
    # Extract children count
    children_match = re.search(r'(\d+)\s+children?', message_lower)
    if children_match:
        params["children_count"] = int(children_match.group(1))
    
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
    
    if intent_type == "create_group":
        return await handle_create_group(params, session_id, auth_token)
    elif intent_type == "find_employees":
        return await handle_find_employees(params, session_id)
    elif intent_type == "bulk_assign":
        return handle_bulk_assign(params, session_id)
    elif intent_type == "assign_profile":
        return await handle_assign_profile(params, session_id, auth_token)
    elif intent_type == "reassign_profile":
        return await handle_reassign_profile(params, session_id, auth_token)
    elif intent_type == "edit_profile":
        return await handle_edit_profile(params, session_id, auth_token)
    elif intent_type == "delete_profile":
        return await handle_delete_profile(params, session_id, auth_token)
    elif intent_type == "confirm":
        return handle_confirm_action(session_id, auth_token)
    elif intent_type == "reject":
        return handle_reject_action(session_id)
    else:
        return handle_general_query(session_id)

async def handle_create_group(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle create group intent."""
    # Check if group already exists
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{LARAVEL_API_URL}/fiscal-profile/groups/match",
                params=params
            )
            if response.status_code == 200:
                match_result = response.json()
                if match_result.get("exists"):
                    return ChatResponse(
                        session_id=session_id or "new",
                        ai_message=ChatMessage(
                            role="ai",
                            content=f"A fiscal profile group with these attributes already exists: {match_result['label']}. Would you like to view the employees in this group?",
                            proposed_action={
                                "type": "view_group",
                                "group_id": match_result["group_id"],
                                "label": match_result["label"]
                            }
                        )
                    )
        except Exception as e:
            pass
    
    # Propose creating new group
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"I can create a new fiscal profile group with these attributes:\n- Gender: {params['gender']}\n- Marital Status: {params['marital_status']}\n- Children: {params['children_count']}\n\nWould you like me to proceed?",
            proposed_action={
                "type": "create_group",
                "params": params
            }
        )
    )

async def handle_find_employees(criteria: Dict[str, Any], session_id: Optional[str]) -> ChatResponse:
    """Handle find employees intent."""
    url = f"{LARAVEL_API_URL}/fiscal-profile/employees/fiscal-search"
    print(f"Calling Laravel API: {url} with params: {criteria}")
    
    async with httpx.AsyncClient() as client:
        try:
            # Increased timeout to 30 seconds for diagnostic testing
            response = await client.get(url, params=criteria, timeout=30.0)
            print(f"Laravel API response status: {response.status_code}")
            print(f"Laravel API response body: {response.text}")
            
            if response.status_code == 200:
                employees = response.json()
                employee_count = len(employees)
                
                if employee_count == 0:
                    return ChatResponse(
                        session_id=session_id or "new",
                        ai_message=ChatMessage(
                            role="ai",
                            content="No employees match the specified criteria. Would you like to adjust the search criteria?"
                        )
                    )
                
                employee_names = [f"{emp['nom']} {emp['prenom']} ({emp['matricule']})" for emp in employees[:5]]
                more_text = f" and {employee_count - 5} more" if employee_count > 5 else ""
                
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Found {employee_count} employees matching your criteria.",
                        proposed_action={
                            "type": "bulk_assign_preview",
                            "employee_ids": [emp["id"] for emp in employees],
                            "employees": [
                                {
                                    "id": emp["id"],
                                    "nom": emp["nom"],
                                    "prenom": emp["prenom"],
                                    "matricule": emp["matricule"]
                                } for emp in employees
                            ],
                            "count": employee_count,
                            "criteria": criteria,
                            "group_label": _format_group_label(criteria),
                            "group_params": criteria,
                            "effective_from": datetime.now().strftime("%Y-%m-%d")
                        }
                    )
                )
            else:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Error searching for employees: {response.status_code} - {response.text}"
                    )
                )
        except httpx.ConnectError as e:
            print(f"Connection error: {str(e)}")
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"Cannot connect to Laravel backend at {LARAVEL_API_URL}. Connection error: {str(e)}"
                )
            )
        except httpx.TimeoutException as e:
            print(f"Timeout error: {str(e)}")
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"Connection to Laravel backend timed out. This may be due to php artisan serve handling requests sequentially on Windows. Timeout error: {str(e)}"
                )
            )
        except Exception as e:
            print(f"Exception in handle_find_employees: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return ChatResponse(
                session_id=session_id or "new",
                ai_message=ChatMessage(
                    role="ai",
                    content=f"I encountered an error while searching for employees: {type(e).__name__}: {str(e)}"
                )
            )

def handle_bulk_assign(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle bulk assignment intent."""
    employee_ids = params.get("employee_ids", [])
    criteria = params.get("criteria", {})
    count = len(employee_ids)
    
    if not employee_ids:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="No employees found for bulk assignment. Please search for employees first.",
            )
        )
    
    # Extract group label from criteria
    gender = criteria.get("gender", "")
    marital_status = criteria.get("marital_status", "")
    children_count = criteria.get("children_count", 0)
    
    # Format group label
    group_label = f"{marital_status.capitalize() if marital_status else ''} {gender.capitalize() if gender else ''}".strip()
    if children_count > 0:
        group_label += f" · {children_count} child(ren)"
    
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"I found {count} employees matching your criteria. I can assign them to the '{group_label}' fiscal profile group.",
            proposed_action={
                "type": "bulk_assign_confirm",
                "employee_ids": employee_ids,
                "count": count,
                "criteria": criteria,
                "group_label": group_label,
                "group_params": {
                    "gender": gender,
                    "marital_status": marital_status,
                    "children_count": children_count
                },
                "effective_from": datetime.now().strftime("%Y-%m-%d"),
                "requires_confirmation": True
            }
        )
    )

async def handle_assign_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle assign profile intent."""
    print(f"DEBUG: handle_assign_profile called with auth_token: {auth_token is not None}")
    
    # Extract employee identifier (name or matricule)
    employee_identifier = params.get("employee_id") or params.get("employee_name")
    print(f"DEBUG: employee_identifier: {employee_identifier}")
    
    # Extract fiscal profile label or attributes
    group_label = params.get("group_label")
    group_params = {
        "gender": params.get("gender"),
        "marital_status": params.get("marital_status"),
        "children_count": params.get("children_count", 0)
    }
    print(f"DEBUG: group_label: {group_label}, group_params: {group_params}")
    
    # Extract effective date (default to today)
    effective_from = params.get("effective_from", datetime.now().strftime("%Y-%m-%d"))
    print(f"DEBUG: effective_from: {effective_from}")
    
    # Return confirmation card with extracted parameters
    # The frontend will handle the actual API call
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content=f"Ready to assign fiscal profile to employee '{employee_identifier}'.",
            proposed_action={
                "type": "assign_profile",
                "employee_id": employee_identifier,  # Will be resolved by frontend
                "employee_name": employee_identifier,
                "employee_matricule": employee_identifier,
                "group_id": "placeholder",  # Will be resolved by frontend
                "group_label": group_label or f"{group_params.get('marital_status').capitalize() if group_params.get('marital_status') else ''} {group_params.get('gender').capitalize() if group_params.get('gender') else ''}".strip(),
                "effective_from": effective_from,
                "requires_confirmation": True
            }
        )
    )

async def handle_reassign_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle reassign profile intent."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="To reassign an employee to a different fiscal profile, please provide:\n1. The employee ID or name\n2. The new fiscal profile group ID\n3. The effective date (default: today)\n\nExample: \"Reassign employee John Doe to fiscal profile group ABC effective from 2024-01-01\"",
            proposed_action={
                "type": "request_reassign_details",
                "required_fields": ["employee_id", "new_group_id", "effective_from"]
            }
        )
    )

async def handle_edit_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle edit fiscal profile intent."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="To edit a fiscal profile group, please provide:\n1. The fiscal profile group ID\n2. The fields to update (gender, marital_status, children_count, label)\n\nExample: \"Update fiscal profile group XYZ to have 3 children\"",
            proposed_action={
                "type": "request_edit_details",
                "required_fields": ["group_id"],
                "optional_fields": ["gender", "marital_status", "children_count", "label"]
            }
        )
    )

async def handle_delete_profile(params: Dict[str, Any], session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle delete fiscal profile intent."""
    label = params.get("label")
    
    if not label:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="To delete a fiscal profile group, please provide the name/label of the profile.\n\nExample: \"delete fiscal profile Single Male\" or \"delete 'Single Male · Head of Family'\"",
                proposed_action={
                    "type": "request_delete_details",
                    "required_fields": ["label"]
                }
            )
        )
    
    try:
        # Search for the fiscal profile by label
        search_url = f"{LARAVEL_API_URL}/fiscal-profile/groups/search"
        async with httpx.AsyncClient(timeout=30.0) as client:
            search_response = await client.get(search_url, params={"label": label})
            
            if search_response.status_code == 200:
                search_data = search_response.json()
                
                if search_data["count"] == 0:
                    return ChatResponse(
                        session_id=session_id or "new",
                        ai_message=ChatMessage(
                            role="ai",
                            content=f"No fiscal profile found with name containing '{label}'. Please check the name and try again."
                        )
                    )
                
                if search_data["count"] > 1:
                    groups = search_data["groups"]
                    group_names = "\n".join([f"- {g['label']} (ID: {g['id']})" for g in groups])
                    return ChatResponse(
                        session_id=session_id or "new",
                        ai_message=ChatMessage(
                            role="ai",
                            content=f"Multiple fiscal profiles found matching '{label}':\n{group_names}\n\nPlease be more specific with the name or provide the exact ID.",
                            proposed_action={
                                "type": "multiple_matches",
                                "matches": groups
                            }
                        )
                    )
                
                # Found exactly one match
                group = search_data["groups"][0]
                group_id = group["id"]
                group_label = group["label"]
                
                # Check if group has active assignments (only if auth token is provided)
                if auth_token:
                    employees_url = f"{LARAVEL_API_URL}/fiscal-profile/groups/{group_id}/employees"
                    headers = {"Authorization": f"Bearer {auth_token}"}
                    try:
                        employees_response = await client.get(employees_url, headers=headers)
                        
                        if employees_response.status_code == 200:
                            employees = employees_response.json()
                            if len(employees) > 0:
                                return ChatResponse(
                                    session_id=session_id or "new",
                                    ai_message=ChatMessage(
                                        role="ai",
                                        content=f"Cannot delete fiscal profile '{group_label}' because it has {len(employees)} active employee assignments.\n\nPlease reassign these employees to another fiscal profile first."
                                    )
                                )
                    except httpx.HTTPStatusError:
                        # If we can't check for active assignments, proceed with confirmation
                        pass
                
                # Return proposed action for deletion (requires confirmation)
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Found fiscal profile '{group_label}'. Please use the confirmation button in the interface to delete this profile.",
                        proposed_action={
                            "type": "delete_profile",
                            "group_id": group_id,
                            "group_label": group_label,
                            "gender": group.get("gender"),
                            "marital_status": group.get("marital_status"),
                            "children_count": group.get("children_count"),
                            "requires_confirmation": True
                        }
                    )
                )
            else:
                return ChatResponse(
                    session_id=session_id or "new",
                    ai_message=ChatMessage(
                        role="ai",
                        content=f"Error searching for fiscal profile: {search_response.status_code} - {search_response.text}"
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
                content=f"I encountered an error while deleting the fiscal profile: {type(e).__name__}: {str(e)}"
            )
        )

def handle_general_query(session_id: Optional[str]) -> ChatResponse:
    """Handle general queries."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="I can help you with fiscal profile management. Here are some things you can ask:\n\n- \"Create a fiscal profile group for married males with 2 children\"\n- \"Find all single employees without children\"\n- \"Assign fiscal profile X to employees Y and Z\"\n\nWhat would you like to do?"
        )
    )

def handle_confirm_action(session_id: Optional[str], auth_token: Optional[str] = None) -> ChatResponse:
    """Handle confirmation of a proposed action."""
    if not auth_token:
        return ChatResponse(
            session_id=session_id or "new",
            ai_message=ChatMessage(
                role="ai",
                content="Authentication required to execute actions. Please log in and try again."
            )
        )
    
    # In a real implementation, we would retrieve the pending action from session storage
    # For now, return a message indicating the action would be executed
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="Action confirmed. This would execute the pending action with your authentication token.",
            proposed_action={
                "type": "action_confirmed",
                "requires_frontend_execution": True
            }
        )
    )

def handle_reject_action(session_id: Optional[str]) -> ChatResponse:
    """Handle rejection of a proposed action."""
    return ChatResponse(
        session_id=session_id or "new",
        ai_message=ChatMessage(
            role="ai",
            content="Action cancelled. What else would you like to do?"
        )
    )

def _format_group_label(criteria: Dict[str, Any]) -> str:
    """Format a group label from criteria."""
    parts = []
    
    if criteria.get('marital_status'):
        parts.append(criteria['marital_status'].capitalize())
    
    if criteria.get('gender'):
        parts.append(criteria['gender'].capitalize())
    
    label = ' '.join(parts)
    
    # Add children count if present and > 0
    if criteria.get('children_count') and criteria['children_count'] > 0:
        children = criteria['children_count']
        label += f" · {children} child" if children == 1 else f" · {children} children"
    
    return label
