from pydantic import BaseModel
from typing import Any, Dict, List


class DiffSummary(BaseModel):
    total_keys: int
    added: int
    removed: int
    modified: int
    match_score: float


class DiffDetail(BaseModel):
    key_path: str
    baseline_value: Any = None
    target_value: Any = None
    change_type: str  # "added", "removed", "modified"


class DiffResponse(BaseModel):
    summary: DiffSummary
    differences: List[DiffDetail]


class FlattenResponse(BaseModel):
    original_key_count: int
    flattened_key_count: int
    flattened: Dict[str, Any]
