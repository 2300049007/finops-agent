// Predefined simulation scenarios for the FinOps Agent
const scenarios = [
  {
    id: "CASE-101",
    title: "Duplicate Charge Refund (₹1,500)",
    domain: "Customer Support",
    taskType: "Refund Request",
    urgency: "Medium",
    description: "Customer reports they were charged twice for their order. They want a refund of ₹1,500 for the duplicate charge.",
    customer: {
      id: "CUST-8801",
      name: "Aarav Sharma",
      maskedAadhaar: "XXXX-XXXX-8812",
      maskedPan: "XXXX-XX-1122",
      isVulnerable: false,
      isDisputed: false,
      underInvestigation: false
    },
    systemContext: {
      crmHistory: "Last interaction: 3 days ago. No active complaints. Customer loyalty tier: Gold.",
      paymentPlatform: [
        { id: "TXN-4059-A", amount: 1500, status: "SUCCESS", timestamp: "2026-08-07T14:30:10Z" },
        { id: "TXN-4059-B", amount: 1500, status: "SUCCESS", timestamp: "2026-08-07T14:30:15Z" } // Duplicate transaction 5 seconds later
      ],
      priorFraudNotes: "Risk score: 3%. Regular IP usage, matching billing and shipping addresses.",
      caseManagement: "No open cases."
    }
  },
  {
    id: "CASE-102",
    title: "Delayed Delivery Refund (₹7,500)",
    domain: "Customer Support",
    taskType: "Refund Request",
    urgency: "Medium",
    description: "Customer wants a full refund of ₹7,500 because the delivery is delayed by 10 days and they no longer want the product.",
    customer: {
      id: "CUST-4432",
      name: "Priyanka Patel",
      maskedAadhaar: "XXXX-XXXX-9900",
      maskedPan: "XXXX-XX-4455",
      isVulnerable: false,
      isDisputed: false,
      underInvestigation: false
    },
    systemContext: {
      crmHistory: "Last interaction: 1 day ago. Ticket opened for delivery status. Product status: In-Transit (delayed).",
      paymentPlatform: [
        { id: "TXN-8822-A", amount: 7500, status: "SUCCESS", timestamp: "2026-08-01T09:15:00Z" }
      ],
      priorFraudNotes: "Risk score: 10%. Regular buyer, no dispute history.",
      caseManagement: "Open shipping ticket #SHIP-9912."
    }
  },
  {
    id: "CASE-103",
    title: "Vulnerable Customer Payment Dispute (₹2,200)",
    domain: "Payments",
    taskType: "Refund Request",
    urgency: "High",
    description: "Senior citizen customer claims they were charged ₹2,200 for a service they did not authorize. Standard policy allows autonomous refunds below ₹5,000, but customer profile indicates a 'Vulnerable Customer' tag.",
    customer: {
      id: "CUST-3091",
      name: "Ramesh Chandra",
      maskedAadhaar: "XXXX-XXXX-3344",
      maskedPan: "XXXX-XX-8899",
      isVulnerable: true, // Vulnerable customer flag
      isDisputed: true,
      underInvestigation: false
    },
    systemContext: {
      crmHistory: "Profile marked: Vulnerable (Senior Citizen). Multiple payment assistance notes. Needs telephone confirmation for critical updates.",
      paymentPlatform: [
        { id: "TXN-1010-C", amount: 2200, status: "SUCCESS", timestamp: "2026-08-06T18:40:00Z" }
      ],
      priorFraudNotes: "Risk score: 25%. Login from normal device but late-night transaction.",
      caseManagement: "Dispute opened by customer's nominee."
    }
  },
  {
    id: "CASE-104",
    title: "Failed Payment Auto-Retry (₹500)",
    domain: "Payments",
    taskType: "Transaction Failure",
    urgency: "Low",
    description: "Transaction failed with transient code network error. Customer request asks to complete payment for their pending electricity bill.",
    customer: {
      id: "CUST-7023",
      name: "Karan Johar",
      maskedAadhaar: "XXXX-XXXX-7766",
      maskedPan: "XXXX-XX-0011",
      isVulnerable: false,
      isDisputed: false,
      underInvestigation: false
    },
    systemContext: {
      crmHistory: "No prior tickets. Standard active user.",
      paymentPlatform: [
        { id: "TXN-9021-F", amount: 500, status: "FAILED", errorCode: "ERR_NETWORK_TIMEOUT", timestamp: "2026-08-07T19:00:00Z" }
      ],
      priorFraudNotes: "Risk score: 1%. Common utility payment pattern.",
      caseManagement: "No open cases."
    }
  },
  {
    id: "CASE-105",
    title: "Suspicious Account Freeze Request (₹0)",
    domain: "Fraud",
    taskType: "Account Freeze",
    urgency: "Critical",
    description: "Anomalous multi-login detected from 3 different cities in under 2 hours. Recommended action is to freeze the account funds immediately to prevent capital flight.",
    customer: {
      id: "CUST-1102",
      name: "Aditya Roy",
      maskedAadhaar: "XXXX-XXXX-4422",
      maskedPan: "XXXX-XX-9933",
      isVulnerable: false,
      isDisputed: false,
      underInvestigation: true
    },
    systemContext: {
      crmHistory: "Account logged in from Mumbai, Chennai, and Delhi within 90 minutes. Password changed 10 minutes ago.",
      paymentPlatform: [
        { id: "TXN-5544-H", amount: 0, status: "AUTH_CHECK", timestamp: "2026-08-07T19:15:00Z" }
      ],
      priorFraudNotes: "Risk score: 92%. Active velocity triggers hit. System recommends immediate freeze of CUST-1102 wallet.",
      caseManagement: "Active fraud alert case opened automatically by system."
    }
  },
  {
    id: "CASE-106",
    title: "Pending Approval Reminder Chasing (₹0)",
    domain: "Internal Ops",
    taskType: "Approval Chase",
    urgency: "Low",
    description: "Budget approval request for purchase order PO-8877 is pending for more than 48 hours. FinOps agent needs to ping the manager for review.",
    customer: {
      id: "USER-550",
      name: "Vikram Malhotra (Ops Lead)",
      maskedAadhaar: "N/A",
      maskedPan: "N/A",
      isVulnerable: false,
      isDisputed: false,
      underInvestigation: false
    },
    systemContext: {
      crmHistory: "Internal staff account.",
      paymentPlatform: [],
      priorFraudNotes: "N/A",
      caseManagement: "PO-8877 status: PENDING_SIGN_OFF. Approver: Finance Director."
    }
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = scenarios;
}
