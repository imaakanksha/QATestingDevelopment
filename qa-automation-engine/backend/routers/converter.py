from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import json
from typing import Optional
from services.xlsx_parser import parse_xlsx_to_json
from services.json_diff import compute_json_diff
from models.schemas import DiffResponse

router = APIRouter()

@router.post("/xlsx-to-json")
async def convert_xlsx(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    header_row: int = Form(1),
    treat_first_column_as_key: bool = Form(False),
    normalize_keys: bool = Form(False)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Must be an Excel file")
        
    try:
        content = await file.read()
        json_data = parse_xlsx_to_json(content, sheet_name, header_row, treat_first_column_as_key, normalize_keys)
        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/xlsx-compare", response_model=DiffResponse)
async def compare_xlsx(
    xlsx_file: UploadFile = File(...),
    reference_file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    header_row: int = Form(1),
    treat_first_column_as_key: bool = Form(False),
    normalize_keys: bool = Form(False)
):
    if not xlsx_file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="First file must be an Excel file")
    if not reference_file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Reference file must be a JSON file")
        
    try:
        xlsx_content = await xlsx_file.read()
        target_dict = parse_xlsx_to_json(xlsx_content, sheet_name, header_row, treat_first_column_as_key, normalize_keys)
        
        ref_content = await reference_file.read()
        baseline_dict = json.loads(ref_content)
        
        return compute_json_diff(baseline_dict, target_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in reference file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
