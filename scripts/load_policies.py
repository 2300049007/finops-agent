import os
import sys

# Add root folder to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import SessionLocal
from backend.app.db.models import KnowledgeBase
from backend.app.services.rag.vector_store import policy_rag

POLICIES = [
    {
        "id": "refund_policy_001",
        "title": "Corporate Refund Policy",
        "doc_type": "Policy",
        "content": """
## Refund Eligibility and Thresholds
1. Standard Refunds:
   - Customers are eligible for refunds on successful transactions within 30 days of purchase.
   - Refunds must be processed to the original payment method.
2. Risk Thresholds and Manager Approvals:
   - Any individual refund request exceeding ₹10,000 (INR 10,000) is classified as HIGH RISK.
   - High-risk refunds MUST receive explicit Manager approval. The AI agent must automatically halt the execution and route the request to the Manager approval queue.
3. System Safeguards:
   - The system must prevent multiple refunds on the same transaction ID.
   - Refunds cannot be processed on transactions that have already failed or are currently marked as disputed.
4. SLA: Approved refunds must be executed through the Payment Gateway API within 24 hours of approval.
"""
    },
    {
        "id": "fraud_policy_001",
        "title": "Anti-Fraud and Risk Policy",
        "doc_type": "Policy",
        "content": """
## Fraud Detection and Account Restriction Rules
1. Risk Classifications:
   - Low Risk: Risk score < 0.3. Automated workflows are allowed to complete without human intervention.
   - Medium Risk: Risk score between 0.3 and 0.79. Triggers a warning. The transaction is held for Analyst review, but the account remains active.
   - High Risk: Risk score >= 0.8. The transaction is instantly blocked, and the customer account is put on a Fraud Hold.
2. Account Freeze and Block Criteria:
   - Account Block/Freeze actions are extremely high risk and require double authorization.
   - Any AI recommendations to Freeze or Block a customer account must be forwarded to the Manager approval queue.
3. Chargeback and Dispute Investigations:
   - Multiple chargebacks (more than 2 within a 90-day window) trigger an automatic account restriction proposal.
   - Known fraudulent merchant categories or rapid velocity transactions (e.g. 5 transactions in 1 minute) trigger an automatic fraud investigation case.
"""
    },
    {
        "id": "kyc_policy_001",
        "title": "Know Your Customer (KYC) Guidelines",
        "doc_type": "Policy",
        "content": """
## Customer Identity Verification Rules
1. Identity Verification Requirements:
   - Customers must provide valid government-issued identifiers (PAN card, Aadhaar card, or Passport).
   - The name on the document must match the registered account name.
2. OCR Verification and Confidence Scores:
   - The automated KYC system runs optical character recognition (OCR) on uploaded documents.
   - If the OCR match confidence score is 95% or higher, the KYC can be automatically Approved.
   - If the OCR confidence score falls below 70%, the KYC must be Rejected or routed to the Manager queue.
   - Explicit KYC Rejection action proposed by the AI must be approved by an Analyst or Manager.
3. KYC Status Actions:
   - Statuses include: Pending, Approved, Rejected.
   - Accounts with Rejected KYC status are barred from conducting transactions exceeding ₹5,000.
"""
    },
    {
        "id": "sop_001",
        "title": "Internal SOP for Financial Support Tickets",
        "doc_type": "SOP",
        "content": """
## Support Ticket Workflow Standard Operating Procedure (SOP)
1. Ingestion and Intent Parsing:
   - The Support Agent reads incoming tickets, identifies intent (e.g., Refund Query, Dispute, Account Issue), and classifies customer sentiment.
2. Escalation Paths:
   - Refund queries: Route to the Payments Agent to verify payment status and execute refunds.
   - Account blocks/disputes: Route to the Fraud Agent for risk profiling and account actions.
   - KYC/Document issues: Route to the KYC utility.
3. Tool Usage:
   - Use the CRM Tool to extract customer profile details.
   - Use the Payments Tool to verify transaction IDs.
   - Use the Fraud Tool to query risk databases.
4. Response Drafting:
   - AI agent answers should remain professional, citing policies, and providing the user with reference transaction or refund IDs.
"""
    }
]

def load_all_policies():
    db = SessionLocal()
    try:
        print("Starting policy ingestion...")
        for policy in POLICIES:
            # Save or update in database
            db_kb = db.query(KnowledgeBase).filter(KnowledgeBase.title == policy["title"]).first()
            if not db_kb:
                db_kb = KnowledgeBase(
                    title=policy["title"],
                    doc_type=policy["doc_type"],
                    content=policy["content"]
                )
                db.add(db_kb)
            else:
                db_kb.content = policy["content"]
                db_kb.doc_type = policy["doc_type"]
            
            db.commit()
            
            # Ingest into vector store
            policy_rag.ingest_policy(
                doc_id=policy["id"],
                title=policy["title"],
                content=policy["content"],
                doc_type=policy["doc_type"]
            )
            print(f"Loaded policy: {policy['title']}")
            
        print("All policies ingested successfully!")
    except Exception as e:
        print(f"Error loading policies: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_all_policies()
