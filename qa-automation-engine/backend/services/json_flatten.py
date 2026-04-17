from models.schemas import FlattenResponse

def flatten_dict(data: dict, separator: str = '.', max_depth: int = None, preserve_arrays: bool = False) -> FlattenResponse:
    
    def count_keys(d):
        count = 0
        if isinstance(d, dict):
            for k, v in d.items():
                count += 1 + count_keys(v)
        elif isinstance(d, list):
            for item in d:
                count += count_keys(item)
        return count
        
    original_key_count = count_keys(data)
    
    out = {}
    
    def flatten(x, name='', current_depth=0):
        if max_depth is not None and current_depth > max_depth:
            out[name[:-len(separator)]] = x
            return
            
        if isinstance(x, dict):
            for a in x:
                flatten(x[a], name + a + separator, current_depth + 1)
        elif isinstance(x, list) and not preserve_arrays:
            for i, a in enumerate(x):
                flatten(a, name + str(i) + separator, current_depth + 1)
        else:
            out[name[:-len(separator)]] = x
            
    # For top level list
    if isinstance(data, dict):
        for a in data:
            flatten(data[a], a + separator, 1)
    elif isinstance(data, list) and not preserve_arrays:
        for i, a in enumerate(data):
            flatten(a, str(i) + separator, 1)
    else:
        out = data
        
    flattened_key_count = len(out.keys()) if isinstance(out, dict) else 0
    
    return FlattenResponse(
        original_key_count=original_key_count,
        flattened_key_count=flattened_key_count,
        flattened=out if isinstance(out, dict) else {"data": out}
    )
