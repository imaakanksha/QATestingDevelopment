import pandas as pd

def parse_xlsx_to_json(file_bytes: bytes, sheet_name: str = None, header_row: int = 1, treat_first_column_as_key: bool = False, normalize_keys: bool = False) -> dict:
    # header_row is 1-indexed, pandas uses 0-indexed
    header_idx = header_row - 1 if header_row > 0 else 0
    
    import io
    df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, header=header_idx)
    
    if normalize_keys:
        df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]
    else:
        df.columns = [str(col) for col in df.columns]
        
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient='records')
    
    if treat_first_column_as_key and len(df.columns) > 0:
        first_col = df.columns[0]
        result = {}
        for row in records:
            key = row[first_col]
            if key is not None:
                result[str(key)] = row
        return result
        
    return {"data": records}
