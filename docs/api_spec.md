# API Documentation & REST Specifications

This document catalogs the REST API endpoints exposed by the FastAPI server on port 8000.

---

## 1. Authentication Endpoints

### Register User
* **URL**: `/api/v1/auth/register`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "user@finops.com",
    "password": "strongpassword",
    "full_name": "Operations Lead",
    "role": "Manager"
  }
  ```
* **Response**: `{"message": "User registered successfully", "email": "user@finops.com"}`

### Login & Token Issuance
* **URL**: `/api/v1/auth/login`
* **Method**: `POST`
* **Request Body (Form Data)**:
  * `username`: Email address
  * `password`: Plaintext password
* **Response**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "role": "Manager",
    "full_name": "Operations Lead"
  }
  ```

---

## 2. Support Ticket Endpoints

### List Support Tickets
* **URL**: `/api/v1/tickets`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**:
  ```json
  [
    {
      "id": 1,
      "customer": {"id": 12, "name": "Rahul Sharma", "email": "rahul@gmail.com"},
      "subject": "Double charge refund request",
      "description": "I was charged twice...",
      "status": "Open",
      "priority": "High",
      "sentiment": "Angry"
    }
  ]
  ```

### Process Ticket via LangGraph Agent
* **URL**: `/api/v1/tickets/{ticket_id}/process`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**:
  ```json
  {
    "ticket_id": 1,
    "status": "Closed",
    "next_action": "EXECUTE",
    "agent_response": "Refund of ₹5,400 Swiggy transaction was successfully processed.",
    "execution_plan": ["Support node parsed...", "Payments node executed refund..."],
    "audit_trail": [{"node": "Support Agent", "action": "Intake completed..."}]
  }
  ```

---

## 3. Manager Approval Queue

### List Approvals
* **URL**: `/api/v1/approvals/requests`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**:
  ```json
  [
    {
      "id": 5,
      "action_type": "Refund",
      "target_id": "TXN87654321",
      "details": {
        "ticket_id": 1,
        "amount": 15000.0,
        "reason": "Refund limit ₹10,000 exceeded."
      },
      "status": "Pending",
      "requested_by": "AI Workflow Agent"
    }
  ]
  ```

### Submit Manager Decision (Approve/Reject)
* **URL**: `/api/v1/approvals/requests/{request_id}/action`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "status": "Approved",
    "reason": "Authorized refund; checked double invoice validity."
  }
  ```
* **Response**: `{"success": true, "message": "Approval request successfully marked as Approved."}`
