"""Section-aware semantic diff engine for O9 report JSONs.

Compares two O9 wireframe JSONs section-by-section, aligning rows
by key fields (filter_type, dimension_name, measure_name, etc.)
and producing per-section field-level comparison tables.
"""

from typing import Any, Optional


# ---------------------------------------------------------------------------
# Key-field heuristics: which column uniquely identifies rows in each section
# ---------------------------------------------------------------------------

# Ordered list of candidate key fields per well-known O9 section.
# The engine tries each in order and picks the first one present in the data.
SECTION_KEY_CANDIDATES = {
    "filter_aop": ["filter_type", "filter_name", "filter_item"],
    "filters": ["filter_type", "filter_name"],
    "dimensions": ["dimension_name", "dimension_display_name", "type"],
    "measure": ["measure_name", "measure_translation"],
    "measures": ["measure_name", "measure_translation"],
}

# Fallback: try these generic key candidates for unknown section names
GENERIC_KEY_CANDIDATES = ["name", "id", "key", "type", "label", "title"]


def _pick_row_key(section_key: str, columns: list[str]) -> Optional[str]:
    """Choose the best key field for row alignment within a section."""
    col_set = set(columns)

    # Try section-specific candidates first
    for candidate in SECTION_KEY_CANDIDATES.get(section_key, []):
        if candidate in col_set:
            return candidate

    # Try generic candidates
    for candidate in GENERIC_KEY_CANDIDATES:
        if candidate in col_set:
            return candidate

    # Last resort: use the first column
    return columns[0] if columns else None


def _format_value(val: Any) -> str:
    """Format a value for display in a comparison table."""
    if val is None:
        return "—"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    return str(val)


def _values_equal(a: Any, b: Any) -> bool:
    """Compare two values for equality, handling None and type coercion."""
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    # Coerce for comparison: bool(True) == int(1) should match
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    # String comparison (case-insensitive for flexibility)
    if isinstance(a, str) and isinstance(b, str):
        return a.strip().lower() == b.strip().lower()
    return a == b


# ---------------------------------------------------------------------------
# Per-section comparison
# ---------------------------------------------------------------------------

