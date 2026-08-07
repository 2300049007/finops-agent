from sqlalchemy.orm import Session
from backend.app.db.models import Customer, Transaction, FraudCase, SupportTicket, Refund, AuditLog
import datetime
from typing import Optional, List, Dict, Any

class CRMSystem:
    @staticmethod
    def search_customer(db: Session, query: str) -> List[Dict[str, Any]]:
        """Search customer by name or email."""
        customers = db.query(Customer).filter(
            (Customer.name.ilike(f"%{query}%")) | (Customer.email.ilike(f"%{query}%"))
        ).limit(10).all()
        
        return [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "status": c.status,
                "kyc_status": c.kyc_status,
                "risk_score": c.risk_score,
                "created_at": c.created_at.isoformat()
            }
            for c in customers
        ]

    @staticmethod
    def get_customer_history(db: Session, customer_id: int) -> Dict[str, Any]:
        """Get history for a customer including transactions and tickets."""
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found"}
        
        transactions = db.query(Transaction).filter(Transaction.customer_id == customer_id).all()
        tickets = db.query(SupportTicket).filter(SupportTicket.customer_id == customer_id).all()
        
        return {
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "status": customer.status,
                "kyc_status": customer.kyc_status,
                "risk_score": customer.risk_score
            },
            "transactions_count": len(transactions),
            "recent_transactions": [
                {
                    "payment_id": t.payment_id,
                    "amount": t.amount,
                    "currency": t.currency,
                    "merchant": t.merchant,
                    "status": t.status,
                    "created_at": t.created_at.isoformat()
                } for t in transactions[-5:]
            ],
            "tickets_count": len(tickets),
            "recent_tickets": [
                {
                    "id": tick.id,
                    "subject": tick.subject,
                    "status": tick.status,
                    "priority": tick.priority,
                    "sentiment": tick.sentiment,
                    "created_at": tick.created_at.isoformat()
                } for tick in tickets[-5:]
            ]
        }

class PaymentsSystem:
    @staticmethod
    def search_transaction(db: Session, payment_id: str) -> Optional[Dict[str, Any]]:
        """Search transaction database by payment ID."""
        t = db.query(Transaction).filter(Transaction.payment_id == payment_id).first()
        if not t:
            return None
        return {
            "id": t.id,
            "payment_id": t.payment_id,
            "customer_id": t.customer_id,
            "customer_name": t.customer.name if t.customer else "Unknown",
            "amount": t.amount,
            "currency": t.currency,
            "merchant": t.merchant,
            "status": t.status,
            "description": t.description,
            "created_at": t.created_at.isoformat()
        }

    @staticmethod
    def execute_refund(db: Session, payment_id: str, amount: float, reason: str) -> Dict[str, Any]:
        """Perform simulated payment refund and update state."""
        t = db.query(Transaction).filter(Transaction.payment_id == payment_id).first()
        if not t:
            return {"success": False, "error": "Transaction not found"}
        
        if t.status == "Refunded":
            return {"success": False, "error": "Transaction already fully refunded"}
        
        # Create refund record
        refund = Refund(
            transaction_id=t.id,
            amount=amount,
            status="Completed",
            reason=reason,
            created_at=datetime.datetime.utcnow()
        )
        db.add(refund)
        
        # Update transaction status
        t.status = "Refunded"
        
        # Add to audit log
        audit = AuditLog(
            action="Refund Executed",
            category="Payment",
            details=f"Refund of {amount} {t.currency} processed successfully for Tx ID: {payment_id}. Reason: {reason}",
            confidence=1.0,
            execution_status="Success",
            request_payload={"payment_id": payment_id, "amount": amount, "reason": reason},
            response_payload={"refund_id": refund.id, "status": "Completed"}
        )
        db.add(audit)
        db.commit()
        
        return {
            "success": True,
            "refund_id": refund.id,
            "payment_id": payment_id,
            "amount": amount,
            "status": "Completed",
            "message": "Refund processed successfully"
        }

class FraudSystem:
    @staticmethod
    def calculate_risk(db: Session, transaction_id: int) -> Dict[str, Any]:
        """Determine transaction risk based on amount and customer flag indicators."""
        t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not t:
            return {"error": "Transaction not found"}
        
        c = t.customer
        risk_score = 0.1
        evidence = []
        
        if t.amount > 50000:
            risk_score += 0.4
            evidence.append(f"High transaction value: ₹{t.amount}")
        elif t.amount > 10000:
            risk_score += 0.2
            evidence.append(f"Moderate transaction value: ₹{t.amount}")
            
        if c:
            if c.status == "Frozen":
                risk_score += 0.8
                evidence.append("Customer account is frozen")
            elif c.status == "Blocked":
                risk_score += 0.9
                evidence.append("Customer account is blocked")
            if c.risk_score > 0.5:
                risk_score += 0.3
                evidence.append(f"Customer base risk is high: {c.risk_score}")
                
            # Count previous fraud cases
            prev_fraud = db.query(FraudCase).join(Transaction).filter(
                Transaction.customer_id == c.id,
                FraudCase.status == "Resolved"
            ).count()
            if prev_fraud > 0:
                risk_score += 0.2 * prev_fraud
                evidence.append(f"Customer has {prev_fraud} previous resolved fraud records")

        # Clamp risk score
        risk_score = min(1.0, max(0.0, risk_score))
        
        return {
            "transaction_id": transaction_id,
            "risk_score": round(risk_score, 2),
            "evidence": evidence,
            "explanation": "Calculated risk score based on transaction value thresholds and customer account flags."
        }

class KYCSystem:
    @staticmethod
    def get_kyc_details(db: Session, customer_id: int) -> Dict[str, Any]:
        """Retrieve simulated KYC records and OCR document attributes."""
        c = db.query(Customer).filter(Customer.id == customer_id).first()
        if not c:
            return {"error": "Customer not found"}
            
        # Simulating document info
        return {
            "customer_id": c.id,
            "name": c.name,
            "kyc_status": c.kyc_status,
            "document_type": "PAN Card / Aadhaar",
            "document_id_extracted": f"XXXXXX{c.id * 13}X",
            "ocr_match_confidence": 0.98 if c.kyc_status == "Approved" else 0.45,
            "risk_notes": "All identity checks passed" if c.kyc_status == "Approved" else "Pending document review"
        }

    @staticmethod
    def update_kyc(db: Session, customer_id: int, status: str, reason: str = "") -> Dict[str, Any]:
        """Approve or reject KYC status."""
        c = db.query(Customer).filter(Customer.id == customer_id).first()
        if not c:
            return {"success": False, "error": "Customer not found"}
        
        c.kyc_status = status
        db.commit()
        
        return {
            "success": True,
            "customer_id": customer_id,
            "kyc_status": status,
            "message": f"KYC status updated successfully to {status}. Reason: {reason}"
        }

class CaseManagementSystem:
    @staticmethod
    def update_ticket(db: Session, ticket_id: int, status: str) -> Dict[str, Any]:
        """Update ticket resolution status."""
        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
        if not ticket:
            return {"success": False, "error": "Ticket not found"}
        
        ticket.status = status
        db.commit()
        return {"success": True, "ticket_id": ticket_id, "status": status}
