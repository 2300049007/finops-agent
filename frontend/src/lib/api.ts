const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("finops_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // --- AUTHENTICATION ---
  async login(email: string, password: string): Promise<any> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Authentication failed");
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem("finops_token", data.access_token);
      localStorage.setItem("finops_role", data.role);
      localStorage.setItem("finops_user", JSON.stringify({ email, full_name: data.full_name, role: data.role }));
    }
    return data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("finops_token");
      localStorage.removeItem("finops_role");
      localStorage.removeItem("finops_user");
    }
  },

  getUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem("finops_user");
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  async getMe(): Promise<any> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Session expired");
    return res.json();
  },

  // --- TICKETS ---
  async getTickets(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/tickets`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load tickets");
    return res.json();
  },

  async getTicketDetails(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/tickets/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load ticket details");
    return res.json();
  },

  async processTicket(id: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/tickets/${id}/process`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to process ticket");
    return res.json();
  },

  // --- PAYMENTS ---
  async getTransactions(search?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status_filter", status);
    
    const res = await fetch(`${BASE_URL}/payments/transactions?${params.toString()}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
  },

  async triggerRefund(paymentId: string, amount: number, reason: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/payments/refund`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ payment_id: paymentId, amount, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Refund failed");
    }
    return res.json();
  },

  // --- FRAUD ---
  async getFraudCases(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/fraud/cases`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch fraud cases");
    return res.json();
  },

  async resolveFraudCase(caseId: number, status: string, actionTaken: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/fraud/cases/${caseId}/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ status, action_taken: actionTaken }),
    });
    if (!res.ok) throw new Error("Failed to update case");
    return res.json();
  },

  // --- HUMAN APPROVALS ---
  async getApprovalRequests(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/approvals/requests`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch approval queue");
    return res.json();
  },

  async actionApprovalRequest(requestId: number, status: string, reason: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/approvals/requests/${requestId}/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Approval request action failed");
    }
    return res.json();
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(category?: string): Promise<any[]> {
    const url = category ? `${BASE_URL}/audit/logs?category=${category}` : `${BASE_URL}/audit/logs`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  async exportAuditLogs(): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/audit/export`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to export audit logs");
  }

  return res.blob();
},

  // --- SETTINGS ---
  async getSettings(): Promise<any> {
    const res = await fetch(`${BASE_URL}/settings`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  // --- CELERY BACKGROUND TASKS ---
  async triggerKycOcr(customerId: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/tools/trigger-ocr/${customerId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to trigger KYC OCR");
    return res.json();
  },

  async triggerPdfReport(ticketId: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/tools/generate-report/${ticketId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to compile PDF Case file");
    return res.json();
  }
};