def _compare_section(section_a: dict, section_b: dict, section_key: str) -> dict:
    """Compare two sections row-by-row and field-by-field.

    Args:
        section_a: Section dict with 'columns' and 'data' from Report A.
        section_b: Section dict with 'columns' and 'data' from Report B.
        section_key: Normalised section name (e.g. 'filter_aop').

    Returns:
        Section diff dict with summary and row comparisons.
    """
    cols_a = section_a.get("columns", [])
    cols_b = section_b.get("columns", [])
    data_a = section_a.get("data", [])
    data_b = section_b.get("data", [])

    # Determine the key-normalised column names from the data
    all_data_keys_a = set()
    for row in data_a:
        all_data_keys_a.update(row.keys())
    all_data_keys_b = set()
    for row in data_b:
        all_data_keys_b.update(row.keys())

    # Use data keys for alignment (these are normalised)
    all_fields = sorted(all_data_keys_a | all_data_keys_b)

    # Pick the row key for alignment
    row_key = _pick_row_key(section_key, all_fields)

    # Build row indexes by key value
    rows_a = {}
    for row in data_a:
        key_val = row.get(row_key) if row_key else None
        if key_val is not None:
            key_str = str(key_val)
            if key_str not in rows_a:
                rows_a[key_str] = row
            else:
                # Duplicate key — append index to disambiguate
                idx = 2
                while f"{key_str}_{idx}" in rows_a:
                    idx += 1
                rows_a[f"{key_str}_{idx}"] = row
        else:
            rows_a[f"__unnamed_a_{len(rows_a)}"] = row

    rows_b = {}
    for row in data_b:
        key_val = row.get(row_key) if row_key else None
        if key_val is not None:
            key_str = str(key_val)
            if key_str not in rows_b:
                rows_b[key_str] = row
            else:
                idx = 2
                while f"{key_str}_{idx}" in rows_b:
                    idx += 1
                rows_b[f"{key_str}_{idx}"] = row
        else:
            rows_b[f"__unnamed_b_{len(rows_b)}"] = row

    # All unique row keys across both reports
    all_row_keys = list(dict.fromkeys(list(rows_a.keys()) + list(rows_b.keys())))

    comparisons = []
    total_fields = 0
    identical_fields = 0
    modified_fields = 0
    only_in_a_fields = 0
    only_in_b_fields = 0
    rows_only_in_a = 0
    rows_only_in_b = 0
    rows_modified = 0
    rows_identical = 0

    for rk in all_row_keys:
        row_a = rows_a.get(rk)
        row_b = rows_b.get(rk)

        if row_a and not row_b:
            # Entire row only in Report A
            rows_only_in_a += 1
            fields = []
            for field in all_fields:
                if field == row_key:
                    continue
                val_a = row_a.get(field)
                fields.append({
                    "field": field,
                    "report_a": _format_value(val_a),
                    "report_b": "—",
                    "status": "only_in_a",
                })
                if val_a is not None:
                    only_in_a_fields += 1
                    total_fields += 1
            comparisons.append({
                "row_key_value": rk,
                "status": "only_in_a",
                "fields": fields,
            })
            continue

        if row_b and not row_a:
            # Entire row only in Report B
            rows_only_in_b += 1
            fields = []
            for field in all_fields:
                if field == row_key:
                    continue
                val_b = row_b.get(field)
                fields.append({
                    "field": field,
                    "report_a": "—",
                    "report_b": _format_value(val_b),
                    "status": "only_in_b",
                })
                if val_b is not None:
                    only_in_b_fields += 1
                    total_fields += 1
            comparisons.append({
                "row_key_value": rk,
                "status": "only_in_b",
                "fields": fields,
            })
            continue

        # Both exist — compare field by field
        fields = []
        row_has_diff = False
        for field in all_fields:
            if field == row_key:
                continue
            val_a = row_a.get(field)
            val_b = row_b.get(field)
            total_fields += 1

            if _values_equal(val_a, val_b):
                identical_fields += 1
                fields.append({
                    "field": field,
                    "report_a": _format_value(val_a),
                    "report_b": _format_value(val_b),
                    "status": "identical",
                })
            elif val_a is not None and val_b is None:
                only_in_a_fields += 1
                row_has_diff = True
                fields.append({
                    "field": field,
                    "report_a": _format_value(val_a),
                    "report_b": "—",
                    "status": "only_in_a",
                })
            elif val_a is None and val_b is not None:
                only_in_b_fields += 1
                row_has_diff = True
                fields.append({
                    "field": field,
                    "report_a": "—",
                    "report_b": _format_value(val_b),
                    "status": "only_in_b",
                })
            else:
                modified_fields += 1
                row_has_diff = True
                fields.append({
                    "field": field,
                    "report_a": _format_value(val_a),
                    "report_b": _format_value(val_b),
                    "status": "modified",
                })

        if row_has_diff:
            rows_modified += 1
        else:
            rows_identical += 1

        comparisons.append({
            "row_key_value": rk,
            "status": "modified" if row_has_diff else "identical",
            "fields": fields,
        })

    return {
        "status": "identical" if (modified_fields == 0 and only_in_a_fields == 0 and only_in_b_fields == 0 and rows_only_in_a == 0 and rows_only_in_b == 0) else "modified",
        "row_key": row_key,
        "columns_a": cols_a,
        "columns_b": cols_b,
        "summary": {
            "total_rows_a": len(data_a),
            "total_rows_b": len(data_b),
            "rows_identical": rows_identical,
            "rows_modified": rows_modified,
            "rows_only_in_a": rows_only_in_a,
            "rows_only_in_b": rows_only_in_b,
            "total_fields_compared": total_fields,
            "fields_identical": identical_fields,
            "fields_modified": modified_fields,
            "fields_only_in_a": only_in_a_fields,
            "fields_only_in_b": only_in_b_fields,
        },
        "comparisons": comparisons,
    }


# ---------------------------------------------------------------------------
# Metadata comparison
# ---------------------------------------------------------------------------

