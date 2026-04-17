import json
from deepdiff import DeepDiff
from models.schemas import DiffSummary, DiffDetail, DiffResponse

def compute_json_diff(baseline: dict, target: dict) -> DiffResponse:
    diff = DeepDiff(baseline, target, ignore_order=True)
    
    differences = []
    added_count = 0
    removed_count = 0
    modified_count = 0
    
    def clean_path(path_str: str) -> str:
        # e.g. root['report']['user'] -> ['report']['user']
        if path_str.startswith("root"):
            return path_str[4:]
        return path_str
            
    # Process added
    if 'dictionary_item_added' in diff:
        for path in diff['dictionary_item_added']:
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value=None,
                target_value="[Added Element]",
                change_type="added"
            ))
            added_count += 1
            
    if 'iterable_item_added' in diff:
        for path, change in diff['iterable_item_added'].items():
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value=None,
                target_value="[Added Element]",
                change_type="added"
            ))
            added_count += 1
            
    # Process removed
    if 'dictionary_item_removed' in diff:
        for path in diff['dictionary_item_removed']:
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value="[Removed Element]",
                target_value=None,
                change_type="removed"
            ))
            removed_count += 1

    if 'iterable_item_removed' in diff:
        for path, change in diff['iterable_item_removed'].items():
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value="[Removed Element]",
                target_value=None,
                change_type="removed"
            ))
            removed_count += 1

    # Process modified
    if 'values_changed' in diff:
        for path, change in diff['values_changed'].items():
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value=change['old_value'],
                target_value=change['new_value'],
                change_type="modified"
            ))
            modified_count += 1
            
    if 'type_changes' in diff:
         for path, change in diff['type_changes'].items():
            differences.append(DiffDetail(
                key_path=clean_path(path),
                baseline_value=change['old_value'],
                target_value=change['new_value'],
                change_type="modified"
            ))
            modified_count += 1
            
    def count_keys(d):
        count = 0
        if isinstance(d, dict):
            for k, v in d.items():
                count += 1 + count_keys(v)
        elif isinstance(d, list):
            for item in d:
                count += count_keys(item)
        return count
        
    baseline_keys = count_keys(baseline)
    target_keys = count_keys(target)
    total_unique_approx = max(baseline_keys, target_keys)
    
    if total_unique_approx == 0:
        match_score = 100.0
    else:
        total_changes = added_count + removed_count + modified_count
        match_score = max(0.0, ((total_unique_approx - total_changes) / total_unique_approx) * 100)
        
    summary = DiffSummary(
        total_keys=total_unique_approx,
        added=added_count,
        removed=removed_count,
        modified=modified_count,
        match_score=round(match_score, 2)
    )
    
    return DiffResponse(summary=summary, differences=differences)
