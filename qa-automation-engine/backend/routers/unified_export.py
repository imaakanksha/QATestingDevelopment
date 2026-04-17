"""Unified flat-table report export endpoint for PDF-ready HTML generation.

Renders the unified diff output (a single flat table of all field-level
comparisons across all sections) as a styled HTML document optimized
for browser viewing and html2pdf.js client-side PDF conversion.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, List
from jinja2 import Template
import datetime

router = APIRouter()


class UnifiedExportRequest(BaseModel):
    report_a_name: str
    report_b_name: str
    rows: List[Dict[str, Any]]
    summary: Dict[str, Any]


UNIFIED_REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Report Comparison — {{ report_a_name }} vs {{ report_b_name }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #F8FAFC;
            color: #1E293B;
            padding: 32px;
            line-height: 1.5;
        }

        .container { max-width: 1400px; margin: 0 auto; }

        /* Header */
        .report-header {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #334155 100%);
            color: white;
            padding: 28px 36px;
            border-radius: 14px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        .report-header::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
            border-radius: 50%;
        }
        .report-header h1 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 3px;
            letter-spacing: -0.02em;
            position: relative;
            z-index: 1;
        }
        .report-header .subtitle {
            font-size: 12px;
            color: #94A3B8;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }
        .vs-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
            font-size: 13px;
            font-weight: 600;
            position: relative;
            z-index: 1;
        }
        .vs-badge .name {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(4px);
            padding: 5px 14px;
            border-radius: 8px;
            color: #E2E8F0;
            border: 1px solid rgba(255,255,255,0.06);
        }
        .vs-badge .vs {
            color: #64748B;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }

        /* Summary cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 16px;
            text-align: center;
        }
        .stat-card .value {
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 2px;
            letter-spacing: -0.02em;
        }
        .stat-card .label {
            font-size: 9px;
            color: #64748B;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.08em;
        }
        .color-blue { color: #2563EB; }
        .color-green { color: #16A34A; }
        .color-red { color: #DC2626; }
        .color-amber { color: #D97706; }
        .color-slate { color: #334155; }
        .color-indigo { color: #4F46E5; }

        /* Table */
        .table-container {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .table-title {
            padding: 14px 20px;
            border-bottom: 1px solid #E2E8F0;
            background: #F8FAFC;
            font-size: 13px;
            font-weight: 700;
            color: #1E293B;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .table-title .count {
            font-size: 11px;
            color: #64748B;
            font-weight: 500;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        th {
            background: #F1F5F9;
            color: #475569;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 9px 14px;
            text-align: left;
            border-bottom: 1px solid #E2E8F0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        td {
            padding: 8px 14px;
            border-bottom: 1px solid #F1F5F9;
            color: #334155;
            font-size: 11px;
            word-break: break-word;
            max-width: 280px;
        }
        td.mono {
            font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
            font-size: 10.5px;
        }
        tr:last-child td { border-bottom: none; }

        /* Section column styling */
        .section-cell {
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }
        .section-metadata { color: #6366F1; }
        .section-filter { color: #0891B2; }
        .section-dimensions { color: #7C3AED; }
        .section-measures { color: #059669; }
        .section-settings { color: #D97706; }
        .section-kpi { color: #DC2626; }
        .section-default { color: #475569; }

        /* Status badges */
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }
        .badge-identical { background: #F1F5F9; color: #94A3B8; }
        .badge-modified { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
        .badge-only_in_a { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; }
        .badge-only_in_b { background: #DBEAFE; color: #2563EB; border: 1px solid #BFDBFE; }

        /* Row highlighting */
        tr.row-modified { background: #FFFBEB; }
        tr.row-only_in_a { background: #FFF5F5; }
        tr.row-only_in_b { background: #EFF6FF; }
        tr:hover { background: #F8FAFC !important; }

        /* Section separator rows */
        .section-separator td {
            background: #F8FAFC;
            padding: 6px 14px;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 11px;
            color: #475569;
            border-bottom: 2px solid #E2E8F0;
            border-top: 2px solid #E2E8F0;
        }

        /* Footer */
        .report-footer {
            text-align: center;
            padding: 20px;
            color: #94A3B8;
            font-size: 10px;
        }

        /* Print styles */
        @media print {
            body { padding: 16px; background: white; }
            .report-header { break-after: avoid; }
            .no-print { display: none !important; }
            tr { break-inside: avoid; }
            @page { margin: 12mm; size: A3 landscape; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="report-header">
            <h1>O9 Report Comparison</h1>
            <p class="subtitle">Generated on {{ date }}</p>
            <div class="vs-badge">
                <span class="name">{{ report_a_name }}</span>
                <span class="vs">vs</span>
                <span class="name">{{ report_b_name }}</span>
            </div>
        </div>

        <!-- Summary -->
        <div class="summary-grid">
            <div class="stat-card">
                <div class="value color-blue">{{ summary.match_percentage }}%</div>
                <div class="label">Match Score</div>
            </div>
            <div class="stat-card">
                <div class="value color-slate">{{ summary.total_fields }}</div>
                <div class="label">Total Fields</div>
            </div>
            <div class="stat-card">
                <div class="value color-green">{{ summary.identical }}</div>
                <div class="label">Identical</div>
            </div>
            <div class="stat-card">
                <div class="value color-amber">{{ summary.modified }}</div>
                <div class="label">Modified</div>
            </div>
            <div class="stat-card">
                <div class="value color-red">{{ summary.only_in_a + summary.only_in_b }}</div>
                <div class="label">Only in One</div>
            </div>
        </div>

        <!-- Comparison Table -->
        <div class="table-container">
            <div class="table-title">
                <span>📊 Field-by-Field Comparison (Differences Only)</span>
                <span class="count">{{ diff_rows | length }} difference{{ 's' if diff_rows | length != 1 else '' }} found</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:12%">Section</th>
                        <th style="width:15%">Item</th>
                        <th style="width:13%">Field</th>
                        <th style="width:23%">{{ report_a_name }}</th>
                        <th style="width:23%">{{ report_b_name }}</th>
                        <th style="width:14%">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {% set current_section = namespace(value='') %}
                    {% for row in diff_rows %}
                    {% if row.section != current_section.value %}
                    {% set current_section.value = row.section %}
                    <tr class="section-separator">
                        <td colspan="6">{{ row.section }}</td>
                    </tr>
                    {% endif %}
                    <tr class="row-{{ row.status }}">
                        <td class="section-cell {% if 'metadata' in row.section.lower() %}section-metadata{% elif 'filter' in row.section.lower() %}section-filter{% elif 'dimension' in row.section.lower() %}section-dimensions{% elif 'measure' in row.section.lower() %}section-measures{% elif 'setting' in row.section.lower() %}section-settings{% elif 'kpi' in row.section.lower() %}section-kpi{% else %}section-default{% endif %}">{{ row.section }}</td>
                        <td style="font-weight: 500;">{{ row.item }}</td>
                        <td style="font-weight: 500; color: #475569;">{{ row.field }}</td>
                        <td class="mono">{{ row.report_a }}</td>
                        <td class="mono">{{ row.report_b }}</td>
                        <td><span class="badge badge-{{ row.status }}">{{ row.status | replace('_', ' ') }}</span></td>
                    </tr>
                    {% endfor %}
                    {% if diff_rows | length == 0 %}
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #94A3B8; font-size: 13px;">
                            ✅ No differences found — reports are identical.
                        </td>
                    </tr>
                    {% endif %}
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div class="report-footer">
            Generated by QA Automation Engine · {{ date }}
        </div>
    </div>
</body>
</html>
"""


@router.post("/export-unified-report", response_class=HTMLResponse)
async def export_unified_report(request: UnifiedExportRequest):
    """Generate a styled HTML report for unified flat-table comparison results.

    The output HTML is optimized for both browser viewing and PDF export
    (via browser print or html2pdf.js client-side conversion). Only
    non-identical rows are included in the PDF output for clarity.
    """
    try:
        # Filter out identical rows for the PDF — only show differences
        diff_rows = [r for r in request.rows if r.get("status") != "identical"]

        template = Template(UNIFIED_REPORT_TEMPLATE)
        html_content = template.render(
            report_a_name=request.report_a_name,
            report_b_name=request.report_b_name,
            summary=request.summary,
            rows=request.rows,
            diff_rows=diff_rows,
            date=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unified report generation failed: {str(e)}",
        )
