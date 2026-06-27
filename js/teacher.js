/* --- Teacher Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') return;

  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    await initDashboard(currentUser);
  } else if (pagePath.includes('student-status.html')) {
    await initStudentStatus();
  } else if (pagePath.includes('leave-records.html')) {
    await initLeaveRecords(currentUser);
  }
});

// Calculate statistics helper
async function getDeptStats(dept) {
  const [allStudents, leaves, attendance] = await Promise.all([
    HostelDB.getStudents(),
    HostelDB.getLeaves(),
    HostelDB.getAttendanceRecords()
  ]);

  const students = allStudents.filter(s => s.dept === dept);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance[todayStr] || {};

  let activeLeave = 0;
  let illegalAbsence = 0;

  students.forEach(s => {
    // 1. Is student on approved leave today?
    const onLeave = leaves.some(l => 
      l.studentReg === s.regNo && 
      l.status === 'Approved' && 
      new Date(todayStr) >= new Date(l.fromDate) && 
      new Date(todayStr) <= new Date(l.toDate)
    );

    if (onLeave) {
      activeLeave++;
    } else {
      // 2. Is student marked absent today without approved leave?
      if (todayAttendance[s.regNo] === 'absent') {
        illegalAbsence++;
      }
    }
  });

  const inHostel = students.length - activeLeave - illegalAbsence;

  return {
    total: students.length,
    inHostel: Math.max(0, inHostel),
    onLeave: activeLeave,
    illegal: illegalAbsence
  };
}

// 1. Teacher Dashboard
async function initDashboard(teacher) {
  // Set placeholders
  const statsIds = ['stats-total-students', 'stats-in-hostel', 'stats-on-leave', 'stats-illegal-leave'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  const tbody = document.getElementById('teacher-alerts-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading department alerts...</td></tr>';
  }

  try {
    const stats = await getDeptStats(teacher.dept);

    // Hydrate UI counters
    document.getElementById('stats-total-students').textContent = stats.total;
    document.getElementById('stats-in-hostel').textContent = stats.inHostel;
    document.getElementById('stats-on-leave').textContent = stats.onLeave;
    document.getElementById('stats-illegal-leave').textContent = stats.illegal;

    // Update labels to include department
    const cards = document.querySelectorAll('.stat-card');
    if (cards.length >= 4) {
      cards[0].querySelector('.stat-label').textContent = `Total ${teacher.dept} Students`;
      cards[1].querySelector('.stat-label').textContent = `${teacher.dept} Hostel Students`;
      cards[2].querySelector('.stat-label').textContent = `${teacher.dept} Leave Students`;
      cards[3].querySelector('.stat-label').textContent = `${teacher.dept} Illegal Absences`;
    }

    // Hydrate Recent Alerts (Illegal absences in department)
    if (tbody) {
      const [allStudents, attendance, leaves] = await Promise.all([
        HostelDB.getStudents(),
        HostelDB.getAttendanceRecords(),
        HostelDB.getLeaves()
      ]);

      const students = allStudents.filter(s => s.dept === teacher.dept);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance[todayStr] || {};

      const alerts = [];
      students.forEach(s => {
        if (todayAttendance[s.regNo] === 'absent') {
          const onLeave = leaves.some(l => 
            l.studentReg === s.regNo && 
            l.status === 'Approved' && 
            new Date(todayStr) >= new Date(l.fromDate) && 
            new Date(todayStr) <= new Date(l.toDate)
          );
          if (!onLeave) {
            alerts.push({
              regNo: s.regNo,
              name: s.name,
              room: s.room || 'Unallocated',
              reason: 'Absent at evening roll call (No approved leave)'
            });
          }
        }
      });

      if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-success"><i class="fa-solid fa-circle-check"></i> All department students accounted for today.</td></tr>';
        return;
      }

      tbody.innerHTML = alerts.map(a => `
        <tr style="background: var(--danger-light);">
          <td><strong>${a.regNo}</strong></td>
          <td>${a.name}</td>
          <td>${a.room}</td>
          <td><span class="text-danger" style="font-weight:600;"><i class="fa-solid fa-triangle-exclamation" style="margin-right:0.25rem;"></i>${a.reason}</span></td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load teacher dashboard:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load alerts roster.</td></tr>';
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

// 2. Student Search / Status Panel
async function initStudentStatus() {
  const searchInput = document.getElementById('student-search-input');
  const searchBtn = document.getElementById('btn-student-search');
  const resultCard = document.getElementById('search-result-card');

  if (!searchBtn || !searchInput) return;

  async function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      showToast('Please enter student name or registration number.', 'warning');
      return;
    }

    const originalBtnHtml = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
      const [students, leavesData, attendance] = await Promise.all([
        HostelDB.getStudents(),
        HostelDB.getLeaves(),
        HostelDB.getAttendanceRecords()
      ]);

      const found = students.find(s => s.regNo.toLowerCase() === query || s.name.toLowerCase().includes(query));

      if (!found) {
        showToast('Student not found.', 'danger');
        resultCard.classList.add('hidden');
        return;
      }

      // Hydrate student metrics
      const leaves = leavesData.filter(l => l.studentReg === found.regNo);

      // Calculate status
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance[todayStr] || {};
      const onLeave = leaves.some(l => 
        l.status === 'Approved' && 
        new Date(todayStr) >= new Date(l.fromDate) && 
        new Date(todayStr) <= new Date(l.toDate)
      );

      let statusText = 'In Hostel';
      let statusClass = 'in-hostel';
      
      if (onLeave) {
        statusText = 'On Leave';
        statusClass = 'on-leave';
      } else if (todayAttendance[found.regNo] === 'absent') {
        statusText = 'Illegal Absence';
        statusClass = 'out-illegal';
      }

      // Attendance percentage calculation
      let presentCount = 0;
      let totalRolls = 0;
      Object.keys(attendance).forEach(date => {
        const records = attendance[date];
        if (records[found.regNo]) {
          totalRolls++;
          if (records[found.regNo] === 'present') presentCount++;
        }
      });
      
      const percentage = totalRolls > 0 ? Math.round((presentCount / totalRolls) * 100) : 100;

      // Set layout elements
      document.getElementById('res-avatar').textContent = found.name.charAt(0).toUpperCase();
      document.getElementById('res-name').textContent = found.name;
      document.getElementById('res-reg').textContent = found.regNo;
      document.getElementById('res-dept').textContent = found.dept;
      document.getElementById('res-room').textContent = found.room || 'Unallocated';
      document.getElementById('res-contact').textContent = found.contact;
      document.getElementById('res-email').textContent = found.email;

      // Set hostel status
      const indicator = document.getElementById('res-hostel-status');
      indicator.innerHTML = `
        <span class="status-indicator">
          <span class="status-dot ${statusClass}"></span>
          <strong>${statusText}</strong>
        </span>
      `;

      // Attendance summary
      document.getElementById('res-attendance').innerHTML = `
        <strong>${percentage}%</strong> (${presentCount} Present / ${totalRolls - presentCount} Absent)
      `;

      // Leave list
      const leavesList = document.getElementById('res-leaves-list');
      if (leavesList) {
        if (leaves.length === 0) {
          leavesList.innerHTML = '<span class="text-muted">No leave requests found.</span>';
        } else {
          leavesList.innerHTML = leaves.map(l => `
            <div style="font-size:0.8rem; padding: 0.5rem; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
              <span>${formatDateString(l.fromDate)} to ${formatDateString(l.toDate)}</span>
              <span class="badge badge-${l.status.toLowerCase()}">${l.status}</span>
            </div>
          `).join('');
        }
      }

      // Show result card
      resultCard.classList.remove('hidden');
      showToast(`Found student ${found.name}`, 'success');
    } catch (error) {
      console.error('Failed to perform student search:', error);
      showToast('Search query failed. Please verify connection.', 'danger');
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerHTML = originalBtnHtml;
    }
  }

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

// 3. Leave records page
// 3. Leave records page
async function initLeaveRecords(teacher) {
  const tbody = document.getElementById('teacher-leaves-tbody');
  const searchInput = document.getElementById('teacher-leaves-search');
  const statusSelect = document.getElementById('filter-teacher-leaves-status');
  const prevBtn = document.getElementById('btn-prev-page-teacher-leaves');
  const nextBtn = document.getElementById('btn-next-page-teacher-leaves');
  const infoSpan = document.getElementById('pagination-info-teacher-leaves');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading department leave journal...</td></tr>';
  }

  let leaves = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'id';
  let currentSortOrder = 'desc';

  try {
    const allLeaves = await HostelDB.getLeaves();
    leaves = allLeaves.filter(l => l.dept === teacher.dept);

    function renderLedger() {
      if (!tbody) return;

      // Filter
      let filtered = leaves.filter(l => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = l.id.toLowerCase().includes(query) || 
                              l.studentName.toLowerCase().includes(query) || 
                              (l.room || '').toLowerCase().includes(query) ||
                              l.reason.toLowerCase().includes(query);

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || l.status === statusVal;

        return matchesSearch && matchesStatus;
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
          infoSpan.textContent = 'Showing 0 to 0 of 0 requests';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} requests`;
        }
      }

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (leaves.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No leave requests found.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No department outing leaves found matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(l => `
        <tr>
          <td><strong>${l.id}</strong></td>
          <td>${l.studentName} (${l.room || 'Unallocated'})</td>
          <td>${formatDateString(l.fromDate)} to ${formatDateString(l.toDate)}</td>
          <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.reason}</td>
          <td><span class="badge badge-${l.status.toLowerCase()}">${l.status}</span></td>
        </tr>
      `).join('');
    }

    renderLedger();

    // Event Bindings
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLedger(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderLedger(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLedger(); });

    // Sort Click Handlers
    const sortId = document.getElementById('sort-teacher-lv-id');
    const sortDate = document.getElementById('sort-teacher-lv-date');
    if (sortId) {
      sortId.addEventListener('click', () => {
        toggleSort('id');
        renderLedger();
      });
    }
    if (sortDate) {
      sortDate.addEventListener('click', () => {
        toggleSort('fromDate');
        renderLedger();
      });
    }

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }
  } catch (error) {
    console.error('Failed to load leave records journal:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load department leaves.</td></tr>';
    }
  }
}
