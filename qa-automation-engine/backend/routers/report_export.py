"""Section-aware report export endpoint for PDF-ready HTML generation."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from jinja2 import Template
import datetime

router = APIRouter()


class SectionExportRequest(BaseModel):
    report_a_name: str
    report_b_name: str
    overall_summary: Dict[str, Any]
    metadata_diff: Dict[str, Any]
    section_order: List[str]
    section_diffs: Dict[str, Any]


SECTION_REPORT_TEMPLATE = """
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
            padding: 40px;
            line-height: 1.5;
        }

        .container { max-width: 1200px; margin: 0 auto; }

        /* Header */
        .report-header {
            background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
            color: white;
            padding: 32px 40px;
            border-radius: 16px;
            margin-bottom: 24px;
        }
        .report-header h1 {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 4px;
            letter-spacing: -0.02em;
        }
        .report-header .subtitle {
            font-size: 13px;
            color: #94A3B8;
            font-weight: 500;
        }
        .report-header .vs-badge {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
            font-size: 14px;
            font-weight: 600;
        }
        .report-header .vs-badge .name {
            background: rgba(255,255,255,0.1);
            padding: 6px 14px;
            border-radius: 8px;
            color: #E2E8F0;
        }
        .report-header .vs-badge .vs {
            color: #64748B;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }

        /* Summary cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 4px;
            letter-spacing: -0.02em;
        }
        .stat-card .label {
            font-size: 10px;
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

        /* Section block */
        .section-block {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        .section-header {
            padding: 16px 24px;
            border-bottom: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #F8FAFC;
        }
        .section-header h2 {
            font-size: 15px;
            font-weight: 700;
            color: #1E293B;
            text-transform: capitalize;
        }
        .section-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .status-identical { background: #DCFCE7; color: #16A34A; }
        .status-modified { background: #FEF3C7; color: #D97706; }
        .status-only_in_a { background: #FEE2E2; color: #DC2626; }
        .status-only_in_b { background: #DBEAFE; color: #2563EB; }

        .section-stats {
            padding: 12px 24px;
            display: flex;
            gap: 24px;
            border-bottom: 1px solid #F1F5F9;
            font-size: 12px;
            color: #64748B;
        }
        .section-stats strong { color: #334155; font-weight: 600; }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th {
            background: #F1F5F9;
            color: #475569;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 10px 16px;
            text-align: left;
            border-bottom: 1px solid #E2E8F0;
        }
        td {
            padding: 10px 16px;
            border-bottom: 1px solid #F1F5F9;
            color: #334155;
            font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
            font-size: 11px;
            word-break: break-word;
            max-width: 300px;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #F8FAFC; }

        .field-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .badge-identical { background: #F1F5F9; color: #94A3B8; }
        .badge-modified { background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A; }
        .badge-only_in_a { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; }
        .badge-only_in_b { background: #DBEAFE; color: #2563EB; border: 1px solid #BFDBFE; }

        .row-group-header {
            background: #FAFBFC;
            font-weight: 600;
            color: #475569;
        }
        .row-group-header td {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            padding: 8px 16px;
            border-bottom: 1px solid #E2E8F0;
        }

        /* Metadata section */
        .metadata-block {
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .metadata-header {
            padding: 14px 24px;
            border-bottom: 1px solid #E2E8F0;
            background: #F8FAFC;
        }
        .metadata-header h2 {
            font-size: 14px;
            font-weight: 700;
            color: #1E293B;
        }

        /* Footer */
        .report-footer {
            text-align: center;
            padding: 24px;
            color: #94A3B8;
            font-size: 11px;
        }

        /* Print styles */
        @media print {
            body { padding: 20px; background: white; }
            .section-block { break-inside: avoid; }
            .report-header { break-after: avoid; }
            .no-print { display: none !important; }
            @page { margin: 15mm; size: A4 landscape; }
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

        <!-- Overall Summary -->
        <div class="summary-grid">
            <div class="stat-card">
                <div class="value color-blue">{{ overall_summary.match_percentage }}%</div>
                <div class="label">Match Score</div>
            </div>
            <div class="stat-card">
                <div class="value color-slate">{{ overall_summary.total_sections }}</div>
                <div class="label">Sections</div>
            </div>
            <div class="stat-card">
                <div class="value color-slate">{{ overall_summary.total_fields_compared }}</div>
                <div class="label">Fields Compared</div>
            </div>
            <div class="stat-card">
                <div class="value color-amber">{{ overall_summary.total_differences }}</div>
                <div class="label">Differences</div>
            </div>
            <div class="stat-card">
                <div class="value color-green">{{ overall_summary.sections_identical }}</div>
                <div class="label">Identical Sections</div>
            </div>
        </div>

        <!-- Metadata -->
        {% if metadata_diff and metadata_diff.fields %}
        <div class="metadata-block">
            <div class="metadata-header">
                <h2>📋 Metadata Comparison</h2>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:30%">Field</th>
                        <th style="width:30%">{{ report_a_name }}</th>
                        <th style="width:30%">{{ report_b_name }}</th>
                        <th style="width:10%">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {% for field in metadata_diff.fields %}
                    <tr>
                        <td style="font-family: 'Inter', sans-serif; font-weight: 600;">{{ field.field }}</td>
                        <td>{{ field.report_a }}</td>
                        <td>{{ field.report_b }}</td>
                        <td><span class="field-badge badge-{{ field.status }}">{{ field.status | replace('_', ' ') }}</span></td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <!-- Sections -->
        {% for sec_key in section_order %}
        {% set sec = section_diffs[sec_key] %}
        <div class="section-block">
            <div class="section-header">
                <h2>{{ sec_key | replace('_', ' ') }}</h2>
                <span class="section-status status-{{ sec.status }}">{{ sec.status | replace('_', ' ') }}</span>
            </div>

            {% if sec.summary %}
            <div class="section-stats">
                <span>Rows A: <strong>{{ sec.summary.total_rows_a }}</strong></span>
                <span>Rows B: <strong>{{ sec.summary.total_rows_b }}</strong></span>
                <span>Identical: <strong>{{ sec.summary.rows_identical }}</strong></span>
                <span>Modified: <strong>{{ sec.summary.rows_modified }}</strong></span>
                <span>Only A: <strong>{{ sec.summary.rows_only_in_a }}</strong></span>
                <span>Only B: <strong>{{ sec.summary.rows_only_in_b }}</strong></span>
            </div>
            {% endif %}

            {% if sec.comparisons %}
            <table>
                <thead>
                    <tr>
                        <th style="width:25%">Field</th>
                        <th style="width:30%">{{ report_a_name }}</th>
                        <th style="width:30%">{{ report_b_name }}</th>
                        <th style="width:15%">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {% for comp in sec.comparisons %}
                    <tr class="row-group-header">
                        <td colspan="4">
                            {% if sec.row_key %}{{ sec.row_key }}: {% endif %}<strong>{{ comp.row_key_value }}</strong>
                            — <span class="field-badge badge-{{ comp.status }}">{{ comp.status | replace('_', ' ') }}</span>
                        </td>
                    </tr>
                    {% for field in comp.fields %}
                    {% if field.status != 'identical' %}
                    <tr>
                        <td style="font-family: 'Inter', sans-serif; font-weight: 500; padding-left: 32px;">{{ field.field }}</td>
                        <td>{{ field.report_a }}</td>
                        <td>{{ field.report_b }}</td>
                        <td><span class="field-badge badge-{{ field.status }}">{{ field.status | replace('_', ' ') }}</span></td>
                    </tr>
                    {% endif %}
                    {% endfor %}
                    {% endfor %}
                </tbody>
            </table>
            {% else %}
            <div style="padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">
                {% if sec.status == 'only_in_a' %}
                This section exists only in {{ report_a_name }} ({{ sec.summary.total_rows_a }} rows)
                {% elif sec.status == 'only_in_b' %}
                This section exists only in {{ report_b_name }} ({{ sec.summary.total_rows_b }} rows)
                {% else %}
                No comparison data available.
                {% endif %}
            </div>
            {% endif %}
        </div>
        {% endfor %}

        <!-- Footer -->
        <div class="report-footer">
            Generated by QA Automation Engine · {{ date }}
        </div>
    </div>
</body>
</html>
"""


@router.post("/export-section-report", response_class=HTMLResponse)
async def export_section_report(request: SectionExportRequest):
    """Generate a styled HTML report for section-aware comparison results.
    
    The output HTML is optimized for both browser viewing and PDF export
    (via browser print or html2pdf.js client-side conversion).
    """
    try:
        template = Template(SECTION_REPORT_TEMPLATE)
        html_content = template.render(
            report_a_name=request.report_a_name,
            report_b_name=request.report_b_name,
            overall_summary=request.overall_summary,
            metadata_diff=request.metadata_diff,
            section_order=request.section_order,
            section_diffs=request.section_diffs,
            date=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
