# CV Skills Extraction Agent — Full Specification

## 1. Purpose

A single-responsibility AI agent that reads the raw text of a candidate's CV/resume and returns a structured, normalized JSON object describing the candidate's technical skills, soft skills, spoken languages, and certifications.

The agent does **one job only**: extraction. It does not decide what gets saved to the user's profile — that decision belongs to the human user, via the confirmation step in the app. The agent's output is always treated as a *proposal*, never as final data.

## 2. Where It Lives

- Runs inside the **FastAPI AI service**, called internally by Laravel (never called directly by the frontend).
- Stateless: each call is independent, no memory of previous CVs or users. All context needed is passed in the request.

## 3. Inputs

| Input | Type | Required | Notes |
|---|---|---|---|
| CV text | string | Yes | Plain text, already extracted from PDF/DOCX upstream (via `pdfplumber` / `python-docx`) |
| user_id | string | Optional | For logging/traceability only, not used in the prompt itself |
| existing_skills_taxonomy | list[string] | Optional | If you maintain a master skills list, pass it so the agent can prefer canonical names |

The agent should never receive raw file bytes — text extraction happens before the agent is invoked, keeping the agent's responsibility narrow and easy to test.

## 4. Output Contract

The agent must return **only** valid JSON matching this schema — no prose, no markdown fences, no explanation.

```json
{
  "technical_skills": [
    {
      "name": "React",
      "category": "framework",
      "confidence": "high"
    }
  ],
  "soft_skills": [
    { "name": "Team Leadership", "confidence": "medium" }
  ],
  "languages_spoken": [
    { "language": "English", "proficiency": "fluent" }
  ],
  "certifications": [
    { "name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services" }
  ]
}
```

**Category enum** (technical_skills only): `programming_language`, `framework`, `tool`, `database`, `cloud_platform`, `other`

**Confidence enum**: `high`, `medium`, `low`

This contract is enforced twice:
1. In the prompt (agent is told the exact schema).
2. In code, via a **Pydantic model** in FastAPI that validates the response before it's returned to Laravel. If validation fails, the request is retried once with a stricter reminder, then fails cleanly (see Section 8).

## 5. Agent Behavior Rules

The agent must follow these rules, in priority order:

1. **Never invent skills.** Only extract what is explicitly stated or clearly and reasonably implied by described experience/projects.
2. **Normalize names.** Convert to the most globally recognized form (e.g., "JS" → "JavaScript", "Postgres" → "PostgreSQL", "ReactJS" → "React").
3. **Deduplicate.** A skill mentioned in both the "Skills" section and a job description should appear once, with the *highest* confidence level found across mentions.
4. **Rate confidence honestly:**
   - `high` — appears in a dedicated skills/tools section
   - `medium` — inferred from a project or job description
   - `low` — ambiguous, indirect, or only tangentially implied
5. **Language-agnostic extraction.** If the CV is in French, Arabic, Spanish, etc., extract accurately but return skill names in their standard international form.
6. **No false completeness.** If a category has nothing confidently identifiable, return an empty array for it — do not pad with guesses.
7. **No commentary.** Output must be pure JSON — any explanatory text breaks the parsing contract downstream.

## 6. System Prompt (production-ready)

