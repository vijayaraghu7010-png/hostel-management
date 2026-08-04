/* --- HOD Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'hod') return;

  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    await initDashboard(currentUser);
  } else if (pagePath.includes('department-students.html')) {
    await initDeptStudents(currentUser);
  } else if (pagePath.includes('leave-reports.html')) {
    await initLeaveReports(currentUser);
  } else if (pagePath.includes('analytics.html')) {
    await initAnalytics(currentUser);
  }
});

// Helper: Calculate department statistics (reused from teacher context but for HOD scope)
async function calculateHodStats(dept) {
  const [allStudents, leaves, attendance, complaints] = await Promise.all([
    HostelDB.getStudents(),
    HostelDB.getLeaves(),
    HostelDB.getAttendanceRecords(),
    HostelDB.getComplaints()
  ]);

  const students = allStudents.filter(s => s.dept === dept);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance[todayStr] || {};

  let activeLeave = 0;
  let illegalAbsence = 0;
  let presentCount = 0;
  let hostelResidents = students.filter(s => s.room).length;

  students.forEach(s => {
    const onLeave = leaves.some(l => 
      l.studentReg === s.regNo && 
      l.status === 'Approved' && 
      new Date(todayStr) >= new Date(l.fromDate) && 
      new Date(todayStr) <= new Date(l.toDate)
    );

    if (onLeave) {
      activeLeave++;
    } else {
      if (todayAttendance[s.regNo] === 'absent') {
        illegalAbsence++;
      } else if (todayAttendance[s.regNo] === 'present') {
        presentCount++;
      }
    }
  });

  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 100;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;

  return {
    total: students.length,
    hostel: hostelResidents,
    leave: activeLeave,
    illegal: illegalAbsence,
    attendanceRate: attendanceRate,
    pendingComplaints: pendingCount
  };
}

// 1. HOD Dashboard
async function initDashboard(hod) {
  // Set placeholders
  const statsIds = [
    'stats-dept-students', 
    'stats-hostel-students', 
    'stats-leave-students', 
    'stats-illegal-leave',
    'stats-attendance-rate',
    'stats-pending-complaints'
  ];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  const tbody = document.getElementById('hod-recent-students');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading department roster...</td></tr>';
  }

  try {
    const stats = await calculateHodStats(hod.dept);

    // Set counters
    document.getElementById('stats-dept-students').textContent = stats.total;
    document.getElementById('stats-hostel-students').textContent = stats.hostel;
    document.getElementById('stats-leave-students').textContent = stats.leave;
    document.getElementById('stats-illegal-leave').textContent = stats.illegal;
    
    const attRateEl = document.getElementById('stats-attendance-rate');
    if (attRateEl) attRateEl.textContent = `${stats.attendanceRate}%`;
    
    const pendComplaintsEl = document.getElementById('stats-pending-complaints');
    if (pendComplaintsEl) pendComplaintsEl.textContent = stats.pendingComplaints;

    // Update labels to include department
    const cards = document.querySelectorAll('.stat-card');
    if (cards.length >= 6) {
      cards[0].querySelector('.stat-label').textContent = `Total ${hod.dept} Students`;
      cards[1].querySelector('.stat-label').textContent = `${hod.dept} Hostel Residents`;
      cards[2].querySelector('.stat-label').textContent = `${hod.dept} Active Leaves`;
      cards[3].querySelector('.stat-label').textContent = `${hod.dept} Illegal Absence`;
      cards[4].querySelector('.stat-label').textContent = `${hod.dept} Attendance Rate`;
      cards[5].querySelector('.stat-label').textContent = `${hod.dept} Pending Complaints`;
    }

    // Hydrate quick review student table
    if (tbody) {
      const [allStudents, leaves, attendance] = await Promise.all([
        HostelDB.getStudents(),
        HostelDB.getLeaves(),
        HostelDB.getAttendanceRecords()
      ]);

      const students = allStudents.filter(s => s.dept === hod.dept).slice(0, 5);
      const todayStr = new Date().toISOString().split('T')[0];

      if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No students have been added yet.</td></tr>';
        return;
      }

      const todayAttendance = attendance[todayStr] || {};

      tbody.innerHTML = students.map(s => {
        const onLeave = leaves.some(l => 
          l.studentReg === s.regNo && 
          l.status === 'Approved' && 
          new Date(todayStr) >= new Date(l.fromDate) && 
          new Date(todayStr) <= new Date(l.toDate)
        );
        
        let statusText = 'In Hostel';
        let statusClass = 'present';
        
        if (onLeave) {
          statusText = 'On Approved Leave';
          statusClass = 'warning';
        } else if (todayAttendance[s.regNo] === 'absent') {
          statusText = 'Illegal Absence';
          statusClass = 'rejected';
        }

        return `
          <tr>
            <td><strong>${s.regNo}</strong></td>
            <td>${s.name}</td>
            <td>${s.room || 'Not Allocated'}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Failed to load HOD dashboard stats:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load department student data.</td></tr>';
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

// 2. Department Students Full List
async function initDeptStudents(hod) {
  const tbody = document.getElementById('hod-dept-tbody');
  const searchInput = document.getElementById('dept-students-search');
  const statusSelect = document.getElementById('filter-dept-status');
  const prevBtn = document.getElementById('btn-prev-page-dept');
  const nextBtn = document.getElementById('btn-next-page-dept');
  const infoSpan = document.getElementById('pagination-info-dept');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading students list...</td></tr>';
  }

  let students = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'name';
  let currentSortOrder = 'asc';

  try {
    const [allStudents, leaves, attendance] = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getLeaves(),
      HostelDB.getAttendanceRecords()
    ]);

    const deptStudents = allStudents.filter(s => s.dept === hod.dept);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance[todayStr] || {};

    // Map status today for filtering/rendering
    students = deptStudents.map(s => {
      const onLeave = leaves.some(l => 
        l.studentReg === s.regNo && 
        l.status === 'Approved' && 
        new Date(todayStr) >= new Date(l.fromDate) && 
        new Date(todayStr) <= new Date(l.toDate)
      );
      
      let statusText = 'In Hostel';
      let statusClass = 'approved';
      
      if (onLeave) {
        statusText = 'On Approved Leave';
        statusClass = 'warning';
      } else if (todayAttendance[s.regNo] === 'absent') {
        statusText = 'Illegal Absence';
        statusClass = 'rejected';
      }

      return {
        ...s,
        statusText,
        statusClass
      };
    });

    function renderLedger() {
      if (!tbody) return;

      // Filter
      let filtered = students.filter(s => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(query) || 
                              s.regNo.toLowerCase().includes(query) || 
                              (s.room || '').toLowerCase().includes(query);

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || s.statusText === statusVal;

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
          infoSpan.textContent = 'Showing 0 to 0 of 0 students';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} students`;
        }
      }

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (students.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No students have been added yet.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No department student records found matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(s => `
        <tr>
          <td><strong>${s.regNo}</strong></td>
          <td>${s.name}</td>
          <td>${s.room || 'Unallocated'}</td>
          <td><span class="badge badge-${s.statusClass}">${s.statusText}</span></td>
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
    const sortReg = document.getElementById('sort-dept-reg');
    const sortName = document.getElementById('sort-dept-name');
    if (sortReg) {
      sortReg.addEventListener('click', () => {
        toggleSort('regNo');
        renderLedger();
      });
    }
    if (sortName) {
      sortName.addEventListener('click', () => {
        toggleSort('name');
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
    console.error('Failed to load department student records:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load department students list.</td></tr>';
    }
  }
}

// 3. Leave Reports Journal
async function initLeaveReports(hod) {
  const tbody = document.getElementById('hod-leaves-tbody');
  const searchInput = document.getElementById('dept-leaves-search');
  const statusSelect = document.getElementById('filter-dept-leaves-status');
  const prevBtn = document.getElementById('btn-prev-page-dept-leaves');
  const nextBtn = document.getElementById('btn-next-page-dept-leaves');
  const infoSpan = document.getElementById('pagination-info-dept-leaves');

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
    leaves = allLeaves.filter(l => l.dept === hod.dept);

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
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No department outstation leaves found matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(l => `
        <tr>
          <td><strong>${l.id}</strong></td>
          <td>${l.studentName} (${l.room || 'Unallocated'})</td>
          <td>${formatDateString(l.fromDate)} to ${formatDateString(l.toDate)}</td>
          <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.reason}</td>
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
    const sortId = document.getElementById('sort-dept-lv-id');
    const sortDate = document.getElementById('sort-dept-lv-date');
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
    console.error('Failed to load leave journal:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load leave reports.</td></tr>';
    }
  }
}

// 4. Analytics and Charts Rendering (using HMSCharts wrapper)
async function initAnalytics(hod) {
  try {
    // Show temporary spinner placeholder inside charts elements parent
    const chartsContainers = ['hod-wing-chart', 'hod-attendance-chart'];
    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const p = canvas.parentNode;
        const spinner = document.createElement('div');
        spinner.className = 'chart-spinner text-center';
        spinner.style.padding = '3rem 0';
        spinner.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color"></i><p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">Synthesizing charts data...</p>';
        p.insertBefore(spinner, canvas);
        canvas.style.display = 'none';
      }
    });

    const [allStudents, rooms, attendance] = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getRooms(),
      HostelDB.getAttendanceRecords()
    ]);

    const students = allStudents.filter(s => s.dept === hod.dept);

    // Remove spinners
    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const p = canvas.parentNode;
        const spinner = p.querySelector('.chart-spinner');
        if (spinner) spinner.remove();
      }
    });

    if (students.length === 0 || Object.keys(attendance).length === 0) {
      chartsContainers.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
          const p = canvas.parentNode;
          const errDiv = document.createElement('div');
          errDiv.className = 'text-center text-muted';
          errDiv.style.padding = '3rem 0';
          errDiv.innerHTML = '<i class="fa-solid fa-chart-line fa-2x" style="margin-bottom: 0.5rem;"></i><p>Not enough data to generate analytics.</p>';
          p.insertBefore(errDiv, canvas);
          canvas.style.display = 'none';
        }
      });
      return;
    }

    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) canvas.style.display = 'block';
    });

    // --- Wing Wise Resident Distribution Pie Chart ---
    const wingCount = { 'A-Block': 0, 'B-Block': 0, 'C-Block': 0 };
    
    students.forEach(s => {
      if (s.room) {
        const roomObj = rooms.find(r => r.roomNo === s.room);
        if (roomObj && wingCount[roomObj.wing] !== undefined) {
          wingCount[roomObj.wing]++;
        }
      }
    });

    HMSCharts.renderPie(
      'hod-wing-chart',
      ['A-Block Residents', 'B-Block Residents', 'C-Block Residents'],
      [wingCount['A-Block'], wingCount['B-Block'], wingCount['C-Block']],
      ['#4f46e5', '#0ea5e9', '#d946ef']
    );

    // --- Department Attendance Trend Bar Chart (Last 5 Days) ---
    const dates = [];
    const presentCounts = [];
    const absentCounts = [];

    // Get last 5 dates sorted chronologically
    const sortedDates = Object.keys(attendance).sort().slice(-5);

    sortedDates.forEach(date => {
      dates.push(formatDateString(date));
      let present = 0;
      let absent = 0;
      
      students.forEach(s => {
        const status = attendance[date][s.regNo];
        if (status === 'present') present++;
        if (status === 'absent') absent++;
      });
      
      presentCounts.push(present);
      absentCounts.push(absent);
    });

    const barDatasets = [
      { label: 'Present Students', data: presentCounts, backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Absent Students', data: absentCounts, backgroundColor: '#ef4444', borderRadius: 4 }
    ];

    HMSCharts.renderBar('hod-attendance-chart', dates, barDatasets, 'Branch Attendance');
  } catch (error) {
    console.error('Failed to load department analytics charts:', error);
    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const p = canvas.parentNode;
        const spinner = p.querySelector('.chart-spinner');
        if (spinner) spinner.innerHTML = '<p class="text-danger">Failed to render chart.</p>';
      }
    });
  }
}
