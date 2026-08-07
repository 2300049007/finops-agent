import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Analyst")  # Admin, Analyst, Manager
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    status = Column(String, default="Active")  # Active, Blocked, Frozen
    kyc_status = Column(String, default="Pending")  # Pending, Approved, Rejected
    risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tickets = relationship("SupportTicket", back_populates="customer")
    transactions = relationship("Transaction", back_populates="customer")

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="Open")  # Open, Closed
    priority = Column(String, default="Medium")  # Low, Medium, High, Urgent
    sentiment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="tickets")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    merchant = Column(String, nullable=False)
    status = Column(String, default="Success")  # Success, Pending, Failed, Refunded
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="transactions")
    fraud_cases = relationship("FraudCase", back_populates="transaction")
    refunds = relationship("Refund", back_populates="transaction")

class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    risk_score = Column(Float, default=0.0)
    status = Column(String, default="Pending")  # Pending, Reviewing, Resolved
    evidence = Column(JSON, nullable=True)  # List of reasons/evidence
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transaction = relationship("Transaction", back_populates="fraud_cases")

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String, nullable=False)  # Refund, AccountBlock, AccountFreeze, FraudHold, KYCRejection
    target_id = Column(String, nullable=False)  # ID of transaction or customer being acted on
    details = Column(JSON, nullable=True)  # Details of request (e.g. amount, metadata)
    status = Column(String, default="Pending")  # Pending, Approved, Rejected
    requested_by = Column(String, default="AI Agent")
    approved_by = Column(String, nullable=True)
    reason = Column(Text, nullable=True)  # Denial/Approval explanation from manager
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)  # e.g., "Customer Sentiment Detected", "Refund Verified"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    category = Column(String, nullable=False)  # Support, Payment, Fraud, System
    details = Column(Text, nullable=True)
    user_id = Column(String, default="System")
    confidence = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    execution_status = Column(String, default="Success")  # Success, Failed, Paused
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    gateway = Column(String, nullable=False)
    transaction_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pending")  # Pending, Completed, Failed
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transaction = relationship("Transaction", back_populates="refunds")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    message = Column(Text, nullable=False)
    sender = Column(String, nullable=False)  # User or Agent
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    doc_type = Column(String, nullable=False)  # Policy, SOP, FAQ
    hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
