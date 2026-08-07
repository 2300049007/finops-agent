from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import datetime
import csv
import io

from backend.app.db.session import get_db
from backend.app.db.models import (
    User, Customer, SupportTicket, Transaction, FraudCase, ApprovalRequest, AuditLog, Refund, KnowledgeBase
)
from backend.app.auth import (
    create_access_token, get_password_hash, verify_password, get_current_user,
    admin_required, manager_required, analyst_required
)
from backend.app.services.agent.graph import finops_agent_app, resume_workflow
from backend.app.tasks.celery_app import perform_kyc_ocr, parse_email_ticket, generate_pdf_report

router = APIRouter()

# ----------------- PYDANTIC SCHEMAS -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "Analyst"  # Admin, Analyst, Manager

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

class TicketCreate(BaseModel):
    customer_id: int
    subject: str
    description: str
    priority: str = "Medium"

class ApprovalAction(BaseModel):
    status: str  # Approved, Rejected
    reason: str

class RefundCreate(BaseModel):
    payment_id: str
    amount: float
    reason: str

class FraudAction(BaseModel):
    status: str  # Resolved, Dismissed
    action_taken: str  # AccountBlock, AccountFreeze, FraudHold, Release

# ----------------- AUTHENTICATION -----------------
@router.post("/auth/register", response_model=Dict[str, Any])
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully", "email": new_user.email}

@router.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name
    }

@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "created_at": current_user.created_at
    }

