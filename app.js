// FinOps Agent State & Decision Engine

// Initialize State
let state = {
  tasksProcessed: 0,
  autonomousTasks: 0,
  escalatedTasks: 0,
  declinedTasks: 0,
  domainCounts: {
    "Customer Support": 0,
    "Payments": 0,
    "Fraud": 0,
    "Internal Ops": 0
  },
  hitlQueue: [],
  logs: [],
  settings: {
    refundThreshold: 5000,
    confidenceThreshold: 85,
    escalateVulnerable: true,
    escalateFraud: true,
    escalateDisputes: true,
    escalateAccountActions: true
  }
};

// Masking Utilities for DPDP/Compliance
function maskAadhaar(aadhaar) {
  if (!aadhaar || aadhaar === "N/A") return "N/A";
  const clean = aadhaar.replace(/[^0-9]/g, "");
  if (clean.length < 4) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

function maskPAN(pan) {
  if (!pan || pan === "N/A") return "N/A";
  const clean = pan.trim();
  if (clean.length < 4) return "XXXX-XX-XXXX";
  return `XXXX-XX-${clean.slice(-4)}`;
}

function maskName(name) {
  if (!name) return "Anonymous";
  const parts = name.split(" ");
  if (parts.length === 1) return name.slice(0, 1) + ".";
  return `${parts[0].slice(0, 1)}. ${parts[parts.length - 1]}`;
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// Generate Timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  initNavigation();
  loadPresets();
  bindForms();
  renderOverview();
  
  // Set up event listener to clear/reset simulation
  document.getElementById("btn-reset-simulator").addEventListener("click", resetState);
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
  document.getElementById("logs-search").addEventListener("input", filterLogs);
  document.getElementById("logs-filter-domain").addEventListener("change", filterLogs);
  document.getElementById("logs-filter-outcome").addEventListener("change", filterLogs);
  document.getElementById("btn-export-logs").addEventListener("click", exportLogs);

  // Quick triggers from Dashboard
  document.querySelectorAll("[data-tab-trigger]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = el.getAttribute("data-tab-trigger");
      switchTab(tabName);
    });
  });
});

// Navigation Handling
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = item.getAttribute("data-tab");
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update nav menu active state
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (activeNavItem) activeNavItem.classList.add("active");

  // Update tabs active state
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  const activeTabContent = document.getElementById(`tab-${tabName}`);
  if (activeTabContent) activeTabContent.classList.add("active");

  // Update page headers
  const titleEl = document.getElementById("page-title");
  const subtitleEl = document.getElementById("page-subtitle");
  
  switch(tabName) {
    case "overview":
      titleEl.textContent = "Dashboard Overview";
      subtitleEl.textContent = "Real-time metrics and autonomous operations overview.";
      renderOverview();
      break;
    case "simulator":
      titleEl.textContent = "Task Simulator Console";
      subtitleEl.textContent = "Inject operational tickets, watch reasoning loops, and analyze agent decisions.";
      break;
    case "hitl":
      titleEl.textContent = "Human-in-the-Loop (HITL) Queue";
      subtitleEl.textContent = "High-risk items escalated for review. Make instant decisions under 60 seconds.";
      renderHITLQueue();
      break;
    case "logs":
      titleEl.textContent = "Audit Trail Terminal";
      subtitleEl.textContent = "DPDP compliant operations ledger for internal risk management and external audits.";
      renderLogs();
      break;
    case "settings":
      titleEl.textContent = "Agent Configuration & Policy Editor";
      subtitleEl.textContent = "Adjust AI parameters, refund thresholds, and compliance lock rules.";
      break;
  }
}

