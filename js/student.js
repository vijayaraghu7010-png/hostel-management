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
        <tr style="cursor: pointer;" onclick="viewLeaveDetails('${l.id}')">
          <td><strong class="text-primary-color">${l.id}</strong></td>
          <td>${formatDateString(l.fromDate)}</td>
          <td>${formatDateString(l.toDate)}</td>
          <td><strong>${totalDays} Days</strong></td>
          <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.reason}</td>
          <td>${formatDateString(l.dateRaised)}</td>
          <td><span class="badge badge-${badgeClass}">${l.status}</span></td>
          <td>${l.approvedBy || 'Pending'}</td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.remarks || 'Awaiting Review'}</td>
        </tr>
      `;
    }).join('');
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
