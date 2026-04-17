"""Unified flat diff engine for O9 report JSONs.

Produces a single flat list of field-level comparisons across ALL sections,
suitable for rendering in one table and exporting to PDF via jsPDF-autoTable.
"""

from typing import Any, Optional


# ---------------------------------------------------------------------------
# Key-field heuristics per section
# ---------------------------------------------------------------------------

SECTION_KEY_CANDIDATES = {
    "filter_aop": ["filter_name"],
    "filters": ["filter_name", "filter_type"],
    "dimensions": ["dimension_name"],
    "measure": ["measure_name"],
    "measures": ["measure_name"],
    "settings": ["setting_name"],
    "kpi_panel": ["kpi_name"],
}

GENERIC_KEY_CANDIDATES = ["name", "id", "key", "type", "label", "title"]


def _pick_row_key(section_key: str, data_keys: set) -> Optional[str]:
    """Choose the best key field for row alignment within a section."""
    for candidate in SECTION_KEY_CANDIDATES.get(section_key, []):
        if candidate in data_keys:
            return candidate
    for candidate in GENERIC_KEY_CANDIDATES:
        if candidate in data_keys:
            return candidate
    return list(data_keys)[0] if data_keys else None


def _fmt(val: Any) -> str:
    """Format a value for display."""
    if val is None:
        return "—"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    return str(val)


