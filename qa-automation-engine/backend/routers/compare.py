"""JSON comparison endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException
import json

from models.schemas import DiffResponse
from services.json_diff import compute_json_diff

router = APIRouter()


@router.post("/compare-json", response_model=DiffResponse)
async def compare_json(
    baseline: UploadFile = File(...),
    target: UploadFile = File(...),
):
    """Compare two JSON files and return a structured diff report."""
    # Validate file extensions
    if not baseline.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail=f"Baseline file '{baseline.filename}' is not a .json file")
    if not target.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail=f"Target file '{target.filename}' is not a .json file")

    try:
        baseline_content = await baseline.read()
        target_content = await target.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded files")

    if not baseline_content.strip():
        raise HTTPException(status_code=400, detail="Baseline file is empty")
    if not target_content.strip():
        raise HTTPException(status_code=400, detail="Target file is empty")

    try:
        baseline_dict = json.loads(baseline_content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in baseline file: {e.msg}")

    try:
        target_dict = json.loads(target_content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in target file: {e.msg}")

    try:
        return compute_json_diff(baseline_dict, target_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
