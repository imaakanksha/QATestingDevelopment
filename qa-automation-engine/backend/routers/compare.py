from fastapi import APIRouter, UploadFile, File, HTTPException
import json
from models.schemas import DiffResponse
from services.json_diff import compute_json_diff

router = APIRouter()

@router.post("/compare-json", response_model=DiffResponse)
async def compare_json(baseline: UploadFile = File(...), target: UploadFile = File(...)):
    if not baseline.filename.endswith('.json') or not target.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Both files must be valid JSON files")
        
    try:
        baseline_content = await baseline.read()
        target_content = await target.read()
        
        baseline_dict = json.loads(baseline_content)
        target_dict = json.loads(target_content)
        
        return compute_json_diff(baseline_dict, target_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format in one of the files")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
