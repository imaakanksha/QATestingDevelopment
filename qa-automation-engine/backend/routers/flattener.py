"""JSON flattening endpoint."""

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
    preserve_arrays: bool = Form(False),
):
    """Flatten a nested JSON structure into a single-level key-value format."""
    if not file and not raw_json:
        raise HTTPException(status_code=400, detail="Provide either a JSON file upload or raw JSON text")

    try:
        if file and file.filename:
            content = await file.read()
            if not content.strip():
                raise HTTPException(status_code=400, detail="Uploaded file is empty")
            data = json.loads(content)
        else:
            data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e.msg}")
    except HTTPException:
        raise

    try:
        return flatten_dict(data, separator, max_depth, preserve_arrays)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flatten failed: {str(e)}")
