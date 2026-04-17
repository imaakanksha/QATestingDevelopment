# QA Automation Engine

A professional-grade tool that automates report testing and data validation during system migrations. Built for QA engineers who need to compare JSON reports, convert XLSX wireframes to JSON, and flatten deeply nested data structures.

## Features

- **JSON Comparator** — Upload two JSON files and get a detailed diff report with match score, color-coded change table, inline value highlighting, and exportable HTML report.
- **XLSX → JSON Converter** — Convert Excel wireframes to structured JSON with options for sheet selection, header row, key mapping, and column name normalization. Optionally compare the converted output against a reference JSON.
- **JSON Flattener** — Flatten deeply nested JSON into single-level key-value pairs with configurable separator, max depth, and array handling.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI (Python) | Async, auto Swagger docs, Pydantic validation |
| XLSX Parsing | pandas + openpyxl | Most robust Excel parsing in Python |
| JSON Diffing | deepdiff | Handles nested diffs, type changes, list reordering |
| Frontend | React + Tailwind CSS v4 | Fast, responsive UI with modern design tokens |
| Report Export | Jinja2 HTML | Styled, portable, shareable reports |

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compare-json` | Compare two JSON files |
| POST | `/api/xlsx-to-json` | Convert XLSX to JSON |
| POST | `/api/xlsx-sheet-names` | Get sheet names from XLSX |
| POST | `/api/xlsx-compare` | Convert XLSX & compare against reference JSON |
| POST | `/api/flatten-json` | Flatten nested JSON |
| POST | `/api/export-report` | Generate styled HTML diff report |

## Project Structure

```
qa-automation-engine/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── routers/
│   │   ├── compare.py          # /api/compare-json
│   │   ├── converter.py        # /api/xlsx-to-json, /api/xlsx-compare
│   │   ├── flattener.py        # /api/flatten-json
│   │   └── export.py           # /api/export-report
│   └── services/
│       ├── json_diff.py        # DeepDiff comparison logic
│       ├── xlsx_parser.py      # pandas/openpyxl conversion
│       └── json_flatten.py     # Recursive flatten logic
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── index.css           # Tailwind v4 theme & global styles
│       ├── main.jsx
│       ├── App.jsx
│       ├── lib/
│       │   └── utils.js        # Shared utilities (cn, API_BASE)
│       └── components/
│           ├── Sidebar.jsx
│           ├── FileUploadZone.jsx
│           ├── JsonComparator.jsx
│           ├── XlsxConverter.jsx
│           ├── JsonFlattener.jsx
│           ├── DiffTable.jsx
│           ├── SummaryCard.jsx
│           └── JsonTreeViewer.jsx
└── README.md
```