```
You are a CV/Resume Skills Extraction Agent. Your only task is to read CV 
text and return structured JSON describing the candidate's skills. You do 
not summarize, evaluate, rank candidates, or give opinions.

OUTPUT: Return ONLY valid JSON matching this exact schema. No preamble, no 
markdown code fences, no explanation before or after.

{
  "technical_skills": [
    { "name": string, "category": "programming_language" | "framework" | 
      "tool" | "database" | "cloud_platform" | "other", 
      "confidence": "high" | "medium" | "low" }
  ],
  "soft_skills": [
    { "name": string, "confidence": "high" | "medium" | "low" }
  ],
  "languages_spoken": [
    { "language": string, "proficiency": string | null }
  ],
  "certifications": [
    { "name": string, "issuer": string | null }
  ]
}

RULES:
1. Only extract skills explicitly stated or clearly implied by described 
   experience or projects. Never invent or assume skills not supported by 
   the text.
2. Normalize skill names to their most common, globally recognized form 
   (e.g. "JS" -> "JavaScript", "ReactJS" -> "React", "Postgres" -> 
   "PostgreSQL").
3. Deduplicate skills. If a skill appears in multiple places (skills 
   section, project description, job history), list it once using the 
   highest confidence level found.
4. Confidence levels:
   - "high": listed in a dedicated skills/tools/tech-stack section
   - "medium": inferred from project or job descriptions
   - "low": ambiguous or weakly implied mention
5. If the CV is not in English, extract accurately regardless of language 
   and return skill/language names in their standard international form.
6. If no items can be confidently identified for a category, return an 
   empty array for it. Do not guess or pad results.
7. Do not include any text outside the JSON object — no notes, no 
   apologies, no markdown formatting.
```

## 7. Example Call & Response

**Request to Claude (from FastAPI):**
```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2000,
    system=CV_EXTRACTION_PROMPT,
    messages=[{"role": "user", "content": cv_text}]
)
```

**Expected response body:**
```json
{
  "technical_skills": [
    { "name": "Python", "category": "programming_language", "confidence": "high" },
    { "name": "Docker", "category": "tool", "confidence": "medium" },
    { "name": "PostgreSQL", "category": "database", "confidence": "high" }
  ],
  "soft_skills": [
    { "name": "Project Management", "confidence": "medium" }
  ],
  "languages_spoken": [
    { "language": "English", "proficiency": "fluent" },
    { "language": "French", "proficiency": "intermediate" }
  ],
  "certifications": [
    { "name": "PMP", "issuer": "PMI" }
  ]
}
```

## 8. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Claude returns malformed JSON | Pydantic validation fails → retry once with an appended reminder ("Return ONLY valid JSON, no other text") → if it fails again, return HTTP 422 to Laravel with a clear error code |
| CV text is empty/unreadable (e.g. scanned image with no OCR) | FastAPI checks text length before calling Claude; if under a minimum threshold (~50 characters), skip the AI call and return a `low_quality_input` error so Laravel can prompt the user to re-upload |
| CV in an unsupported language the model struggles with | Agent still attempts extraction per Rule 5; no special handling needed, Claude handles multilingual text natively |
| Very long CV (multi-page, dense) | Truncate to a safe token budget before sending (~6000-8000 words is plenty for skills extraction; nothing useful is usually buried past that) |
| Skill appears with wrong/inconsistent naming vs. your master skills table | Handled *after* the agent, in Laravel, via fuzzy matching — not the agent's responsibility |
| Timeout/AI service unavailable | Laravel job has retry + backoff (3 tries, exponential backoff); after final failure, `CvUpload.status = 'failed'` and user is notified to retry manually |

## 9. What This Agent Is Not Responsible For

To keep the boundary clean:
- ❌ Deciding which skills get saved to the profile (that's the user, via confirmation UI)
- ❌ Matching extracted names against your master skills taxonomy (that's a Laravel-side fuzzy-match step)
- ❌ Storing or remembering anything between calls (fully stateless)
- ❌ Evaluating candidate quality, seniority, or fit (out of scope entirely, and should never be added — this agent extracts facts, it doesn't judge people)

## 10. Testing Checklist

Before shipping, validate the agent against:
- [ ] A CV with a clear, dedicated "Skills" section
- [ ] A CV with no skills section, skills only inferable from job descriptions
- [ ] A CV in a non-English language
- [ ] A CV with heavy formatting noise (tables, columns) from PDF conversion
- [ ] An empty or near-empty CV (should return empty arrays, not errors)
- [ ] A CV listing outdated/obscure tech (e.g. "AngularJS 1.x" vs "Angular") to check normalization
- [ ] A very long, multi-page CV (token budget handling)