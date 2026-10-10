"""
main.py — Sanchal Backend (FastAPI)
─────────────────────────────────────────────────────────────────────────────
Serves spatial conflict data to the Next.js frontend, performs real-time
geometric conflict detection using Shapely, scores delay risk, and acts as
a Twilio WhatsApp webhook receiver.

Run:
    uvicorn main:app --reload --port 8000

Install deps:
    pip install fastapi uvicorn python-multipart shapely
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from shapely.geometry import LineString, mapping
from shapely.ops import unary_union

# ─────────────────────────────────────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sanchal API",
    description="Municipal road-digging conflict detection backend — powered by Shapely.",
    version="2.0.0",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — Allow all origins for local hackathon development
# ─────────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# RAW PROJECT DATA  (the single source of truth — edit here to add projects)
#
# coordinates: list of [lon, lat] pairs  (GeoJSON convention)
# Buffer radius uses decimal-degree approximation:
#   ~0.000090° ≈ 10 m near Chennai  (1° lat ≈ 111 km)
# ─────────────────────────────────────────────────────────────────────────────
BUFFER_DEGREES = 0.00009   # ≈ 10-metre excavation corridor

RAW_PROJECTS: list[dict[str, Any]] = [
    {
        "id": "PRJ-001",
        "department": "Chennai Metropolitan Water Supply & Sewerage Board",
        "purpose": "Underground water pipeline replacement",
        "startDate": "2026-09-15",
        "endDate": "2026-10-20",
        "coordinates": [
            [80.265, 13.082],
            [80.268, 13.084],
            [80.271, 13.086],
            [80.274, 13.087],
        ],
    },
    {
        "id": "PRJ-002",
        "department": "Jio Telecom – Fiber Division",
        "purpose": "Fiber optic cable laying",
        "startDate": "2026-10-01",
        "endDate": "2026-11-05",
        "coordinates": [
            [80.270, 13.079],
            [80.272, 13.082],
            [80.274, 13.085],
            [80.276, 13.088],
        ],
    },
    {
        "id": "PRJ-003",
        "department": "Tamil Nadu Generation & Distribution Corporation (TANGEDCO)",
        "purpose": "Underground power cable trench",
        "startDate": "2026-10-03",
        "endDate": "2026-11-10",
        "coordinates": [
            [80.271, 13.078],
            [80.273, 13.081],
            [80.275, 13.084],
            [80.277, 13.087],
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# ███  SPATIAL CONFLICT SOLVER  ███
#
# Algorithm:
#   1. Convert each project's coordinates into a Shapely LineString.
#   2. Buffer each line by BUFFER_DEGREES to create an excavation corridor.
#   3. For every pair (i, j), test if buffer_i intersects buffer_j AND
#      the date ranges overlap (temporal filter).
#   4. Mark conflicting project IDs and record pairwise overlap geometry.
#
# Why pure Shapely (not GeoPandas)?
#   GeoPandas requires compiled GDAL/Fiona binaries that are painful to install
#   on Windows without conda. Shapely is a pure-Python wrapper over GEOS and
#   installs with a single pip command.
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _dates_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    """Return True if two [start, end] date ranges overlap."""
    s1, e1 = _parse_date(start1), _parse_date(end1)
    s2, e2 = _parse_date(start2), _parse_date(end2)
    return s1 <= e2 and s2 <= e1


def _overlap_length_metres(geom1: LineString, geom2: LineString) -> float:
    """
    Approximate the length of the buffered intersection in metres.
    Uses the centroid latitude to correct longitude degrees → metres.
    """
    buf1 = geom1.buffer(BUFFER_DEGREES)
    buf2 = geom2.buffer(BUFFER_DEGREES)
    intersection = buf1.intersection(buf2)
    if intersection.is_empty:
        return 0.0
    # Convert degrees to metres at Chennai's latitude (~13°N)
    lat_rad = math.radians(13.0827)
    metres_per_deg_lon = 111_320 * math.cos(lat_rad)
    metres_per_deg_lat = 110_574
    # Use bounding box diagonal as a proxy for overlap extent
    minx, miny, maxx, maxy = intersection.bounds
    dx = (maxx - minx) * metres_per_deg_lon
    dy = (maxy - miny) * metres_per_deg_lat
    return math.sqrt(dx**2 + dy**2)


def run_conflict_solver(projects: list[dict]) -> dict[str, Any]:
    """
    Run pairwise spatial + temporal conflict detection across all projects.

    Returns a dict with:
      - enriched_features : GeoJSON features with computed `status` and
                            `conflictsWith` properties
      - conflicts         : list of pairwise conflict records
      - summary           : aggregate statistics
    """
    n = len(projects)

    # Build Shapely geometries
    lines = [LineString(p["coordinates"]) for p in projects]
    buffers = [line.buffer(BUFFER_DEGREES) for line in lines]

    # Track which project IDs are in conflict
    conflict_ids: set[str] = set()
    conflict_records: list[dict] = []

    for i in range(n):
        for j in range(i + 1, n):
            # Temporal overlap check first (cheap)
            if not _dates_overlap(
                projects[i]["startDate"], projects[i]["endDate"],
                projects[j]["startDate"], projects[j]["endDate"],
            ):
                continue

            # Spatial intersection check
            if buffers[i].intersects(buffers[j]):
                overlap_m = _overlap_length_metres(lines[i], lines[j])

                conflict_ids.add(projects[i]["id"])
                conflict_ids.add(projects[j]["id"])

                conflict_records.append({
                    "project1_id": projects[i]["id"],
                    "project2_id": projects[j]["id"],
                    "dept1": projects[i]["department"],
                    "dept2": projects[j]["department"],
                    "overlap_metres": round(overlap_m, 1),
                    "delay_risk_score": _compute_delay_risk(
                        projects[i], projects[j], overlap_m
                    ),
                })

    # Build enriched GeoJSON features
    features = []
    for p in projects:
        is_conflict = p["id"] in conflict_ids
        conflicting_with = [
            r["dept2"] if r["project1_id"] == p["id"] else r["dept1"]
            for r in conflict_records
            if p["id"] in (r["project1_id"], r["project2_id"])
        ]
        features.append({
            "type": "Feature",
            "properties": {
                **{k: v for k, v in p.items() if k != "coordinates"},
                "status": "Critical Overlap" if is_conflict else "On Schedule",
                "conflictsWith": conflicting_with,
            },
            "geometry": {
                "type": "LineString",
                "coordinates": p["coordinates"],
            },
        })

    total = len(projects)
    overlapping = len(conflict_ids)
    avg_risk = (
        round(
            sum(r["delay_risk_score"] for r in conflict_records) / len(conflict_records), 1
        )
        if conflict_records
        else 0.0
    )

    return {
        "enriched_features": features,
        "conflicts": conflict_records,
        "summary": {
            "total_projects": total,
            "active_excavations": total,
            "critical_overlaps": len(conflict_records),
            "projects_in_conflict": overlapping,
            "avg_delay_risk_pct": avg_risk,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# ███  DELAY RISK SCORER  ███
#
# A lightweight heuristic model (no ML framework needed for MVP).
# Factors:
#   • Spatial overlap length  — longer overlap = higher risk
#   • Temporal overlap days   — more concurrent days = higher risk
#   • Department type penalty — power/telecom vs water has higher disruption risk
#
# Score is bounded [0, 100]. Replace with LightGBM later by swapping this fn.
# ─────────────────────────────────────────────────────────────────────────────

_DEPT_RISK_WEIGHT = {
    "tangedco": 1.4,    # Electricity — highest disruption, safety risk
    "telecom":  1.2,    # Telecom fiber — moderate, often urgent
    "water":    1.0,    # Water — baseline
}


def _dept_weight(dept_name: str) -> float:
    name_lower = dept_name.lower()
    for keyword, weight in _DEPT_RISK_WEIGHT.items():
        if keyword in name_lower:
            return weight
    return 1.0


def _compute_delay_risk(p1: dict, p2: dict, overlap_m: float) -> float:
    """
    Heuristic delay risk score in [0, 100].

    Formula:
        base     = min(overlap_m / 50, 1.0) * 60   # spatial component, max 60pts
        temporal = min(temporal_overlap_days / 30, 1.0) * 30  # time component, max 30pts
        dept_pen = (weight1 + weight2) / 2 * 10    # dept penalty, max ~14pts
        total    = clamp(base + temporal + dept_pen, 0, 100)
    """
    # Temporal overlap in days
    s1, e1 = _parse_date(p1["startDate"]), _parse_date(p1["endDate"])
    s2, e2 = _parse_date(p2["startDate"]), _parse_date(p2["endDate"])
    overlap_start = max(s1, s2)
    overlap_end   = min(e1, e2)
    temporal_days = max((overlap_end - overlap_start).days, 0)

    spatial_score   = min(overlap_m / 50.0, 1.0) * 60
    temporal_score  = min(temporal_days / 30.0, 1.0) * 30
    dept_penalty    = ((_dept_weight(p1["department"]) + _dept_weight(p2["department"])) / 2) * 10

    raw = spatial_score + temporal_score + dept_penalty
    return round(min(raw, 100.0), 1)


# ─────────────────────────────────────────────────────────────────────────────
# ███  NLP SENTIMENT STUB  ███
#
# Placeholder for Hugging Face integration.
# Drop-in replacement: swap the body with a transformers pipeline call.
# ─────────────────────────────────────────────────────────────────────────────

def analyse_sentiment(text: str) -> dict[str, Any]:
    """
    Stub: returns mock sentiment for a grievance message.
    Replace with:
        from transformers import pipeline
        _pipe = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")
        result = _pipe(text)[0]
    """
    text_lower = text.lower()
    negative_keywords = ["broken", "damage", "flood", "leak", "accident", "urgent", "dead"]
    score = sum(1 for kw in negative_keywords if kw in text_lower)

    if score >= 2:
        return {"label": "NEGATIVE", "confidence": 0.91, "urgency": "High"}
    elif score == 1:
        return {"label": "NEGATIVE", "confidence": 0.65, "urgency": "Medium"}
    else:
        return {"label": "NEUTRAL",  "confidence": 0.80, "urgency": "Low"}


# ─────────────────────────────────────────────────────────────────────────────
# Pre-compute on startup so endpoints are instant
# ─────────────────────────────────────────────────────────────────────────────
_solver_result = run_conflict_solver(RAW_PROJECTS)
print("─" * 60)
print("[Sanchal] Spatial conflict solver ran on startup")
print(f"  Projects   : {_solver_result['summary']['total_projects']}")
print(f"  Overlaps   : {_solver_result['summary']['critical_overlaps']}")
print(f"  Avg risk   : {_solver_result['summary']['avg_delay_risk_pct']}%")
for c in _solver_result["conflicts"]:
    print(f"  ⚠  {c['dept1']}  ×  {c['dept2']}")
    print(f"     overlap={c['overlap_metres']}m  risk={c['delay_risk_score']}%")
print("─" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/projects
# Returns a GeoJSON FeatureCollection with Shapely-computed conflict statuses.
# ─────────────────────────────────────────────────────────────────────────────
@app.get(
    "/api/projects",
    summary="Get active road-cut projects with computed conflict status",
    response_description="GeoJSON FeatureCollection — status field is computed by Shapely",
)
async def get_projects() -> dict:
    """
    Returns a GeoJSON FeatureCollection. Each feature's `status` property
    ('Critical Overlap' or 'On Schedule') is computed at startup by the
    Shapely spatial conflict solver, not hardcoded.
    """
    return {
        "type": "FeatureCollection",
        "features": _solver_result["enriched_features"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/conflicts
# Returns pairwise conflict records + summary statistics.
# The frontend sidebar should consume this endpoint instead of its hardcoded array.
# ─────────────────────────────────────────────────────────────────────────────
@app.get(
    "/api/conflicts",
    summary="Get pairwise conflict records and summary stats",
)
async def get_conflicts() -> dict:
    """
    Returns:
      - conflicts : list of pairwise conflict objects with overlap_metres
                   and delay_risk_score computed by the heuristic scorer
      - summary   : aggregate stats (total projects, overlaps, avg risk %)
    """
    return {
        "conflicts": _solver_result["conflicts"],
        "summary": _solver_result["summary"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/whatsapp
# Twilio WhatsApp webhook receiver.
# Now runs NLP sentiment analysis on the inbound message and tailors the reply.
# ─────────────────────────────────────────────────────────────────────────────
@app.post(
    "/api/whatsapp",
    summary="Twilio WhatsApp webhook with NLP sentiment routing",
    response_description="TwiML XML response sent back to Twilio",
)
async def whatsapp_webhook(request: Request) -> Response:
    """
    Receives an inbound WhatsApp message from Twilio.
    Runs sentiment analysis on the message body to detect urgency,
    logs results to terminal, and returns a context-aware TwiML reply.
    """
    form_data = await request.form()
    sender: str = str(form_data.get("From", "unknown"))
    body: str   = str(form_data.get("Body", ""))

    # NLP sentiment analysis
    sentiment = analyse_sentiment(body)
    conflict_count = _solver_result["summary"]["critical_overlaps"]

    print("─" * 60)
    print("[Sanchal WhatsApp] Incoming message")
    print(f"  From      : {sender}")
    print(f"  Body      : {body}")
    print(f"  Sentiment : {sentiment['label']} (confidence={sentiment['confidence']}, urgency={sentiment['urgency']})")
    print("─" * 60)

    # Build context-aware TwiML reply
    if sentiment["urgency"] == "High":
        reply_text = (
            f"🚨 Sanchal AI [URGENT]: Your grievance has been flagged as HIGH priority. "
            f"There are currently {conflict_count} active road-digging conflicts in Chennai. "
            "An escalation report is being generated for the District Collector."
        )
    elif conflict_count > 0:
        reply_text = (
            f"⚠ Sanchal AI: We have received your query. "
            f"Our system has detected {conflict_count} active digging conflict(s) near you. "
            "Type 'REPORT' to receive a detailed conflict summary."
        )
    else:
        reply_text = (
            "✅ Sanchal AI: We have received your query. "
            "No critical road conflicts are currently active in your area. "
            "We will notify you if a new conflict is detected."
        )

    twiml_response = (
        "<?xml version='1.0' encoding='UTF-8'?>"
        "<Response>"
        f"<Message>{reply_text}</Message>"
        "</Response>"
    )

    return Response(content=twiml_response, media_type="application/xml")


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health", include_in_schema=False)
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "Sanchal API",
        "solver_version": "shapely-heuristic-v1",
        "conflicts_detected": _solver_result["summary"]["critical_overlaps"],
    }
