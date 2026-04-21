# QA Automation Engine

A professional-grade tool that automates report testing and data validation during system migrations. Built for QA engineers who need to compare JSON reports, convert XLSX wireframes to JSON, and flatten deeply nested data structures.

## Features

### 🔍 JSON Comparator (Tab 1)
Upload two JSON files and get a detailed comparison in a **5-column table**:

| Column | Content |
|--------|---------|
| **Difference Features** | Section category (Dimensions, Measures, Filters, etc.) |
| **JSON Difference** | Specific item and field that differs |
| **Element in Report 1** | Value from the first report |
| **Element in Report 2** | Value from the second report |
| **Final Verdict** | ✅ Match / ❌ Mismatch / ⚠️ Only in Report 1/2 |

- Auto-detects O9 structured reports (with `sections` and `section_order`)
- Falls back to generic DeepDiff for any JSON structure
- PDF and HTML export for both modes
- Match score progress bar, search, filtering, pagination

### 🛡️ Wireframe Validator (Tab 2)
Bidirectional field-level comparison of wireframe XLSX design documents against O9 report JSON exports:

- **Smart Wireframe Parsing** — purpose-built parser that correctly handles filter sub-type labels, continuation rows, and section banners
- **O9 JSON Normalization** — extracts filters, dimensions, and measures from the dual LevelAttributes structure
- **Bidirectional comparison** — flags mismatches on EITHER side (wireframe errors or report errors)
- **3-section validation** — Filters (9 fields), Dimensions (10 fields), Measures (10 fields) compared field-by-field
- **Dashboard view** — match score, collapsible section tables with color-coded verdicts
- Print / Save as PDF for validation reports

### 🔧 JSON Flattener (Tab 3)
Flatten deeply nested JSON into single-level key-value pairs:

- **File upload** or paste JSON directly
- **Table view** with syntax-highlighted key paths and type badges
- **Tree view** with side-by-side original vs flattened comparison
- Download as JSON or CSV
- Configurable separator, max depth, and array handling

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI (Python) | Async, auto Swagger docs, Pydantic validation |
| XLSX Parsing | pandas + openpyxl | Most robust Excel parsing in Python |
| JSON Diffing | deepdiff | Handles nested diffs, type changes, list reordering |
| Frontend | React 19 + Tailwind CSS v4 | Fast, responsive UI with modern design tokens |
| Report Export | Jinja2 HTML + browser print | Styled, portable PDF/HTML reports |

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd qa-automation-engine/backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `/docs`.

### Frontend

```bash
cd qa-automation-engine/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the backend automatically.

## API Endpoints

### Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compare-json` | Compare two JSON files (auto-detects O9 structured vs flat) |
| POST | `/api/compare-json-body` | Compare two JSON objects passed in request body |

### Conversion & Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wireframe-compare` | **Validate wireframe XLSX against O9 report JSON** (bidirectional) |
| POST | `/api/wireframe-to-json` | Convert O9 wireframe XLSX to structured JSON |
| POST | `/api/wireframe-preview` | Quick-detect sections in a wireframe without full parsing |
| POST | `/api/xlsx-to-json` | Convert flat XLSX table to JSON |
| POST | `/api/xlsx-sheet-names` | Get sheet names from an XLSX file |
| POST | `/api/xlsx-compare` | Convert XLSX and compare against reference JSON |

### Flattening

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flatten-json` | Flatten nested JSON (supports file upload or raw text) |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export-report` | Generate HTML diff report (flat DeepDiff mode) |
| POST | `/api/export-unified-report` | Generate HTML report (unified 5-column format) |
| POST | `/api/export-section-report` | Generate HTML report (section-aware O9 format) |

## Project Structure

```
qa-automation-engine/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── test_api.py                # Quick API test script
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   ├── routers/
│   │   ├── compare.py             # /api/compare-json, /api/compare-json-body
│   │   ├── converter.py           # /api/xlsx-to-json, /api/wireframe-*, /api/xlsx-compare
│   │   ├── flattener.py           # /api/flatten-json
│   │   ├── export.py              # /api/export-report (flat diff HTML)
│   │   ├── unified_export.py      # /api/export-unified-report (5-column HTML)
│   │   └── report_export.py       # /api/export-section-report (section-aware HTML)
│   └── services/
│       ├── json_diff.py           # DeepDiff comparison logic
│       ├── unified_diff.py        # Unified flat diff engine for O9 reports
│       ├── section_diff.py        # Section-aware diff engine for O9 reports
│       ├── wireframe_comparator.py # Wireframe vs O9 report comparison engine
│       ├── wireframe_parser.py    # O9 wireframe XLSX parser (generic)
│       ├── xlsx_parser.py         # Flat XLSX table parser
│       └── json_flatten.py        # Recursive flatten logic
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── index.css              # Tailwind v4 theme & global styles
│       ├── main.jsx
│       ├── App.jsx
│       ├── lib/
│       │   └── utils.js           # Shared utilities (cn, API_BASE, formatFileSize)
│       └── components/
│           ├── Sidebar.jsx        # Navigation sidebar
│           ├── FileUploadZone.jsx  # Drag-and-drop file upload
│           ├── JsonComparator.jsx  # Tab 1: JSON comparison orchestrator
│           ├── UnifiedResultsView.jsx # 5-column comparison table
│           ├── XlsxConverter.jsx  # Tab 2: Wireframe Validator
│           ├── JsonFlattener.jsx  # Tab 3: JSON flattener
│           ├── DiffTable.jsx      # Flat diff results table
│           ├── SummaryCard.jsx    # Match score summary cards
│           └── JsonTreeViewer.jsx # Collapsible JSON tree viewer
├── test_report_a.json             # Sample O9 report for testing
├── test_report_b.json             # Sample O9 report for testing
├── test_wireframe.xlsx            # Sample wireframe for testing
├── o9_wireframe_sample.xlsx       # Sample O9 wireframe
├── .gitignore
└── README.md
```

## Testing

```bash
# Run the backend test script (requires backend running on port 8000)
cd qa-automation-engine/backend
python test_api.py
```

Sample test files (`test_report_a.json`, `test_report_b.json`, `test_wireframe.xlsx`) are included in the root directory for quick validation.
