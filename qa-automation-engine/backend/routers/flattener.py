from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import json
from typing import Optional
from services.json_flatten import flatten_dict
from models.schemas import FlattenResponse

router = APIRouter()

@router.post("/flatten-json", response_model=FlattenResponse)
async def flatten_json_endpoint(
    file: Optional[UploadFile] = File(None),
    raw_json: Optional[str] = Form(None),
    separator: str = Form("."),
    max_depth: Optional[int] = Form(None),
    preserve_arrays: bool = Form(False)
):
    if not file and not raw_json:
        raise HTTPException(status_code=400, detail="Must provide either a file or raw_json string")
        
    try:
        if file:
            content = await file.read()
            data = json.loads(content)
        else:
            data = json.loads(raw_json)
            
        return flatten_dict(data, separator, max_depth, preserve_arrays)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON provided")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