def _compare_metadata(meta_a: dict, meta_b: dict) -> dict:
    """Compare two metadata dicts field-by-field."""
    all_keys = sorted(set(list(meta_a.keys()) + list(meta_b.keys())))

    fields = []
    identical = 0
    modified = 0
    only_a = 0
    only_b = 0

    for key in all_keys:
        val_a = meta_a.get(key)
        val_b = meta_b.get(key)

        if _values_equal(val_a, val_b):
            identical += 1
            fields.append({
                "field": key,
                "report_a": _format_value(val_a),
                "report_b": _format_value(val_b),
                "status": "identical",
            })
        elif val_a is not None and val_b is None:
            only_a += 1
            fields.append({
                "field": key,
                "report_a": _format_value(val_a),
                "report_b": "—",
                "status": "only_in_a",
            })
        elif val_a is None and val_b is not None:
            only_b += 1
            fields.append({
                "field": key,
                "report_a": "—",
                "report_b": _format_value(val_b),
                "status": "only_in_b",
            })
        else:
            modified += 1
            fields.append({
                "field": key,
                "report_a": _format_value(val_a),
                "report_b": _format_value(val_b),
                "status": "modified",
            })

    return {
        "fields": fields,
        "summary": {
            "total": len(all_keys),
            "identical": identical,
            "modified": modified,
            "only_in_a": only_a,
            "only_in_b": only_b,
        },
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compare_reports(report_a: dict, report_b: dict,
                    name_a: str = "Report A",
                    name_b: str = "Report B") -> dict:
    """Compare two O9 wireframe JSONs section-by-section.

    Args:
        report_a: Parsed wireframe JSON (output of parse_wireframe_to_json).
        report_b: Parsed wireframe JSON (output of parse_wireframe_to_json).
        name_a: Display name for report A.
        name_b: Display name for report B.

    Returns:
        Structured comparison result with per-section diffs.
    """
    meta_a = report_a.get("metadata", {})
    meta_b = report_b.get("metadata", {})
    sections_a = report_a.get("sections", {})
    sections_b = report_b.get("sections", {})
    order_a = report_a.get("section_order", list(sections_a.keys()))
    order_b = report_b.get("section_order", list(sections_b.keys()))

    # All section keys across both reports
    all_section_keys = list(dict.fromkeys(order_a + order_b))

    # Compare metadata
    metadata_diff = _compare_metadata(meta_a, meta_b)

    # Compare each section
    section_diffs = {}
    sections_identical = 0
    sections_modified = 0
    sections_only_a = 0
    sections_only_b = 0
    total_fields = 0
    total_diffs = 0

    for sec_key in all_section_keys:
        sec_a = sections_a.get(sec_key)
        sec_b = sections_b.get(sec_key)

        if sec_a and not sec_b:
            # Section only in Report A
            sections_only_a += 1
            row_count = len(sec_a.get("data", []))
            section_diffs[sec_key] = {
                "status": "only_in_a",
                "row_key": None,
                "columns_a": sec_a.get("columns", []),
                "columns_b": [],
                "summary": {
                    "total_rows_a": row_count,
                    "total_rows_b": 0,
                    "rows_identical": 0,
                    "rows_modified": 0,
                    "rows_only_in_a": row_count,
                    "rows_only_in_b": 0,
                    "total_fields_compared": 0,
                    "fields_identical": 0,
                    "fields_modified": 0,
                    "fields_only_in_a": 0,
                    "fields_only_in_b": 0,
                },
                "comparisons": [],
            }
            continue

        if sec_b and not sec_a:
            # Section only in Report B
            sections_only_b += 1
            row_count = len(sec_b.get("data", []))
            section_diffs[sec_key] = {
                "status": "only_in_b",
                "row_key": None,
                "columns_a": [],
                "columns_b": sec_b.get("columns", []),
                "summary": {
                    "total_rows_a": 0,
                    "total_rows_b": row_count,
                    "rows_identical": 0,
                    "rows_modified": 0,
                    "rows_only_in_a": 0,
                    "rows_only_in_b": row_count,
                    "total_fields_compared": 0,
                    "fields_identical": 0,
                    "fields_modified": 0,
                    "fields_only_in_a": 0,
                    "fields_only_in_b": 0,
                },
                "comparisons": [],
            }
            continue

        # Both exist — deep compare
        sec_diff = _compare_section(sec_a, sec_b, sec_key)
        section_diffs[sec_key] = sec_diff

        if sec_diff["status"] == "identical":
            sections_identical += 1
        else:
            sections_modified += 1

        s = sec_diff["summary"]
        total_fields += s["total_fields_compared"]
        total_diffs += s["fields_modified"] + s["fields_only_in_a"] + s["fields_only_in_b"]

    # Overall match percentage
    if total_fields > 0:
        match_percentage = round(((total_fields - total_diffs) / total_fields) * 100, 1)
    else:
        match_percentage = 100.0

    return {
        "report_a_name": name_a,
        "report_b_name": name_b,
        "overall_summary": {
            "total_sections": len(all_section_keys),
            "sections_identical": sections_identical,
            "sections_modified": sections_modified,
            "sections_only_in_a": sections_only_a,
            "sections_only_in_b": sections_only_b,
            "total_fields_compared": total_fields,
            "total_differences": total_diffs,
            "match_percentage": match_percentage,
        },
        "metadata_diff": metadata_diff,
        "section_order": all_section_keys,
        "section_diffs": section_diffs,
    }
