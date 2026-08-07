import os
import sys
import random
import datetime

# Add root folder to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import SessionLocal, Base, engine
from backend.app.db.models import (
    User, Customer, Transaction, SupportTicket, FraudCase, ApprovalRequest, AuditLog, Payment, Refund
)
from backend.app.auth import get_password_hash

FIRST_NAMES = [
    "Rahul", "Priya", "Amit", "Neha", "Vijay", "Anjali", "Sanjay", "Deepika", "Aditya", "Ritu",
    "Rajesh", "Kiran", "Arjun", "Pooja", "Vikram", "Sunita", "Harish", "Asha", "Sandeep", "Jyoti",
    "Manish", "Meena", "Rohan", "Geeta", "Abhishek", "Kavita", "Suresh", "Renu", "Dinesh", "Preeti",
    "Alok", "Shweta", "Anil", "Seema", "Kamal", "Lata", "Girish", "Madhu", "Naveen", "Nisha"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Patel", "Mehta", "Singh", "Joshi", "Rao", "Nair", "Iyer",
    "Kumar", "Reddy", "Sen", "Roy", "Das", "Choudhury", "Mishra", "Pandey", "Dubey", "Trivedi",
    "Bose", "Ghosh", "Saxena", "Sinha", "Prasad", "Bajaj", "Goel", "Bansal", "Agrawal", "Grover"
]

MERCHANTS = [
    "Amazon India", "Flipkart", "Zomato", "Swiggy", "AWS Cloud Services", "Google Play",
    "Apple Services", "Netflix India", "MakeMyTrip", "BookMyShow", "Paytm Merchant",
    "Uber India", "Ola Cabs", "Reliance Digital", "Zudio", "Decathlon India"
]

TICKET_SUBJECTS = [
    "Refund requested for double transaction",
    "Transaction failed but amount debited",
    "Account access is blocked after login failure",
    "Need details on chargeback dispute timeline",
    "Document verification (KYC) pending since 3 days",
    "Unauthorized charge detected on my ledger statement",
    "Requesting to unlock card for international purchases",
    "Refund policy clarification for cancelation fee",
    "KYC rejected without reason",
    "Suspicious login notification received"
]

TICKET_DESCRIPTIONS = [
    "I tried to make a payment of ₹{} using my card, but the app crashed. The transaction was txn_{} and I want my money back.",
    "My transaction txn_{} of ₹{} shows success, but the merchant says they did not receive it. Please refund.",
    "I cannot access my profile. It says blocked. Please verify my details and resolve as soon as possible.",
    "A transaction was performed on Zomato for ₹{} without my authorization. I want to report this fraud txn_{}.",
    "I uploaded my PAN card document 3 days ago but it is still showing KYC pending. Please approve my profile.",
    "I was charged twice for my subscription. Payment txn_{} and txn_{} of ₹{}. Refund the duplicate payment."
]

