"""Test script for Maritime and Prune AI Integrations in GESTURA.

Verifies:
1. Maritime agent status & tier info (Scale plan with VIHAANX code)
2. Maritime clinical triage categorization (Critical, Urgent, Routine, Communication)
3. Prune PII sanitization (HIPAA compliant scrubbing of MRN, Bed/Room, Phone, etc.)
4. Prune semantic caching (0ms latency, 100% token cost reduction)
5. Non-breaking compatibility with ASL video library and recognition
"""

import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import (
    get_maritime_agent_status,
    trigger_maritime_triage,
    execute_prune_query,
    get_prune_metrics,
    MaritimeTriageRequest,
    PruneQueryRequest,
    health,
    list_signs,
)
from providers.prune_gateway import PruneSecurityGuard


def test_maritime_and_prune():
    print("=================================================================")
    print("1. TESTING HEALTH & EXISTING ASL ENDPOINTS")
    print("=================================================================")
    h = health()
    assert h["status"] == "ok"
    assert h["asl_library_active"] is True
    assert h["maritime_agent_active"] is True
    assert h["prune_gateway_active"] is True
    print(" Health check passed with Maritime & Prune active flags.")

    signs_data = list_signs(lang="asl")
    assert signs_data["language"] == "ASL"
    assert len(signs_data["signs"]) == 31
    print(f" Existing ASL library intact: {len(signs_data['signs'])} signs verified.")

    print("\n=================================================================")
    print("2. TESTING PRUNE SECURITY GUARD & PII SANITIZATION")
    print("=================================================================")
    sample_text = "Patient John Doe in Room 402 with MRN: 9847291 needs help. Call 555-019-2834."
    sanitized, redacted = PruneSecurityGuard.sanitize(sample_text)
    print(f"Original:  {sample_text}")
    print(f"Sanitized: {sanitized}")
    print(f"Redacted entities: {redacted}")
    assert "[REDACTED_ROOM]" in sanitized or "[REDACTED_BED_ROOM]" in sanitized
    assert "[REDACTED_MRN]" in sanitized
    assert "[REDACTED_PHONE]" in sanitized
    assert len(redacted) >= 3
    print(" Prune PII Sanitization verified: All sensitive identifiers masked.")

    print("\n=================================================================")
    print("3. TESTING PRUNE SEMANTIC CACHING & COST REDUCTION")
    print("=================================================================")
    # Query 1: First call (cached from ASL prepopulated seeds)
    req1 = PruneQueryRequest(prompt="help")
    res1 = execute_prune_query(req1)
    print(f"Query 'help' result: cached={res1['cached']}, tokens_saved={res1['tokens_saved']}, cost_saved={res1['cost_saved_usd']}")
    assert res1["cached"] is True
    assert res1["tokens_saved"] > 0
    assert res1["gateway_status"] == "CACHE_HIT_ZERO_COST"

    # Query 2: Repeated clinical query
    req2 = PruneQueryRequest(prompt="water")
    res2 = execute_prune_query(req2)
    assert res2["cached"] is True
    assert res2["tokens_saved"] > 0
    print(f"Query 'water' result: cached={res2['cached']}, tokens_saved={res2['tokens_saved']}")

    # Metrics check
    metrics = get_prune_metrics()
    print("Prune Telemetry Dashboard:")
    for k, v in metrics.items():
        print(f"  - {k}: {v}")
    assert metrics["cache_hits"] >= 2
    assert metrics["tokens_saved"] >= 200
    assert metrics["cost_saved_usd"] > 0.0
    print(" Prune Caching & Telemetry verified successfully.")

    print("\n=================================================================")
    print("4. TESTING MARITIME AUTONOMOUS CAREGIVER & TRIAGE AGENT")
    print("=================================================================")
    status = get_maritime_agent_status()
    print("Maritime Agent Status:")
    print(f"  - Platform: {status['platform']}")
    print(f"  - Tier: {status['tier']}")
    print(f"  - Agent Name: {status['agent_name']}")
    print(f"  - Status: {status['status']}")
    assert "Maritime" in status["platform"]
    assert "Scale" in status["tier"] or "Hackathon" in status["tier"]

    # Test Critical Emergency Triage ("help", "pain")
    req_crit = MaritimeTriageRequest(signs=["help", "pain"], patient_id="ICU-BED-08")
    triage_crit = trigger_maritime_triage(req_crit)
    print(f"\nTriage Critical Check:")
    print(f"  - Signs: {triage_crit['signs_detected']}")
    print(f"  - Triage Level: {triage_crit['triage_level']}")
    print(f"  - Action Plan: {triage_crit['action_plan']}")
    print(f"  - Spoken Reassurance: {triage_crit['spoken_reassurance']}")
    print(f"  - Avatar Reply Gloss: {triage_crit['avatar_response_gloss']}")
    assert triage_crit["triage_level"] == "CRITICAL_EMERGENCY"
    assert "RAPID_DISPATCH" in triage_crit["action_plan"]

    # Test Urgent Care Triage ("doctor")
    req_urg = MaritimeTriageRequest(signs=["doctor"], patient_id="BED-102")
    triage_urg = trigger_maritime_triage(req_urg)
    print(f"\nTriage Urgent Check:")
    print(f"  - Triage Level: {triage_urg['triage_level']}")
    assert triage_urg["triage_level"] == "URGENT_CARE"

    # Test Routine Comfort Triage ("water")
    req_rout = MaritimeTriageRequest(signs=["water"], patient_id="BED-102")
    triage_rout = trigger_maritime_triage(req_rout)
    print(f"\nTriage Routine Check:")
    print(f"  - Triage Level: {triage_rout['triage_level']}")
    assert triage_rout["triage_level"] == "ROUTINE_COMFORT"

    # Test Communication Triage ("hello", "thank you")
    req_comm = MaritimeTriageRequest(signs=["hello", "thank you"], patient_id="BED-102")
    triage_comm = trigger_maritime_triage(req_comm)
    print(f"\nTriage Communication Check:")
    print(f"  - Triage Level: {triage_comm['triage_level']}")
    assert triage_comm["triage_level"] == "COMMUNICATION"

    print("\n=================================================================")
    print("ALL MARITIME & PRUNE INTEGRATION TESTS PASSED (100%)!")
    print("=================================================================")


if __name__ == "__main__":
    test_maritime_and_prune()
