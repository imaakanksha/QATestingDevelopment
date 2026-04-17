from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, List
from jinja2 import Template
import datetime

router = APIRouter()

class ExportRequest(BaseModel):
    summary: Dict[str, Any]
    differences: List[Dict[str, Any]]

REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>QA Automation Engine - Diff Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background-color: #FFFFFF; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; border: 1px solid #E2E8F0; }
        .header h1 { margin: 0 0 10px 0; color: #0F172A; font-size: 24px;}
        .header p { margin: 0; color: #64748B; font-size: 14px; }
        .summary-card { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 24px; }
        .stat { background: #FFFFFF; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; }
        .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 5px; color: #1E293B; }
        .stat-label { font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
        .table-container { background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 16px 20px; text-align: left; border-bottom: 1px solid #E2E8F0; }
        th { background: #F1F5F9; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #334155; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background-color: #F8FAFC; }
        .badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-block; }
        .badge-added { background: #DCFCE7; color: #16A34A; border: 1px solid #BBF7D0; }
        .badge-removed { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; }
        .badge-modified { background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>QA Automation Engine - Difference Report</h1>
            <p>Generated on: {{ date }}</p>
        </div>
        
        <div class="summary-card">
            <div class="stat"><div class="stat-value" style="color: #2563EB;">{{ summary.match_score }}%</div><div class="stat-label">Match Score</div></div>
            <div class="stat"><div class="stat-value">{{ summary.total_keys }}</div><div class="stat-label">Total Keys</div></div>
            <div class="stat"><div class="stat-value" style="color: #16A34A;">{{ summary.added }}</div><div class="stat-label">Added</div></div>
            <div class="stat"><div class="stat-value" style="color: #DC2626;">{{ summary.removed }}</div><div class="stat-label">Removed</div></div>
            <div class="stat"><div class="stat-value" style="color: #D97706;">{{ summary.modified }}</div><div class="stat-label">Modified</div></div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Key Path</th>
                        <th>Baseline Value</th>
                        <th>Target Value</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    {% for diff in differences %}
                    <tr>
                        <td style="max-width: 300px; word-wrap: break-word;">{{ diff.key_path }}</td>
                        <td style="max-width: 300px; word-wrap: break-word;">{% if diff.change_type == 'added' %}-{% else %}{{ diff.baseline_value | string }}{% endif %}</td>
                        <td style="max-width: 300px; word-wrap: break-word;">{% if diff.change_type == 'removed' %}-{% else %}{{ diff.target_value | string }}{% endif %}</td>
                        <td>
                            <span class="badge badge-{{ diff.change_type }}">{{ diff.change_type }}</span>
                        </td>
                    </tr>
                    {% else %}
                    <tr><td colspan="4" style="text-align: center; padding: 40px; color: #64748B;">No differences found.</td></tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
"""

@router.post("/export-report", response_class=HTMLResponse)
async def export_report(request: ExportRequest):
    try:
        template = Template(REPORT_TEMPLATE)
        html_content = template.render(
            summary=request.summary,
            differences=request.differences,
            date=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
