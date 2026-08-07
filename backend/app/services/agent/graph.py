import re
import datetime
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal
from backend.app.db.models import SupportTicket, Customer, Transaction, ApprovalRequest, AuditLog
from backend.app.services.rag.vector_store import policy_rag
from backend.app.services.agent.tools import (
    crm_search_customer_tool, crm_get_customer_history_tool,
    payment_search_transaction_tool, payment_refund_transaction_tool,
    fraud_calculate_risk_tool, kyc_get_details_tool, audit_store_log_tool
)
from backend.app.config import settings

# State definition
class AgentState(TypedDict):
    ticket_id: int
    ticket_subject: str
    ticket_description: str
    customer_id: Optional[int]
    customer_name: Optional[str]
    customer_email: Optional[str]
    intent: Optional[str]
    sentiment: Optional[str]
    payment_id: Optional[str]
    refund_amount: Optional[float]
    risk_score: Optional[float]
    risk_evidence: List[str]
    approval_required: bool
    approval_type: Optional[str]  # Refund, AccountBlock, AccountFreeze, FraudHold, KYCRejection
    approval_reason: Optional[str]
    next_action: str  # "EXECUTE", "HOLD", "RESOLVE", "WAIT_FOR_APPROVAL"
    execution_plan: List[str]
    audit_trail: List[Dict[str, Any]]
    rag_context: Optional[str]
    agent_response: Optional[str]