def _eq(a: Any, b: Any) -> bool:
    """Compare two values, handling type coercion."""
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, str) and isinstance(b, str):
        return a.strip().lower() == b.strip().lower()
    return a == b


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compute_unified_diff(
    report_a: dict,
    report_b: dict,
    name_a: str = "Report A",
    name_b: str = "Report B",
) -> dict:
    """Compare two O9 report JSONs and return a unified flat diff.

    Returns:
        {
            "report_a_name": str,
            "report_b_name": str,
            "rows": [
                {
                    "section": str,
                    "item": str,
                    "field": str,
                    "report_a": str,
                    "report_b": str,
                    "status": "identical" | "modified" | "only_in_a" | "only_in_b"
                },
                ...
            ],
            "summary": {
                "total_fields": int,
                "identical": int,
                "modified": int,
                "only_in_a": int,
                "only_in_b": int,
                "match_percentage": float,
            }
        }
    """
    rows = []
    counts = {"identical": 0, "modified": 0, "only_in_a": 0, "only_in_b": 0}

    # ── 1. Compare metadata ──
    meta_a = report_a.get("metadata", {})
    meta_b = report_b.get("metadata", {})
    all_meta_keys = sorted(set(list(meta_a.keys()) + list(meta_b.keys())))

    for key in all_meta_keys:
        va, vb = meta_a.get(key), meta_b.get(key)
        if _eq(va, vb):
            status = "identical"
        elif va is not None and vb is None:
            status = "only_in_a"
        elif va is None and vb is not None:
            status = "only_in_b"
        else:
            status = "modified"
        counts[status] += 1
        rows.append({
            "section": "Metadata",
            "item": "—",
            "field": key,
            "report_a": _fmt(va),
            "report_b": _fmt(vb),
            "status": status,
        })

    # ── 2. Compare sections ──
    sections_a = report_a.get("sections", {})
    sections_b = report_b.get("sections", {})
    order_a = report_a.get("section_order", list(sections_a.keys()))
    order_b = report_b.get("section_order", list(sections_b.keys()))
    all_section_keys = list(dict.fromkeys(order_a + order_b))

    for sec_key in all_section_keys:
        sec_label = sec_key.replace("_", " ").title()
        sec_a = sections_a.get(sec_key)
        sec_b = sections_b.get(sec_key)

        # Section only in one report
        if sec_a and not sec_b:
            rows.append({
                "section": sec_label,
                "item": "⬤ Entire Section",
                "field": "(all fields)",
                "report_a": f"✓ Present ({len(sec_a.get('data', []))} rows)",
                "report_b": "—",
                "status": "only_in_a",
            })
            counts["only_in_a"] += 1
            # Also list the individual items for completeness
            data_a = sec_a.get("data", [])
            all_keys_a = set()
            for row in data_a:
                all_keys_a.update(row.keys())
            rk = _pick_row_key(sec_key, all_keys_a)
            for row in data_a:
                item_label = str(row.get(rk, "?")) if rk else "?"
                for field_key in sorted(row.keys()):
                    if field_key == rk:
                        continue
                    counts["only_in_a"] += 1
                    rows.append({
                        "section": sec_label,
                        "item": item_label,
                        "field": field_key,
                        "report_a": _fmt(row.get(field_key)),
                        "report_b": "—",
                        "status": "only_in_a",
                    })
            continue

        if sec_b and not sec_a:
            rows.append({
                "section": sec_label,
                "item": "⬤ Entire Section",
                "field": "(all fields)",
                "report_a": "—",
                "report_b": f"✓ Present ({len(sec_b.get('data', []))} rows)",
                "status": "only_in_b",
            })
            counts["only_in_b"] += 1
            data_b = sec_b.get("data", [])
            all_keys_b = set()
            for row in data_b:
                all_keys_b.update(row.keys())
            rk = _pick_row_key(sec_key, all_keys_b)
            for row in data_b:
                item_label = str(row.get(rk, "?")) if rk else "?"
                for field_key in sorted(row.keys()):
                    if field_key == rk:
                        continue
                    counts["only_in_b"] += 1
                    rows.append({
                        "section": sec_label,
                        "item": item_label,
                        "field": field_key,
                        "report_a": "—",
                        "report_b": _fmt(row.get(field_key)),
                        "status": "only_in_b",
                    })
            continue

        # Both exist — deep compare row by row
        data_a = sec_a.get("data", [])
        data_b = sec_b.get("data", [])

        # Collect all data keys
        all_data_keys = set()
        for r in data_a:
            all_data_keys.update(r.keys())
        for r in data_b:
            all_data_keys.update(r.keys())

        rk = _pick_row_key(sec_key, all_data_keys)

        # Index rows by key value
        def _index_rows(data):
            index = {}
            for row in data:
                kv = str(row.get(rk, "")) if rk else ""
                if kv not in index:
                    index[kv] = row
                else:
                    idx = 2
                    while f"{kv} ({idx})" in index:
                        idx += 1
                    index[f"{kv} ({idx})"] = row
            return index

        idx_a = _index_rows(data_a)
        idx_b = _index_rows(data_b)
        all_row_keys = list(dict.fromkeys(list(idx_a.keys()) + list(idx_b.keys())))

        # Sorted field names (excluding the row key)
        compare_fields = sorted(f for f in all_data_keys if f != rk)

        for row_key_val in all_row_keys:
            ra = idx_a.get(row_key_val)
            rb = idx_b.get(row_key_val)

            if ra and not rb:
                # Entire row only in A
                for field in compare_fields:
                    va = ra.get(field)
                    if va is not None:
                        counts["only_in_a"] += 1
                        rows.append({
                            "section": sec_label,
                            "item": row_key_val,
                            "field": field,
                            "report_a": _fmt(va),
                            "report_b": "—",
                            "status": "only_in_a",
                        })
                continue

            if rb and not ra:
                # Entire row only in B
                for field in compare_fields:
                    vb = rb.get(field)
                    if vb is not None:
                        counts["only_in_b"] += 1
                        rows.append({
                            "section": sec_label,
                            "item": row_key_val,
                            "field": field,
                            "report_a": "—",
                            "report_b": _fmt(vb),
                            "status": "only_in_b",
                        })
                continue

            # Both exist — compare field by field
            for field in compare_fields:
                va = ra.get(field)
                vb = rb.get(field)

                if _eq(va, vb):
                    status = "identical"
                elif va is not None and vb is None:
                    status = "only_in_a"
                elif va is None and vb is not None:
                    status = "only_in_b"
                else:
                    status = "modified"

                counts[status] += 1
                rows.append({
                    "section": sec_label,
                    "item": row_key_val,
                    "field": field,
                    "report_a": _fmt(va),
                    "report_b": _fmt(vb),
                    "status": status,
                })

    # ── Summary ──
    total = sum(counts.values())
    diffs = counts["modified"] + counts["only_in_a"] + counts["only_in_b"]
    match_pct = round(((total - diffs) / total) * 100, 1) if total > 0 else 100.0

    return {
        "report_a_name": name_a,
        "report_b_name": name_b,
        "rows": rows,
        "summary": {
            "total_fields": total,
            "identical": counts["identical"],
            "modified": counts["modified"],
            "only_in_a": counts["only_in_a"],
            "only_in_b": counts["only_in_b"],
            "match_percentage": match_pct,
        },
    }
