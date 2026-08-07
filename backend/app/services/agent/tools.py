from sqlalchemy.orm import Session
from backend.app.services.mock_systems.integrations import (
    CRMSystem, PaymentsSystem, FraudSystem, KYCSystem, CaseManagementSystem
)
from backend.app.db.models import AuditLog
import datetime
from typing import Dict, Any, List

def crm_search_customer_tool(db: Session, query: str) -> List[Dict[str, Any]]:
    return CRMSystem.search_customer(db, query)

def crm_get_customer_history_tool(db: Session, customer_id: int) -> Dict[str, Any]:
    return CRMSystem.get_customer_history(db, customer_id)

def payment_search_transaction_tool(db: Session, payment_id: str) -> Dict[str, Any]:
    tx = PaymentsSystem.search_transaction(db, payment_id)
    if not tx:
        return {"error": "Transaction not found"}
    return tx

def payment_refund_transaction_tool(db: Session, payment_id: str, amount: float, reason: str) -> Dict[str, Any]:
    return PaymentsSystem.execute_refund(db, payment_id, amount, reason)

def fraud_calculate_risk_tool(db: Session, transaction_id: int) -> Dict[str, Any]:
    return FraudSystem.calculate_risk(db, transaction_id)

def kyc_get_details_tool(db: Session, customer_id: int) -> Dict[str, Any]:
    return KYCSystem.get_kyc_details(db, customer_id)

def audit_store_log_tool(
    db: Session,
    action: str,
    category: str,
    details: str,
    confidence: float,
    reason: str,
    user_id: str = "AI Agent",
    execution_status: str = "Success",
    request_payload: dict = None,
    response_payload: dict = None
) -> None:
    log_entry = AuditLog(
        action=action,
        category=category,
        details=details,
        user_id=user_id,
        confidence=confidence,
        reason=reason,
        execution_status=execution_status,
        request_payload=request_payload,
        response_payload=response_payload,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
