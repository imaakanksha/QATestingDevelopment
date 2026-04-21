"""JSON comparison endpoints."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import json
from typing import Optional, Dict, Any

from models.schemas import DiffResponse
from services.json_diff import compute_json_diff
from services.section_diff import compare_reports
from services.unified_diff import compute_unified_diff
from services.wireframe_parser import parse_wireframe_to_json

router = APIRouter()


class CompareJsonBodyRequest(BaseModel):
    """Request body for JSON comparison via body (not file upload)."""
    baseline: Dict[str, Any]
    target: Dict[str, Any]
    name_a: str = "Report A"
    name_b: str = "Report B"


def _is_o9_structured(data: dict) -> bool:
    """Check if a JSON dict looks like an o9 structured report (has sections)."""
    return (
        isinstance(data, dict)
        and "sections" in data
        and isinstance(data.get("sections"), dict)
    )


@router.post("/compare-json")
async def compare_json(
    baseline: UploadFile = File(...),
    target: UploadFile = File(...),
):
    """Compare two JSON files — auto-detects o9 structured reports.

    If both JSONs have a 'sections' key, uses the unified flat diff engine
    that produces a single table of all differences across all sections.
    Otherwise falls back to the flat DeepDiff comparison.
    """
    if not baseline.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail=f"File '{baseline.filename}' is not a .json file")
    if not target.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail=f"File '{target.filename}' is not a .json file")

    try:
        baseline_content = await baseline.read()
        target_content = await target.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded files")

    if not baseline_content.strip():
        raise HTTPException(status_code=400, detail="First JSON file is empty")
    if not target_content.strip():
        raise HTTPException(status_code=400, detail="Second JSON file is empty")

    try:
        baseline_dict = json.loads(baseline_content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in first file: {e.msg}")

    try:
        target_dict = json.loads(target_content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in second file: {e.msg}")

    try:
        # Auto-detect: if both are o9 structured, use unified flat diff
        if _is_o9_structured(baseline_dict) and _is_o9_structured(target_dict):
            name_a = baseline.filename.replace(".json", "") if baseline.filename else "Report A"
            name_b = target.filename.replace(".json", "") if target.filename else "Report B"
            result = compute_unified_diff(baseline_dict, target_dict, name_a, name_b)
            result["mode"] = "unified"
            return result
        else:
            # Flat diff mode
            flat_result = compute_json_diff(baseline_dict, target_dict)
            return {
                "mode": "flat",
                "summary": flat_result.summary.model_dump(),
                "differences": [d.model_dump() for d in flat_result.differences],
            }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.post("/compare-reports")
async def compare_reports_endpoint(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    sheet_name_a: Optional[str] = Form(None),
    sheet_name_b: Optional[str] = Form(None),
    normalize_keys: bool = Form(True),
):
    """Compare two O9 reports section-by-section.

    Accepts either:
    - Two JSON files (already converted wireframe JSONs)
    - Two XLSX files (wireframes that get auto-converted)
    - One of each (mixed)

    Returns a section-aware comparison with per-section field-level diffs.
    """
    try:
        content_a = await file_a.read()
        content_b = await file_b.read()

        if not content_a:
            raise HTTPException(status_code=400, detail="Report A file is empty")
        if not content_b:
            raise HTTPException(status_code=400, detail="Report B file is empty")

        name_a = file_a.filename or "Report A"
        name_b = file_b.filename or "Report B"

        # Parse Report A
        if file_a.filename.lower().endswith((".xlsx", ".xls")):
            report_a = parse_wireframe_to_json(content_a, sheet_name_a, normalize_keys)
        elif file_a.filename.lower().endswith(".json"):
            report_a = json.loads(content_a)
        else:
            raise HTTPException(status_code=400, detail="Report A must be .xlsx, .xls, or .json")

        # Parse Report B
        if file_b.filename.lower().endswith((".xlsx", ".xls")):
            report_b = parse_wireframe_to_json(content_b, sheet_name_b, normalize_keys)
        elif file_b.filename.lower().endswith(".json"):
            report_b = json.loads(content_b)
        else:
            raise HTTPException(status_code=400, detail="Report B must be .xlsx, .xls, or .json")

        return compare_reports(report_a, report_b, name_a, name_b)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e.msg}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.post("/compare-json-body")
async def compare_json_body(request: CompareJsonBodyRequest):
    """Compare two JSON objects passed directly in the request body.

    Useful for comparing wireframe output against reference JSON
    without requiring file uploads.
    """
    try:
        baseline_dict = request.baseline
        target_dict = request.target

        if _is_o9_structured(baseline_dict) and _is_o9_structured(target_dict):
            result = compute_unified_diff(
                baseline_dict, target_dict,
                request.name_a, request.name_b
            )
            result["mode"] = "unified"
            return result
        else:
            flat_result = compute_json_diff(baseline_dict, target_dict)
            return {
                "mode": "flat",
                "summary": flat_result.summary.model_dump(),
                "differences": [d.model_dump() for d in flat_result.differences],
            }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

