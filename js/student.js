/* --- Student Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'student') return;

  // Execute based on active page
  const pagePath = window.location.pathname;
  
  if (pagePath.includes('dashboard.html')) {
    await initDashboard(currentUser);
  } else if (pagePath.includes('complaints.html')) {
    await initRaiseComplaint(currentUser);
  } else if (pagePath.includes('leave-request.html')) {
    await initLeaveRequest(currentUser);
  } else if (pagePath.includes('leave-status.html')) {
    await initLeaveStatus(currentUser);
  } else if (pagePath.includes('outing-request.html')) {
    await initStudentOutingRequest(currentUser);
  } else if (pagePath.includes('my-outpasses.html')) {
    await initStudentMyOutpasses(currentUser);
  } else if (pagePath.includes('my-credits.html')) {
    await initStudentMyCredits(currentUser);
  } else if (pagePath.includes('study-hour.html')) {
    await initStudentStudyHour(currentUser);
  } else if (pagePath.includes('complaint-status.html')) {
    await initComplaintStatusTimeline(currentUser);
  } else if (pagePath.includes('profile.html')) {
    initProfile(currentUser);
  }
});

// 1. Dashboard Hydration
async function initDashboard(student) {
  const tbody = document.getElementById('student-complaints-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading complaints list...</td></tr>';
  }

  // Set loading states for stats
  const statsIds = ['stats-total-complaints', 'stats-pending-complaints', 'stats-resolved-complaints', 'stats-leave-requests'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  try {
    const [allComplaints, allLeaves] = await Promise.all([
      HostelDB.getComplaints(),
      HostelDB.getLeaves()
    ]);

    const complaints = allComplaints.filter(c => c.studentReg === student.regNo);
    const leaves = allLeaves.filter(l => l.studentReg === student.regNo);

    // Set counters
    document.getElementById('stats-total-complaints').textContent = complaints.length;
    document.getElementById('stats-pending-complaints').textContent = complaints.filter(c => c.status === 'Pending').length;
    document.getElementById('stats-resolved-complaints').textContent = complaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('stats-leave-requests').textContent = leaves.length;

    // Hydrate table
    if (tbody) {
      if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No complaints available.</td></tr>';
      } else {
        tbody.innerHTML = complaints.map(c => `
          <tr>
            <td><strong>${c.id}</strong></td>
            <td>${c.category}</td>
            <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
            <td>${formatDateString(c.date)}</td>
          </tr>
        `).join('');
      }
    }

    // Synchronize Real-time Live Study Hour Card
    await initStudentDashboardStudyHour(student);
  } catch (error) {
    console.error('Failed to load student dashboard:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load complaints.</td></tr>';
    }
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
  }

  // Bind Dashboard Logout Action
  const dashLogout = document.getElementById('btn-dashboard-logout');
  if (dashLogout) {
    dashLogout.addEventListener('click', () => {
      HMSAuth.logout();
    });
  }
}

// 2. Raise Complaint Form
async function initRaiseComplaint(student) {
  const form = document.getElementById('raise-complaint-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('complaint-category').value;
    const priority = document.getElementById('complaint-priority').value;
    const description = document.getElementById('complaint-description').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;

    if (!category || !priority || !description) {
      showToast('All fields are required.', 'warning');
      return;
    }

    // Enter loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span>Submitting...</span>
      <i class="fa-solid fa-circle-notch fa-spin"></i>
    `;

    try {
      const newComplaintId = generateID('CMP');
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newComplaint = {
        id: newComplaintId,
        studentReg: student.regNo,
        studentName: student.name,
        room: student.room,
        category: category,
        priority: priority,
        description: description,
        date: today,
        status: 'Pending',
        timeline: [
          { status: 'Pending', desc: `Complaint raised for ${category}`, date: `${today} ${nowTime}` }
        ],
        assignedTo: 'Warden Desk',
        deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] // 3 days deadline
      };

      await HostelDB.addComplaint(newComplaint);

      // Push notification to Warden
      await addSystemNotification('New Complaint Raised', `${student.name} (${student.room}) filed a ${category} complaint.`);
      
      showToast(`Complaint ${newComplaintId} submitted successfully!`, 'success');
      form.reset();
    } catch (error) {
      console.error('Failed to submit complaint:', error);
      showToast('Failed to raise complaint. Please check your connection.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

// 3. Leave Request Form
async function initLeaveRequest(student) {
  const form = document.getElementById('leave-request-form');
  if (!form) return;

  // Set min dates to today
  const fromDateInput = document.getElementById('leave-from');
  const toDateInput = document.getElementById('leave-to');
  const todayStr = new Date().toISOString().split('T')[0];
  if (fromDateInput) fromDateInput.min = todayStr;
  if (toDateInput) toDateInput.min = todayStr;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;
    const reason = document.getElementById('leave-reason').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;

    if (!fromDate || !toDate || !reason) {
      showToast('All fields are required.', 'warning');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      showToast('From date cannot be after To date.', 'danger');
      return;
    }

    // Enter loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span>Submitting...</span>
      <i class="fa-solid fa-circle-notch fa-spin"></i>
    `;

    try {
      const newLeaveId = generateID('LV');

      const newLeave = {
        id: newLeaveId,
        studentReg: student.regNo,
        studentName: student.name,
        dept: student.dept,
        room: student.room,
        fromDate: fromDate,
        toDate: toDate,
        reason: reason,
        status: 'Pending',
        dateRaised: todayStr,
        approvedBy: ''
      };

      await HostelDB.addLeave(newLeave);

      // Push notification to Warden
      await addSystemNotification('New Leave Application', `${student.name} requested leave from ${fromDate} to ${toDate}.`);

      showToast(`Leave request ${newLeaveId} submitted!`, 'success');
      form.reset();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      showToast('Failed to submit leave request. Please check your connection.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

// 4. Timeline Tracker UI
async function initComplaintStatusTimeline(student) {
  const select = document.getElementById('timeline-complaint-select');
  const wrapper = document.getElementById('timeline-render-area');
  if (!select || !wrapper) return;

  wrapper.innerHTML = `
    <div class="glass-card text-center" style="padding: 2rem;">
      <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin-bottom: 0.5rem;"></i>
      <p style="font-size: 0.9rem; color: var(--text-secondary);">Loading complaints...</p>
    </div>
  `;

  try {
    const allComplaints = await HostelDB.getComplaints();
    const complaints = allComplaints.filter(c => c.studentReg === student.regNo);

    if (complaints.length === 0) {
      select.innerHTML = '<option value="">No complaints found...</option>';
      wrapper.innerHTML = `
        <div class="glass-card text-center text-muted" style="padding: 2rem;">
          No complaints filed. Submit a complaint to view its progress timeline.
        </div>
      `;
      return;
    }

    // Populate Select dropdown
    select.innerHTML = complaints.map(c => `
      <option value="${c.id}">${c.id} - ${c.category} (${c.status})</option>
    `).join('');

    // Render on load
    await renderTimeline(complaints[0].id);

    // Render on change
    select.addEventListener('change', async (e) => {
      await renderTimeline(e.target.value);
    });
  } catch (error) {
    console.error('Failed to load complaints status page:', error);
    wrapper.innerHTML = `
      <div class="glass-card text-center text-danger" style="padding: 2rem;">
        Failed to load complaints timeline. Please reload the page.
      </div>
    `;
  }
}

async function renderTimeline(complaintId) {
  const wrapper = document.getElementById('timeline-render-area');
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="glass-card text-center" style="padding: 2rem;">
      <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin-bottom: 0.5rem;"></i>
      <p style="font-size: 0.9rem; color: var(--text-secondary);">Loading timeline details...</p>
    </div>
  `;

  try {
    const allComplaints = await HostelDB.getComplaints();
    const complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) {
      wrapper.innerHTML = `<div class="glass-card text-center text-muted">Complaint not found.</div>`;
      return;
    }

    // Generate timeline steps status list
    const steps = ['Pending', 'In Progress', 'Resolved'];
    if (complaint.status === 'Escalated') {
      steps.push('Escalated');
    }

    let timelineHtml = `
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">Complaint Details</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Assigned to: <strong>${complaint.assignedTo}</strong> | Target Deadline: <strong>${formatDateString(complaint.deadline)}</strong></p>
          </div>
          <span class="badge badge-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span>
        </div>
        
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; background: var(--bg-primary); padding: 1rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
          <strong>Description:</strong> ${complaint.description}
        </p>

        <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 1rem;">Resolution Milestones</h4>
        <div class="timeline">
    `;

    // Draw timeline items
    complaint.timeline.forEach((item, index) => {
      let typeClass = 'active';
      if (item.status === 'Resolved') typeClass = 'success';
      if (item.status === 'Escalated') typeClass = 'danger';

      timelineHtml += `
        <div class="timeline-item ${typeClass}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">${item.status}</span>
              <span class="timeline-date">${item.date}</span>
            </div>
            <span class="timeline-desc">${item.desc}</span>
          </div>
        </div>
      `;
    });

    timelineHtml += `
        </div>
      </div>
    `;

    wrapper.innerHTML = timelineHtml;
  } catch (error) {
    console.error('Failed to render timeline:', error);
    wrapper.innerHTML = `<div class="glass-card text-center text-danger">Failed to load timeline.</div>`;
  }
}

// 5. Student Profile Hydration
function initProfile(student) {
  // Parse contact
  let contactObj = {};
  if (student.contact) {
    if (typeof student.contact === 'object') {
      contactObj = student.contact;
    } else if (typeof student.contact === 'string') {
      try {
        if (student.contact.trim().startsWith('{')) {
          contactObj = JSON.parse(student.contact);
        } else {
          contactObj = { studentPhone: student.contact };
        }
      } catch (e) {
        console.error('Failed to parse contact JSON:', e);
        contactObj = { studentPhone: student.contact };
      }
    }
  }

  // Format Helper
  const getVal = (val) => {
    if (val === undefined || val === null || val === '' || val === '{}' || (typeof val === 'object' && Object.keys(val).length === 0)) {
      return 'Not Available';
    }
    return val;
  };

  // Format Date Helper (e.g. 2006-09-20 to 20-09-2006)
  const formatDateStr = (dateStr) => {
    if (!dateStr || dateStr === 'Not Available') return 'Not Available';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } catch (e) {}
    return dateStr;
  };

  document.getElementById('profile-name').textContent = getVal(student.name);
  if (document.getElementById('profile-name-detail')) {
    document.getElementById('profile-name-detail').textContent = getVal(student.name);
  }
  document.getElementById('profile-reg').textContent = getVal(student.regNo);
  document.getElementById('profile-dept').textContent = getVal(student.dept);
  document.getElementById('profile-room').textContent = getVal(student.room);
  document.getElementById('profile-email').textContent = getVal(student.email);
  
  // Hydrate contact details
  document.getElementById('profile-student-phone').textContent = getVal(contactObj.studentPhone);
  document.getElementById('profile-parent-phone').textContent = getVal(contactObj.parentPhone);
  document.getElementById('profile-gender').textContent = getVal(contactObj.gender || student.gender);
  document.getElementById('profile-dob').textContent = formatDateStr(getVal(contactObj.dob || student.dob));
  document.getElementById('profile-parent-name').textContent = getVal(contactObj.parentName || student.parentName);
  document.getElementById('profile-bed').textContent = getVal(contactObj.bedNo || student.bedNo);
  document.getElementById('profile-address').textContent = getVal(contactObj.address || student.address);

  // Left card dynamic metrics
  if (document.getElementById('profile-residence-card')) {
    document.getElementById('profile-residence-card').textContent = student.room ? student.room : 'Not Allocated';
  }
  if (document.getElementById('profile-status-card')) {
    document.getElementById('profile-status-card').textContent = getVal(contactObj.status || 'Active Enrollment');
  }

  // Custom display badge
  document.getElementById('profile-avatar-big').textContent = student.name ? student.name.charAt(0).toUpperCase() : 'S';
}

// 6. Student Leave Request Status & Timeline Portal
async function initLeaveStatus(student) {
  const tbody = document.getElementById('student-leaves-tbody');
  const searchInput = document.getElementById('leaves-search');
  const dateInput = document.getElementById('leaves-date');
  const statusFilter = document.getElementById('filter-leave-status');
  const prevBtn = document.getElementById('btn-prev-page-lv');
  const nextBtn = document.getElementById('btn-next-page-lv');
  const infoSpan = document.getElementById('pagination-info-lv');

  const modal = document.getElementById('leave-details-modal');
  const closeModalBtn = document.getElementById('btn-close-details-modal');
  const closeDetailsFooterBtn = document.getElementById('btn-close-details-footer');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Querying leaves records...</p></td></tr>';
  }

  let leaves = [];
  let statusCache = {}; // Cache of leave statuses to detect changes
  let isFirstLoad = true;

  let currentPage = 1;
  const itemsPerPage = 10;
  let currentSortCol = 'dateRaised';
  let currentSortOrder = 'desc';

  // Load and refresh leaves data
  async function refreshLeavesData() {
    try {
      const allLeaves = await HostelDB.getLeaves();
      // Filter to currently logged in student
      const studentLeaves = allLeaves.filter(l => l.studentReg === student.regNo);

      // Detect status changes for toast notifications
      studentLeaves.forEach(l => {
        if (!isFirstLoad) {
          const oldStatus = statusCache[l.id];
          if (oldStatus && oldStatus !== l.status) {
            if (l.status === 'Approved') {
              showToast(`Your leave request ${l.id} has been approved.`, 'success');
            } else if (l.status === 'Rejected') {
              showToast(`Your leave request ${l.id} has been rejected.`, 'danger');
            } else if (l.status === 'Cancelled') {
              showToast(`Your leave request ${l.id} has been cancelled.`, 'secondary');
            }
          }
        }
        statusCache[l.id] = l.status;
      });
      isFirstLoad = false;

      leaves = studentLeaves;

      // Update Summary Cards
      document.getElementById('stats-total-leaves').textContent = leaves.length;
      document.getElementById('stats-pending-leaves').textContent = leaves.filter(l => l.status === 'Pending').length;
      document.getElementById('stats-approved-leaves').textContent = leaves.filter(l => l.status === 'Approved').length;
      document.getElementById('stats-rejected-leaves').textContent = leaves.filter(l => l.status === 'Rejected').length;

      renderLeavesTable();
    } catch (error) {
      console.error('Failed to refresh leaves:', error);
    }
  }

  function renderLeavesTable() {
    if (!tbody) return;

    // Filter
    let filtered = leaves.filter(l => {
      const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const matchesSearch = l.id.toLowerCase().includes(query) || l.reason.toLowerCase().includes(query);

      const statusVal = statusFilter ? statusFilter.value : '';
      const matchesStatus = statusVal === '' || l.status === statusVal;

      const dateVal = dateInput ? dateInput.value : '';
      const matchesDate = dateVal === '' || l.fromDate === dateVal || l.toDate === dateVal || l.dateRaised === dateVal;

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let valA = a[currentSortCol] || '';
      let valB = b[currentSortCol] || '';
      if (currentSortOrder === 'desc') {
        return valB.localeCompare(valA);
      }
      return valA.localeCompare(valB);
    });

    // Paginate
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginated = filtered.slice(startIndex, endIndex);

    // Info text
    if (infoSpan) {
      if (totalItems === 0) {
        infoSpan.textContent = 'Showing 0 to 0 of 0 requests';
      } else {
        infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} requests`;
      }
    }

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

    if (filtered.length === 0) {
      if (leaves.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-muted" style="padding: 3rem 1.5rem;">
              <i class="fa-solid fa-plane-departure fa-2x" style="margin-bottom:0.5rem; color: var(--text-muted);"></i>
              <p>No leave requests found.</p>
              <a href="leave-request.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Apply for Leave</a>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No leave requests found matching filter options.</td></tr>';
      }
      return;
    }

    tbody.innerHTML = paginated.map(l => {
      let badgeClass = 'pending';
      if (l.status === 'Approved') badgeClass = 'present';
      if (l.status === 'Rejected') badgeClass = 'absent';
      if (l.status === 'Cancelled') badgeClass = 'secondary';

      const fromDateObj = new Date(l.fromDate);
      const toDateObj = new Date(l.toDate);
      const totalDays = Math.round((toDateObj - fromDateObj) / 86400000) + 1;

      return `
        <tr style="cursor: pointer;" data-leave-id="${l.id}">
          <td><strong class="text-primary-color">${l.id}</strong></td>
          <td>${formatDateString(l.fromDate)}</td>
          <td>${formatDateString(l.toDate)}</td>
          <td><strong>${totalDays} Days</strong></td>
          <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.reason}</td>
          <td>${formatDateString(l.dateRaised)}</td>
          <td><span class="badge badge-${badgeClass}">${l.status}</span></td>
          <td>${l.approvedBy || 'Pending'}</td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.remarks || 'Awaiting Review'}</td>
          <td style="text-align: right; padding-right: 1.5rem;">
            ${l.status === 'Approved' ? `
              <button class="btn btn-success btn-sm" data-action="view-outpass" data-leave-id="${l.id}">
                <i class="fa-solid fa-qrcode"></i> View Outpass
              </button>
            ` : `<span class="text-muted" style="font-size: 0.78rem;">${l.status === 'Pending' ? 'Awaiting Review' : l.status}</span>`}
          </td>
        </tr>
      `;
    }).join('');

    if (tbody && !tbody.dataset.listenerBound) {
      tbody.dataset.listenerBound = 'true';
      tbody.addEventListener('click', (e) => {
        const outpassBtn = e.target.closest('[data-action="view-outpass"]');
        if (outpassBtn) {
          e.stopPropagation();
          const leaveId = outpassBtn.dataset.leaveId;
          if (leaveId) {
            window.openOutpassModalForLeave(leaveId);
          }
          return;
        }

        const row = e.target.closest('tr[data-leave-id]');
        if (row) {
          window.viewLeaveDetails(row.dataset.leaveId);
        }
      });
    }
  }

  // Interactive sorting
  const sortHeaders = [
    { id: 'sort-lv-id', col: 'id' },
    { id: 'sort-lv-date', col: 'dateRaised' }
  ];

  sortHeaders.forEach(sh => {
    const el = document.getElementById(sh.id);
    if (el) {
      el.addEventListener('click', () => {
        if (currentSortCol === sh.col) {
          currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortCol = sh.col;
          currentSortOrder = 'asc';
        }
        renderLeavesTable();
      });
    }
  });

  // Filter triggers
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLeavesTable(); });
  if (dateInput) dateInput.addEventListener('change', () => { currentPage = 1; renderLeavesTable(); });
  if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; renderLeavesTable(); });

  // Pagination triggers
  if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderLeavesTable(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLeavesTable(); });

  // Modal Control
  window.viewLeaveDetails = function(id) {
    const l = leaves.find(x => x.id === id);
    if (!l) return;

    const fromDateObj = new Date(l.fromDate);
    const toDateObj = new Date(l.toDate);
    const totalDays = Math.round((toDateObj - fromDateObj) / 86400000) + 1;

    document.getElementById('detail-leave-id').textContent = `Leave Request - ${l.id}`;
    document.getElementById('detail-submitted-on').textContent = formatDateString(l.dateRaised);
    
    // Status Badge
    let badgeClass = 'pending';
    if (l.status === 'Approved') badgeClass = 'present';
    if (l.status === 'Rejected') badgeClass = 'absent';
    if (l.status === 'Cancelled') badgeClass = 'secondary';

    const statusBadge = document.getElementById('detail-status');
    statusBadge.textContent = l.status;
    statusBadge.className = `badge badge-${badgeClass}`;

    document.getElementById('detail-student-name').textContent = student.name;
    document.getElementById('detail-reg-no').textContent = student.regNo;
    document.getElementById('detail-dept').textContent = student.dept;
    document.getElementById('detail-room').textContent = student.room || 'Unallocated';
    document.getElementById('detail-from-date').textContent = formatDateString(l.fromDate);
    document.getElementById('detail-to-date').textContent = formatDateString(l.toDate);
    document.getElementById('detail-total-days').textContent = `${totalDays} Days`;
    document.getElementById('detail-reviewed-by').textContent = l.approvedBy || 'Pending Review';
    document.getElementById('detail-reason').textContent = l.reason;
    document.getElementById('detail-remarks').textContent = l.remarks || 'Warden review pending.';

    // Render Timeline Steps
    const timelineContainer = document.getElementById('detail-timeline-container');
    if (timelineContainer) {
      let step1Class = 'active';
      let step2Class = 'active';
      let step3Class = '';

      let step3Title = 'Awaiting Review';
      let step3Desc = 'Decision updates gate pass clearance.';
      let step3Date = 'Pending';

      if (l.status === 'Approved') {
        step1Class = 'success';
        step2Class = 'success';
        step3Class = 'success';
        step3Title = 'Approved';
        step3Desc = l.remarks || 'Leave request approved by warden.';
        step3Date = formatDateString(l.reviewDate);
      } else if (l.status === 'Rejected') {
        step1Class = 'danger';
        step2Class = 'danger';
        step3Class = 'danger';
        step3Title = 'Rejected';
        step3Desc = l.remarks || 'Leave request rejected by warden.';
        step3Date = formatDateString(l.reviewDate);
      } else if (l.status === 'Cancelled') {
        step1Class = 'active';
        step2Class = 'active';
        step3Class = 'active';
        step3Title = 'Cancelled';
        step3Desc = 'Cancelled by student.';
        step3Date = formatDateString(l.reviewDate);
      }

      timelineContainer.innerHTML = `
        <div class="timeline-item ${step1Class}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">Leave Submitted</span>
              <span class="timeline-date">${formatDateString(l.dateRaised)}</span>
            </div>
            <span class="timeline-desc">Application created successfully in ERP system.</span>
          </div>
        </div>

        <div class="timeline-item ${step2Class}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">Under Review</span>
              <span class="timeline-date">${formatDateString(l.dateRaised)}</span>
            </div>
            <span class="timeline-desc">Warden office is auditing the gatepass request.</span>
          </div>
        </div>

        <div class="timeline-item ${step3Class}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">${step3Title}</span>
              <span class="timeline-date">${step3Date}</span>
            </div>
            <span class="timeline-desc">${step3Desc}</span>
          </div>
        </div>

        ${l.status === 'Approved' ? `
          <div style="margin-top: 1.25rem; text-align: center; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
            <button type="button" class="btn btn-success" onclick="openOutpassModalForLeave('${l.id}')">
              <i class="fa-solid fa-qrcode"></i> View Digital Outpass & QR Code
            </button>
          </div>
        ` : ''}
      `;
    }

    if (modal) modal.style.display = 'flex';
  };

  const closeModal = () => { if (modal) modal.style.display = 'none'; };
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (closeDetailsFooterBtn) closeDetailsFooterBtn.addEventListener('click', closeModal);

  // Initialize and schedule dynamic refresh polling
  await refreshLeavesData();
  const pollInterval = setInterval(refreshLeavesData, 5000);

  // Clean interval when leaving page
  window.addEventListener('beforeunload', () => {
    clearInterval(pollInterval);
  });
}

// [STUDY HOUR SYSTEM REMOVED]

// 8. Student Discipline Credit Portal
async function initStudentMyCredits(student) {
  const scoreNum = document.getElementById('credit-score-num');
  const tierBadge = document.getElementById('credit-tier-badge');
  const progressBar = document.getElementById('credit-progress-bar');
  const riskAlert = document.getElementById('credit-risk-alert');
  const riskTitle = document.getElementById('risk-alert-title');
  const riskDesc = document.getElementById('risk-alert-desc');
  const ledgerTbody = document.getElementById('credit-ledger-tbody');

  async function loadCreditData() {
    try {
      const balance = await HostelDB.getCreditBalance(student.regNo);
      if (scoreNum) scoreNum.textContent = balance;

      const evalTier = HostelDB.evaluateRatingTier(balance);
      if (tierBadge) {
        tierBadge.textContent = evalTier.tier;
        tierBadge.className = `badge ${evalTier.badgeClass}`;
        tierBadge.style.backgroundColor = evalTier.color;
      }

      if (progressBar) {
        const pct = Math.max(0, Math.min(100, (balance / 1000) * 100));
        progressBar.style.width = `${pct}%`;
      }

      // Risk Profile Check
      const riskProfile = await HostelDB.getStudentRiskProfile(student.regNo);
      if (riskProfile && (riskProfile.riskLevel === 'WATCH' || riskProfile.riskLevel === 'WARNING' || riskProfile.riskLevel === 'CRITICAL')) {
        if (riskAlert) riskAlert.style.display = 'block';
        if (riskTitle) riskTitle.textContent = `Attention: Discipline ${riskProfile.riskLevel} Tier Active`;
        if (riskDesc) {
          const evidenceStr = riskProfile.evidence && riskProfile.evidence.length > 0 ? riskProfile.evidence.join('; ') : 'Study hour compliance drop detected.';
          riskDesc.textContent = `Reasons: ${evidenceStr}. Maintain regular attendance to restore your rating tier.`;
        }
      } else {
        if (riskAlert) riskAlert.style.display = 'none';
      }

      // Render Ledger Table
      const ledger = await HostelDB.getCreditLedger(student.regNo);
      if (!ledgerTbody) return;

      if (ledger.length === 0) {
        ledgerTbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted" style="padding: 2rem;">
              No discipline credit transactions recorded yet. Starting balance: 1000 Credits.
            </td>
          </tr>
        `;
        return;
      }

      ledgerTbody.innerHTML = ledger.map(item => {
        const isPos = item.pointsChange > 0;
        const changeStr = isPos ? `+${item.pointsChange}` : `${item.pointsChange}`;
        const changeClass = isPos ? 'text-success' : (item.pointsChange < 0 ? 'text-danger' : 'text-muted');

        return `
          <tr>
            <td>${formatDateString(item.createdAt)}</td>
            <td><strong class="text-primary-color">${item.sourceEvent}</strong></td>
            <td>${item.reason}</td>
            <td><strong class="${changeClass}">${changeStr} pts</strong></td>
            <td><strong>${item.balanceAfter} / 1000</strong></td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      console.error('Error loading credit ledger:', e);
    }
  }

  await loadCreditData();
}

// 8. Student Short Outing Request Controller
async function initStudentOutingRequest(student) {
  const openModalBtn = document.getElementById('btn-open-outing-modal');
  const modal = document.getElementById('modal-outing-request');
  const closeModalBtn = document.getElementById('modal-outing-close');
  const cancelModalBtn = document.getElementById('btn-cancel-outing');
  const form = document.getElementById('form-outing-request');
  const tbody = document.getElementById('student-outing-tbody');

  const exitTimeInput = document.getElementById('outing-exit-time');
  const returnTimeInput = document.getElementById('outing-return-time');
  const durationBadge = document.getElementById('outing-duration-badge');
  const policyAlert = document.getElementById('outing-policy-alert');

  // Set minimum date to today
  const dateInput = document.getElementById('outing-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // Calculate Outing Duration helper
  const calculateDuration = () => {
    if (!exitTimeInput || !returnTimeInput) return { mins: 0, valid: true };
    const exitVal = exitTimeInput.value;
    const returnVal = returnTimeInput.value;
    if (!exitVal || !returnVal) return { mins: 0, valid: true };

    const [eH, eM] = exitVal.split(':').map(Number);
    const [rH, rM] = returnVal.split(':').map(Number);
    const exitMins = eH * 60 + eM;
    const returnMins = rH * 60 + rM;

    let diffMins = returnMins - exitMins;
    if (diffMins < 0) diffMins += 24 * 60; // Overnight wrap guard

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (durationBadge) {
      durationBadge.textContent = `${hours} Hours ${mins} Mins`;
    }

    // Policy Rule: Max 4 hours (240 mins)
    const MAX_OUTING_MINUTES = 240;
    if (diffMins > MAX_OUTING_MINUTES) {
      if (policyAlert) policyAlert.style.display = 'block';
      if (durationBadge) durationBadge.style.color = 'var(--danger)';
      return { mins: diffMins, valid: false };
    } else {
      if (policyAlert) policyAlert.style.display = 'none';
      if (durationBadge) durationBadge.style.color = 'var(--primary)';
      return { mins: diffMins, valid: true };
    }
  };

  if (exitTimeInput && returnTimeInput) {
    exitTimeInput.addEventListener('input', calculateDuration);
    returnTimeInput.addEventListener('input', calculateDuration);
    calculateDuration();
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      HMSModal.open('#modal-outing-request');
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', () => HMSModal.close('#modal-outing-request'));
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => HMSModal.close('#modal-outing-request'));

  // Load Outings Table
  const loadOutings = async () => {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading outings...</td></tr>';
    try {
      const allOutings = await HostelDB.getOutingRequests();
      const myOutings = allOutings.filter(o => o.studentReg === student.regNo);

      if (myOutings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No short outing applications submitted yet.</td></tr>';
        return;
      }

      tbody.innerHTML = myOutings.map(o => {
        let parentBadge = '<span class="badge badge-pending">Pending</span>';
        if (o.parentApprovalStatus === 'Approved') parentBadge = '<span class="badge badge-present">Approved</span>';
        if (o.parentApprovalStatus === 'Rejected') parentBadge = '<span class="badge badge-absent">Rejected</span>';

        let wardenBadge = '<span class="badge badge-pending">Pending</span>';
        if (o.wardenApprovalStatus === 'Approved') wardenBadge = '<span class="badge badge-present">Approved</span>';
        if (o.wardenApprovalStatus === 'Rejected') wardenBadge = '<span class="badge badge-absent">Rejected</span>';

        const parentApprovalUrl = `${window.location.origin}/pages/parent/outpass-approval.html?token=${o.parentToken}`;

        return `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${formatDateString(o.outingDate)}</td>
            <td>${o.requestedExitTime} - ${o.expectedReturnTime}</td>
            <td><span class="badge badge-secondary">${o.destination}</span></td>
            <td>${o.reason}</td>
            <td>${parentBadge}</td>
            <td>${wardenBadge}</td>
            <td style="text-align: right;">
              ${o.status === 'Pending Parent' ? `
                <button class="btn btn-secondary btn-sm" data-action="copy-parent-link" data-url="${parentApprovalUrl}" title="Copy Parent Link">
                  <i class="fa-solid fa-link"></i> Parent Link
                </button>
              ` : ''}
              ${o.status === 'Approved' ? `
                <button class="btn btn-success btn-sm" data-action="view-outpass" data-outing-id="${o.id}">
                  <i class="fa-solid fa-qrcode"></i> View Outpass
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');

      if (tbody && !tbody.dataset.listenerBound) {
        tbody.dataset.listenerBound = 'true';
        tbody.addEventListener('click', (e) => {
          const parentBtn = e.target.closest('[data-action="copy-parent-link"]');
          if (parentBtn) {
            window.copyParentLink(parentBtn.dataset.url);
            return;
          }
          const outpassBtn = e.target.closest('[data-action="view-outpass"]');
          if (outpassBtn) {
            window.openOutpassModalForOuting(outpassBtn.dataset.outingId);
          }
        });
      }
    } catch (e) {
      console.error('Error loading student outings:', e);
    }
  };

  window.copyParentLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Parent Approval Link copied to clipboard! Share this link with your parent.', 'success');
    }).catch(() => {
      prompt('Copy this Parent Approval Link:', url);
    });
  };

  window.openOutpassModalForOuting = async function(outingId) {
    const passes = await HostelDB.getOutpasses();
    const pass = passes.find(p => p.sourceOutingId === outingId);
    if (pass) {
      window.openOutpassModal(pass.id);
    } else {
      showToast('Outpass generating... Please refresh in a moment.', 'warning');
    }
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const durationCheck = calculateDuration();
      if (!durationCheck.valid) {
        showToast(durationCheck.msg || 'Normal outing permission cannot exceed 4 hours.', 'danger');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';

      try {
        const outingDate = document.getElementById('outing-date').value;
        const requestedExitTime = document.getElementById('outing-exit-time').value;
        const expectedReturnTime = document.getElementById('outing-return-time').value;
        const destination = document.getElementById('outing-destination').value.trim();
        const reason = document.getElementById('outing-reason').value.trim();
        const emergencyContact = document.getElementById('outing-emergency').value.trim();

        if (!outingDate || !requestedExitTime || !expectedReturnTime || !destination || !reason) {
          showToast('Please fill out all required fields (Date, Exit Time, Return Time, Destination, and Reason).', 'warning');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
          return;
        }

        const req = {
          studentReg: student.regNo,
          outingDate,
          requestedExitTime,
          expectedReturnTime,
          destination,
          reason,
          emergencyContact
        };

        const newReq = await HostelDB.addOutingRequest(req);
        HMSModal.close('#modal-outing-request');
        form.reset();

        const parentUrl = `${window.location.origin}/pages/parent/outpass-approval.html?token=${newReq.parentToken}`;
        showToast(`Outing Request ${newReq.id} submitted! Share the Parent Link with your parent.`, 'success');
        window.copyParentLink(parentUrl);
        await loadOutings();
      } catch (err) {
        console.error('Failed to submit outing request:', err);
        showToast('Failed to submit request.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
      }
    });
  }

  await loadOutings();
}

// 9. Student Digital Outpass Wallet Controller
async function initStudentMyOutpasses(student) {
  const tbody = document.getElementById('student-outpasses-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Digital Outpasses...</td></tr>';
  try {
    const allPasses = await HostelDB.getOutpasses();
    const myPasses = allPasses.filter(p => p.studentReg === student.regNo);

    if (myPasses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No Digital Outpasses generated yet. Approved Home Leaves and Short Outings automatically appear here.</td></tr>';
      return;
    }

    tbody.innerHTML = myPasses.map(p => {
      let statusBadge = '<span class="badge badge-present">VALID</span>';
      if (p.status === 'NOT_YET_VALID') statusBadge = '<span class="badge badge-warning">NOT YET VALID</span>';
      if (p.status === 'EXIT_RECORDED') statusBadge = '<span class="badge badge-primary">EXIT RECORDED</span>';
      if (p.status === 'RETURNED') statusBadge = '<span class="badge badge-info">RETURNED</span>';
      if (p.status === 'EXPIRED') statusBadge = '<span class="badge badge-secondary">EXPIRED</span>';
      if (p.status === 'REVOKED') statusBadge = '<span class="badge badge-danger">REVOKED</span>';

      return `
        <tr>
          <td><strong class="text-primary-color">${p.id}</strong></td>
          <td><span class="badge badge-secondary">${p.passType === 'HOME_LEAVE' ? 'HOME LEAVE' : 'SHORT OUTING'}</span></td>
          <td>${p.validFrom}</td>
          <td>${p.validUntil}</td>
          <td>${p.actualExitTime ? formatDateString(p.actualExitTime) : '<span class="text-muted">-</span>'}</td>
          <td>${p.actualReturnTime ? formatDateString(p.actualReturnTime) : '<span class="text-muted">-</span>'}</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <button class="btn btn-primary btn-sm" data-action="view-outpass" data-outpass-id="${p.id}">
              <i class="fa-solid fa-qrcode"></i> View Pass & QR
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (!tbody.dataset.listenerBound) {
      tbody.dataset.listenerBound = 'true';
      tbody.addEventListener('click', (e) => {
        const outpassBtn = e.target.closest('[data-action="view-outpass"]');
        if (outpassBtn) {
          const passId = outpassBtn.dataset.outpassId;
          if (passId) {
            window.openOutpassModal(passId);
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to load outpasses:', e);
  }
}

// Global Outpass Viewer Modal Controller
window.openOutpassModal = async function(passId) {
  try {
    const passes = await HostelDB.getOutpasses();
    const pass = passes.find(p => p.id === passId);
    if (!pass) {
      showToast('Outpass not found.', 'danger');
      return;
    }

    const currentUser = HMSAuth.getCurrentUser();
    const students = await HostelDB.getStudents();
    const student = students.find(s => s.regNo === pass.studentReg) || currentUser || { name: 'Student', regNo: pass.studentReg, dept: 'CSE', room: '-' };

    let details = {};
    if (pass.passType === 'SHORT_OUTING' && pass.sourceOutingId) {
      const outings = await HostelDB.getOutingRequests();
      details = outings.find(o => o.id === pass.sourceOutingId) || {};
    } else if (pass.passType === 'HOME_LEAVE' && pass.sourceLeaveId) {
      const leaves = await HostelDB.getLeaves();
      details = leaves.find(l => l.id === pass.sourceLeaveId) || {};
    }

    const container = document.getElementById('outpass-card-content');
    if (!container) return;

    let statusBadgeClass = 'present';
    if (pass.status === 'NOT_YET_VALID') statusBadgeClass = 'warning';
    if (pass.status === 'EXPIRED') statusBadgeClass = 'secondary';
    if (pass.status === 'REVOKED') statusBadgeClass = 'absent';
    if (pass.status === 'RETURNED') statusBadgeClass = 'secondary';

    container.innerHTML = `
      <div style="border: 2px solid var(--primary); border-radius: var(--border-radius-md); padding: 1.25rem; background: var(--bg-secondary);">
        <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <h4 style="font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; color: var(--primary); text-transform: uppercase; margin: 0;">KVCET SMART HOSTEL SYSTEM</h4>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0.2rem 0 0 0;">
            ${pass.passType === 'HOME_LEAVE' ? 'DIGITAL LEAVE OUTPASS' : 'DIGITAL OUTING PASS'}
          </h3>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: left; font-size: 0.82rem; margin-bottom: 1rem;">
          <div><span style="color: var(--text-muted); font-size: 0.72rem; display: block;">STUDENT NAME</span><strong>${student.name}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 0.72rem; display: block;">REGISTER NO</span><strong>${student.regNo}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 0.72rem; display: block;">DEPARTMENT</span><strong>${student.dept || 'CSE'}</strong></div>
          <div><span style="color: var(--text-muted); font-size: 0.72rem; display: block;">ROOM NUMBER</span><strong>${student.room || '-'}</strong></div>
        </div>

        <div style="background: var(--bg-primary); border-radius: var(--border-radius-sm); padding: 0.75rem; font-size: 0.82rem; text-align: left; margin-bottom: 1rem; border: 1px solid var(--border-color);">
          <div style="margin-bottom: 0.4rem;"><strong>DESTINATION:</strong> ${details.destination || details.reason || 'Home'}</div>
          <div style="margin-bottom: 0.4rem;"><strong>PERMITTED EXIT:</strong> ${pass.validFrom}</div>
          <div><strong>RETURN BEFORE:</strong> ${pass.validUntil}</div>
        </div>

        <!-- Scanner-Safe QR Code Card Wrapper -->
        <div class="outpass-qr-container" style="background: #ffffff; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 236px; height: 236px; margin: 1rem auto; border: 1px solid #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
          <div id="outpass-qr-canvas" style="width: 204px; height: 204px; display: flex; align-items: center; justify-content: center; overflow: hidden;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
          <span style="font-family: monospace; font-weight: 700; color: var(--text-primary);">PASS ID: ${pass.id}</span>
          <span class="badge badge-${statusBadgeClass}">${pass.status}</span>
        </div>
      </div>
    `;

    // Bind close listeners for outpass viewer modal
    const closeBtn = document.getElementById('modal-outpass-close');
    const closeFooterBtn = document.getElementById('btn-close-outpass-modal');
    const backdrop = document.getElementById('modal-outpass-backdrop');

    if (closeBtn) closeBtn.onclick = () => HMSModal.close('#modal-view-outpass');
    if (closeFooterBtn) closeFooterBtn.onclick = () => HMSModal.close('#modal-view-outpass');
    if (backdrop) backdrop.onclick = () => HMSModal.close('#modal-view-outpass');

    const renderQR = () => {
      const qrTarget = document.getElementById('outpass-qr-canvas');
      if (!qrTarget) return;

      qrTarget.innerHTML = '';

      const payloadStr = JSON.stringify({
        type: "OUTPASS",
        id: pass.id,
        studentId: pass.studentReg,
        sessionId: pass.sourceOutingId || pass.sourceLeaveId || "",
        timestamp: Date.now(),
        signature: pass.secureToken
      });
      console.log("GENERATING VALID QR PAYLOAD:", payloadStr);

      let isRendered = false;

      if (typeof QRCode !== 'undefined') {
        try {
          new QRCode(qrTarget, {
            text: payloadStr,
            width: 204,
            height: 204,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
          });

          const canvas = qrTarget.querySelector('canvas');
          if (canvas) {
            canvas.style.width = '204px';
            canvas.style.height = '204px';
            canvas.style.maxWidth = '100%';
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
          }
          const img = qrTarget.querySelector('img');
          if (img) {
            img.style.maxWidth = '100%';
            img.style.margin = '0 auto';
          }
          isRendered = true;
        } catch (err) {
          console.warn("QRCode JS render error, trying fallback:", err);
        }
      }

      if (!isRendered) {
        const encoded = encodeURIComponent(payloadStr);
        qrTarget.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=H&margin=2&data=${encoded}" alt="Outpass QR" style="width: 204px; height: 204px; display: block; margin: 0 auto; border-radius: 4px;">`;
      }
    };

    renderQR();

    HMSModal.open('#modal-view-outpass');
  } catch (e) {
    console.error('Failed to open outpass modal:', e);
    showToast('Failed to load outpass details.', 'danger');
  }
};

window.openOutpassModalForLeave = async function(leaveId) {
  try {
    const pass = await HostelDB.createOrGetLeaveOutpass(leaveId);
    if (pass) {
      if (typeof viewLeaveDetails !== 'undefined') {
        const modal = document.getElementById('leave-details-modal');
        if (modal) modal.style.display = 'none';
      }
      window.openOutpassModal(pass.id);
    } else {
      showToast('Outpass not generated for this leave yet.', 'warning');
    }
  } catch (err) {
    console.error('Error viewing leave outpass:', err);
    showToast('Failed to load leave outpass.', 'danger');
  }
};

/* --- REALTIME STUDY HOUR LIVE DASHBOARD SYNCHRONIZER --- */
let studentLiveTimerInterval = null;
let lastKnownSessionId = null;
let lastKnownStatus = null;

