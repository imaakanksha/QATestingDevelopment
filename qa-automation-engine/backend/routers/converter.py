"""XLSX conversion and comparison endpoints."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import json
from typing import Optional

from services.xlsx_parser import parse_xlsx_to_json, get_sheet_names
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
    """Convert an XLSX file to JSON."""
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
