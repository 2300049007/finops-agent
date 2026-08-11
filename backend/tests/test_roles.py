import os
import sys
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.db.session import Base
from backend.app.db.models import User, Customer, Transaction, SupportTicket, ApprovalRequest, FraudCase, AuditLog
from backend.app.auth import get_password_hash, create_access_token, verify_password, RoleChecker, admin_required, manager_required, analyst_required
from backend.app.api.router import (
    get_tickets, get_transactions, trigger_refund, get_fraud_cases, resolve_fraud_case,
    get_approval_requests, action_approval_request, get_audit_logs, get_settings, update_settings,
    list_users, toggle_user_status, RefundCreate, FraudAction, ApprovalAction, SettingsUpdate, UserStatusUpdate
)

# Setup SQLite In-Memory Database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class TestBackendRolesDirect(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Seed test database with roles and initial mock data."""
        Base.metadata.create_all(bind=engine)
        cls.db = TestingSessionLocal()

        # Seed 3 Users (Analyst, Manager, Admin)
        cls.analyst = User(id=1, email="analyst@finops.com", hashed_password=get_password_hash("analyst123"), full_name="Alice Analyst", role="Analyst")
        cls.manager = User(id=2, email="manager@finops.com", hashed_password=get_password_hash("manager123"), full_name="Bob Manager", role="Manager")
        cls.admin = User(id=3, email="admin@finops.com", hashed_password=get_password_hash("admin123"), full_name="Charlie Admin", role="Admin")
        cls.db.add_all([cls.analyst, cls.manager, cls.admin])

        # Seed Customer & Transaction
        cls.cust = Customer(name="Rahul Sharma", email="rahul@example.com", kyc_status="Verified", status="Active")
        cls.db.add(cls.cust)
        cls.db.commit()

        cls.tx = Transaction(customer_id=cls.cust.id, payment_id="TXN_TEST_999", amount=15000.0, currency="INR", merchant="Swiggy", status="Success")
        cls.db.add(cls.tx)
        cls.db.commit()

        # Seed Ticket & Approval Request
        cls.ticket = SupportTicket(customer_id=cls.cust.id, subject="Double Charged", description="Charged twice for TXN_TEST_999", status="Open", priority="High")
        cls.db.add(cls.ticket)
        cls.db.commit()

        cls.app_req = ApprovalRequest(action_type="Refund", target_id=cls.tx.payment_id, details={"ticket_id": cls.ticket.id, "payment_id": cls.tx.payment_id, "amount": 15000.0}, status="Pending", requested_by="Agent")
        cls.db.add(cls.app_req)
        cls.db.commit()

    # ----------------- TEST ROLE CHECKER RBAC -----------------
    def test_role_checker_analyst(self):
        """Analyst user passes analyst_required, but fails manager_required & admin_required."""
        checker_analyst = RoleChecker(["Admin", "Manager", "Analyst"])
        checker_manager = RoleChecker(["Admin", "Manager"])
        checker_admin = RoleChecker(["Admin"])

        # Analyst passes analyst check
        self.assertEqual(checker_analyst(self.analyst).role, "Analyst")

        # Analyst fails manager check with 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            checker_manager(self.analyst)
        self.assertEqual(ctx.exception.status_code, 403)

        # Analyst fails admin check with 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            checker_admin(self.analyst)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_role_checker_manager(self):
        """Manager user passes analyst & manager checks, but fails admin check."""
        checker_analyst = RoleChecker(["Admin", "Manager", "Analyst"])
        checker_manager = RoleChecker(["Admin", "Manager"])
        checker_admin = RoleChecker(["Admin"])

        self.assertEqual(checker_analyst(self.manager).role, "Manager")
        self.assertEqual(checker_manager(self.manager).role, "Manager")

        with self.assertRaises(HTTPException) as ctx:
            checker_admin(self.manager)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_role_checker_admin(self):
        """Admin user passes all checks (analyst, manager, admin)."""
        checker_analyst = RoleChecker(["Admin", "Manager", "Analyst"])
        checker_manager = RoleChecker(["Admin", "Manager"])
        checker_admin = RoleChecker(["Admin"])

        self.assertEqual(checker_analyst(self.admin).role, "Admin")
        self.assertEqual(checker_manager(self.admin).role, "Admin")
        self.assertEqual(checker_admin(self.admin).role, "Admin")

    # ----------------- TEST ENDPOINTS & BUSINESS LOGIC -----------------
    def test_get_tickets(self):
        tickets = get_tickets(db=self.db, current_user=self.analyst)
        self.assertGreaterEqual(len(tickets), 1)

    def test_get_transactions(self):
        txs = get_transactions(db=self.db, current_user=self.analyst)
        self.assertGreaterEqual(len(txs), 1)

    def test_manager_approval_action(self):
        """Manager executes approval request."""
        action = ApprovalAction(status="Approved", reason="Manager double charge confirmed")
        res = action_approval_request(request_id=self.app_req.id, action_in=action, db=self.db, current_user=self.manager)
        self.assertTrue(res["success"])

    def test_admin_settings_and_user_mgmt(self):
        """Admin updates settings and views user list."""
        settings_in = SettingsUpdate(openai_model="gpt-4o-mini")
        res = update_settings(settings_in=settings_in, current_user=self.admin)
        self.assertTrue(res["success"])

        users = list_users(db=self.db, current_user=self.admin)
        self.assertGreaterEqual(len(users), 3)

        res_status = toggle_user_status(user_id=1, status_in=UserStatusUpdate(is_active=True), db=self.db, current_user=self.admin)
        self.assertTrue(res_status["success"])

if __name__ == "__main__":
    unittest.main()


