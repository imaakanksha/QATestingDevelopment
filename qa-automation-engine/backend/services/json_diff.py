"""JSON comparison service using DeepDiff."""

from deepdiff import DeepDiff
from models.schemas import DiffSummary, DiffDetail, DiffResponse


def _clean_path(path_str: str) -> str:
    """Convert DeepDiff root paths to readable key paths.
    
    e.g. root['report']['user']['email'] -> report.user.email
    """
    path = path_str
    if path.startswith("root"):
        path = path[4:]
    # Convert bracket notation to dot notation for readability
    path = path.replace("']['", ".").replace("['", "").replace("']", "")
    path = path.replace("][", ".").replace("[", ".").replace("]", "")
    if path.startswith("."):
        path = path[1:]
    return path


def _resolve_value(data: dict, path_str: str):
    """Navigate into the data structure using DeepDiff's path string to get actual value."""
    try:
        # Use eval-style navigation — path looks like root['key1']['key2']
        # We build a chain of key accesses
        path = path_str
        if path.startswith("root"):
            path = path[4:]
        
        result = data
        # Parse bracket-notation segments
        import re
        segments = re.findall(r"\['([^']+)'\]|\[(\d+)\]", path)
        for str_key, int_key in segments:
            if str_key:
                result = result[str_key]
            elif int_key:
                result = result[int(int_key)]
        return result
    except (KeyError, IndexError, TypeError):
        return None


def _count_keys(d) -> int:
    """Recursively count all keys/elements in a nested structure."""
    count = 0
    if isinstance(d, dict):
        for v in d.values():
            count += 1 + _count_keys(v)
    elif isinstance(d, list):
        for item in d:
            count += _count_keys(item)
    return count


def compute_json_diff(baseline: dict, target: dict) -> DiffResponse:
    """Compute a structured diff between baseline and target JSON objects."""
    diff = DeepDiff(baseline, target, ignore_order=True)

    differences = []
    added_count = 0
    removed_count = 0
    modified_count = 0

    # --- Added items ---
    # In DeepDiff v9, dictionary_item_added is a set of path strings
    for path in diff.get("dictionary_item_added", []):
        actual_value = _resolve_value(target, path)
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=None,
            target_value=actual_value,
            change_type="added",
        ))
        added_count += 1

    for path in diff.get("iterable_item_added", {}):
        val = diff["iterable_item_added"][path] if isinstance(diff.get("iterable_item_added"), dict) else None
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=None,
            target_value=val,
            change_type="added",
        ))
        added_count += 1

    # --- Removed items ---
    for path in diff.get("dictionary_item_removed", []):
        actual_value = _resolve_value(baseline, path)
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=actual_value,
            target_value=None,
            change_type="removed",
        ))
        removed_count += 1

    for path in diff.get("iterable_item_removed", {}):
        val = diff["iterable_item_removed"][path] if isinstance(diff.get("iterable_item_removed"), dict) else None
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=val,
            target_value=None,
            change_type="removed",
        ))
        removed_count += 1

    # --- Modified values ---
    for path, change in diff.get("values_changed", {}).items():
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=change.get("old_value"),
            target_value=change.get("new_value"),
            change_type="modified",
        ))
        modified_count += 1

    # --- Type changes ---
    for path, change in diff.get("type_changes", {}).items():
        differences.append(DiffDetail(
            key_path=_clean_path(path),
            baseline_value=change.get("old_value"),
            target_value=change.get("new_value"),
            change_type="modified",
        ))
        modified_count += 1

    # Calculate match score
    total_keys = max(_count_keys(baseline), _count_keys(target))
    if total_keys == 0:
        match_score = 100.0
    else:
        total_changes = added_count + removed_count + modified_count
        match_score = max(0.0, ((total_keys - total_changes) / total_keys) * 100)

    return DiffResponse(
        summary=DiffSummary(
            total_keys=total_keys,
            added=added_count,
            removed=removed_count,
            modified=modified_count,
            match_score=round(match_score, 2),
        ),
        differences=differences,
    )
