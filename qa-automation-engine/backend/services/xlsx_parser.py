"""XLSX to JSON conversion service."""

import io
import math
import pandas as pd
import numpy as np


def get_sheet_names(file_bytes: bytes) -> list[str]:
    """Return list of sheet names in an Excel file."""
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    return xl.sheet_names


def _sanitize_value(val):
    """Convert a single cell value to a JSON-safe Python type.
    
    Handles: NaN, Infinity, numpy scalars, numpy integers, Timestamps, etc.
    """
    if val is None:
        return None
    
    # Check for NaN / Infinity (must come before other numeric checks)
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        if val.is_integer():
            return int(val)
    
    # numpy NaN check (np.float64('nan'), etc.)
    try:
        if hasattr(val, 'item'):
            native = val.item()
            if isinstance(native, float):
                if math.isnan(native) or math.isinf(native):
                    return None
                if native.is_integer():
                    return int(native)
            return native
    except (ValueError, OverflowError, AttributeError):
        pass
    
    # datetime and time → ISO string
    if hasattr(val, "isoformat") and callable(val.isoformat):
        return val.isoformat()
    
    # pandas NA / NaT
    try:
        if pd.isna(val):
            return None
    except (ValueError, TypeError):
        pass
    
    return val


def parse_xlsx_to_json(
    file_bytes: bytes,
    sheet_name: str = None,
    header_row: int = 1,
    treat_first_column_as_key: bool = False,
    normalize_keys: bool = False,
) -> dict:
    """Convert an Excel sheet to a JSON-serializable dict.
    
    Args:
        file_bytes: Raw bytes of the .xlsx file.
        sheet_name: Sheet to read. None = first sheet.
        header_row: 1-indexed row number to use as column headers.
        treat_first_column_as_key: Use values in the first column as top-level keys.
        normalize_keys: Strip whitespace, lowercase, replace spaces with underscores.
    """
    header_idx = max(header_row - 1, 0)

    df = pd.read_excel(
        io.BytesIO(file_bytes),
        sheet_name=sheet_name if sheet_name else 0,
        header=header_idx,
        engine="openpyxl",
    )

    # Normalize or clean column names
    if normalize_keys:
        df.columns = [
            str(col).strip().lower().replace(" ", "_").replace("-", "_")
            for col in df.columns
        ]
    else:
        df.columns = [str(col).strip() for col in df.columns]

    # Build records with fully sanitized values
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            record[col] = _sanitize_value(row[col])
        records.append(record)

    if treat_first_column_as_key and len(df.columns) > 0:
        first_col = df.columns[0]
        result = {}
        for row in records:
            key = row.get(first_col)
            if key is not None:
                result[str(key)] = row
        return result

    return {"data": records}