# ----------------- TICKETS & AGENT AGGREGATOR -----------------
@router.get("/tickets", response_model=List[Dict[str, Any]])
def get_tickets(db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(100).all()
    return [
        {
            "id": t.id,
            "customer": {"id": t.customer.id, "name": t.customer.name, "email": t.customer.email} if t.customer else None,
            "subject": t.subject,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "sentiment": t.sentiment,
            "created_at": t.created_at.isoformat()
        }
        for t in tickets
    ]

@router.get("/tickets/{ticket_id}")
def get_ticket_details(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    audit_logs = db.query(AuditLog).filter(
        AuditLog.details.like(f"%Ticket #{ticket_id}%") | AuditLog.request_payload.like(f"%{ticket_id}%")
    ).all()
    
    return {
        "ticket": {
            "id": ticket.id,
            "customer_id": ticket.customer_id,
            "customer_name": ticket.customer.name if ticket.customer else "Unknown",
            "customer_email": ticket.customer.email if ticket.customer else "N/A",
            "customer_status": ticket.customer.status if ticket.customer else "Active",
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "sentiment": ticket.sentiment,
            "created_at": ticket.created_at
        },
        "audit_logs": [
            {
                "id": l.id,
                "action": l.action,
                "category": l.category,
                "timestamp": l.timestamp.isoformat(),
                "details": l.details,
                "confidence": l.confidence,
                "reason": l.reason,
                "execution_status": l.execution_status
            }
            for l in audit_logs
        ]
    }

@router.post("/tickets/create")
def create_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    ticket = SupportTicket(
        customer_id=ticket_in.customer_id,
        subject=ticket_in.subject,
        description=ticket_in.description,
        priority=ticket_in.priority,
        status="Open"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"message": "Ticket created successfully", "ticket_id": ticket.id}

@router.post("/tickets/{ticket_id}/process")
def process_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    """Triggers LangGraph agent flow for the selected support ticket."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Build initial LangGraph state inputs
    inputs = {
        "ticket_id": ticket.id,
        "ticket_subject": ticket.subject,
        "ticket_description": ticket.description,
        "customer_id": ticket.customer_id,
        "customer_name": ticket.customer.name if ticket.customer else None,
        "customer_email": ticket.customer.email if ticket.customer else None,
        "intent": None,
        "sentiment": None,
        "payment_id": None,
        "refund_amount": None,
        "risk_score": 0.0,
        "risk_evidence": [],
        "approval_required": False,
        "approval_type": None,
        "approval_reason": None,
        "next_action": "EXECUTE",
        "execution_plan": [],
        "audit_trail": [],
        "rag_context": None,
        "agent_response": None
    }
    
    try:
        # Execute LangGraph state machine
        final_state = finops_agent_app.invoke(inputs)
        
        # Save output values back to DB ticket
        ticket.sentiment = final_state.get("sentiment")
        if final_state.get("next_action") == "EXECUTE" or final_state.get("next_action") == "RESOLVE":
            ticket.status = "Closed"
        db.commit()
        
        return {
            "ticket_id": ticket_id,
            "status": ticket.status,
            "next_action": final_state.get("next_action"),
            "agent_response": final_state.get("agent_response"),
            "execution_plan": final_state.get("execution_plan"),
            "audit_trail": final_state.get("audit_trail")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent orchestration error: {str(e)}")

# ----------------- PAYMENTS & TRANSACTIONS -----------------
@router.get("/payments/transactions")
def get_transactions(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_required)
):
    query = db.query(Transaction)
    if search:
        query = query.filter(
            (Transaction.payment_id.ilike(f"%{search}%")) |
            (Transaction.merchant.ilike(f"%{search}%"))
        )
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
        
    txs = query.order_by(Transaction.created_at.desc()).limit(150).all()
    return [
        {
            "id": tx.id,
            "payment_id": tx.payment_id,
            "customer_name": tx.customer.name if tx.customer else "Unknown",
            "amount": tx.amount,
            "currency": tx.currency,
            "merchant": tx.merchant,
            "status": tx.status,
            "description": tx.description,
            "created_at": tx.created_at.isoformat()
        }
        for tx in txs
    ]

@router.post("/payments/refund")
def trigger_refund(refund_in: RefundCreate, db: Session = Depends(get_db), current_user: User = Depends(manager_required)):
    """Manual refund override endpoint (requires Manager privileges)."""
    tx = db.query(Transaction).filter(Transaction.payment_id == refund_in.payment_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status == "Refunded":
        raise HTTPException(status_code=400, detail="Transaction is already refunded")
        
    # Execute direct refund
    refund = Refund(
        transaction_id=tx.id,
        amount=refund_in.amount,
        status="Completed",
        reason=refund_in.reason
    )
    db.add(refund)
    tx.status = "Refunded"
    
    # Audit log
    audit = AuditLog(
        action="Manual Refund Processed",
        category="Payment",
        details=f"Manual refund of ₹{refund_in.amount} for payment {refund_in.payment_id} executed by manager: {current_user.full_name}.",
        confidence=1.0,
        reason=refund_in.reason,
        user_id=current_user.email,
        execution_status="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": "Refund processed successfully", "refund_id": refund.id}

# ----------------- FRAUD CASES -----------------
@router.get("/fraud/cases")
def get_fraud_cases(db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    cases = db.query(FraudCase).order_by(FraudCase.created_at.desc()).all()
    return [
        {
            "id": case.id,
            "transaction": {
                "id": case.transaction.id,
                "payment_id": case.transaction.payment_id,
                "amount": case.transaction.amount,
                "customer": case.transaction.customer.name if case.transaction.customer else "Unknown"
            } if case.transaction else None,
            "risk_score": case.risk_score,
            "status": case.status,
            "evidence": case.evidence,
            "reasoning": case.reasoning,
            "created_at": case.created_at.isoformat()
        }
        for case in cases
    ]

@router.post("/fraud/cases/{case_id}/action")
def resolve_fraud_case(
    case_id: int,
    action_in: FraudAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(manager_required)
):
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")
        
    case.status = action_in.status
    
    # Process override action
    if action_in.action_taken in ["AccountBlock", "AccountFreeze"]:
        customer = case.transaction.customer
        if customer:
            customer.status = "Blocked" if action_in.action_taken == "AccountBlock" else "Frozen"
            
    db.commit()
    
    # Audit log
    audit = AuditLog(
        action="Fraud Case Resolved",
        category="Fraud",
        details=f"Fraud case #{case_id} resolved with status: {action_in.status}. Resolution action: {action_in.action_taken}.",
        confidence=1.0,
        user_id=current_user.email,
        execution_status="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": "Fraud case updated successfully"}

# ----------------- HUMAN APPROVALS -----------------
@router.get("/approvals/requests")
def get_approval_requests(db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    reqs = db.query(ApprovalRequest).order_by(ApprovalRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "action_type": r.action_type,
            "target_id": r.target_id,
            "details": r.details,
            "status": r.status,
            "requested_by": r.requested_by,
            "approved_by": r.approved_by,
            "reason": r.reason,
            "created_at": r.created_at.isoformat()
        }
        for r in reqs
    ]

@router.post("/approvals/requests/{request_id}/action")
def action_approval_request(
    request_id: int,
    action_in: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(manager_required)
):
    """Executes manager's Approve/Reject decision, resuming the state workflow."""
    res = resume_workflow(
        approval_id=request_id,
        status=action_in.status,
        manager_reason=action_in.reason,
        manager_name=current_user.full_name
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to resume workflow"))
        
    return {"success": True, "message": f"Approval request successfully marked as {action_in.status}.", "details": res}

# ----------------- AUDIT LOGS -----------------
@router.get("/audit/logs")
def get_audit_logs(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_required)
):
    query = db.query(AuditLog)
    if category:
        query = query.filter(AuditLog.category == category)
        
    logs = query.order_by(AuditLog.timestamp.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "timestamp": l.timestamp.isoformat(),
            "category": l.category,
            "details": l.details,
            "user_id": l.user_id,
            "confidence": l.confidence,
            "reason": l.reason,
            "execution_status": l.execution_status
        }
        for l in logs
    ]

@router.get("/audit/export")
def export_audit_csv(db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Action", "Timestamp", "Category", "Details", "Operator", "Confidence", "Reasoning", "Status"])
    
    for l in logs:
        writer.writerow([
            l.id,
            l.action,
            l.timestamp.isoformat(),
            l.category,
            l.details,
            l.user_id,
            l.confidence or "",
            l.reason or "",
            l.execution_status
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=finops_audit_export.csv"
    return response

# ----------------- SETTINGS & SYSTEM MONITOR -----------------
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(analyst_required)):
    kb_count = db.query(KnowledgeBase).count()
    return {
        "current_model": settings.OPENAI_MODEL,
        "risk_thresholds": {
            "low_threshold": 0.3,
            "high_threshold": 0.8
        },
        "knowledge_base_articles": kb_count,
        "is_openai_configured": bool(settings.OPENAI_API_KEY)
    }

# ----------------- CELERY & BONUS SERVICE TRIGGERS -----------------
@router.post("/tools/trigger-ocr/{customer_id}")
def trigger_kyc_ocr(customer_id: int, current_user: User = Depends(analyst_required)):
    """Triggers Celery background task to verify document via OCR."""
    task = perform_kyc_ocr.delay(customer_id)
    return {"success": True, "task_id": task.id, "message": "KYC OCR pipeline scheduled successfully."}

@router.post("/tools/generate-report/{ticket_id}")
def trigger_pdf_report(ticket_id: int, current_user: User = Depends(analyst_required)):
    """Triggers Celery PDF builder task to create customer case file."""
    # We output report to static directories so it is download-accessible
    output_dir = "/app/static/reports"
    task = generate_pdf_report.delay(ticket_id, output_dir=output_dir)
    return {"success": True, "task_id": task.id, "message": "PDF Report compilation scheduled successfully."}
