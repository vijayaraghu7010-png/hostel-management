/* ==========================================================================
   PARENT ALERT SYSTEM — Complete JS Module
   Self-contained module that integrates with existing HostelDB data layer.
   No modifications to utils.js or existing warden.js logic required.
   ========================================================================== */

// ---- Settings Defaults ----
const PA_SETTINGS_KEY = 'hms_parent_alert_settings';
const PA_DELIVERY_LOG_KEY = 'hms_parent_delivery_log';

function getDefaultPASettings() {
  return {
    creditThreshold: 600,
    absenceThreshold: 3,
    language: 'TAMIL_ENGLISH',
    frequency: 48,
    autoSend: false,
    voiceEnabled: true,
    messageEnabled: true
  };
}

function getPASettings() {
  try {
    const stored = localStorage.getItem(PA_SETTINGS_KEY);
    return stored ? { ...getDefaultPASettings(), ...JSON.parse(stored) } : getDefaultPASettings();
  } catch (e) {
    return getDefaultPASettings();
  }
}

function savePASettings(settings) {
  localStorage.setItem(PA_SETTINGS_KEY, JSON.stringify(settings));
}

// ---- Delivery Log ----
function getDeliveryLog() {
  try {
    return JSON.parse(localStorage.getItem(PA_DELIVERY_LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function addDeliveryLogEntry(entry) {
  const log = getDeliveryLog();
  log.unshift({
    id: 'DLV' + Math.floor(1000 + Math.random() * 9000),
    ...entry,
    timestamp: new Date().toISOString()
  });
  // Keep max 500 entries
  if (log.length > 500) log.length = 500;
  localStorage.setItem(PA_DELIVERY_LOG_KEY, JSON.stringify(log));
}

// ---- Message Templates ----
function generateEnglishMessage(studentName, regNo, credit, reasons) {
  const reasonList = reasons.map(r => `• ${r}`).join('\n');
  return `🚨 KVCET Smart Hostel Alert

Dear Parent,

This is an automated notification from KVCET Smart Hostel Management System.

Your ward ${studentName} (${regNo}) requires attention.

Reason:
${reasonList}

Current Credit:
${credit}/1000

Please speak with your ward and encourage regular attendance and hostel discipline.

For further information, kindly contact the Hostel Warden.

Thank you.`;
}

function generateTamilMessage(studentName, regNo, credit, reasons) {
  const reasonList = reasons.map(r => `• ${r}`).join('\n');
  return `🚨 KVCET ஸ்மார்ட் ஹாஸ்டல் அறிவிப்பு

அன்புடைய பெற்றோருக்கு,

இது KVCET Smart Hostel Management System வழங்கும் தானியங்கி அறிவிப்பு.

உங்கள் மாணவர் ${studentName} (${regNo}) அவர்களின் Study Hour வருகை மற்றும் ஹாஸ்டல் ஒழுக்கம் குறைவாக உள்ளது.

காரணங்கள்:
${reasonList}

தற்போதைய Discipline Credit:
${credit}/1000

தயவுசெய்து உங்கள் மாணவரிடம் பேசி தேவையான ஆலோசனைகளை வழங்குமாறு கேட்டுக்கொள்கிறோம்.

மேலும் தகவல்களுக்கு ஹாஸ்டல் வார்டனை தொடர்பு கொள்ளவும்.

நன்றி.`;
}

function generateBilingualMessage(studentName, regNo, credit, reasons) {
  return generateTamilMessage(studentName, regNo, credit, reasons) + '\n\n───────────────\n\n' + generateEnglishMessage(studentName, regNo, credit, reasons);
}

function generateEnglishVoiceScript(studentName, credit) {
  return `Hello Parent. This is an automated notification from KVCET Smart Hostel Management System. Your ward ${studentName} currently has low discipline credit because of poor Study Hour attendance or repeated hostel rule violations. Current discipline credit is ${credit} out of 1000. Kindly communicate with your ward and encourage improvement. Thank you.`;
}

function generateTamilVoiceScript(studentName, credit) {
  return `வணக்கம். இது KVCET Smart Hostel Management System வழங்கும் தானியங்கி அறிவிப்பு. உங்கள் மாணவர் ${studentName} அவர்களின் Study Hour வருகை மற்றும் ஹாஸ்டல் ஒழுக்கம் குறைவாக இருப்பதால் Discipline Credit குறைந்துள்ளது. தற்போதைய Credit ${credit} out of 1000. தயவுசெய்து உங்கள் மாணவரிடம் பேசி தேவையான ஆலோசனைகளை வழங்குமாறு கேட்டுக்கொள்கிறோம். நன்றி.`;
}

function getMessageByLanguage(language, studentName, regNo, credit, reasons) {
  switch (language) {
    case 'ENGLISH': return generateEnglishMessage(studentName, regNo, credit, reasons);
    case 'TAMIL': return generateTamilMessage(studentName, regNo, credit, reasons);
    case 'TAMIL_ENGLISH':
    default: return generateBilingualMessage(studentName, regNo, credit, reasons);
  }
}

function getVoiceScriptByLanguage(language, studentName, credit) {
  switch (language) {
    case 'ENGLISH': return { text: generateEnglishVoiceScript(studentName, credit), lang: 'en-IN' };
    case 'TAMIL': return { text: generateTamilVoiceScript(studentName, credit), lang: 'ta-IN' };
    case 'TAMIL_ENGLISH':
    default: return { text: generateTamilVoiceScript(studentName, credit) + ' ' + generateEnglishVoiceScript(studentName, credit), lang: 'ta-IN' };
  }
}

// ---- Risk Helpers ----
function getRiskBadgeClass(riskLevel) {
  switch (riskLevel) {
    case 'CRITICAL': return 'badge-critical';
    case 'WARNING': return 'badge-highrisk';
    case 'WATCH': return 'badge-watch';
    case 'NORMAL':
    default: return 'badge-normal';
  }
}

function getRiskLabel(riskLevel) {
  switch (riskLevel) {
    case 'CRITICAL': return 'Critical';
    case 'WARNING': return 'High Risk';
    case 'WATCH': return 'Watch';
    case 'NORMAL':
    default: return 'Normal';
  }
}

function getStatusBadgeClass(status) {
  switch ((status || '').toUpperCase()) {
    case 'PENDING': return 'badge-status-pending';
    case 'SENDING': return 'badge-status-sending';
    case 'SENT': return 'badge-status-sent';
    case 'DELIVERED': return 'badge-status-delivered';
    case 'FAILED': return 'badge-status-failed';
    case 'RESOLVED': return 'badge-status-resolved';
    default: return 'badge-status-pending';
  }
}

function getCreditColor(credit) {
  if (credit >= 800) return '#34d399';
  if (credit >= 650) return '#818cf8';
  if (credit >= 500) return '#fbbf24';
  if (credit >= 350) return '#f97316';
  return '#f87171';
}

// ---- Voice Synthesis ----
let currentUtterance = null;

function synthesizeVoice(text, lang = 'en-IN') {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any currently playing
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    currentUtterance = utterance;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };
    utterance.onerror = (e) => {
      currentUtterance = null;
      reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}

function stopVoice() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

// ---- WhatsApp Integration ----
function openWhatsAppSend(phoneNumber, message) {
  // Clean phone number
  let cleaned = (phoneNumber || '').replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleaned}?text=${encoded}`;
  window.open(url, '_blank');
}

// ---- Alert Engine ----
async function scanAllStudentsForRisk() {
  const settings = getPASettings();
  const students = await HostelDB.getStudents();
  const activeStudents = students.filter(s => (s.hostelStatus || 'Active') === 'Active');
  const existingAlerts = await HostelDB.getParentAlerts();
  const newAlerts = [];

  for (const student of activeStudents) {
    // Get credit balance
    const credit = await HostelDB.getCreditBalance(student.regNo);

    // Evaluate risk
    const riskProfile = await HostelDB.evaluateStudentRisk(student.regNo);

    // Check if alert is needed
    const shouldTrigger = credit < settings.creditThreshold ||
                          riskProfile.risk_level === 'CRITICAL' ||
                          riskProfile.risk_level === 'WARNING';

    if (!shouldTrigger) continue;

    // Check frequency — don't alert same student too often
    const recentAlerts = existingAlerts.filter(a =>
      a.studentReg === student.regNo &&
      a.status !== 'RESOLVED'
    );

    const lastAlert = recentAlerts[0];
    if (lastAlert) {
      const hoursSinceLastAlert = (Date.now() - new Date(lastAlert.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < settings.frequency) continue;
    }

    // Build reasons
    const reasons = [];
    if (credit < settings.creditThreshold) {
      reasons.push(`Discipline Credit below threshold (${credit}/${settings.creditThreshold})`);
    }
    const ledger = await HostelDB.getCreditLedger(student.regNo);
    const absences = ledger.filter(l => l.sourceEvent === 'STUDY_SESSION_ABSENT');
    if (absences.length >= settings.absenceThreshold) {
      reasons.push(`${absences.length} Study Hour absences detected`);
    }
    const violations = ledger.filter(l => l.pointsChange < 0);
    if (violations.length >= 3) {
      reasons.push(`${violations.length} hostel rule violations recorded`);
    }
    if (reasons.length === 0) {
      reasons.push('Low Discipline Credit');
    }

    // Generate message
    const message = getMessageByLanguage(settings.language, student.name, student.regNo, credit, reasons);

    // Create alert
    const alert = await HostelDB.createParentAlert({
      studentReg: student.regNo,
      alertType: riskProfile.risk_level === 'CRITICAL' ? 'CRITICAL_ALERT' : 'DISCIPLINE_WARNING',
      language: settings.language,
      messageText: message,
      status: settings.autoSend ? 'SENDING' : 'PENDING'
    });

    newAlerts.push({
      alert,
      student,
      credit,
      riskProfile,
      reasons
    });
  }

  return newAlerts;
}

// ---- Main Init ----
async function initParentAlerts() {
  // Verify role access — only warden and principal
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'warden' && currentUser.role !== 'principal')) return;

  // Load settings into UI
  loadSettingsUI();

  // Initial data render
  await refreshAlertDashboard();

  // Bind events
  bindParentAlertEvents();

  // Init voice wave bars
  initVoiceWaveBars();
}

// ---- Data Refresh ----
let paAlerts = [];
let paStudents = [];
let paPage = 1;
const PA_PAGE_SIZE = 15;

async function refreshAlertDashboard() {
  try {
    const [alerts, students] = await Promise.all([
      HostelDB.getParentAlerts(),
      HostelDB.getStudents()
    ]);

    paAlerts = alerts;
    paStudents = students;

    renderAlertStats(alerts);
    renderAlertTable();
    renderDeliveryLog();
  } catch (e) {
    console.error('Failed to load parent alerts data:', e);
  }
}

// ---- Stats Rendering ----
function renderAlertStats(alerts) {
  const totalEl = document.getElementById('stat-total-alerts');
  const highRiskEl = document.getElementById('stat-high-risk');
  const pendingEl = document.getElementById('stat-pending');
  const sentTodayEl = document.getElementById('stat-sent-today');

  if (totalEl) totalEl.textContent = alerts.length;
  if (highRiskEl) {
    const highRisk = alerts.filter(a => a.alertType === 'CRITICAL_ALERT').length;
    highRiskEl.textContent = highRisk;
  }
  if (pendingEl) {
    const pending = alerts.filter(a => (a.status || '').toUpperCase() === 'PENDING').length;
    pendingEl.textContent = pending;
  }
  if (sentTodayEl) {
    const today = new Date().toDateString();
    const sentToday = alerts.filter(a => {
      const status = (a.status || '').toUpperCase();
      return (status === 'SENT' || status === 'DELIVERED') &&
             a.sentAt && new Date(a.sentAt).toDateString() === today;
    }).length;
    sentTodayEl.textContent = sentToday;
  }
}

// ---- Alert Table Rendering ----
function getFilteredAlerts() {
  const searchVal = (document.getElementById('pa-search')?.value || '').toLowerCase();
  const riskFilter = document.getElementById('pa-filter-risk')?.value || '';
  const deptFilter = document.getElementById('pa-filter-dept')?.value || '';
  const statusFilter = document.getElementById('pa-filter-status')?.value || '';

  return paAlerts.filter(alert => {
    const student = paStudents.find(s => s.regNo === alert.studentReg) || {};

    // Search
    if (searchVal) {
      const match = (student.name || '').toLowerCase().includes(searchVal) ||
                    (alert.studentReg || '').toLowerCase().includes(searchVal);
      if (!match) return false;
    }

    // Risk filter
    if (riskFilter) {
      const alertRisk = alert.alertType === 'CRITICAL_ALERT' ? 'CRITICAL' : 'WARNING';
      if (riskFilter === 'CRITICAL' && alertRisk !== 'CRITICAL') return false;
      if (riskFilter === 'WARNING' && alertRisk !== 'WARNING') return false;
      if (riskFilter === 'WATCH' && alertRisk !== 'WATCH') return false;
      if (riskFilter === 'NORMAL' && alertRisk !== 'NORMAL') return false;
    }

    // Department filter
    if (deptFilter && (student.dept || '') !== deptFilter) return false;

    // Status filter
    if (statusFilter && (alert.status || '').toUpperCase() !== statusFilter) return false;

    return true;
  });
}

function renderAlertTable() {
  const tbody = document.getElementById('pa-alerts-tbody');
  const countEl = document.getElementById('pa-alert-count');
  const paginationInfo = document.getElementById('pa-pagination-info');
  const btnPrev = document.getElementById('pa-btn-prev');
  const btnNext = document.getElementById('pa-btn-next');

  if (!tbody) return;

  const filtered = getFilteredAlerts();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PA_PAGE_SIZE));
  if (paPage > totalPages) paPage = totalPages;

  const start = (paPage - 1) * PA_PAGE_SIZE;
  const end = Math.min(start + PA_PAGE_SIZE, total);
  const pageAlerts = filtered.slice(start, end);

  if (countEl) countEl.textContent = `${total} alert${total !== 1 ? 's' : ''}`;
  if (paginationInfo) paginationInfo.textContent = `Showing ${total > 0 ? start + 1 : 0} to ${end} of ${total} alerts`;
  if (btnPrev) btnPrev.disabled = paPage <= 1;
  if (btnNext) btnNext.disabled = paPage >= totalPages;

  if (pageAlerts.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="pa-empty-state">
          <div class="pa-empty-icon"><i class="fa-solid fa-bell-slash"></i></div>
          <div class="pa-empty-title">No Parent Alerts Found</div>
          <div class="pa-empty-text">Click "Scan All Students" to detect at-risk students and generate alerts automatically.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = pageAlerts.map(alert => {
    const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
    const riskLevel = alert.alertType === 'CRITICAL_ALERT' ? 'CRITICAL' : 'WARNING';
    const status = (alert.status || 'PENDING').toUpperCase();

    // Extract credit from message
    let credit = '—';
    const creditMatch = (alert.messageText || '').match(/(\d+)\/1000/);
    if (creditMatch) credit = creditMatch[1];

    // Extract reason excerpt
    let reasonExcerpt = 'Low Discipline Credit';
    const reasonMatch = (alert.messageText || '').match(/(?:Reason|காரணங்கள்):\n([\s\S]*?)(?:\n\n|Current|தற்போதைய)/);
    if (reasonMatch) {
      reasonExcerpt = reasonMatch[1].replace(/[•]/g, '').trim().split('\n')[0].trim();
      if (reasonExcerpt.length > 40) reasonExcerpt = reasonExcerpt.substring(0, 37) + '...';
    }

    return `
      <tr>
        <td><strong>${student.name || alert.studentReg}</strong></td>
        <td>${alert.studentReg}</td>
        <td>${student.dept || '—'}</td>
        <td>${student.room || '—'}</td>
        <td><span style="color: ${getCreditColor(parseInt(credit) || 0)}; font-weight: 700;">${credit}</span></td>
        <td><span class="pa-badge ${getRiskBadgeClass(riskLevel)}">${getRiskLabel(riskLevel)}</span></td>
        <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis;" title="${reasonExcerpt}">${reasonExcerpt}</td>
        <td><span class="pa-badge ${getStatusBadgeClass(status)}">${status}</span></td>
        <td>${formatDateString(alert.createdAt)}</td>
        <td>${alert.sentAt ? formatDateString(alert.sentAt) : '<span class="text-muted">—</span>'}</td>
        <td style="text-align: right; padding-right: 1.5rem;">
          <div class="pa-action-row" style="justify-content: flex-end;">
            <button class="pa-btn pa-btn-view" onclick="openAlertDetail('${alert.id}')"><i class="fa-solid fa-eye"></i></button>
            ${status === 'PENDING' ? `<button class="pa-btn pa-btn-send" onclick="openMessagePreview('${alert.id}')"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
            ${status !== 'RESOLVED' ? `<button class="pa-btn pa-btn-resolve" onclick="resolveAlert('${alert.id}')"><i class="fa-solid fa-check"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');

  // Re-apply responsive data labels
  if (typeof applyDataLabels === 'function') {
    applyDataLabels(document.getElementById('pa-alerts-table'));
  }
}

// ---- Delivery Log Rendering ----
function renderDeliveryLog() {
  const tbody = document.getElementById('pa-delivery-tbody');
  if (!tbody) return;

  const log = getDeliveryLog();

  if (log.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 2rem;">
      <span class="text-muted">No delivery records yet.</span>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = log.slice(0, 50).map(entry => `
    <tr>
      <td><strong>${entry.studentName || entry.studentReg}</strong></td>
      <td>${entry.parentPhone || '—'}</td>
      <td>${formatDateString(entry.timestamp)}</td>
      <td><span class="pa-delivery-tag"><i class="fa-brands fa-whatsapp"></i> ${entry.messageType || 'WhatsApp'}</span></td>
      <td>${entry.voiceSent ? '<span style="color: #34d399;"><i class="fa-solid fa-volume-high"></i> Yes</span>' : '<span class="text-muted">—</span>'}</td>
      <td><span class="pa-badge ${getStatusBadgeClass(entry.status)}">${entry.status}</span></td>
      <td>${entry.deliveryResult || '—'}</td>
    </tr>
  `).join('');

  // Re-apply responsive data labels
  if (typeof applyDataLabels === 'function') {
    applyDataLabels(document.getElementById('pa-delivery-table'));
  }
}

// ---- Settings UI ----
function loadSettingsUI() {
  const settings = getPASettings();

  const creditEl = document.getElementById('setting-credit-threshold');
  const absenceEl = document.getElementById('setting-absence-threshold');
  const langEl = document.getElementById('setting-language');
  const freqEl = document.getElementById('setting-frequency');
  const autoSendEl = document.getElementById('setting-auto-send');
  const voiceEl = document.getElementById('setting-voice-enabled');
  const messageEl = document.getElementById('setting-message-enabled');

  if (creditEl) creditEl.value = settings.creditThreshold;
  if (absenceEl) absenceEl.value = settings.absenceThreshold;
  if (langEl) langEl.value = settings.language;
  if (freqEl) freqEl.value = settings.frequency;
  if (autoSendEl) autoSendEl.checked = settings.autoSend;
  if (voiceEl) voiceEl.checked = settings.voiceEnabled;
  if (messageEl) messageEl.checked = settings.messageEnabled;
}

function saveSettingsFromUI() {
  const settings = {
    creditThreshold: parseInt(document.getElementById('setting-credit-threshold')?.value || 600),
    absenceThreshold: parseInt(document.getElementById('setting-absence-threshold')?.value || 3),
    language: document.getElementById('setting-language')?.value || 'TAMIL_ENGLISH',
    frequency: parseInt(document.getElementById('setting-frequency')?.value || 48),
    autoSend: document.getElementById('setting-auto-send')?.checked || false,
    voiceEnabled: document.getElementById('setting-voice-enabled')?.checked || true,
    messageEnabled: document.getElementById('setting-message-enabled')?.checked || true
  };
  savePASettings(settings);
  showToast('Alert settings saved successfully!', 'success');
}

// ---- Detail Modal ----
let activeAlertId = null;
let activeAlertData = null;

async function openAlertDetail(alertId) {
  const modal = document.getElementById('pa-detail-modal');
  if (!modal) return;

  activeAlertId = alertId;

  // Find alert
  const alert = paAlerts.find(a => a.id === alertId);
  if (!alert) {
    showToast('Alert not found', 'danger');
    return;
  }

  // Find student
  const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
  const credit = await HostelDB.getCreditBalance(alert.studentReg);
  const riskProfile = await HostelDB.getStudentRiskProfile(alert.studentReg);
  const ledger = await HostelDB.getCreditLedger(alert.studentReg);
  
  let complaints = [];
  try { complaints = (await HostelDB.getComplaints()).filter(c => c.studentReg === alert.studentReg); } catch (e) {}
  
  let leaves = [];
  try { leaves = (await HostelDB.getLeaves()).filter(l => l.studentReg === alert.studentReg); } catch (e) {}

  activeAlertData = { alert, student, credit, riskProfile, ledger, complaints, leaves };

  // Set title
  const titleEl = document.getElementById('pa-modal-title');
  if (titleEl) titleEl.textContent = `Alert: ${student.name || alert.studentReg}`;

  // Show voice button if enabled
  const voiceBtn = document.getElementById('pa-modal-play-voice');
  if (voiceBtn) voiceBtn.style.display = getPASettings().voiceEnabled ? 'inline-flex' : 'none';

  // Set default tab
  showAlertTab('profile');

  // Show modal
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeAlertDetailModal() {
  const modal = document.getElementById('pa-detail-modal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  stopVoice();
  activeAlertId = null;
  activeAlertData = null;
}

function showAlertTab(tabName) {
  if (!activeAlertData) return;

  // Update tab buttons
  document.querySelectorAll('#pa-modal-tabs .pa-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });

  const contentEl = document.getElementById('pa-modal-content');
  if (!contentEl) return;

  const { alert, student, credit, riskProfile, ledger, complaints, leaves } = activeAlertData;
  const tier = HostelDB.evaluateRatingTier(credit);

  switch (tabName) {
    case 'profile':
      contentEl.innerHTML = renderProfileTab(student, credit, riskProfile, tier);
      break;
    case 'attendance':
      contentEl.innerHTML = renderAttendanceTab(ledger);
      break;
    case 'credits':
      contentEl.innerHTML = renderCreditsTab(ledger, credit, tier);
      break;
    case 'violations':
      contentEl.innerHTML = renderViolationsTab(ledger);
      break;
    case 'leaves':
      contentEl.innerHTML = renderLeavesTab(leaves);
      break;
    case 'complaints':
      contentEl.innerHTML = renderComplaintsTab(complaints);
      break;
    case 'message':
      contentEl.innerHTML = renderMessageTab(alert, student, credit);
      break;
    case 'voice':
      contentEl.innerHTML = renderVoiceTab(student, credit);
      bindVoiceTabEvents();
      break;
  }
}

// ---- Tab Renderers ----
function renderProfileTab(student, credit, riskProfile, tier) {
  const circumference = 2 * Math.PI * 48;
  const offset = circumference * (1 - credit / 1000);

  return `
    <div class="pa-detail-section">
      <div style="display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;">
        <!-- Credit Gauge -->
        <div class="pa-credit-gauge">
          <svg viewBox="0 0 120 120">
            <circle class="pa-credit-gauge-bg" cx="60" cy="60" r="48"></circle>
            <circle class="pa-credit-gauge-fill" cx="60" cy="60" r="48"
              stroke="${getCreditColor(credit)}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}">
            </circle>
          </svg>
          <div class="pa-credit-gauge-text">
            <div class="pa-credit-gauge-value">${credit}</div>
            <div class="pa-credit-gauge-label">/ 1000</div>
          </div>
        </div>
        <!-- Student Info -->
        <div style="flex: 1;">
          <div class="pa-detail-grid">
            <div class="pa-detail-item">
              <span class="pa-detail-label">Student Name</span>
              <span class="pa-detail-value">${student.name || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Register Number</span>
              <span class="pa-detail-value">${student.regNo || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Department</span>
              <span class="pa-detail-value">${student.dept || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Room</span>
              <span class="pa-detail-value">${student.room || 'Unallocated'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Year</span>
              <span class="pa-detail-value">${student.year || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Risk Level</span>
              <span class="pa-badge ${getRiskBadgeClass(riskProfile.riskLevel || 'NORMAL')}">${getRiskLabel(riskProfile.riskLevel || 'NORMAL')}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Credit Tier</span>
              <span class="pa-badge" style="background: ${tier.bgColor}; color: ${tier.textColor}; border: 1px solid ${tier.color}40;">${tier.tier}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Parent Name</span>
              <span class="pa-detail-value">${student.parentName || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Parent Phone</span>
              <span class="pa-detail-value" style="color: #25d366;">${student.parentPhone || student.contact || '—'}</span>
            </div>
            <div class="pa-detail-item">
              <span class="pa-detail-label">Student Phone</span>
              <span class="pa-detail-value">${student.contact || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${riskProfile.evidence && riskProfile.evidence.length > 0 ? `
      <div class="pa-detail-section">
        <div class="pa-detail-section-title"><i class="fa-solid fa-exclamation-circle"></i> Risk Evidence</div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${riskProfile.evidence.map(e => `<li style="padding: 0.35rem 0; font-size: 0.85rem; color: #E6E6FA; display: flex; align-items: flex-start; gap: 0.5rem;"><i class="fa-solid fa-caret-right" style="color: #f87171; margin-top: 3px;"></i> ${e}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-lightbulb"></i> Recommended Action</div>
      <div style="background: rgba(164, 134, 61, 0.1); border: 1px solid rgba(164, 134, 61, 0.2); border-radius: 12px; padding: 1rem; font-size: 0.85rem; color: #E6E6FA; line-height: 1.6;">
        ${getRecommendedAction(credit, riskProfile)}
      </div>
    </div>
  `;
}

function renderAttendanceTab(ledger) {
  const totalSessions = ledger.filter(l => l.sourceEvent && l.sourceEvent.includes('STUDY_SESSION')).length;
  const absences = ledger.filter(l => l.sourceEvent === 'STUDY_SESSION_ABSENT').length;
  const present = totalSessions - absences;
  const pct = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 100;

  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-chart-bar"></i> Study Hour Summary</div>
      <div class="pa-detail-grid">
        <div class="pa-detail-item">
          <span class="pa-detail-label">Total Sessions</span>
          <span class="pa-detail-value">${totalSessions}</span>
        </div>
        <div class="pa-detail-item">
          <span class="pa-detail-label">Present</span>
          <span class="pa-detail-value" style="color: #34d399;">${present}</span>
        </div>
        <div class="pa-detail-item">
          <span class="pa-detail-label">Absent</span>
          <span class="pa-detail-value" style="color: #f87171;">${absences}</span>
        </div>
        <div class="pa-detail-item">
          <span class="pa-detail-label">Attendance %</span>
          <span class="pa-detail-value" style="color: ${pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'};">${pct}%</span>
        </div>
      </div>
    </div>
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-chart-simple"></i> Attendance Progress</div>
      <div style="background: #2A2A2A; border-radius: 8px; height: 12px; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, ${pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'} 0%, ${pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626'} 100%); border-radius: 8px; transition: width 0.8s ease;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.72rem; color: #94a3b8;">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  `;
}

function renderCreditsTab(ledger, credit, tier) {
  const recent = ledger.slice(0, 15);

  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-award"></i> Current Balance: <span style="color: ${tier.textColor}; margin-left: 0.35rem;">${credit}/1000 (${tier.tier})</span></div>
    </div>
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-clock-rotate-left"></i> Credit History (Last 15)</div>
      ${recent.length > 0 ? `
        <div class="pa-timeline">
          ${recent.map(entry => {
            const isNeg = entry.pointsChange < 0;
            return `
              <div class="pa-timeline-item ${isNeg ? 'negative' : 'positive'}">
                <div class="pa-timeline-date">${formatDateString(entry.createdAt)}</div>
                <div class="pa-timeline-text">
                  ${entry.reason || entry.sourceEvent || 'Credit change'}
                  <span class="pa-timeline-points ${isNeg ? 'negative' : 'positive'}">${isNeg ? '' : '+'}${entry.pointsChange}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      ` : '<p class="text-muted" style="font-size: 0.85rem;">No credit history found.</p>'}
    </div>
  `;
}

function renderViolationsTab(ledger) {
  const violations = ledger.filter(l => l.pointsChange < 0).slice(0, 20);

  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-gavel"></i> Violations & Deductions (${violations.length})</div>
      ${violations.length > 0 ? `
        <div class="pa-timeline">
          ${violations.map(v => `
            <div class="pa-timeline-item negative">
              <div class="pa-timeline-date">${formatDateString(v.createdAt)}</div>
              <div class="pa-timeline-text">
                ${v.reason || v.sourceEvent || 'Violation'}
                <span class="pa-timeline-points negative">${v.pointsChange}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="text-muted" style="font-size: 0.85rem;">No violations recorded — excellent discipline record!</p>'}
    </div>
  `;
}

function renderLeavesTab(leaves) {
  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-calendar-minus"></i> Leave History (${leaves.length})</div>
      ${leaves.length > 0 ? `
        <div style="overflow-x: auto;">
          <table class="table-custom" style="min-width: 500px;">
            <thead>
              <tr><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${leaves.slice(0, 10).map(l => `
                <tr>
                  <td>${formatDateString(l.fromDate)}</td>
                  <td>${formatDateString(l.toDate)}</td>
                  <td>${l.reason || '—'}</td>
                  <td><span class="badge badge-${(l.status || '').toLowerCase()}">${l.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="text-muted" style="font-size: 0.85rem;">No leave records found.</p>'}
    </div>
  `;
}

function renderComplaintsTab(complaints) {
  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-circle-exclamation"></i> Complaint History (${complaints.length})</div>
      ${complaints.length > 0 ? `
        <div style="overflow-x: auto;">
          <table class="table-custom" style="min-width: 500px;">
            <thead>
              <tr><th>ID</th><th>Category</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${complaints.slice(0, 10).map(c => `
                <tr>
                  <td><strong>${c.id}</strong></td>
                  <td>${c.category || '—'}</td>
                  <td>${formatDateString(c.date)}</td>
                  <td><span class="badge badge-${(c.status || '').toLowerCase().replace(' ', '')}">${c.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="text-muted" style="font-size: 0.85rem;">No complaints filed.</p>'}
    </div>
  `;
}

function renderMessageTab(alert, student, credit) {
  const settings = getPASettings();
  const reasons = ['Low Discipline Credit', 'Study Hour Absences'];
  const englishMsg = generateEnglishMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons);
  const tamilMsg = generateTamilMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons);
  const bilingualMsg = generateBilingualMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons);

  let displayMsg = alert.messageText || bilingualMsg;
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-brands fa-whatsapp" style="color: #25d366;"></i> WhatsApp Message</div>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <button class="pa-btn pa-btn-primary pa-msg-tab-btn active" data-msg="current">Current</button>
        <button class="pa-btn pa-btn-view pa-msg-tab-btn" data-msg="english">English</button>
        <button class="pa-btn pa-btn-view pa-msg-tab-btn" data-msg="tamil">Tamil</button>
        <button class="pa-btn pa-btn-view pa-msg-tab-btn" data-msg="both">Both</button>
      </div>
      <div class="pa-message-preview">
        <div class="pa-message-bubble" id="pa-detail-msg-bubble">
          ${escapeHtml(displayMsg).replace(/\n/g, '<br>')}
          <span class="msg-time">${timeStr} <i class="fa-solid fa-check-double msg-check"></i></span>
        </div>
      </div>
      <p style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem;">Parent Phone: <strong style="color: #25d366;">${student.parentPhone || student.contact || 'Not set'}</strong></p>
    </div>
  `;
}

function renderVoiceTab(student, credit) {
  const settings = getPASettings();
  const voiceScript = getVoiceScriptByLanguage(settings.language, student.name || 'Student', credit);

  return `
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-volume-high"></i> AI Voice Message Preview</div>
      <div class="pa-voice-player">
        <button class="pa-voice-btn" id="pa-detail-voice-play"><i class="fa-solid fa-play"></i></button>
        <div class="pa-voice-wave" id="pa-detail-voice-wave">
          ${Array.from({length: 30}, () => `<div class="pa-voice-wave-bar" style="height: ${Math.random() * 20 + 6}px;"></div>`).join('')}
        </div>
        <span class="pa-voice-info" id="pa-detail-voice-info">Ready</span>
      </div>
    </div>
    <div class="pa-detail-section">
      <div class="pa-detail-section-title"><i class="fa-solid fa-file-lines"></i> Voice Script</div>
      <div style="background: #2A2A2A; border: 1px solid rgba(164, 134, 61, 0.2); border-radius: 12px; padding: 1rem; font-size: 0.85rem; color: #E6E6FA; line-height: 1.7;">
        ${escapeHtml(voiceScript.text)}
      </div>
      <p style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem;">Language: <strong>${voiceScript.lang}</strong> | Engine: Browser Web Speech API</p>
    </div>
  `;
}

function bindVoiceTabEvents() {
  const playBtn = document.getElementById('pa-detail-voice-play');
  if (!playBtn) return;

  let isPlaying = false;
  let waveInterval = null;

  playBtn.addEventListener('click', async () => {
    if (isPlaying) {
      stopVoice();
      isPlaying = false;
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      playBtn.classList.remove('playing');
      clearInterval(waveInterval);
      resetWaveBars('pa-detail-voice-wave');
      updateVoiceInfo('pa-detail-voice-info', 'Ready');
      return;
    }

    const settings = getPASettings();
    const student = activeAlertData?.student || {};
    const credit = activeAlertData?.credit || 0;
    const voiceScript = getVoiceScriptByLanguage(settings.language, student.name || 'Student', credit);

    isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
    playBtn.classList.add('playing');
    updateVoiceInfo('pa-detail-voice-info', 'Speaking...');
    waveInterval = animateWaveBars('pa-detail-voice-wave');

    try {
      await synthesizeVoice(voiceScript.text, voiceScript.lang);
    } catch (e) {
      console.warn('Voice synthesis failed:', e);
    }

    isPlaying = false;
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playBtn.classList.remove('playing');
    clearInterval(waveInterval);
    resetWaveBars('pa-detail-voice-wave');
    updateVoiceInfo('pa-detail-voice-info', 'Completed');
  });
}

// ---- Message Preview Modal ----
let previewAlertId = null;

function openMessagePreview(alertId) {
  const modal = document.getElementById('pa-message-modal');
  if (!modal) return;

  previewAlertId = alertId;
  const alert = paAlerts.find(a => a.id === alertId);
  if (!alert) return;

  const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
  const settings = getPASettings();

  // Set the preview message
  const msgBubble = document.getElementById('pa-msg-bubble');
  const msgEdit = document.getElementById('pa-msg-edit');
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const message = alert.messageText || 'No message content';

  if (msgBubble) {
    msgBubble.innerHTML = escapeHtml(message).replace(/\n/g, '<br>') +
      `<span class="msg-time">${timeStr} <i class="fa-solid fa-check-double msg-check"></i></span>`;
  }
  if (msgEdit) msgEdit.value = message;

  // Voice section visibility
  const voiceSection = document.getElementById('pa-msg-voice-section');
  if (voiceSection) voiceSection.style.display = settings.voiceEnabled ? 'block' : 'none';

  // Init wave bars
  initVoiceWaveBars('pa-msg-voice-wave');

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeMessagePreviewModal() {
  const modal = document.getElementById('pa-message-modal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  stopVoice();
  previewAlertId = null;
}

async function approveAndSend() {
  if (!previewAlertId) return;

  const alert = paAlerts.find(a => a.id === previewAlertId);
  if (!alert) return;

  const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
  const editedMessage = document.getElementById('pa-msg-edit')?.value || alert.messageText;
  const parentPhone = student.parentPhone || student.contact || '';

  if (!parentPhone) {
    showToast('Parent phone number not available for this student.', 'warning');
    return;
  }

  // Update alert status
  await updateAlertStatus(previewAlertId, 'SENT');

  // Open WhatsApp
  openWhatsAppSend(parentPhone, editedMessage);

  // Log delivery
  addDeliveryLogEntry({
    studentReg: alert.studentReg,
    studentName: student.name || alert.studentReg,
    parentPhone: parentPhone,
    messageType: getPASettings().language,
    voiceSent: false,
    status: 'SENT',
    deliveryResult: 'WhatsApp opened via wa.me'
  });

  closeMessagePreviewModal();
  showToast('WhatsApp message initiated successfully!', 'success');
  await refreshAlertDashboard();
}

// ---- Alert Status Updates ----
async function updateAlertStatus(alertId, newStatus) {
  // Update in HostelDB (localStorage + Supabase)
  let alerts = HostelDB.getData('hms_parent_alerts') || [];
  alerts = alerts.map(a => {
    if (a.id === alertId) {
      return {
        ...a,
        status: newStatus,
        sentAt: (newStatus === 'SENT' || newStatus === 'DELIVERED') ? new Date().toISOString() : a.sentAt
      };
    }
    return a;
  });
  HostelDB.setData('hms_parent_alerts', alerts);

  // Try Supabase update too
  if (typeof USE_SUPABASE !== 'undefined' && USE_SUPABASE) {
    try {
      const body = { status: newStatus };
      if (newStatus === 'SENT' || newStatus === 'DELIVERED') {
        body.sent_at = new Date().toISOString();
      }
      await supabaseFetch(`hms_parent_alerts?id=eq.${alertId}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn('Supabase alert status update failed:', e.message);
    }
  }
}

async function resolveAlert(alertId) {
  await updateAlertStatus(alertId, 'RESOLVED');
  showToast('Alert resolved successfully', 'success');
  await refreshAlertDashboard();
  closeAlertDetailModal();
}

// ---- Helpers ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRecommendedAction(credit, riskProfile) {
  const level = riskProfile.riskLevel || 'NORMAL';
  if (level === 'CRITICAL' || credit < 350) {
    return `<strong style="color: #f87171;">Immediate Action Required.</strong> This student is in critical standing with a credit balance of ${credit}/1000. Recommend:<br>
    • Contact parent immediately via WhatsApp and phone call<br>
    • Schedule a counseling session with the student<br>
    • Issue a formal warning letter<br>
    • Consider temporary restrictions on outing permissions`;
  }
  if (level === 'WARNING' || credit < 600) {
    return `<strong style="color: #fb923c;">Attention Required.</strong> Student credit has dropped to ${credit}/1000. Recommend:<br>
    • Send parent notification via WhatsApp<br>
    • Have a brief conversation with the student<br>
    • Monitor study hour attendance closely for the next week`;
  }
  if (level === 'WATCH' || credit < 750) {
    return `<strong style="color: #fbbf24;">Monitoring Advisory.</strong> Student credit is at ${credit}/1000. Recommend:<br>
    • Keep under observation<br>
    • Send a courtesy notification if attendance doesn't improve in 3 days`;
  }
  return `<strong style="color: #34d399;">No immediate action required.</strong> Student credit is at ${credit}/1000, within acceptable range.`;
}

// ---- Voice Wave Animation ----
function initVoiceWaveBars(containerId) {
  const container = document.getElementById(containerId || 'pa-msg-voice-wave');
  if (!container) return;
  if (container.children.length > 0) return;
  for (let i = 0; i < 30; i++) {
    const bar = document.createElement('div');
    bar.className = 'pa-voice-wave-bar';
    bar.style.height = (Math.random() * 20 + 6) + 'px';
    container.appendChild(bar);
  }
}

function animateWaveBars(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const bars = container.querySelectorAll('.pa-voice-wave-bar');

  return setInterval(() => {
    bars.forEach(bar => {
      bar.style.height = (Math.random() * 28 + 4) + 'px';
      bar.classList.add('active');
    });
  }, 150);
}

function resetWaveBars(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const bars = container.querySelectorAll('.pa-voice-wave-bar');
  bars.forEach(bar => {
    bar.style.height = (Math.random() * 20 + 6) + 'px';
    bar.classList.remove('active');
  });
}

function updateVoiceInfo(elId, text) {
  const el = document.getElementById(elId);
  if (el) el.textContent = text;
}

// ---- Event Bindings ----
function bindParentAlertEvents() {
  // Scan button
  const scanBtn = document.getElementById('btn-scan-students');
  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      scanBtn.classList.add('scanning');
      scanBtn.querySelector('span').textContent = 'Scanning...';

      try {
        const newAlerts = await scanAllStudentsForRisk();
        if (newAlerts.length > 0) {
          showToast(`${newAlerts.length} new alert(s) generated!`, 'success');
        } else {
          showToast('Scan complete — no new alerts needed.', 'info');
        }
        await refreshAlertDashboard();
      } catch (e) {
        console.error('Scan failed:', e);
        showToast('Scan failed. Check console for details.', 'danger');
      }

      scanBtn.classList.remove('scanning');
      scanBtn.querySelector('span').textContent = 'Scan All Students';
    });
  }

  // Settings toggle
  const settingsBtn = document.getElementById('btn-toggle-settings');
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Save settings
  const saveSettingsBtn = document.getElementById('btn-save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettingsFromUI);
  }

  // Collapsible panels
  document.querySelectorAll('.pa-collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const body = header.nextElementSibling;
      if (body && body.classList.contains('pa-collapsible-body')) {
        body.classList.toggle('open');
      }
    });
  });

  // Filters
  ['pa-search', 'pa-filter-risk', 'pa-filter-dept', 'pa-filter-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
        paPage = 1;
        renderAlertTable();
      });
    }
  });

  // Pagination
  const btnPrev = document.getElementById('pa-btn-prev');
  const btnNext = document.getElementById('pa-btn-next');
  if (btnPrev) btnPrev.addEventListener('click', () => { paPage--; renderAlertTable(); });
  if (btnNext) btnNext.addEventListener('click', () => { paPage++; renderAlertTable(); });

  // Detail modal close
  const modalClose = document.getElementById('pa-modal-close');
  const modalCloseBtn = document.getElementById('pa-modal-close-btn');
  if (modalClose) modalClose.addEventListener('click', closeAlertDetailModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAlertDetailModal);

  // Detail modal backdrop click
  const detailModal = document.getElementById('pa-detail-modal');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeAlertDetailModal();
    });
  }

  // Detail modal tabs
  document.querySelectorAll('#pa-modal-tabs .pa-tab').forEach(tab => {
    tab.addEventListener('click', () => showAlertTab(tab.getAttribute('data-tab')));
  });

  // Detail modal send WhatsApp
  const modalSendWA = document.getElementById('pa-modal-send-whatsapp');
  if (modalSendWA) {
    modalSendWA.addEventListener('click', () => {
      if (activeAlertId) openMessagePreview(activeAlertId);
    });
  }

  // Detail modal play voice
  const modalPlayVoice = document.getElementById('pa-modal-play-voice');
  if (modalPlayVoice) {
    modalPlayVoice.addEventListener('click', () => {
      showAlertTab('voice');
    });
  }

  // Detail modal resolve
  const modalResolve = document.getElementById('pa-modal-resolve');
  if (modalResolve) {
    modalResolve.addEventListener('click', () => {
      if (activeAlertId) resolveAlert(activeAlertId);
    });
  }

  // Message preview modal close
  const msgModalClose = document.getElementById('pa-msg-modal-close');
  const msgCancel = document.getElementById('pa-msg-cancel');
  if (msgModalClose) msgModalClose.addEventListener('click', closeMessagePreviewModal);
  if (msgCancel) msgCancel.addEventListener('click', closeMessagePreviewModal);

  // Message preview backdrop click
  const msgModal = document.getElementById('pa-message-modal');
  if (msgModal) {
    msgModal.addEventListener('click', (e) => {
      if (e.target === msgModal) closeMessagePreviewModal();
    });
  }

  // Approve & Send
  const approveBtn = document.getElementById('pa-msg-approve-send');
  if (approveBtn) {
    approveBtn.addEventListener('click', approveAndSend);
  }

  // Message language tabs in preview modal
  document.querySelectorAll('.pa-msg-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pa-msg-lang-btn').forEach(b => {
        b.classList.remove('active', 'pa-btn-primary');
        b.classList.add('pa-btn-view');
      });
      btn.classList.add('active', 'pa-btn-primary');
      btn.classList.remove('pa-btn-view');

      if (!previewAlertId) return;
      const alert = paAlerts.find(a => a.id === previewAlertId);
      if (!alert) return;
      const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
      const lang = btn.getAttribute('data-lang');
      const reasons = ['Low Discipline Credit', 'Study Hour Absences'];

      // We need credit — extract from existing message or default
      let credit = 0;
      const creditMatch = (alert.messageText || '').match(/(\d+)\/1000/);
      if (creditMatch) credit = parseInt(creditMatch[1]);

      const newMsg = getMessageByLanguage(lang, student.name || alert.studentReg, alert.studentReg, credit, reasons);
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const bubble = document.getElementById('pa-msg-bubble');
      const editArea = document.getElementById('pa-msg-edit');
      if (bubble) {
        bubble.innerHTML = escapeHtml(newMsg).replace(/\n/g, '<br>') +
          `<span class="msg-time">${timeStr} <i class="fa-solid fa-check-double msg-check"></i></span>`;
      }
      if (editArea) editArea.value = newMsg;
    });
  });

  // Live edit sync for message preview
  const msgEdit = document.getElementById('pa-msg-edit');
  if (msgEdit) {
    msgEdit.addEventListener('input', () => {
      const bubble = document.getElementById('pa-msg-bubble');
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (bubble) {
        bubble.innerHTML = escapeHtml(msgEdit.value).replace(/\n/g, '<br>') +
          `<span class="msg-time">${timeStr} <i class="fa-solid fa-check-double msg-check"></i></span>`;
      }
    });
  }

  // Voice play in message preview modal
  const msgVoicePlay = document.getElementById('pa-msg-voice-play');
  if (msgVoicePlay) {
    let isPlaying = false;
    let waveInterval = null;

    msgVoicePlay.addEventListener('click', async () => {
      if (isPlaying) {
        stopVoice();
        isPlaying = false;
        msgVoicePlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        msgVoicePlay.classList.remove('playing');
        clearInterval(waveInterval);
        resetWaveBars('pa-msg-voice-wave');
        updateVoiceInfo('pa-msg-voice-info', 'Ready');
        return;
      }

      const settings = getPASettings();
      if (!previewAlertId) return;
      const alert = paAlerts.find(a => a.id === previewAlertId);
      if (!alert) return;
      const student = paStudents.find(s => s.regNo === alert.studentReg) || {};
      let credit = 0;
      const creditMatch = (alert.messageText || '').match(/(\d+)\/1000/);
      if (creditMatch) credit = parseInt(creditMatch[1]);

      const voiceScript = getVoiceScriptByLanguage(settings.language, student.name || 'Student', credit);

      isPlaying = true;
      msgVoicePlay.innerHTML = '<i class="fa-solid fa-stop"></i>';
      msgVoicePlay.classList.add('playing');
      updateVoiceInfo('pa-msg-voice-info', 'Speaking...');
      waveInterval = animateWaveBars('pa-msg-voice-wave');

      try {
        await synthesizeVoice(voiceScript.text, voiceScript.lang);
      } catch (e) {
        console.warn('Voice synthesis failed:', e);
      }

      isPlaying = false;
      msgVoicePlay.innerHTML = '<i class="fa-solid fa-play"></i>';
      msgVoicePlay.classList.remove('playing');
      clearInterval(waveInterval);
      resetWaveBars('pa-msg-voice-wave');
      updateVoiceInfo('pa-msg-voice-info', 'Completed');
    });
  }

  // Message tab buttons inside detail modal
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.pa-msg-tab-btn');
    if (!tabBtn) return;

    document.querySelectorAll('.pa-msg-tab-btn').forEach(b => {
      b.classList.remove('active', 'pa-btn-primary');
      b.classList.add('pa-btn-view');
    });
    tabBtn.classList.add('active', 'pa-btn-primary');
    tabBtn.classList.remove('pa-btn-view');

    if (!activeAlertData) return;
    const { alert, student, credit } = activeAlertData;
    const msgType = tabBtn.getAttribute('data-msg');
    const reasons = ['Low Discipline Credit', 'Study Hour Absences'];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let msg;
    switch (msgType) {
      case 'english': msg = generateEnglishMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons); break;
      case 'tamil': msg = generateTamilMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons); break;
      case 'both': msg = generateBilingualMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons); break;
      default: msg = alert.messageText || generateBilingualMessage(student.name || alert.studentReg, alert.studentReg, credit, reasons);
    }

    const bubble = document.getElementById('pa-detail-msg-bubble');
    if (bubble) {
      bubble.innerHTML = escapeHtml(msg).replace(/\n/g, '<br>') +
        `<span class="msg-time">${timeStr} <i class="fa-solid fa-check-double msg-check"></i></span>`;
    }
  });

  // Preload voices
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}