# High-fidelity NLP Rule Fallback for AI Reasoning
def run_nlp_reasoning(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    
    # 1. Intent Detection
    intent = "General Support"
    if any(kwd in text_lower for kwd in ["refund", "money back", "reimburse", "charge back", "double charged"]):
        intent = "Refund Request"
    elif any(kwd in text_lower for kwd in ["block", "freeze", "locked", "suspend", "cannot log in"]):
        intent = "Account Access Issue"
    elif any(kwd in text_lower for kwd in ["kyc", "verify identity", "pan card", "aadhaar", "document"]):
        intent = "KYC Inquiry"
    elif any(kwd in text_lower for kwd in ["fraud", "hacked", "unauthorized", "scam", "stolen"]):
        intent = "Fraud Report"

    # 2. Sentiment Analysis
    sentiment = "Neutral"
    if any(kwd in text_lower for kwd in ["angry", "furious", "unacceptable", "terrible", "worst", "sue", "legal"]):
        sentiment = "Angry"
    elif any(kwd in text_lower for kwd in ["please", "thank", "appreciate", "helpful"]):
        sentiment = "Polite"

    # 3. Entity Extraction (e.g. Transaction ID, Refund Amount)
    payment_id = None
    tx_match = re.search(r'(txn_?[0-9a-zA-Z]+)', text, re.IGNORECASE)
    if tx_match:
        payment_id = tx_match.group(1).upper()

    amount = None
    amt_match = re.search(r'(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)', text, re.IGNORECASE)
    if amt_match:
        amount = float(amt_match.group(1).replace(",", ""))

    return {
        "intent": intent,
        "sentiment": sentiment,
        "payment_id": payment_id,
        "refund_amount": amount
    }

# LANGGRAPH NODES
def support_agent_node(state: AgentState) -> AgentState:
    """Ingests ticket, retrieves customer details from CRM, detects sentiment/intent."""
    db: Session = SessionLocal()
    audit_trail = list(state.get("audit_trail", []))
    execution_plan = list(state.get("execution_plan", []))
    
    ticket_id = state["ticket_id"]
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    
    customer_id = state.get("customer_id")
    customer_name = state.get("customer_name")
    customer_email = state.get("customer_email")
    
    if ticket:
        customer_id = ticket.customer_id
        customer = ticket.customer
        if customer:
            customer_name = customer.name
            customer_email = customer.email
    
    desc = state["ticket_description"]
    
    # Run NLP reasoning (or OpenAI if key set)
    nlp_res = run_nlp_reasoning(desc)
    intent = nlp_res["intent"]
    sentiment = nlp_res["sentiment"]
    payment_id = nlp_res["payment_id"]
    refund_amount = nlp_res["refund_amount"]
    
    # Retrieve customer history from CRM
    crm_history = {}
    if customer_id:
        crm_history = crm_get_customer_history_tool(db, customer_id)
        # If payment_id not in ticket text, look up customer's last transaction
        if not payment_id and crm_history.get("recent_transactions"):
            payment_id = crm_history["recent_transactions"][-1]["payment_id"]
            
    # Search RAG SOP
    rag_docs = policy_rag.search_policies(f"SOP for support tickets intent {intent}", limit=1)
    rag_context = rag_docs[0]["content"] if rag_docs else ""
    
    # Update execution plan
    execution_plan.append("Support: Parsed customer query and matched records.")
    
    step_log = {
        "node": "Support Agent",
        "action": "Customer Profile Resolved",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "summary": f"Identified customer {customer_name} (ID: {customer_id}) with intent: '{intent}' ({sentiment} sentiment)."
    }
    audit_trail.append(step_log)
    
    # Store audit in DB
    audit_store_log_tool(
        db,
        action="Ticket Classified",
        category="Support",
        details=f"Intent: {intent}, Sentiment: {sentiment}, Extracted Tx: {payment_id}",
        confidence=0.95,
        reason="NLP extraction from ticket text",
        request_payload={"ticket_id": ticket_id},
        response_payload={"intent": intent, "customer_id": customer_id}
    )
    
    db.close()
    
    return {
        **state,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "intent": intent,
        "sentiment": sentiment,
        "payment_id": payment_id,
        "refund_amount": refund_amount or state.get("refund_amount"),
        "execution_plan": execution_plan,
        "audit_trail": audit_trail,
        "rag_context": rag_context
    }

def payments_agent_node(state: AgentState) -> AgentState:
    """Verifies transaction status and refund eligibility."""
    db: Session = SessionLocal()
    audit_trail = list(state.get("audit_trail", []))
    execution_plan = list(state.get("execution_plan", []))
    
    intent = state.get("intent")
    payment_id = state.get("payment_id")
    refund_amount = state.get("refund_amount")
    
    approval_required = state.get("approval_required", False)
    approval_type = state.get("approval_type")
    approval_reason = state.get("approval_reason")
    
    if intent == "Refund Request" and payment_id:
        tx = payment_search_transaction_tool(db, payment_id)
        if "error" not in tx:
            tx_amount = tx["amount"]
            tx_status = tx["status"]
            
            # Update refund amount if not parsed
            if not refund_amount:
                refund_amount = tx_amount
                
            execution_plan.append(f"Payments: Loaded transaction {payment_id} (amount: ₹{tx_amount}).")
            
            # Check Refund policies
            rag_docs = policy_rag.search_policies("Refund thresholds and manager approvals", limit=1)
            rag_context = rag_docs[0]["content"] if rag_docs else ""
            
            # Threshold check: Refund > 10,000 INR triggers manager approval
            if refund_amount > 10000:
                approval_required = True
                approval_type = "Refund"
                approval_reason = f"Refund amount ₹{refund_amount:,} exceeds manager approval threshold of ₹10,000."
                execution_plan.append("Payments: Flagged for manager approval (limit exceeded).")
            else:
                execution_plan.append(f"Payments: Approved for automated payout of ₹{refund_amount:,}.")
                
            step_log = {
                "node": "Payments Agent",
                "action": "Transaction Investigation Complete",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Tx {payment_id} is '{tx_status}'. Refund of ₹{refund_amount:,} evaluated. Approval required: {approval_required}."
            }
            audit_trail.append(step_log)
            
            audit_store_log_tool(
                db,
                action="Refund Policy Evaluated",
                category="Payment",
                details=f"Tx ID: {payment_id}, Amount: ₹{refund_amount}, Approval required: {approval_required}",
                confidence=0.98,
                reason=approval_reason or "Amount within allowed automated limits.",
                request_payload={"payment_id": payment_id, "refund_amount": refund_amount},
                response_payload={"approval_required": approval_required}
            )
        else:
            execution_plan.append("Payments: Transaction reference not found in logs.")
            step_log = {
                "node": "Payments Agent",
                "action": "Transaction Audit Failed",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Failed to locate payment reference {payment_id}."
            }
            audit_trail.append(step_log)
    else:
        execution_plan.append("Payments: Skipping node (no payment/refund intent).")
        
    db.close()
    
    return {
        **state,
        "refund_amount": refund_amount,
        "approval_required": approval_required,
        "approval_type": approval_type,
        "approval_reason": approval_reason,
        "execution_plan": execution_plan,
        "audit_trail": audit_trail
    }

def fraud_agent_node(state: AgentState) -> AgentState:
    """Runs transaction risk analysis, checks customer profile blocks."""
    db: Session = SessionLocal()
    audit_trail = list(state.get("audit_trail", []))
    execution_plan = list(state.get("execution_plan", []))
    
    payment_id = state.get("payment_id")
    customer_id = state.get("customer_id")
    
    approval_required = state.get("approval_required", False)
    approval_type = state.get("approval_type")
    approval_reason = state.get("approval_reason")
    
    risk_score = 0.0
    risk_evidence = []
    
    if payment_id:
        tx = db.query(Transaction).filter(Transaction.payment_id == payment_id).first()
        if tx:
            # Run risk evaluation
            risk_res = fraud_calculate_risk_tool(db, tx.id)
            risk_score = risk_res["risk_score"]
            risk_evidence = risk_res["evidence"]
            
            # Policy Check
            if risk_score >= 0.8:
                approval_required = True
                approval_type = "FraudHold"
                approval_reason = f"High fraud risk score detected ({risk_score}). Evidence: {', '.join(risk_evidence)}"
                execution_plan.append("Fraud: Proposed Account Block / Hold due to severe risk.")
            elif risk_score >= 0.4:
                execution_plan.append("Fraud: Medium risk warning logged; proceed with standard approval queue check.")
                
            step_log = {
                "node": "Fraud Agent",
                "action": "Fraud Profiling Complete",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Risk assessment scored {risk_score}. Indicators: {len(risk_evidence)} flags identified."
            }
            audit_trail.append(step_log)
            
            audit_store_log_tool(
                db,
                action="Fraud Assessment Executed",
                category="Fraud",
                details=f"Tx ID: {payment_id}, Risk: {risk_score}, Evidence: {risk_evidence}",
                confidence=0.90,
                reason=f"Scored {risk_score} based on security heuristic rules.",
                request_payload={"payment_id": payment_id},
                response_payload={"risk_score": risk_score, "evidence": risk_evidence}
            )
            
    db.close()
    
    return {
        **state,
        "risk_score": risk_score,
        "risk_evidence": risk_evidence,
        "approval_required": approval_required,
        "approval_type": approval_type,
        "approval_reason": approval_reason,
        "execution_plan": execution_plan,
        "audit_trail": audit_trail
    }

def workflow_agent_node(state: AgentState) -> AgentState:
    """Coordinates execution, compiles the resolution plan."""
    db: Session = SessionLocal()
    audit_trail = list(state.get("audit_trail", []))
    execution_plan = list(state.get("execution_plan", []))
    
    approval_required = state.get("approval_required", False)
    intent = state.get("intent")
    
    next_action = "RESOLVE"
    agent_response = ""
    
    if approval_required:
        next_action = "WAIT_FOR_APPROVAL"
        agent_response = f"Your request has been routed to a human manager for validation. Details: {state.get('approval_reason')}"
        execution_plan.append("Workflow: Halting automated execution; routing to Human Approval Queue.")
    else:
        next_action = "EXECUTE"
        payment_id = state.get("payment_id")
        refund_amount = state.get("refund_amount")
        
        if intent == "Refund Request" and payment_id and refund_amount:
            # Automated refund execution
            res = payment_refund_transaction_tool(db, payment_id, refund_amount, "AI Automated low-risk refund")
            if res.get("success"):
                agent_response = f"Refund of ₹{refund_amount:,} for transaction {payment_id} was successfully executed."
                execution_plan.append(f"Workflow: Automated refund issued (payout ID: {res.get('refund_id')}).")
            else:
                agent_response = f"Attempted to process refund of ₹{refund_amount:,} but payments server responded: {res.get('error')}"
                execution_plan.append("Workflow: Automated refund execution failed.")
        else:
            agent_response = "We have reviewed your request. A support representative will resolve your query shortly."
            execution_plan.append("Workflow: Support response drafted.")
            
    step_log = {
        "node": "Workflow Agent",
        "action": "Plan Decided",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "summary": f"Next phase: {next_action}. Resolution: '{agent_response[:100]}...'"
    }
    audit_trail.append(step_log)
    
    db.close()
    
    return {
        **state,
        "next_action": next_action,
        "agent_response": agent_response,
        "execution_plan": execution_plan,
        "audit_trail": audit_trail
    }

def approval_agent_node(state: AgentState) -> AgentState:
    """Halts execution and creates a pending approval record in the database."""
    db: Session = SessionLocal()
    audit_trail = list(state.get("audit_trail", []))
    execution_plan = list(state.get("execution_plan", []))
    
    approval_required = state.get("approval_required", False)
    approval_type = state.get("approval_type", "Refund")
    approval_reason = state.get("approval_reason", "Review needed")
    
    target_id = str(state.get("payment_id") or state.get("customer_id") or state.get("ticket_id"))
    
    if approval_required:
        # Create db approval entry
        app_req = ApprovalRequest(
            action_type=approval_type,
            target_id=target_id,
            details={
                "ticket_id": state["ticket_id"],
                "customer_id": state.get("customer_id"),
                "customer_name": state.get("customer_name"),
                "amount": state.get("refund_amount"),
                "reason": approval_reason,
                "execution_plan": execution_plan
            },
            status="Pending",
            requested_by="AI Workflow Agent",
            created_at=datetime.datetime.utcnow()
        )
        db.add(app_req)
        db.commit()
        db.refresh(app_req)
        
        execution_plan.append(f"Approval: Saved queue reference (Request ID: {app_req.id}).")
        
        step_log = {
            "node": "Approval Agent",
            "action": "Human Authorization Required",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "summary": f"Approval request #{app_req.id} created for action '{approval_type}'. Suspended workflow."
        }
        audit_trail.append(step_log)
        
        audit_store_log_tool(
            db,
            action="Workflow Suspended",
            category="System",
            details=f"Approval request ID {app_req.id} initialized for {approval_type}.",
            confidence=1.0,
            reason=approval_reason,
            execution_status="Paused",
            request_payload={"ticket_id": state["ticket_id"]},
            response_payload={"approval_request_id": app_req.id}
        )
        
    db.close()
    
    return {
        **state,
        "next_action": "WAIT_FOR_APPROVAL",
        "execution_plan": execution_plan,
        "audit_trail": audit_trail
    }

# BUILD STATE GRAPH
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("support", support_agent_node)
workflow.add_node("payments", payments_agent_node)
workflow.add_node("fraud", fraud_agent_node)
workflow.add_node("workflow", workflow_agent_node)
workflow.add_node("approval", approval_agent_node)

# Set Entry Point
workflow.set_entry_point("support")

# Add Sequential Edges
workflow.add_edge("support", "payments")
workflow.add_edge("payments", "fraud")
workflow.add_edge("fraud", "workflow")

# Conditional Routing from Workflow
def route_next(state: AgentState):
    if state.get("next_action") == "WAIT_FOR_APPROVAL":
        return "approval"
    return END

workflow.add_conditional_edges(
    "workflow",
    route_next,
    {
        "approval": "approval",
        END: END
    }
)

workflow.add_edge("approval", END)

# Compile Graph
finops_agent_app = workflow.compile()


# RESUME ROUTINE (EXPLICIT HUMAN DECISION INTAKE)
def resume_workflow(approval_id: int, status: str, manager_reason: str, manager_name: str) -> Dict[str, Any]:
    """Resume execution once a manager provides approval or rejection."""
    db: Session = SessionLocal()
    try:
        app_req = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
        if not app_req:
            return {"success": False, "error": "Approval request not found"}
            
        if app_req.status != "Pending":
            return {"success": False, "error": f"Request has already been processed with status: {app_req.status}"}
            
        app_req.status = status
        app_req.approved_by = manager_name
        app_req.reason = manager_reason
        db.commit()
        
        details = app_req.details or {}
        ticket_id = details.get("ticket_id")
        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
        
        audit_store_log_tool(
            db,
            action="Workflow Resumed",
            category="System",
            details=f"Manager decision: {status} by {manager_name}.",
            confidence=1.0,
            reason=manager_reason,
            execution_status="Success",
            request_payload={"approval_id": approval_id, "decision": status},
            response_payload={"action_type": app_req.action_type}
        )
        
        if status == "Approved":
            # Process action
            if app_req.action_type == "Refund":
                payment_id = details.get("payment_id") or ticket.description
                # Retrieve extracted payment_id
                tx_match = re.search(r'(txn_?[0-9a-zA-Z]+)', ticket.description, re.IGNORECASE)
                payment_id = tx_match.group(1).upper() if tx_match else payment_id
                
                amount = details.get("amount") or 0.0
                res = payment_refund_transaction_tool(db, payment_id, amount, f"Approved by Manager: {manager_name}. Reason: {manager_reason}")
                
                if ticket:
                    ticket.status = "Closed"
                    db.commit()
                return {"success": True, "details": res}
                
            elif app_req.action_type in ["AccountBlock", "AccountFreeze", "FraudHold"]:
                customer_id = details.get("customer_id")
                c = db.query(Customer).filter(Customer.id == customer_id).first()
                if c:
                    c.status = "Blocked" if app_req.action_type == "AccountBlock" else "Frozen"
                    db.commit()
                    
                    audit_store_log_tool(
                        db,
                        action="Account Restricted",
                        category="Fraud",
                        details=f"Customer account {c.name} set to status {c.status} by Manager approval.",
                        confidence=1.0,
                        reason=manager_reason
                    )
                if ticket:
                    ticket.status = "Closed"
                    db.commit()
                return {"success": True, "message": f"Customer account successfully restricted to {c.status}."}
                
            elif app_req.action_type == "KYCRejection":
                customer_id = details.get("customer_id")
                c = db.query(Customer).filter(Customer.id == customer_id).first()
                if c:
                    c.kyc_status = "Rejected"
                    db.commit()
                if ticket:
                    ticket.status = "Closed"
                    db.commit()
                return {"success": True, "message": "KYC profile rejected by human manager."}
        else:
            # Rejection pathway
            if ticket:
                ticket.status = "Closed"
                db.commit()
            
            audit_store_log_tool(
                db,
                action="Action Rejected",
                category="System",
                details=f"AI proposed action '{app_req.action_type}' was declined by Manager.",
                confidence=1.0,
                reason=manager_reason
            )
            return {"success": True, "message": f"AI action rejected by manager: {manager_reason}"}
            
        return {"success": False, "error": "Unknown action type"}
    finally:
        db.close()
