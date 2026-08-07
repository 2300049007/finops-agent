import os
import time
import datetime
from celery import Celery
from sqlalchemy.orm import Session
from backend.app.config import settings

# Initialize Celery app
celery_app = Celery(
    "finops_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Avoid circular dependency imports by delaying db model imports to task scope
@celery_app.task(name="tasks.perform_kyc_ocr")
def perform_kyc_ocr(customer_id: int) -> dict:
    """Asynchronously runs OCR algorithm on uploaded KYC document details."""
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import Customer, AuditLog
    
    db: Session = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"success": False, "error": "Customer not found"}
        
        # Simulate processing time
        time.sleep(2)
        
        # Determine confidence score and update status based on simple heuristics
        ocr_confidence = 0.96 if "test" not in customer.name.lower() else 0.62
        kyc_status = "Approved" if ocr_confidence >= 0.70 else "Rejected"
        
        customer.kyc_status = kyc_status
        
        # Log to audit trace
        audit = AuditLog(
            action="OCR KYC Document Processed",
            category="System",
            details=f"OCR analysis completed for customer: {customer.name} (ID: {customer_id}). Status: {kyc_status}.",
            confidence=ocr_confidence,
            reason=f"OCR verification confidence score: {ocr_confidence:.2f}",
            execution_status="Success",
            request_payload={"customer_id": customer_id},
            response_payload={"kyc_status": kyc_status, "confidence": ocr_confidence}
        )
        db.add(audit)
        db.commit()
        
        return {
            "success": True,
            "customer_id": customer_id,
            "kyc_status": kyc_status,
            "confidence": ocr_confidence
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="tasks.parse_email_ticket")
def parse_email_ticket(sender_email: str, subject: str, body: str) -> dict:
    """Simulates email parser background daemon processing incoming inquiries."""
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import Customer, SupportTicket, AuditLog
    
    db: Session = SessionLocal()
    try:
        # Resolve customer
        customer = db.query(Customer).filter(Customer.email == sender_email).first()
        if not customer:
            # Create new customer automatically
            customer = Customer(
                name=sender_email.split("@")[0].title().replace(".", " "),
                email=sender_email,
                status="Active",
                kyc_status="Pending",
                risk_score=0.1
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
            
        # Create ticket
        ticket = SupportTicket(
            customer_id=customer.id,
            subject=subject,
            description=body,
            status="Open",
            priority="High" if any(w in body.lower() for w in ["angry", "refund", "chargeback", "block", "fraud"]) else "Medium",
            sentiment="Neutral",
            created_at=datetime.datetime.utcnow()
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        audit = AuditLog(
            action="Email Ticket Ingested",
            category="Support",
            details=f"Email from {sender_email} converted to Ticket #{ticket.id}.",
            confidence=1.0,
            reason="Automated email parser intake",
            execution_status="Success"
        )
        db.add(audit)
        db.commit()
        
        return {"success": True, "ticket_id": ticket.id, "customer_id": customer.id}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="tasks.generate_pdf_report")
def generate_pdf_report(ticket_id: int, output_dir: str = "/tmp") -> dict:
    """Builds a beautiful PDF report containing investigation details and AI rationale."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import SupportTicket, AuditLog, Transaction
    
    db: Session = SessionLocal()
    try:
        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
        if not ticket:
            return {"success": False, "error": "Ticket not found"}
            
        os.makedirs(output_dir, exist_ok=True)
        filename = f"Investigation_Report_Ticket_{ticket_id}.pdf"
        filepath = os.path.join(output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            textColor=colors.HexColor("#1A365D"),
            spaceAfter=15
        )
        
        normal_style = styles["Normal"]
        
        story = []
        
        # Header
        story.append(Paragraph(f"AI Financial Operations Agent - Case File #{ticket_id}", title_style))
        story.append(Paragraph(f"Date generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", normal_style))
        story.append(Spacer(1, 15))
        
        # Ticket info table
        data = [
            [Paragraph("<b>Customer Name:</b>", normal_style), Paragraph(ticket.customer.name if ticket.customer else "Unknown", normal_style)],
            [Paragraph("<b>Email:</b>", normal_style), Paragraph(ticket.customer.email if ticket.customer else "N/A", normal_style)],
            [Paragraph("<b>Subject:</b>", normal_style), Paragraph(ticket.subject, normal_style)],
            [Paragraph("<b>Description:</b>", normal_style), Paragraph(ticket.description, normal_style)],
            [Paragraph("<b>Ticket Status:</b>", normal_style), Paragraph(ticket.status, normal_style)]
        ]
        
        t = Table(data, colWidths=[120, 360])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F7FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        
        story.append(t)
        story.append(Spacer(1, 20))
        
        # Audit Logs
        story.append(Paragraph("<b>Agent Audit Trail & Reasoning:</b>", styles["Heading2"]))
        story.append(Spacer(1, 10))
        
        audit_entries = db.query(AuditLog).filter(
            AuditLog.details.like(f"%Ticket #{ticket_id}%") | AuditLog.details.like(f"%Tx ID%")
        ).limit(10).all()
        
        audit_data = [["Action", "Timestamp", "Category", "Execution Status"]]
        for log in audit_entries:
            audit_data.append([
                Paragraph(log.action, normal_style),
                log.timestamp.strftime("%H:%M:%S"),
                log.category,
                log.execution_status
            ])
            
        t_audit = Table(audit_data, colWidths=[200, 80, 100, 100])
        t_audit.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EDF2F7")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ]))
        
        story.append(t_audit)
        
        doc.build(story)
        return {"success": True, "filepath": filepath, "filename": filename}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        db.close()
