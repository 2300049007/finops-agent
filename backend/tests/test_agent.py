import os
import sys
import pytest

# Add root folder to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.services.agent.graph import run_nlp_reasoning, support_agent_node, AgentState

def test_nlp_reasoning_intent_refund():
    """Verify that keywords trigger refund intent detection."""
    text = "Please refund my payment. Double charged txn_12345 in Swiggy for Rs. 500."
    res = run_nlp_reasoning(text)
    assert res["intent"] == "Refund Request"
    assert res["payment_id"] == "TXN_12345"
    assert res["refund_amount"] == 500.0

def test_nlp_reasoning_intent_blocked():
    """Verify lock and account keywords trigger block access intents."""
    text = "Help, my card is locked and account is blocked. I can't log in."
    res = run_nlp_reasoning(text)
    assert res["intent"] == "Account Access Issue"

def test_nlp_reasoning_sentiment_angry():
    """Verify hostile keywords capture angry sentiments."""
    text = "This is the worst service ever! I am angry, unacceptable cancelation fee!"
    res = run_nlp_reasoning(text)
    assert res["sentiment"] == "Angry"