// Preset Loader
function loadPresets() {
  const select = document.getElementById("scenario-presets");
  select.innerHTML = '<option value="" disabled selected>-- Select a Predefined Scenario --</option>';
  
  scenarios.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `[${s.domain}] ${s.title}`;
    select.appendChild(opt);
  });

  // Handle Preset Selection change
  select.addEventListener("change", (e) => {
    const s = scenarios[e.target.value];
    if (!s) return;
    
    // Fill custom task form with scenario details
    document.getElementById("task-domain").value = s.domain;
    document.getElementById("task-type").value = s.taskType;
    document.getElementById("task-urgency").value = s.urgency;
    document.getElementById("task-amount").value = s.systemContext.paymentPlatform && s.systemContext.paymentPlatform[0] ? s.systemContext.paymentPlatform[0].amount : 0;
    document.getElementById("task-desc").value = s.description;

    document.getElementById("cust-name").value = s.customer.name;
    document.getElementById("cust-aadhaar").value = s.customer.maskedAadhaar;
    document.getElementById("cust-pan").value = s.customer.maskedPan;
    
    document.getElementById("cust-vulnerable").checked = s.customer.isVulnerable;
    document.getElementById("cust-disputed").checked = s.customer.isDisputed;
    document.getElementById("cust-investigation").checked = s.customer.underInvestigation;

    document.getElementById("db-crm").value = s.systemContext.crmHistory || "";
    document.getElementById("db-payment").value = s.systemContext.paymentPlatform ? JSON.stringify(s.systemContext.paymentPlatform, null, 2) : "";
    document.getElementById("db-fraud").value = s.systemContext.priorFraudNotes || "";
    
    showToast(`Loaded Scenario: ${s.title}`, "info");
  });
}

// Form Handlers
function bindForms() {
  const form = document.getElementById("custom-task-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Compile task object from form
    const task = {
      id: "TASK-" + Math.floor(1000 + Math.random() * 9000),
      title: document.getElementById("task-type").value + " (₹" + document.getElementById("task-amount").value + ")",
      domain: document.getElementById("task-domain").value,
      taskType: document.getElementById("task-type").value,
      urgency: document.getElementById("task-urgency").value,
      amount: parseFloat(document.getElementById("task-amount").value) || 0,
      description: document.getElementById("task-desc").value,
      customer: {
        id: "CUST-" + Math.floor(1000 + Math.random() * 9000),
        name: document.getElementById("cust-name").value,
        maskedAadhaar: document.getElementById("cust-aadhaar").value,
        maskedPan: document.getElementById("cust-pan").value,
        isVulnerable: document.getElementById("cust-vulnerable").checked,
        isDisputed: document.getElementById("cust-disputed").checked,
        underInvestigation: document.getElementById("cust-investigation").checked
      },
      systemContext: {
        crmHistory: document.getElementById("db-crm").value,
        paymentPlatform: parseJSONQuietly(document.getElementById("db-payment").value) || document.getElementById("db-payment").value,
        priorFraudNotes: document.getElementById("db-fraud").value
      },
      confidence: Math.floor(75 + Math.random() * 25) // AI Confidence Score
    };

    runReasoningLoop(task);
  });
}

function parseJSONQuietly(val) {
  try { return JSON.parse(val); } catch(e) { return null; }
}

// Toast Notifications
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Reset UI Reasoning visuals
function resetVisualizer() {
  document.querySelectorAll(".loop-step").forEach(step => {
    step.classList.remove("active", "completed");
    step.querySelector(".step-output").textContent = "Awaiting execution...";
  });
  const globalTag = document.getElementById("loop-global-status");
  globalTag.textContent = "Idle";
  globalTag.className = "loop-status-tag idle";
}