def seed_database():
    print("Beginning database seed routine...")
    db = SessionLocal()
    
    # Clean database tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    try:
        # 1. Seed Roles
        print("Creating system role credentials...")
        roles = [
            ("admin@finops.com", "Admin User", "Admin", "admin123"),
            ("manager@finops.com", "Manager User", "Manager", "manager123"),
            ("analyst@finops.com", "Analyst User", "Analyst", "analyst123")
        ]
        for email, name, role, password in roles:
            user = User(
                email=email,
                full_name=name,
                role=role,
                hashed_password=get_password_hash(password),
                is_active=True
            )
            db.add(user)
        db.commit()

        # 2. Seed 500 Customers
        print("Seeding 500 customers...")
        customers = []
        for i in range(500):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}.{i+1}@finops-demo.in"
            
            status = "Active"
            if random.random() < 0.05:
                status = "Frozen"
            elif random.random() < 0.03:
                status = "Blocked"
                
            kyc_status = "Approved"
            if random.random() < 0.15:
                kyc_status = "Pending"
            elif random.random() < 0.05:
                kyc_status = "Rejected"
                
            customer = Customer(
                name=name,
                email=email,
                status=status,
                kyc_status=kyc_status,
                risk_score=round(random.uniform(0.0, 0.45) if status == "Active" else random.uniform(0.65, 0.95), 2),
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(10, 180))
            )
            db.add(customer)
            customers.append(customer)
        db.commit()

        # 3. Seed 1000 Transactions (Payments)
        print("Seeding 1000 transaction events...")
        transactions = []
        statuses = ["Success", "Success", "Success", "Success", "Failed", "Pending", "Refunded"]
        
        for i in range(1000):
            cust = random.choice(customers)
            payment_id = f"TXN{random.randint(10000000, 99999999)}"
            amount = round(random.uniform(100.0, 25000.0), 2)
            # High amount weightings for testing thresholds
            if random.random() < 0.10:
                amount = round(random.uniform(11000.0, 60000.0), 2)
                
            tx = Transaction(
                payment_id=payment_id,
                customer_id=cust.id,
                amount=amount,
                currency="INR",
                merchant=random.choice(MERCHANTS),
                status=random.choice(statuses),
                description=f"Purchase at {random.choice(MERCHANTS)}",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
            )
            db.add(tx)
            transactions.append(tx)
        db.commit()

        # 4. Seed 300 Tickets
        print("Seeding 300 support tickets...")
        tickets = []
        priorities = ["Low", "Medium", "High", "Urgent"]
        sentiments = ["Neutral", "Angry", "Polite"]
        ticket_statuses = ["Open", "Closed"]
        
        for i in range(300):
            cust = random.choice(customers)
            # Find customer transactions
            cust_txs = [t for t in transactions if t.customer_id == cust.id]
            tx_id_ref = cust_txs[0].payment_id if cust_txs else f"TXN{random.randint(10000000, 99999999)}"
            tx_amt_ref = cust_txs[0].amount if cust_txs else round(random.uniform(500, 15000), 2)
            
            subject = random.choice(TICKET_SUBJECTS)
            desc_template = random.choice(TICKET_DESCRIPTIONS)
            
            if "{}" in desc_template:
                # Replace with placeholders
                placeholders_count = desc_template.count("{}")
                if placeholders_count == 1:
                    description = desc_template.format(tx_amt_ref)
                elif placeholders_count == 2:
                    description = desc_template.format(tx_id_ref, tx_amt_ref)
                elif placeholders_count == 3:
                    description = desc_template.format(tx_id_ref, tx_id_ref + "D", tx_amt_ref)
                else:
                    description = desc_template
            else:
                description = desc_template

            ticket = SupportTicket(
                customer_id=cust.id,
                subject=subject,
                description=description,
                status=random.choice(ticket_statuses),
                priority=random.choice(priorities),
                sentiment=random.choice(sentiments),
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 15), hours=random.randint(0, 23))
            )
            db.add(ticket)
            tickets.append(ticket)
        db.commit()

        # 5. Seed 150 Fraud Cases
        print("Seeding 150 fraud risk reviews...")
        fraud_cases = []
        fraud_statuses = ["Pending", "Reviewing", "Resolved"]
        evidence_templates = [
            ["Card velocity limit exceeded", "Location mismatch between logins"],
            ["Transaction amount exceeds historic average by 400%", "Device fingerprint fingerprint_987x flags dual accounts"],
            ["Known carding bin used", "Multiple rapid payment failures observed"],
            ["Customer account restricted due to past disputes", "KYC documents expired"]
        ]
        
        # Pick transactions with high values or frozen customer statuses
        risk_txs = [t for t in transactions if t.amount > 10000 or t.customer.status in ["Frozen", "Blocked"]]
        if len(risk_txs) < 150:
            risk_txs = transactions[:150]
            
        for i in range(150):
            tx = risk_txs[i]
            risk = round(random.uniform(0.4, 0.98), 2)
            status = random.choice(fraud_statuses)
            
            case = FraudCase(
                transaction_id=tx.id,
                risk_score=risk,
                status=status,
                evidence=random.choice(evidence_templates),
                reasoning=f"Automated risk scoring flag raised on {tx.payment_id}. Transaction velocity patterns and amount ₹{tx.amount:,} match high-probability fraud signatures.",
                created_at=tx.created_at + datetime.timedelta(minutes=5)
            )
            db.add(case)
            fraud_cases.append(case)
        db.commit()

        # 6. Seed 50 Approval Requests
        print("Seeding 50 approval requests...")
        actions = ["Refund", "AccountBlock", "AccountFreeze", "FraudHold", "KYCRejection"]
        app_statuses = ["Pending", "Approved", "Rejected"]
        managers = ["Manager User", "Admin User"]
        
        for i in range(50):
            action_type = random.choice(actions)
            status = random.choice(app_statuses)
            cust = random.choice(customers)
            tx = random.choice(transactions)
            
            target_id = str(tx.payment_id if action_type == "Refund" else cust.id)
            
            details = {
                "ticket_id": random.choice(tickets).id,
                "customer_id": cust.id,
                "customer_name": cust.name,
                "amount": tx.amount if action_type == "Refund" else None,
                "reason": f"AI Operations agent proposed {action_type} action based on policy constraints."
            }
            
            req = ApprovalRequest(
                action_type=action_type,
                target_id=target_id,
                details=details,
                status=status,
                requested_by="AI Workflow Agent",
                approved_by=random.choice(managers) if status != "Pending" else None,
                reason="Auto-approved following manual review of account ledger." if status == "Approved" else "Denied due to missing customer dispute documentation." if status == "Rejected" else None,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 10))
            )
            db.add(req)
        db.commit()

        # 7. Seed initial system audit logs
        print("Creating operational audit logs...")
        audit_logs = [
            AuditLog(
                action="Database Seeding Init",
                category="System",
                details="Mock database tables created and seeded successfully with demo profiles.",
                confidence=1.0,
                execution_status="Success",
                timestamp=datetime.datetime.utcnow()
            )
        ]
        for a in audit_logs:
            db.add(a)
        db.commit()

        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
