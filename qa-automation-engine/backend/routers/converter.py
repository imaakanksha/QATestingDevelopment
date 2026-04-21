"""XLSX conversion and comparison endpoints."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import json
from typing import Optional

from services.xlsx_parser import parse_xlsx_to_json, get_sheet_names
from services.wireframe_parser import parse_wireframe_to_json, get_wireframe_preview
from services.wireframe_comparator import normalize_wireframe, normalize_o9_json, compare_reports
from services.json_diff import compute_json_diff
from models.schemas import DiffResponse

router = APIRouter()


@router.post("/xlsx-to-json")
async def convert_xlsx(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    header_row: int = Form(1),
    treat_first_column_as_key: bool = Form(False),
    normalize_keys: bool = Form(False),
):
    """Convert an XLSX file to JSON (flat-table mode)."""
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        return parse_xlsx_to_json(content, sheet_name, header_row, treat_first_column_as_key, normalize_keys)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@router.post("/wireframe-to-json")
async def convert_wireframe(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    normalize_keys: bool = Form(True),
):
    """Convert an O9-style wireframe XLSX to structured JSON.

    Automatically detects section banners (coloured rows with merged cells)
    and parses each section independently with its own column headers.
    Falls back to flat-table parsing if no sections are detected.
    """
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        return parse_wireframe_to_json(content, sheet_name, normalize_keys)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Wireframe conversion failed: {str(e)}")


@router.post("/wireframe-preview")
async def preview_wireframe(file: UploadFile = File(...)):
    """Quick preview: detect sections in a wireframe without full parsing."""
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file")

    try:
        content = await file.read()
        return get_wireframe_preview(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.post("/xlsx-sheet-names")
async def get_sheets(file: UploadFile = File(...)):
    """Return the list of sheet names in an uploaded Excel file."""
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file")

    try:
        content = await file.read()
        return {"sheets": get_sheet_names(content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read sheets: {str(e)}")


@router.post("/xlsx-compare", response_model=DiffResponse)
async def compare_xlsx(
    xlsx_file: UploadFile = File(...),
    reference_file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    header_row: int = Form(1),
    treat_first_column_as_key: bool = Form(False),
    normalize_keys: bool = Form(False),
):
    """Convert an XLSX file to JSON and compare against a reference JSON."""
    if not xlsx_file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="First file must be an Excel file")
    if not reference_file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Reference file must be a JSON file")

    try:
        xlsx_content = await xlsx_file.read()
        converted = parse_xlsx_to_json(
            xlsx_content, sheet_name, header_row,
            treat_first_column_as_key, normalize_keys,
        )

        ref_content = await reference_file.read()
        baseline_dict = json.loads(ref_content)

        return compute_json_diff(baseline_dict, converted)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in reference file: {e.msg}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.post("/wireframe-compare")
async def compare_wireframe_to_report(
    wireframe_file: UploadFile = File(...),
    report_file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
):
    """Compare a wireframe XLSX against an O9 report JSON.

    Performs a bidirectional, field-level comparison across three sections:
    Filters, Dimensions, and Measures. Flags mismatches, missing items
    on either side, and matching fields.
    """
    if not wireframe_file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Wireframe file must be an Excel file (.xlsx)")
    if not report_file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Report file must be a JSON file (.json)")

    try:
        xlsx_bytes = await wireframe_file.read()
        if not xlsx_bytes:
            raise HTTPException(status_code=400, detail="Wireframe file is empty")

        json_bytes = await report_file.read()
        if not json_bytes:
            raise HTTPException(status_code=400, detail="Report file is empty")

        o9_data = json.loads(json_bytes)

        wf_normalized = normalize_wireframe(xlsx_bytes, sheet_name)
        rp_normalized = normalize_o9_json(o9_data)
        result = compare_reports(wf_normalized, rp_normalized)

        return {
            "summary": result.summary,
            "rows": result.rows,
            "counts": {
                "wireframe": {
                    "filters": result.wireframe_filters,
                    "dimensions": result.wireframe_dimensions,
                    "measures": result.wireframe_measures,
                },
                "report": {
                    "filters": result.report_filters,
                    "dimensions": result.report_dimensions,
                    "measures": result.report_measures,
                },
            },
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in report file: {e.msg}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