async function initStudentDashboardStudyHour(student) {
  const bannerContainer = document.getElementById('student-study-hour-banner');
  const sessionCardContainer = document.getElementById('student-session-card');
  const historyTbody = document.getElementById('student-study-history-tbody');

  if (!bannerContainer && !sessionCardContainer) return;

  const renderRealtimeState = async (showNotification = false) => {
    const activeSession = await HostelDB.getActiveStudySession();
    const sessions = await HostelDB.getStudySessions();

    // STRICT REQUIRED SESSION STATE MODEL:
    // 'no_session' | 'active' | 'attended' | 'ended'
    // Default initial state is ALWAYS 'no_session' — NEVER 'ended'!
    let currentState = 'no_session';
    let sessionToUse = null;

    if (activeSession) {
      sessionToUse = activeSession;
      lastKnownSessionId = activeSession.id;

      // Check attendance status for active session
      const attendance = await HostelDB.getStudyAttendance(activeSession.id, student.regNo);
      const myRecord = attendance[0] || null;
      const isPresent = myRecord && (myRecord.entryStatus === 'PRESENT' || myRecord.finalStatus === 'PRESENT');

      currentState = isPresent ? 'attended' : 'active';
    } else {
      // Transition to 'ended' ONLY if a session was known to be active in this tracking context and just closed
      if (lastKnownSessionId) {
        const closedSession = sessions.find(s => s.id === lastKnownSessionId);
        if (closedSession && closedSession.status === 'CLOSED') {
          currentState = 'ended';
          sessionToUse = closedSession;
        } else {
          currentState = 'no_session';
        }
      } else {
        currentState = 'no_session';
      }
    }

    // Handle Notifications on State Transitions
    if (showNotification && lastKnownStatus !== null && lastKnownStatus !== currentState) {
      if (currentState === 'active') {
        showToast('🟢 Study Hour Session Started! Please scan QR code to mark attendance.', 'success');
        if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
      } else if (currentState === 'ended') {
        showToast('🔴 The Study Hour session has ended.', 'warning');
      }
    }
    lastKnownStatus = currentState;

    // Build Card Content HTML according to exact required states
    let cardHTML = '';

    if (currentState === 'no_session') {
      // 'no_session' -> Student: "No Active Study Hour Session", scan button hidden
      cardHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
              <span style="font-size: 1.2rem;">📚</span>
              <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">Study Hour</h3>
              <span class="badge" style="background: rgba(148, 163, 184, 0.2); color: #64748b; font-weight: 800; font-size: 0.75rem;">Status: No Active Session</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">No Active Study Hour Session</p>
          </div>
        </div>
      `;
    } else if (currentState === 'active') {
      // 'active' -> Student: "🟢 Study Hour Started", scan button shown
      const startTimeStr = sessionToUse ? (sessionToUse.startTime || '19:00') : '19:00';
      cardHTML = `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1.5px solid #10b981; border-radius: var(--border-radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 260px;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                <span style="font-size: 1.1rem;">🟢</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: #10b981; margin: 0;">🟢 Study Hour Started</h3>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 800; font-size: 0.75rem;">Session Status: Active</span>
              </div>
              <p style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.4rem 0;">
                "Study Hour has started. Please scan the QR code to mark your attendance."
              </p>
              <div style="display: flex; gap: 1.25rem; font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap;">
                <span><i class="fa-solid fa-clock" style="color: var(--primary); margin-right: 0.3rem;"></i> Started: <strong>${startTimeStr}</strong></span>
                <span><i class="fa-solid fa-stopwatch" style="color: #f59e0b; margin-right: 0.3rem;"></i> Live Timer: <strong id="student-live-timer-text" style="color: var(--primary); font-family: monospace;">00:00:00</strong></span>
              </div>
            </div>

            <!-- Scan QR Button (Only shown for Students when status is active) -->
            <button type="button" class="btn btn-success btn-lg btn-scan-study-hour-qr-trigger" style="background: #10b981; border-color: #10b981; font-weight: 800; padding: 0.75rem 1.5rem; font-size: 0.95rem; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
              <i class="fa-solid fa-qrcode" style="margin-right: 0.4rem;"></i> Scan QR Code
            </button>
          </div>
        </div>
      `;
    } else if (currentState === 'attended') {
      // 'attended' -> Student: "✅ Attendance Recorded", scan button disabled
      const attendance = await HostelDB.getStudyAttendance(sessionToUse.id, student.regNo);
      const myRecord = attendance[0] || null;
      const scanTimeStr = myRecord && myRecord.entryTime ? new Date(myRecord.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently';
      cardHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--border-radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                <span style="font-size: 1.2rem;">✅</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: #10b981; margin: 0;">✅ Attendance Recorded</h3>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 800; font-size: 0.75rem;">Attendance Status: Present</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                Scan Time: <strong style="color: var(--text-primary);">${scanTimeStr}</strong>
              </p>
            </div>
            <button type="button" class="btn btn-secondary" disabled style="opacity: 0.7; cursor: not-allowed; font-weight: 700;">
              <i class="fa-solid fa-check"></i> Attendance Marked
            </button>
          </div>
        </div>
      `;
    } else if (currentState === 'ended') {
      // 'ended' -> Student: "🔴 Study Hour Session Ended", scan button hidden
      cardHTML = `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--border-radius-md); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                <span style="font-size: 1.1rem;">🔴</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: #ef4444; margin: 0;">🔴 Study Hour Session Ended</h3>
                <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 800; font-size: 0.75rem;">Session Status: Ended</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                The Study Hour session has ended.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    // Hydrate DOM containers
    if (bannerContainer) {
      const contentEl = document.getElementById('study-banner-content') || bannerContainer;
      contentEl.innerHTML = cardHTML;
    }
    if (sessionCardContainer) {
      const cardContentEl = document.getElementById('student-session-content') || sessionCardContainer;
      cardContentEl.innerHTML = cardHTML;
    }

    // Attach Scan QR Button Click Handlers
    document.querySelectorAll('.btn-scan-study-hour-qr-trigger').forEach(btn => {
      btn.onclick = () => {
        if (!activeSession) {
          showToast('Study Hour session is not currently active.', 'warning');
          return;
        }
        if (window.HMSQRScanner) {
          window.HMSQRScanner.open({
            title: 'Scan Study Hour QR',
            mainText: 'Align the Warden\'s Study Session QR inside frame',
            subText: 'Attendance will be registered automatically',
            onScan: async (decodedText) => {
              try {
                let payload = null;
                try { payload = JSON.parse(decodedText); } catch (e) {}

                if (payload && payload.type === 'STUDY_HOUR') {
                  await HostelDB.upsertStudyAttendance({
                    sessionId: activeSession.id,
                    studentReg: student.regNo,
                    studentName: student.name,
                    dept: student.dept || 'CSE',
                    room: student.room || '-',
                    entryStatus: 'PRESENT',
                    entryTime: new Date().toISOString(),
                    finalStatus: 'PRESENT'
                  });

                  if ('BroadcastChannel' in window) {
                    try {
                      const bc = new BroadcastChannel('hms_study_channel');
                      bc.postMessage({ type: 'ATTENDANCE_RECORDED', studentReg: student.regNo, timestamp: Date.now() });
                      bc.close();
                    } catch (e) {}
                  }

                  showToast('✓ Attendance Recorded: Present!', 'success');
                  await renderRealtimeState(false);
                } else {
                  showToast('Invalid QR Code. Please scan the Warden\'s Study Hour QR.', 'danger');
                }
              } catch (err) {
                console.error('Scan error:', err);
                showToast('Failed to record attendance.', 'danger');
              }
            }
          });
        }
      };
    });

    // Handle Live Timer
    if (activeSession && currentState === 'active') {
      if (!studentLiveTimerInterval) {
        const startTime = new Date(activeSession.createdAt || Date.now()).getTime();
        studentLiveTimerInterval = setInterval(() => {
          const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
          const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
          const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
          const secs = String(elapsedSec % 60).padStart(2, '0');
          const timerEl = document.getElementById('student-live-timer-text');
          if (timerEl) timerEl.textContent = `${hrs}:${mins}:${secs}`;
        }, 1000);
      }
    } else {
      if (studentLiveTimerInterval) {
        clearInterval(studentLiveTimerInterval);
        studentLiveTimerInterval = null;
      }
    }

    // Render Student Study History Table if present
    if (historyTbody) {
      if (sessions.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.25rem;">No historical records found.</td></tr>`;
      } else {
        const rows = await Promise.all(sessions.map(async s => {
          const atts = await HostelDB.getStudyAttendance(s.id, student.regNo);
          const rec = atts[0];
          const isPresentRec = rec && (rec.entryStatus === 'PRESENT' || rec.finalStatus === 'PRESENT');
          const badge = isPresentRec 
            ? `<span class="badge badge-success">PRESENT</span>` 
            : `<span class="badge badge-danger">MISSED / ABSENT</span>`;
          const time = isPresentRec && rec.entryTime ? new Date(rec.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

          return `
            <tr>
              <td>${s.date}</td>
              <td>${s.sessionTitle || 'Study Session'}</td>
              <td>${time}</td>
              <td>${badge}</td>
            </tr>
          `;
        }));
        historyTbody.innerHTML = rows.join('');
      }
    }
  };

  // Initial Sync
  await renderRealtimeState(false);

  // BroadcastChannel Listener for Sub-Millisecond Multi-Tab Sync
  if ('BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('hms_study_channel');
      bc.onmessage = async (event) => {
        console.log('⚡ Realtime Study Broadcast Received:', event.data);
        await renderRealtimeState(true);
      };
    } catch (e) {}
  }

  // Mobile OS & Browser Lifecycle Event Hooks for 100% Guaranteed Mobile Synchronization
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderRealtimeState(true);
    }
  });

  window.addEventListener('focus', () => renderRealtimeState(true));
  window.addEventListener('pageshow', () => renderRealtimeState(true));
  window.addEventListener('online', () => renderRealtimeState(true));

  window.addEventListener('storage', (e) => {
    if (e.key === 'hms_study_sessions' || e.key === 'hms_study_attendance') {
      renderRealtimeState(true);
    }
  });

  // 3s Automatic Background Polling Fallback (Zero Refresh Automation)
  const pollInterval = setInterval(() => renderRealtimeState(true), 3000);
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
}

async function initStudentStudyHour(student) {
  await initStudentDashboardStudyHour(student);
}


