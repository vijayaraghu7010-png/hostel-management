/* --- Administrative Officer (AO) Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'ao') return;

  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    await initDashboard();
  } else if (pagePath.includes('complaints.html')) {
    await initComplaints();
  } else if (pagePath.includes('escalated-cases.html')) {
    await initEscalatedCases();
  } else if (pagePath.includes('reports.html')) {
    await initReports();
  }
});

// Helper stats calculation
async function getAoStats() {
  const complaints = await HostelDB.getComplaints();
  return {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    progress: complaints.filter(c => c.status === 'In Progress').length,
    escalated: complaints.filter(c => c.status === 'Escalated').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    wardenTickets: complaints.filter(c => c.category === 'Warden Complaint').length
  };
}

// 1. AO Dashboard
async function initDashboard() {
  const statsIds = ['stats-new-complaints', 'stats-escalated-complaints', 'stats-warden-complaints', 'stats-pending-cases'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  const tbody = document.getElementById('ao-complaints-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading complaints...</td></tr>';
  }

  try {
    const [stats, complaints] = await Promise.all([
      getAoStats(),
      HostelDB.getComplaints()
    ]);

    // Metrics
    document.getElementById('stats-new-complaints').textContent = stats.pending;
    document.getElementById('stats-escalated-complaints').textContent = stats.escalated;
    document.getElementById('stats-warden-complaints').textContent = stats.wardenTickets;
    document.getElementById('stats-pending-cases').textContent = stats.pending + stats.progress;

    // Hydrate full table
    if (tbody) {
      if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No complaints available.</td></tr>';
        return;
      }

      tbody.innerHTML = complaints.map(c => `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.studentName} (${c.room})</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
          <td>${c.assignedTo || 'Unassigned'}</td>
          <td><span class="text-${new Date(c.deadline) < Date.now() && c.status !== 'Resolved' ? 'danger' : 'secondary'}" style="font-weight:600;">${formatDateString(c.deadline)}</span></td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load AO dashboard:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load complaints.</td></tr>';
    }
  }

  // Bind Dashboard Logout Action
  const dashLogout = document.getElementById('btn-dashboard-logout');
  if (dashLogout) {
    dashLogout.addEventListener('click', () => {
      HMSAuth.logout();
    });
  }
}

// 2. Full Complaints Ledger
// 2. Full Complaints Ledger
async function initComplaints() {
  const tbody = document.getElementById('ao-full-complaints-tbody');
  const searchInput = document.getElementById('ao-complaints-search');
  const categorySelect = document.getElementById('filter-ao-category');
  const statusSelect = document.getElementById('filter-ao-status');
  const prevBtn = document.getElementById('btn-prev-page-ao');
  const nextBtn = document.getElementById('btn-next-page-ao');
  const infoSpan = document.getElementById('pagination-info-ao');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin:1rem 0;"></i><p>Loading full complaints ledger...</p></td></tr>';
  }

  let complaints = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'id';
  let currentSortOrder = 'desc';

  try {
    complaints = await HostelDB.getComplaints();

    function renderList() {
      if (!tbody) return;

      // Filter
      let filtered = complaints.filter(c => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = c.id.toLowerCase().includes(query) || 
                              c.studentName.toLowerCase().includes(query) || 
                              (c.room || '').toLowerCase().includes(query) ||
                              c.description.toLowerCase().includes(query);

        const categoryVal = categorySelect ? categorySelect.value : '';
        const matchesCategory = !categoryVal || c.category === categoryVal;

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || c.status === statusVal;

        return matchesSearch && matchesCategory && matchesStatus;
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

      // Pagination
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      currentPage = Math.max(1, Math.min(currentPage, totalPages));
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      const paginated = filtered.slice(startIndex, endIndex);

      // Info
      if (infoSpan) {
        if (totalItems === 0) {
          infoSpan.textContent = 'Showing 0 to 0 of 0 tickets';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} tickets`;
        }
      }

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (complaints.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No complaints available.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No tickets registered matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(c => `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.studentName}</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
          <td>${c.assignedTo || 'Unassigned'}</td>
          <td>${formatDateString(c.deadline)}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              ${c.status !== 'Resolved' ? `
                <button class="btn btn-primary btn-sm btn-action" onclick="promptAssign('${c.id}')">Assign Staff</button>
                <button class="btn btn-secondary btn-sm btn-action" onclick="forwardTicketToPrincipal('${c.id}')" title="Forward to Principal"><i class="fa-solid fa-share"></i></button>
                <button class="btn btn-success btn-sm btn-action" onclick="closeTicket('${c.id}')">Close</button>
              ` : '<span class="text-muted" style="font-size:0.8rem;">Archive</span>'}
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderList();

    // Event Bindings
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderList(); });
    if (categorySelect) categorySelect.addEventListener('change', () => { currentPage = 1; renderList(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderList(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderList(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderList(); });

    // Sort Click Handlers
    const sortId = document.getElementById('sort-ao-cmp-id');
    const sortStatus = document.getElementById('sort-ao-cmp-status');
    const sortDeadline = document.getElementById('sort-ao-cmp-date');

    if (sortId) sortId.addEventListener('click', () => { toggleSort('id'); renderList(); });
    if (sortStatus) sortStatus.addEventListener('click', () => { toggleSort('status'); renderList(); });
    if (sortDeadline) sortDeadline.addEventListener('click', () => { toggleSort('deadline'); renderList(); });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    const disableButtons = (id) => {
      let row = document.body;
      const cells = tbody.querySelectorAll('tr td strong');
      for (const cell of cells) {
        if (cell.textContent.trim() === id) {
          row = cell.closest('tr');
          break;
        }
      }
      row.querySelectorAll('.btn-action').forEach(btn => btn.disabled = true);
    };

    // Assign staff handler
    window.promptAssign = async function(id) {
      const staff = prompt("Enter Name of Staff Member/Vendor to assign:", "Senior Engineer");
      if (!staff) return;

      disableButtons(id);
      showToast(`Assigning ticket ${id} to ${staff}...`, 'info');

      try {
        const target = complaints.find(c => c.id === id);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updates = {
          status: 'In Progress',
          assignedTo: staff,
          timeline: [...target.timeline, { status: 'In Progress', desc: `AO Vikas Malhotra assigned task to ${staff}`, date: `${today} ${nowTime}` }]
        };

        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Task Assigned', `Ticket ${id} assigned to ${staff}.`);
        showToast(`Ticket ${id} assigned successfully.`, 'info');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to assign staff:', err);
        showToast('Operation failed. Check connection.', 'danger');
        window.location.reload();
      }
    };

    // Close Ticket handler
    window.closeTicket = async function(id) {
      if (!confirm("Are you sure you want to close this ticket?")) return;

      disableButtons(id);
      showToast(`Closing ticket ${id}...`, 'info');

      try {
        const target = complaints.find(c => c.id === id);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updates = {
          status: 'Resolved',
          timeline: [...target.timeline, { status: 'Resolved', desc: 'AO Vikas Malhotra verified resolution and closed ticket.', date: `${today} ${nowTime}` }]
        };

        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Ticket Closed', `AO closed ticket ${id}.`);
        showToast(`Ticket ${id} marked Resolved.`, 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to close ticket:', err);
        showToast('Operation failed. Check connection.', 'danger');
        window.location.reload();
      }
    };

    // Forward Ticket to Principal handler
    window.forwardTicketToPrincipal = async function(id) {
      if (!confirm(`Are you sure you want to forward ticket ${id} to the Principal?`)) return;

      disableButtons(id);
      showToast(`Forwarding ticket ${id} to Principal...`, 'info');

      try {
        const target = complaints.find(c => c.id === id);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updates = {
          assignedTo: 'Principal',
          timeline: [...target.timeline, { status: target.status, desc: `Forwarded to Principal by AO Vikas Malhotra`, date: `${today} ${nowTime}` }]
        };

        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Ticket Forwarded', `AO forwarded ticket ${id} to Principal.`);
        showToast(`Ticket ${id} forwarded successfully.`, 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to forward ticket:', err);
        showToast('Operation failed. Check connection.', 'danger');
        window.location.reload();
      }
    };

  } catch (error) {
    console.error('Failed to load full complaints list:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load complaints ledger.</td></tr>';
    }
  }
}

// 3. Escalated Cases Section
async function initEscalatedCases() {
  const container = document.getElementById('ao-escalations-container');
  if (container) {
    container.innerHTML = `
      <div class="glass-card text-center" style="padding: 2.5rem;">
        <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin-bottom:0.5rem;"></i>
        <p>Loading escalated case files...</p>
      </div>
    `;
  }

  try {
    const allComplaints = await HostelDB.getComplaints();
    const complaints = allComplaints.filter(c => c.status === 'Escalated');

    function renderEscalations() {
      if (!container) return;

      if (complaints.length === 0) {
        container.innerHTML = `
          <div class="glass-card text-center text-success" style="padding: 2.5rem;">
            <i class="fa-solid fa-circle-check" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <h3>All Clear!</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">No active escalated tickets pending AO resolution.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = complaints.map(c => `
        <div class="glass-card" style="margin-bottom: 1.5rem;" id="esc-card-${c.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; margin-bottom: 1rem;">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${c.id} - ${c.category} Complaint</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Filed by: <strong>${c.studentName} (Room ${c.room})</strong> | Date: ${formatDateString(c.date)}</span>
            </div>
            <span class="badge badge-escalated">Escalated</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-primary); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1.5rem;">
            <strong>Issue Details:</strong> ${c.description}
          </p>

          <!-- Escalation UI steps -->
          <div style="margin-bottom: 1.5rem;">
            <h5 style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">Escalation Lifecycle Pipeline</h5>
            <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-primary); padding: 1rem; border-radius: var(--border-radius-sm); border:1px solid var(--border-color);">
              <div class="escalation-step closed" style="margin-bottom:0; padding:0.25rem 0.5rem; font-size:0.75rem;">Step 1: Pending &nbsp;&nbsp;<i class="fa-solid fa-circle-check"></i></div>
              <i class="fa-solid fa-chevron-right text-muted"></i>
              <div class="escalation-step escalated" style="margin-bottom:0; padding:0.25rem 0.5rem; font-size:0.75rem;">Step 2: Escalated &nbsp;&nbsp;<i class="fa-solid fa-triangle-exclamation"></i></div>
              <i class="fa-solid fa-chevron-right text-muted"></i>
              <div class="escalation-step pending" style="margin-bottom:0; padding:0.25rem 0.5rem; font-size:0.75rem; border-left-color: var(--text-muted);">Step 3: Closed</div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button class="btn btn-secondary btn-sm btn-action" onclick="forwardToPrincipal('${c.id}')">
              <i class="fa-solid fa-share"></i>
              <span>Forward to Principal</span>
            </button>
            <button class="btn btn-primary btn-sm btn-action" onclick="resolveEscalation('${c.id}')">
              <i class="fa-solid fa-check-double"></i>
              <span>Resolve and Close Case</span>
            </button>
          </div>
        </div>
      `).join('');
    }

    renderEscalations();

    // Resolve Escalation case
    window.resolveEscalation = async function(id) {
      if (!confirm(`Are you sure you want to resolve case ${id}?`)) return;

      const card = document.getElementById(`esc-card-${id}`);
      if (card) {
        card.querySelectorAll('.btn-action').forEach(btn => btn.disabled = true);
      }
      showToast(`Resolving case ${id}...`, 'info');

      try {
        const target = complaints.find(c => c.id === id);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updates = {
          status: 'Resolved',
          timeline: [...target.timeline, { status: 'Resolved', desc: 'AO Vikas Malhotra investigated and resolved the escalated dispute.', date: `${today} ${nowTime}` }]
        };

        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Escalation Resolved', `Escalated case ${id} resolved by AO.`);
        showToast(`Case ${id} resolved and archived.`, 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to resolve escalation:', err);
        showToast('Operation failed. Check connection.', 'danger');
        window.location.reload();
      }
    };

    // Forward Escalation to Principal handler
    window.forwardToPrincipal = async function(id) {
      if (!confirm(`Are you sure you want to forward case ${id} to the Principal?`)) return;

      const card = document.getElementById(`esc-card-${id}`);
      if (card) {
        card.querySelectorAll('.btn-action').forEach(btn => btn.disabled = true);
      }
      showToast(`Forwarding case ${id} to Principal...`, 'info');

      try {
        const target = complaints.find(c => c.id === id);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updates = {
          assignedTo: 'Principal',
          timeline: [...target.timeline, { status: 'Escalated', desc: 'Forwarded to Principal for final review by AO Vikas Malhotra.', date: `${today} ${nowTime}` }]
        };

        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Case Escalated', `AO forwarded complaint ${id} to Principal.`);
        showToast(`Case ${id} forwarded to Principal.`, 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to forward escalation:', err);
        showToast('Operation failed. Check connection.', 'danger');
        window.location.reload();
      }
    };

  } catch (error) {
    console.error('Failed to load escalated cases:', error);
    if (container) {
      container.innerHTML = `
        <div class="glass-card text-center text-danger" style="padding: 2.5rem;">
          Failed to load escalated cases deck.
        </div>
      `;
    }
  }
}

// 4. Reports Portal
async function initReports() {
  const statsIds = ['rep-total-complaints', 'rep-resolved-complaints', 'rep-pending-complaints', 'rep-escalated-complaints'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  try {
    const stats = await getAoStats();

    document.getElementById('rep-total-complaints').textContent = stats.total;
    document.getElementById('rep-resolved-complaints').textContent = stats.resolved;
    document.getElementById('rep-pending-complaints').textContent = stats.pending;
    document.getElementById('rep-escalated-complaints').textContent = stats.escalated;
  } catch (error) {
    console.error('Failed to load AO reports:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
  }

  // Print utility trigger
  const printBtn = document.getElementById('btn-print-reports');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}
