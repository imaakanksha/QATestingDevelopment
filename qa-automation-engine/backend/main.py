from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import compare, converter, flattener, export, report_export, unified_export, health

app = FastAPI(title="QA Automation Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compare.router, prefix="/api", tags=["compare"])
app.include_router(converter.router, prefix="/api", tags=["converter"])
app.include_router(flattener.router, prefix="/api", tags=["flattener"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(report_export.router, prefix="/api", tags=["report-export"])
app.include_router(unified_export.router, prefix="/api", tags=["unified-export"])
app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
def read_root():
    return {"message": "QA Automation Engine API is running"}
