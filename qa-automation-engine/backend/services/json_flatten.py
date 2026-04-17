"""JSON flattening service."""

from models.schemas import FlattenResponse


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


def flatten_dict(
    data,
    separator: str = ".",
    max_depth: int = None,
    preserve_arrays: bool = False,
) -> FlattenResponse:
    """Flatten a nested JSON structure into a single-level dict.

    Args:
        data: The input dict or list.
        separator: Character used to join nested key paths.
        max_depth: Maximum recursion depth. None = unlimited.
        preserve_arrays: If True, keep arrays as-is instead of expanding with index keys.
    """
    original_key_count = _count_keys(data)
    out = {}

    def _flatten(obj, prefix: str = "", depth: int = 0):
        if max_depth is not None and depth >= max_depth:
            out[prefix] = obj
            return

        if isinstance(obj, dict):
            for key, value in obj.items():
                new_key = f"{prefix}{separator}{key}" if prefix else key
                _flatten(value, new_key, depth + 1)
        elif isinstance(obj, list) and not preserve_arrays:
            for i, item in enumerate(obj):
                new_key = f"{prefix}{separator}{i}" if prefix else str(i)
                _flatten(item, new_key, depth + 1)
        else:
            out[prefix] = obj

    _flatten(data)

    return FlattenResponse(
        original_key_count=original_key_count,
        flattened_key_count=len(out),
        flattened=out,
    )