// Running core reasoning loop visual simulation
function runReasoningLoop(task) {
  resetVisualizer();
  
  const globalTag = document.getElementById("loop-global-status");
  globalTag.textContent = "Processing";
  globalTag.className = "loop-status-tag processing";
  
  // Disable submit button during run
  const submitBtn = document.querySelector("#custom-task-form button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reasoning in progress...';
  
  const steps = [
    { id: "step-classify", run: runStepClassify },
    { id: "step-context", run: runStepContext },
    { id: "step-risk", run: runStepRisk },
    { id: "step-decide", run: runStepDecide },
    { id: "step-explain", run: runStepExplain },
    { id: "step-log-act", run: runStepLogAct }
  ];
  
  let currentStepIdx = 0;
  
  function executeNextStep() {
    if (currentStepIdx >= steps.length) {
      // Loop finished
      globalTag.textContent = "Complete";
      globalTag.className = "loop-status-tag complete";
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run FinOps Reasoning Loop';
      showToast("Reasoning loop complete!", "success");
      return;
    }
    
    const step = steps[currentStepIdx];
    const element = document.getElementById(step.id);
    element.classList.add("active");
    
    // Smooth scroll visualizer if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Simulate thinking delay
    setTimeout(() => {
      const output = step.run(task);
      const outEl = element.querySelector(".step-output");
      outEl.textContent = output;
      element.classList.remove("active");
      element.classList.add("completed");
      currentStepIdx++;
      executeNextStep();
    }, 750);
  }
  
  executeNextStep();
}

// REASONING ENGINE INDIVIDUAL STEPS
function runStepClassify(task) {
  // Classification
  return `DOMAIN: ${task.domain.toUpperCase()}
TASK TYPE: ${task.taskType}
URGENCY: ${task.urgency}
CONFIDENCE: ${task.confidence}%`;
}

function runStepContext(task) {
  // Gather Context
  const isCrm = task.systemContext.crmHistory ? "CRM Data Extracted" : "CRM Data: None";
  const isPay = task.systemContext.paymentPlatform ? "Payment Database Polled" : "Payment Logs: None";
  const isFraud = task.systemContext.priorFraudNotes ? "Fraud DB Checked" : "Fraud Notes: None";
  
  return `Consulted: [CRM, Payment Logs, Case Management]
Key Facts:
- Customer Name: ${maskName(task.customer.name)}
- CRM Records: ${task.systemContext.crmHistory || "None"}
- Payments Context: ${typeof task.systemContext.paymentPlatform === 'object' ? JSON.stringify(task.systemContext.paymentPlatform).slice(0, 100) + '...' : task.systemContext.paymentPlatform || "None"}`;
}

function runStepRisk(task) {
  // Risk assessment
  task.riskFactors = [];
  
  // 1. Threshold check
  if (task.domain === "Customer Support" || task.domain === "Payments") {
    if (task.taskType.toLowerCase().includes("refund") && task.amount > state.settings.refundThreshold) {
      task.riskFactors.push(`Refund value (${formatCurrency(task.amount)}) exceeds autonomous limit (${formatCurrency(state.settings.refundThreshold)})`);
    }
  }
  
  // 2. Vulnerable Customer Check
  if (task.customer.isVulnerable && state.settings.escalateVulnerable) {
    task.riskFactors.push("Customer profile marked as VULNERABLE");
  }
  
  // 3. Under Fraud investigation
  if (task.customer.underInvestigation) {
    task.riskFactors.push("Customer account marked UNDER ACTIVE FRAUD INVESTIGATION");
  }

  // 4. Disputed status
  if (task.customer.isDisputed && state.settings.escalateDisputes) {
    task.riskFactors.push("Customer has ACTIVE ACCOUNT DISPUTE flags");
  }

  // 5. Fraud domain
  if (task.domain === "Fraud" && state.settings.escalateFraud) {
    task.riskFactors.push("Task categorized within high-risk FRAUD domain");
  }

  // 6. Account actions (Suspension, reactive, freeze)
  if (state.settings.escalateAccountActions) {
    const keywords = ["freeze", "suspend", "closure", "kyc override", "credit limit", "unhold"];
    const textToCheck = (task.taskType + " " + task.description).toLowerCase();
    const matches = keywords.filter(kw => textToCheck.includes(kw));
    if (matches.length > 0) {
      task.riskFactors.push(`Task involves account actions: [${matches.join(", ")}]`);
    }
  }

  // 7. Confidence Check
  if (task.confidence < state.settings.confidenceThreshold) {
    task.riskFactors.push(`AI confidence score (${task.confidence}%) is below minimum threshold (${state.settings.confidenceThreshold}%)`);
  }

  task.isHighRisk = task.riskFactors.length > 0;
  
  if (task.isHighRisk) {
    return `RISK LEVEL: HIGH
Reasoning: Triggered ${task.riskFactors.length} HITL guardrail(s):
${task.riskFactors.map((r, i) => `  ${i+1}. ${r}`).join("\n")}`;
  } else {
    return `RISK LEVEL: LOW
Reasoning:
- Refund amount is below threshold
- Customer has no active disputes/vulnerability tags
- AI confidence matches SLA requirements`;
  }
}

function runStepDecide(task) {
  // Decision
  if (task.isHighRisk) {
    task.decision = "Escalated to human Operations Queue";
    task.outcome = "Pending Approval";
    return `DECISION: ESCALATE
Target Queue: human-ops-approvals
Suggested Urgency: ${task.urgency === "Low" ? "Medium" : task.urgency}`;
  } else {
    task.decision = "Autonomous Execution Authorized";
    task.outcome = "Executed (Autonomous)";
    return `DECISION: AUTONOMOUS EXECUTION
Action: Processed locally in ${task.domain} domain`;
  }
}

function runStepExplain(task) {
  // Explainability Standard
  let explanation = "";
  const maskedCustName = maskName(task.customer.name);
  
  if (task.isHighRisk) {
    explanation = `The agent encountered a request involving ${task.taskType} for customer ${maskedCustName} valued at ${formatCurrency(task.amount)}. It was escalated because it triggered guardrail conditions: [${task.riskFactors.join("; ")}]. If these risk conditions were absent (e.g. amount below limit or flag removed), the system would have resolved the case autonomously.`;
  } else {
    // Low risk autonomous action rationale
    if (task.taskType.toLowerCase().includes("refund")) {
      explanation = `A refund of ${formatCurrency(task.amount)} was autonomously issued to customer ${maskedCustName} for a duplicate billing error. The payments database verified double transaction logs, and the amount falls below the ₹${state.settings.refundThreshold} limit. Had the amount exceeded the threshold, the case would have been routed for manual approval.`;
    } else if (task.taskType.toLowerCase().includes("failure") || task.taskType.toLowerCase().includes("retry")) {
      explanation = `A payment retry for ${maskedCustName} valued at ${formatCurrency(task.amount)} was triggered autonomously after detecting a network timeout error code in the logs. This transient failure code is pre-approved for automation. Had the error code indicated insufficient funds, it would have been declined and escalated.`;
    } else {
      explanation = `The task regarding '${task.taskType}' for customer ${maskedCustName} was completed autonomously as it involves minor system updates and reminders. No sensitive financial structures or accounts were modified. Had the request affected customer credit lines, a human check would have been enforced.`;
    }
  }
  task.explanation = explanation;
  return explanation;
}

function runStepLogAct(task) {
  // Act and Log
  const logObj = {
    timestamp: getTimestamp(),
    domain: task.domain,
    caseId: task.id,
    title: task.title,
    action: task.decision,
    reason: task.explanation,
    sources: "CRM records, Payment ledger, Case management details",
    riskLevel: task.isHighRisk ? "High" : "Low",
    riskDetails: task.riskFactors.join("; ") || "No risk flags raised",
    confidence: task.confidence,
    outcome: task.outcome,
    taskObj: task
  };
  
  // Update state database
  state.tasksProcessed++;
  state.domainCounts[task.domain]++;
  
  if (task.isHighRisk) {
    state.escalatedTasks++;
    state.hitlQueue.push(task);
  } else {
    state.autonomousTasks++;
  }
  
  state.logs.unshift(logObj); // Add to beginning of logs array
  
  // Refresh data views
  saveToLocalStorage();
  renderOverview();
  
  let visualLog = `[${logObj.timestamp}] | [${logObj.domain.toUpperCase()}] | [${logObj.caseId}]
ACTION: ${logObj.action}
REASON: ${logObj.reason}
OUTCOME: ${logObj.outcome}`;

  return visualLog;
}

// Local Storage helpers
function saveToLocalStorage() {
  localStorage.setItem("finops_state", JSON.stringify({
    tasksProcessed: state.tasksProcessed,
    autonomousTasks: state.autonomousTasks,
    escalatedTasks: state.escalatedTasks,
    declinedTasks: state.declinedTasks,
    domainCounts: state.domainCounts,
    hitlQueue: state.hitlQueue,
    logs: state.logs
  }));
}

function loadSettings() {
  const savedSettings = localStorage.getItem("finops_settings");
  if (savedSettings) {
    state.settings = JSON.parse(savedSettings);
  }
  
  // Set forms with setting values
  document.getElementById("setting-refund-threshold").value = state.settings.refundThreshold;
  document.getElementById("setting-confidence-slider").value = state.settings.confidenceThreshold;
  document.getElementById("val-conf-threshold").textContent = `${state.settings.confidenceThreshold}%`;
  document.getElementById("header-conf-threshold").textContent = `${state.settings.confidenceThreshold}%`;
  
  document.getElementById("setting-escalate-vulnerable").checked = state.settings.escalateVulnerable;
  document.getElementById("setting-escalate-fraud").checked = state.settings.escalateFraud;
  document.getElementById("setting-escalate-disputes").checked = state.settings.escalateDisputes;
  document.getElementById("setting-escalate-account-actions").checked = state.settings.escalateAccountActions;
  
  // Load state
  const savedState = localStorage.getItem("finops_state");
  if (savedState) {
    const loadedState = JSON.parse(savedState);
    state.tasksProcessed = loadedState.tasksProcessed || 0;
    state.autonomousTasks = loadedState.autonomousTasks || 0;
    state.escalatedTasks = loadedState.escalatedTasks || 0;
    state.declinedTasks = loadedState.declinedTasks || 0;
    state.domainCounts = loadedState.domainCounts || { "Customer Support": 0, "Payments": 0, "Fraud": 0, "Internal Ops": 0 };
    state.hitlQueue = loadedState.hitlQueue || [];
    state.logs = loadedState.logs || [];
  }
}

function saveSettings() {
  state.settings = {
    refundThreshold: parseFloat(document.getElementById("setting-refund-threshold").value) || 0,
    confidenceThreshold: parseInt(document.getElementById("setting-confidence-slider").value) || 85,
    escalateVulnerable: document.getElementById("setting-escalate-vulnerable").checked,
    escalateFraud: document.getElementById("setting-escalate-fraud").checked,
    escalateDisputes: document.getElementById("setting-escalate-disputes").checked,
    escalateAccountActions: document.getElementById("setting-escalate-account-actions").checked
  };
  
  localStorage.setItem("finops_settings", JSON.stringify(state.settings));
  document.getElementById("header-conf-threshold").textContent = `${state.settings.confidenceThreshold}%`;
  
  showToast("Policy and threshold settings updated!", "success");
  renderOverview();
}

function resetState() {
  if (confirm("Are you sure you want to reset all simulated metrics, logs, and queue items? Settings will remain unchanged.")) {
    state.tasksProcessed = 0;
    state.autonomousTasks = 0;
    state.escalatedTasks = 0;
    state.declinedTasks = 0;
    state.domainCounts = { "Customer Support": 0, "Payments": 0, "Fraud": 0, "Internal Ops": 0 };
    state.hitlQueue = [];
    state.logs = [];
    
    saveToLocalStorage();
    resetVisualizer();
    renderOverview();
    showToast("Console state cleared.", "info");
  }
}

// Slider feedback
document.getElementById("setting-confidence-slider").addEventListener("input", (e) => {
  document.getElementById("val-conf-threshold").textContent = `${e.target.value}%`;
});

// Render Dashboard Overview
function renderOverview() {
  // Update badge
  document.getElementById("hitl-badge").textContent = state.hitlQueue.length;
  
  // Render counters
  document.getElementById("stat-total-tasks").textContent = state.tasksProcessed;
  document.getElementById("stat-auto-tasks").textContent = state.autonomousTasks;
  document.getElementById("stat-hitl-tasks").textContent = state.hitlQueue.length; // Active escalations
  document.getElementById("stat-declined-tasks").textContent = state.declinedTasks;
  
  // Percentages
  const pctAuto = state.tasksProcessed > 0 ? Math.round((state.autonomousTasks / state.tasksProcessed) * 100) : 0;
  const pctHitl = state.tasksProcessed > 0 ? Math.round((state.hitlQueue.length / state.tasksProcessed) * 100) : 0;
  const pctDec = state.tasksProcessed > 0 ? Math.round((state.declinedTasks / state.tasksProcessed) * 100) : 0;
  
  document.getElementById("stat-auto-pct").textContent = `${pctAuto}% of total`;
  document.getElementById("stat-hitl-pct").textContent = `${pctHitl}% of total`;
  document.getElementById("stat-declined-pct").textContent = `${pctDec}% of total`;

  // Render Domain Bars
  const totalDomains = Object.values(state.domainCounts).reduce((a, b) => a + b, 0);
  
  const supportPct = totalDomains > 0 ? (state.domainCounts["Customer Support"] / totalDomains) * 100 : 0;
  const paymentsPct = totalDomains > 0 ? (state.domainCounts["Payments"] / totalDomains) * 100 : 0;
  const fraudPct = totalDomains > 0 ? (state.domainCounts["Fraud"] / totalDomains) * 100 : 0;
  const opsPct = totalDomains > 0 ? (state.domainCounts["Internal Ops"] / totalDomains) * 100 : 0;
  
  document.getElementById("bar-support").style.width = `${supportPct}%`;
  document.getElementById("count-support").textContent = state.domainCounts["Customer Support"];
  
  document.getElementById("bar-payments").style.width = `${paymentsPct}%`;
  document.getElementById("count-payments").textContent = state.domainCounts["Payments"];
  
  document.getElementById("bar-fraud").style.width = `${fraudPct}%`;
  document.getElementById("count-fraud").textContent = state.domainCounts["Fraud"];
  
  document.getElementById("bar-ops").style.width = `${opsPct}%`;
  document.getElementById("count-ops").textContent = state.domainCounts["Internal Ops"];

  // Render recent logs preview (limit 3)
  const recentLogsContainer = document.getElementById("recent-logs-terminal");
  recentLogsContainer.innerHTML = "";
  
  if (state.logs.length === 0) {
    recentLogsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-database"></i>
        <p>No transactions processed yet. Run a simulation to populate the audit logs.</p>
      </div>`;
  } else {
    state.logs.slice(0, 3).forEach(log => {
      const block = document.createElement("div");
      block.className = `log-block ${getOutcomeClass(log.outcome)}`;
      
      block.textContent = `[${log.timestamp}] | [${log.domain.toUpperCase()}] | [${log.caseId}]
ACTION TAKEN or ESCALATED TO: ${log.action}
REASON: ${log.reason}
DATA SOURCES CONSULTED: ${log.sources}
RISK LEVEL: ${log.riskLevel.toUpperCase()} - ${log.riskDetails}
CONFIDENCE: ${log.confidence}%
OUTCOME: ${log.outcome}`;
      recentLogsContainer.appendChild(block);
    });
  }

  // Render HITL queue summary preview (limit 3)
  const hitlPreviewList = document.getElementById("hitl-preview-list");
  hitlPreviewList.innerHTML = "";
  
  if (state.hitlQueue.length === 0) {
    hitlPreviewList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-check"></i>
        <p>Human Approval Queue is empty.</p>
      </div>`;
  } else {
    state.hitlQueue.slice(0, 3).forEach(task => {
      const item = document.createElement("div");
      item.className = "compliance-note";
      item.style.borderLeft = "4px solid var(--color-amber)";
      item.style.cursor = "pointer";
      item.addEventListener("click", () => switchTab("hitl"));
      
      item.innerHTML = `
        <div class="note-title">
          <i class="fa-solid fa-triangle-exclamation"></i> ${task.id} - ${task.domain}
        </div>
        <p style="font-weight: 500; font-size:12px; color: #fff;">${task.title}</p>
        <p style="margin-top: 4px; font-size:11px;">Escalation Reason: ${task.riskFactors[0]}...</p>
      `;
      hitlPreviewList.appendChild(item);
    });
  }
}

function getOutcomeClass(outcome) {
  if (outcome.includes("Autonomous") || outcome.includes("Approved")) return "executed";
  if (outcome.includes("Pending")) return "pending";
  return "declined";
}

// Render Full HITL Queue Page
function renderHITLQueue() {
  const container = document.getElementById("hitl-queue-container");
  container.innerHTML = "";
  
  // Count stats
  document.getElementById("hitl-count-pending").textContent = state.hitlQueue.length;
  // Mock SLA breached (say any High/Critical tasks that are odd numbered for demonstration)
  const slaBreached = state.hitlQueue.filter((t, i) => t.urgency === "Critical" || t.urgency === "High").length;
  document.getElementById("hitl-count-sla").textContent = slaBreached;
  
  const approvedToday = state.logs.filter(l => l.outcome === "Approved by Human").length;
  document.getElementById("hitl-count-approved").textContent = approvedToday;

  if (state.hitlQueue.length === 0) {
    container.innerHTML = `
      <div class="empty-state full-width">
        <i class="fa-solid fa-people-roof"></i>
        <h3>Human-in-the-Loop Queue is Empty</h3>
        <p>Great job! There are no operations tasks pending human review. Run simulator scenarios to trigger escalations.</p>
      </div>`;
    return;
  }

  state.hitlQueue.forEach((task, index) => {
    const card = document.createElement("div");
    const isCritical = task.urgency === "Critical" || task.urgency === "High";
    card.className = `hitl-card ${isCritical ? 'sla-breached' : ''}`;
    
    // Map domain badge
    let domBadge = "badge-support";
    if (task.domain === "Payments") domBadge = "badge-payments";
    if (task.domain === "Fraud") domBadge = "badge-fraud";
    if (task.domain === "Internal Ops") domBadge = "badge-ops";

    // PII masking for safe render
    const maskedAadhaarVal = maskAadhaar(task.customer.maskedAadhaar);
    const maskedPanVal = maskPAN(task.customer.maskedPan);
    const maskedNameVal = maskName(task.customer.name);

    card.innerHTML = `
      <div class="hitl-card-header">
        <div class="hitl-id-domain">
          <h4>${task.id} - ${task.taskType}</h4>
          <span class="${domBadge}">${task.domain}</span>
        </div>
        <span class="hitl-urgency-tag urgency-${task.urgency.toLowerCase()}">${task.urgency}</span>
      </div>

      <div class="hitl-summary-section ${isCritical ? 'sla-breached' : ''}">
        <span class="section-label">Case Summary</span>
        <p class="hitl-summary-text">${task.description}</p>
      </div>

      <div class="hitl-rec-action">
        <span class="section-label">Recommendation</span>
        <div>Recommend action: <strong>${getRecommendedAction(task)}</strong></div>
        <div class="hitl-confidence" style="color: ${task.confidence >= 85 ? 'var(--color-green)' : 'var(--color-amber)'}">
          Confidence Score: ${task.confidence}%
        </div>
      </div>

      <div class="hitl-evidence-section">
        <span class="section-label">Supporting Evidence & Context</span>
        <div class="evidence-link">
          <i class="fa-solid fa-address-card"></i>
          <span>Customer: ${maskedNameVal} | Aadhaar: ${maskedAadhaarVal} | PAN: ${maskedPanVal}</span>
        </div>
        <div class="evidence-link">
          <i class="fa-solid fa-clock-history"></i>
          <span>CRM: ${task.systemContext.crmHistory || 'No prior notes found.'}</span>
        </div>
        <div class="evidence-link">
          <i class="fa-solid fa-receipt"></i>
          <span>Payment details: ${typeof task.systemContext.paymentPlatform === 'object' ? JSON.stringify(task.systemContext.paymentPlatform) : task.systemContext.paymentPlatform || 'No payment platform logs.'}</span>
        </div>
      </div>

      <div class="hitl-risk-section">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <span class="section-label" style="color: #fca5a5;">Escalation Risk Factors</span>
          <p style="font-size: 11px; line-height: 1.3;">${task.riskFactors.join(" | ")}</p>
        </div>
      </div>

      <div class="hitl-actions-row">
        <button class="btn btn-primary" onclick="processHumanDecision(${index}, 'approve')">
          <i class="fa-solid fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="processHumanDecision(${index}, 'reject')">
          <i class="fa-solid fa-xmark"></i> Reject
        </button>
        <button class="btn btn-secondary" onclick="processHumanDecision(${index}, 'modify')">
          <i class="fa-solid fa-pen-to-square"></i> Modify
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function getRecommendedAction(task) {
  if (task.taskType.toLowerCase().includes("refund")) {
    return `Issue Refund of ${formatCurrency(task.amount)}`;
  }
  if (task.taskType.toLowerCase().includes("freeze") || task.domain === "Fraud") {
    return "Freeze customer account wallet & funds";
  }
  if (task.taskType.toLowerCase().includes("failure") || task.taskType.toLowerCase().includes("retry")) {
    return "Execute payment transaction retry";
  }
  return `Approve and proceed with ${task.taskType}`;
}

// Global hook for buttons since card is generated in innerHTML
window.processHumanDecision = function(index, decision) {
  const task = state.hitlQueue[index];
  if (!task) return;
  
  let outcomeText = "";
  let actionText = "";
  let detailsText = "";
  
  if (decision === 'approve') {
    actionText = `Approve Action: ${getRecommendedAction(task)}`;
    outcomeText = "Approved by Human";
    detailsText = "Approved after manual operations review of system credentials and contexts.";
    showToast(`Case ${task.id} Approved successfully!`, "success");
  } else if (decision === 'reject') {
    actionText = `Declined Action: ${getRecommendedAction(task)}`;
    outcomeText = "Declined by Human";
    detailsText = "Declined after manual operations review due to security, compliance, or validation failure.";
    showToast(`Case ${task.id} Rejected.`, "error");
    state.declinedTasks++;
  } else if (decision === 'modify') {
    const newValue = prompt(`Modify value/action for task ${task.id}:`, getRecommendedAction(task));
    if (newValue === null) return; // cancelled
    actionText = `Modified Execution: ${newValue}`;
    outcomeText = "Approved by Human";
    detailsText = `Approved with modification: [${newValue}] after manual operations review.`;
    showToast(`Case ${task.id} approved with modification.`, "warning");
  }
  
  // Remove from HITL Queue
  state.hitlQueue.splice(index, 1);
  
  // Log Decision
  const auditLogObj = {
    timestamp: getTimestamp(),
    domain: task.domain,
    caseId: task.id,
    title: task.title,
    action: actionText,
    reason: `HUMAN INTERVENTION: ${detailsText} Original AI Rationale: ${task.explanation}`,
    sources: "CRM records, Payment ledger, Case management details, Human Analyst override",
    riskLevel: "High (Escalated)",
    riskDetails: task.riskFactors.join("; "),
    confidence: 100, // Human decision overrides confidence
    outcome: outcomeText,
    taskObj: task
  };
  
  state.logs.unshift(auditLogObj);
  saveToLocalStorage();
  renderOverview();
  
  // If we are currently on the HITL page, re-render it
  const hitlTab = document.getElementById("tab-hitl");
  if (hitlTab.classList.contains("active")) {
    renderHITLQueue();
  }
};

// Render full Audit Logs
function renderLogs() {
  const container = document.getElementById("audit-logs-full-terminal");
  container.innerHTML = "";
  
  const filtered = filterLogsList();
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-shield"></i>
        <p>No audit logs matches the search filters.</p>
      </div>`;
    return;
  }
  
  filtered.forEach(log => {
    const block = document.createElement("div");
    block.className = `log-block ${getOutcomeClass(log.outcome)}`;
    
    block.textContent = `[${log.timestamp}] | [${log.domain.toUpperCase()}] | [${log.caseId}]
ACTION TAKEN or ESCALATED TO: ${log.action}
REASON: ${log.reason}
DATA SOURCES CONSULTED: ${log.sources}
RISK LEVEL: ${log.riskLevel.toUpperCase()} - ${log.riskDetails}
CONFIDENCE: ${log.confidence}%
OUTCOME: ${log.outcome}`;
    
    container.appendChild(block);
  });
}

function filterLogsList() {
  const query = document.getElementById("logs-search").value.toLowerCase();
  const domainFilter = document.getElementById("logs-filter-domain").value;
  const outcomeFilter = document.getElementById("logs-filter-outcome").value;
  
  return state.logs.filter(log => {
    // Text search
    const textMatch = log.caseId.toLowerCase().includes(query) || 
                      log.reason.toLowerCase().includes(query) || 
                      log.action.toLowerCase().includes(query) ||
                      log.title.toLowerCase().includes(query);
                      
    // Domain match
    const domainMatch = domainFilter === "All" || log.domain === domainFilter;
    
    // Outcome match
    let outcomeMatch = false;
    if (outcomeFilter === "All") {
      outcomeMatch = true;
    } else if (outcomeFilter === "Executed (Autonomous)") {
      outcomeMatch = log.outcome === "Executed (Autonomous)";
    } else if (outcomeFilter === "Pending Approval") {
      outcomeMatch = log.outcome === "Pending Approval";
    } else if (outcomeFilter === "Approved by Human") {
      outcomeMatch = log.outcome === "Approved by Human";
    } else if (outcomeFilter === "Declined by Human") {
      outcomeMatch = log.outcome === "Declined by Human";
    }
    
    return textMatch && domainMatch && outcomeMatch;
  });
}

function filterLogs() {
  // Only redraw if the logs tab is active
  const logsTab = document.getElementById("tab-logs");
  if (logsTab.classList.contains("active")) {
    renderLogs();
  }
}

// Export Logs function (Simple json download)
function exportLogs() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.logs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `finops_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Audit logs exported to JSON!", "success");
}
