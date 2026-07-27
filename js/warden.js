/* --- Warden Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'warden') return;

  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    await initDashboard();
  } else if (pagePath.includes('attendance.html')) {
    await initAttendance();
  } else if (pagePath.includes('room-allocation.html')) {
    await initRoomAllocation();
  } else if (pagePath.includes('rooms.html')) {
    await initRoomManagement();
  } else if (pagePath.includes('students.html')) {
    await initStudentManagement();
  } else if (pagePath.includes('complaints.html')) {
    await initComplaints();
  } else if (pagePath.includes('leave-requests.html')) {
    await initLeaveRequests();
  } else if (pagePath.includes('outing-requests.html')) {
    await initWardenOutingRequests();
  } else if (pagePath.includes('gate-control.html')) {
    await initWardenGateControl();
  } else if (pagePath.includes('staff.html')) {
    await initStaffManagement();
  }
});

// 1. Warden Dashboard
async function initDashboard() {
  // Set loading placeholders
  const statsIds = ['stats-total-students', 'stats-occupied-rooms', 'stats-available-rooms', 'stats-pending-complaints'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  const tbody = document.getElementById('recent-complaints-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading recent complaints...</td></tr>';
  }

  try {
    const [students, rooms, complaints] = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getRooms(),
      HostelDB.getComplaints()
    ]);

    // Metrics
    const totalStudents = students.length;
    const occupiedRooms = rooms.filter(r => r.occupied.length > 0).length;
    const availableRooms = rooms.filter(r => r.occupied.length < r.capacity).length;
    const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;

    document.getElementById('stats-total-students').textContent = totalStudents;
    document.getElementById('stats-occupied-rooms').textContent = occupiedRooms;
    document.getElementById('stats-available-rooms').textContent = availableRooms;
    document.getElementById('stats-pending-complaints').textContent = pendingComplaints;

    // Hydrate Recent Activity
    if (tbody) {
      const recent = complaints.slice(0, 5);
      if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No complaints available.</td></tr>';
        return;
      }
      tbody.innerHTML = recent.map(c => `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.studentName} (${c.room})</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
          <td>${formatDateString(c.date)}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load Warden dashboard:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load complaints.</td></tr>';
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

// 2. Attendance Management
async function initAttendance() {
  const tbody = document.getElementById('attendance-tbody');
  const searchInput = document.getElementById('attendance-search');
  const wingSelect = document.getElementById('filter-wing');
  const prevBtn = document.getElementById('btn-prev-page-att');
  const nextBtn = document.getElementById('btn-next-page-att');
  const infoSpan = document.getElementById('pagination-info-att');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading students roster...</p></td></tr>';
  }

  try {
    const [students, attendanceRecords, leaves, rooms] = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getAttendanceRecords(),
      HostelDB.getLeaves(),
      HostelDB.getRooms()
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Set date field
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
      dateInput.value = todayStr;
      dateInput.max = todayStr;
    }

    // Keep unsaved inputs in a temporary cache object
    let tempRecords = {};
    let activeDate = todayStr;

    function initTempRecords(date) {
      activeDate = date;
      const savedRecords = attendanceRecords[date] || {};
      tempRecords = {};
      students.forEach(s => {
        tempRecords[s.regNo] = savedRecords[s.regNo] || 'present';
      });
    }

    // Initialize cache
    initTempRecords(todayStr);

    // Track radio changes using event delegation
    if (tbody) {
      tbody.addEventListener('change', (e) => {
        if (e.target.name && e.target.name.startsWith('att-')) {
          const regNo = e.target.name.substring(4);
          tempRecords[regNo] = e.target.value;
        }
      });
    }

    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortCol = 'regNo';
    let currentSortOrder = 'asc';

    function renderAttendanceTable() {
      if (!tbody) return;

      // Filter students by Search and Wing
      let filtered = students.filter(s => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(query) || s.regNo.toLowerCase().includes(query);

        const wingVal = wingSelect ? wingSelect.value : '';
        let matchesWing = true;
        if (wingVal) {
          const roomObj = rooms.find(r => r.roomNo === s.room);
          matchesWing = roomObj && roomObj.wing === wingVal;
        }

        return matchesSearch && matchesWing;
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

      // Render Pagination Info
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
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students have been added yet.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students registered in hostel or matching filter.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(s => {
        const status = tempRecords[s.regNo] || 'present';
        return `
          <tr>
            <td><strong>${s.regNo}</strong></td>
            <td>${s.name}</td>
            <td>${s.room || 'Not Allocated'}</td>
            <td>
              <label class="form-checkbox" style="margin:0;">
                <input type="radio" name="att-${s.regNo}" value="present" ${status === 'present' ? 'checked' : ''}>
                <span>Present</span>
              </label>
            </td>
            <td>
              <label class="form-checkbox" style="margin:0;">
                <input type="radio" name="att-${s.regNo}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                <span class="text-danger">Absent</span>
              </label>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Initial render
    renderAttendanceTable();

    // Event Bindings
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderAttendanceTable(); });
    if (wingSelect) wingSelect.addEventListener('change', () => { currentPage = 1; renderAttendanceTable(); });
    
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderAttendanceTable(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderAttendanceTable(); });

    // Sort Click Handlers
    const sortReg = document.getElementById('sort-att-reg');
    const sortName = document.getElementById('sort-att-name');
    if (sortReg) {
      sortReg.addEventListener('click', () => {
        toggleSort('regNo');
        renderAttendanceTable();
      });
    }
    if (sortName) {
      sortName.addEventListener('click', () => {
        toggleSort('name');
        renderAttendanceTable();
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

    // Re-render when date changes
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        initTempRecords(e.target.value);
        currentPage = 1;
        renderAttendanceTable();
      });
    }

    // Save Attendance Form
    const form = document.getElementById('attendance-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activeDateVal = dateInput ? dateInput.value : todayStr;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Saving Roll Call...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>`;

        try {
          // Track illegal absences to trigger system alerts asynchronously
          const warningPromises = [];

          students.forEach(s => {
            const status = tempRecords[s.regNo] || 'present';

            // Check for illegal leave: absent and does not have approved leave request covering activeDate
            if (status === 'absent') {
              const hasApprovedLeave = leaves.some(l => 
                l.studentReg === s.regNo && 
                l.status === 'Approved' && 
                new Date(activeDateVal) >= new Date(l.fromDate) && 
                new Date(activeDateVal) <= new Date(l.toDate)
              );

              if (!hasApprovedLeave) {
                console.log(`Alert: Student ${s.name} is absent without approved leave!`);
                // Queue system warning notification to teachers, HODs, and AO
                warningPromises.push(
                  addSystemNotification('Illegal Leave Warning', `${s.name} (${s.room}) marked Absent without approved gatepass.`)
                );
              }
            }
          });

          // Save via database
          await HostelDB.saveAttendance(activeDateVal, tempRecords);
          
          if (warningPromises.length > 0) {
            await Promise.all(warningPromises);
          }

          // Update local copy of records
          attendanceRecords[activeDateVal] = { ...tempRecords };

          showToast(`Attendance records saved for ${formatDateString(activeDateVal)}!`, 'success');
        } catch (err) {
          console.error('Failed to save attendance:', err);
          showToast('Failed to save attendance records. Please try again.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize attendance portal:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load attendance roster.</td></tr>';
    }
  }
}

// 3. Room Allocation management
async function initRoomAllocation() {
  const roomGrid = document.getElementById('room-grid-cards');
  if (roomGrid) {
    roomGrid.innerHTML = `
      <div class="glass-card text-center" style="grid-column: 1 / -1; padding: 3rem;">
        <i class="fa-solid fa-circle-notch fa-spin fa-3x text-primary-color" style="margin-bottom: 1rem;"></i>
        <h3>Loading Room Deck...</h3>
      </div>
    `;
  }

  try {
    const [students, rooms] = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getRooms()
    ]);

    // Populate Select list dropdowns
    const addStudentSelect = document.getElementById('alloc-student-reg');
    const addRoomSelect = document.getElementById('alloc-room-no');

    if (addStudentSelect) {
      addStudentSelect.innerHTML = '<option value="" disabled selected>Choose student...</option>' + 
        students.map(s => `<option value="${s.regNo}">${s.name} (${s.regNo}) - Room: ${s.room || 'None'}</option>`).join('');
    }

    if (addRoomSelect) {
      addRoomSelect.innerHTML = '<option value="" disabled selected>Choose room...</option>' + 
        rooms.map(r => `<option value="${r.roomNo}">${r.roomNo} (${r.wing}) - Cap: ${r.capacity}</option>`).join('');
    }

    function renderRoomCards() {
      if (!roomGrid) return;
      
      roomGrid.innerHTML = rooms.map(r => {
        const occupiedPercent = Math.min(100, Math.round((r.occupied.length / r.capacity) * 100));
        const occupiedNames = r.occupied.map(reg => {
          const student = students.find(s => s.regNo === reg);
          return student ? student.name : reg;
        }).join(', ');

        return `
          <div class="glass-card room-card">
            <div class="room-card-header">
              <span class="room-number"><i class="fa-solid fa-door-open" style="margin-right: 0.5rem; color: var(--primary);"></i>${r.roomNo}</span>
              <span class="badge ${r.occupied.length >= r.capacity ? 'badge-absent' : 'badge-present'}">
                ${r.occupied.length >= r.capacity ? 'Full' : 'Available'}
              </span>
            </div>

            <div class="room-progress-bar">
              <div class="room-progress-fill" style="width: ${occupiedPercent}%"></div>
            </div>

            <div class="room-details-grid">
              <div class="room-detail-item">
                <span class="room-detail-label">Wing</span>
                <span class="room-detail-value">${r.wing}</span>
              </div>
              <div class="room-detail-item">
                <span class="room-detail-label">Capacity</span>
                <span class="room-detail-value">${r.occupied.length} / ${r.capacity}</span>
              </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-secondary); border-top: 1px solid var(--border-color); padding-top: 0.5rem; white-space: normal;">
              <strong>Occupants:</strong> ${occupiedNames || 'None'}
            </div>
            
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="deallocateRoomPrompt('${r.roomNo}')" style="flex-grow:1; font-size: 0.7rem; padding: 0.25rem 0.5rem;">Deallocate All</button>
            </div>
          </div>
        `;
      }).join('');
    }

    renderRoomCards();

    // Allocation Submission Form
    const allocForm = document.getElementById('room-allocation-form');
    if (allocForm) {
      allocForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const regNo = addStudentSelect.value;
        const roomNo = addRoomSelect.value;
        const submitBtn = allocForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;

        if (!regNo || !roomNo) {
          showToast('Please select both Student and Room.', 'warning');
          return;
        }

        // Check if room is full
        const targetRoom = rooms.find(r => r.roomNo === roomNo);
        if (targetRoom.occupied.length >= targetRoom.capacity) {
          showToast(`Room ${roomNo} is already at full capacity.`, 'danger');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Allocating...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>`;

        try {
          // Remove student from any existing room occupied array in DB
          const removalPromises = [];
          rooms.forEach(r => {
            if (r.occupied.includes(regNo) && r.roomNo !== roomNo) {
              const updatedOccupied = r.occupied.filter(id => id !== regNo);
              removalPromises.push(HostelDB.updateRoomAllocation(r.roomNo, updatedOccupied));
            }
          });

          if (removalPromises.length > 0) {
            await Promise.all(removalPromises);
          }

          // Add student to new room occupied array in DB
          const newOccupied = [...targetRoom.occupied.filter(id => id !== regNo), regNo];
          await HostelDB.updateRoomAllocation(roomNo, newOccupied);

          // Update student user record
          await HostelDB.updateStudentRoom(regNo, roomNo);

          showToast(`Student allocated to room ${roomNo} successfully!`, 'success');
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (err) {
          console.error('Failed to allocate room:', err);
          showToast('Allocation failed. Please check connection.', 'danger');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }

    // Deallocate Helper
    window.deallocateRoomPrompt = async function(roomNo) {
      if (!confirm(`Are you sure you want to deallocate all students from Room ${roomNo}?`)) return;

      const target = rooms.find(r => r.roomNo === roomNo);
      const occupants = target.occupied;

      try {
        showToast('Processing deallocation...', 'info');

        // Clear occupants list
        await HostelDB.updateRoomAllocation(roomNo, []);
        
        // Clear student room fields in DB
        const userPromises = occupants.map(regNo => HostelDB.updateStudentRoom(regNo, ''));
        await Promise.all(userPromises);

        showToast(`Room ${roomNo} cleared.`, 'info');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err) {
        console.error('Failed to deallocate room:', err);
        showToast('Deallocation failed. Please try again.', 'danger');
      }
    };

  } catch (error) {
    console.error('Failed to load room allocation board:', error);
    if (roomGrid) {
      roomGrid.innerHTML = `
        <div class="glass-card text-center text-danger" style="grid-column: 1 / -1; padding: 3rem;">
          Failed to load room data.
        </div>
      `;
    }
  }
}

// 4. Complaints Management Page
async function initComplaints() {
  const tbody = document.getElementById('warden-complaints-tbody');
  const searchInput = document.getElementById('complaints-search');
  const statusSelect = document.getElementById('filter-status');
  const categorySelect = document.getElementById('filter-category');
  const prevBtn = document.getElementById('btn-prev-page-cmp');
  const nextBtn = document.getElementById('btn-next-page-cmp');
  const infoSpan = document.getElementById('pagination-info-cmp');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading complaints...</p></td></tr>';
  }

  let complaints = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'id';
  let currentSortOrder = 'desc';

  try {
    complaints = await HostelDB.getComplaints();

    function renderComplaints() {
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

        if (c.category === 'Warden Complaint') return false;

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

      // Info text
      if (infoSpan) {
        if (totalItems === 0) {
          infoSpan.textContent = 'Showing 0 to 0 of 0 complaints';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} complaints`;
        }
      }

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (complaints.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No complaints available.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No complaints filed matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(c => `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.studentName} (${c.room})</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
          <td>${formatDateString(c.date)}</td>
          <td>
            <div class="action-buttons-group" style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              ${c.status === 'Pending' ? `
                <button class="btn btn-primary btn-sm btn-action" onclick="processComplaint('${c.id}')">Process</button>
              ` : ''}
              ${c.status === 'In Progress' ? `
                <button class="btn btn-success btn-sm btn-action" onclick="resolveComplaint('${c.id}')">Resolve</button>
                <button class="btn btn-danger btn-sm btn-action" onclick="escalateComplaint('${c.id}')">Escalate</button>
              ` : ''}
              ${c.status === 'Resolved' || c.status === 'Escalated' ? `
                <span class="text-muted" style="font-size: 0.8rem;">Archive</span>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderComplaints();

    // Event listeners
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderComplaints(); });
    if (categorySelect) categorySelect.addEventListener('change', () => { currentPage = 1; renderComplaints(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderComplaints(); });

    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderComplaints(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderComplaints(); });

    // Sorting event listeners
    const sortCmpId = document.getElementById('sort-cmp-id');
    const sortCmpDate = document.getElementById('sort-cmp-date');
    const sortCmpStatus = document.getElementById('sort-cmp-status');

    if (sortCmpId) sortCmpId.addEventListener('click', () => { toggleSort('id'); renderComplaints(); });
    if (sortCmpDate) sortCmpDate.addEventListener('click', () => { toggleSort('date'); renderComplaints(); });
    if (sortCmpStatus) sortCmpStatus.addEventListener('click', () => { toggleSort('status'); renderComplaints(); });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    const setActionsLoading = (id, loadingText) => {
      let row = document.body;
      const cells = tbody.querySelectorAll('tr td strong');
      for (const cell of cells) {
        if (cell.textContent.trim() === id) {
          row = cell.closest('tr');
          break;
        }
      }
      const buttons = row.querySelectorAll('.btn-action');
      buttons.forEach(btn => {
        btn.disabled = true;
      });
      showToast(loadingText, 'info');
    };

    // Action Triggers
    window.processComplaint = async function(id) {
      setActionsLoading(id, `Processing complaint ${id}...`);
      const target = complaints.find(c => c.id === id);
      
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const updates = {
        status: 'In Progress',
        timeline: [...target.timeline, { status: 'In Progress', desc: 'Maintenance order issued by Warden', date: `${today} ${nowTime}` }]
      };

      try {
        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Complaint Updated', `Complaint ${id} is now In Progress.`);
        showToast(`Complaint ${id} set to In Progress.`, 'info');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to process complaint:', err);
        showToast('Operation failed. Check connection.', 'danger');
      }
    };

    window.resolveComplaint = async function(id) {
      setActionsLoading(id, `Resolving complaint ${id}...`);
      const target = complaints.find(c => c.id === id);
      
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const updates = {
        status: 'Resolved',
        timeline: [...target.timeline, { status: 'Resolved', desc: 'Warden verified resolution with student', date: `${today} ${nowTime}` }]
      };

      try {
        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Complaint Resolved', `Complaint ${id} has been marked Resolved.`);
        showToast(`Complaint ${id} marked Resolved.`, 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to resolve complaint:', err);
        showToast('Operation failed. Check connection.', 'danger');
      }
    };

    window.escalateComplaint = async function(id) {
      setActionsLoading(id, `Escalating complaint ${id}...`);
      const target = complaints.find(c => c.id === id);
      
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const updates = {
        status: 'Escalated',
        timeline: [...target.timeline, { status: 'Escalated', desc: 'Escalated to Administrative Officer (AO)', date: `${today} ${nowTime}` }]
      };

      try {
        await HostelDB.updateComplaint(id, updates);
        await addSystemNotification('Case Escalated', `Warden escalated complaint ${id} to AO.`);
        showToast(`Complaint ${id} escalated to AO.`, 'danger');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to escalate complaint:', err);
        showToast('Operation failed. Check connection.', 'danger');
      }
    };

  } catch (error) {
    console.error('Failed to load Warden complaints:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load complaints ledger.</td></tr>';
    }
  }
}

// 5. Leave Request Processing
async function initLeaveRequests() {
  const tbody = document.getElementById('warden-leaves-tbody');
  const searchInput = document.getElementById('leaves-search');
  const deptSelect = document.getElementById('filter-leave-dept');
  const statusSelect = document.getElementById('filter-leave-status');
  const prevBtn = document.getElementById('btn-prev-page-lv');
  const nextBtn = document.getElementById('btn-next-page-lv');
  const infoSpan = document.getElementById('pagination-info-lv');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading leave requests...</p></td></tr>';
  }

  let leaves = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'id';
  let currentSortOrder = 'desc';

  try {
    leaves = await HostelDB.getLeaves();

    function renderLeaves() {
      if (!tbody) return;

      // Filter
      let filtered = leaves.filter(l => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = l.id.toLowerCase().includes(query) || 
                              l.studentName.toLowerCase().includes(query) || 
                              (l.room || '').toLowerCase().includes(query) ||
                              l.reason.toLowerCase().includes(query);

        const deptVal = deptSelect ? deptSelect.value : '';
        const matchesDept = !deptVal || l.dept === deptVal;

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || l.status === statusVal;

        return matchesSearch && matchesDept && matchesStatus;
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

      if (paginated.length === 0) {
        if (leaves.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No leave requests found.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No outstation leave requests found matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(l => `
        <tr>
          <td><strong>${l.id}</strong></td>
          <td>${l.studentName} (${l.room || 'Unallocated'})</td>
          <td>${l.dept}</td>
          <td>${formatDateString(l.fromDate)} to ${formatDateString(l.toDate)}</td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.reason}</td>
          <td><span class="badge badge-${l.status.toLowerCase()}">${l.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              ${l.status === 'Pending' ? `
                <button class="btn btn-success btn-sm btn-action" onclick="processLeave('${l.id}', 'Approved')">Approve</button>
                <button class="btn btn-danger btn-sm btn-action" onclick="processLeave('${l.id}', 'Rejected')">Reject</button>
              ` : `<span class="text-muted" style="font-size:0.8rem;">Processed</span>`}
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderLeaves();

    // Event listeners
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLeaves(); });
    if (deptSelect) deptSelect.addEventListener('change', () => { currentPage = 1; renderLeaves(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderLeaves(); });

    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderLeaves(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLeaves(); });

    // Sorting event listeners
    const sortLvId = document.getElementById('sort-lv-id');
    const sortLvDate = document.getElementById('sort-lv-date');

    if (sortLvId) sortLvId.addEventListener('click', () => { toggleSort('id'); renderLeaves(); });
    if (sortLvDate) sortLvDate.addEventListener('click', () => { toggleSort('fromDate'); renderLeaves(); });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    window.processLeave = async function(id, action) {
      let row = document.body;
      const cells = tbody.querySelectorAll('tr td strong');
      for (const cell of cells) {
        if (cell.textContent.trim() === id) {
          row = cell.closest('tr');
          break;
        }
      }
      const buttons = row.querySelectorAll('.btn-action');
      buttons.forEach(btn => btn.disabled = true);

      showToast(`Processing request ${id}...`, 'info');

      try {
        await HostelDB.updateLeave(id, { status: action, approvedBy: 'Warden' });
        
        const targetLeave = leaves.find(l => l.id === id);
        await addSystemNotification('Leave Status Alert', `${targetLeave.studentName}'s outstation leave request ${id} was ${action}.`);
        
        showToast(`Leave request ${id} has been ${action}.`, action === 'Approved' ? 'success' : 'danger');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        console.error('Failed to process leave request:', err);
        showToast('Operation failed. Check connection.', 'danger');
        buttons.forEach(btn => btn.disabled = false);
      }
    };

  } catch (error) {
    console.error('Failed to load leave requests:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load leave applications.</td></tr>';
    }
  }
}

// 6. Student Management Panel
async function initStudentManagement() {
  const tbody = document.getElementById('student-ledger-tbody');
  const searchInput = document.getElementById('student-search');
  const deptSelect = document.getElementById('filter-dept');
  const statusSelect = document.getElementById('filter-status');
  const addBtn = document.getElementById('btn-add-student-modal');
  const modal = document.getElementById('student-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  const form = document.getElementById('student-profile-form');
  const roomSelect = document.getElementById('student-room');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading student profiles...</p></td></tr>';
  }

  let students = [];
  let rooms = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'name';
  let currentSortOrder = 'asc';

  try {
    // 1. Fetch Students and Rooms
    const data = await Promise.all([
      HostelDB.getStudents(),
      HostelDB.getRooms()
    ]);
    students = data[0];
    rooms = data[1];

    // 2. Populate Room Select Dropdown in Modal
    if (roomSelect) {
      roomSelect.innerHTML = '<option value="">Unallocated</option>' + 
        rooms.map(r => {
          const occupiedCount = r.occupied.length;
          return `<option value="${r.roomNo}">${r.roomNo} (${r.wing}) - Occupied: ${occupiedCount}/${r.capacity}</option>`;
        }).join('');
    }

    // 3. Render Table
    function renderLedger() {
      if (!tbody) return;

      // Filter
      let filtered = students.filter(s => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(query) || 
                              s.regNo.toLowerCase().includes(query) || 
                              (s.room || '').toLowerCase().includes(query);
        
        const deptVal = deptSelect ? deptSelect.value : '';
        const matchesDept = !deptVal || s.dept === deptVal;

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || s.hostelStatus === statusVal;

        return matchesSearch && matchesDept && matchesStatus;
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

      // Hydrate Table Info
      const infoSpan = document.getElementById('pagination-info');
      if (infoSpan) {
        if (totalItems === 0) {
          infoSpan.textContent = 'Showing 0 to 0 of 0 students';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} students`;
        }
      }

      // Toggle Pagination Buttons
      const prevBtn = document.getElementById('btn-prev-page');
      const nextBtn = document.getElementById('btn-next-page');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (students.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No students have been added yet.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No student profiles match the filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(s => `
        <tr>
          <td><strong>${s.regNo}</strong></td>
          <td>${s.name}</td>
          <td>${s.dept}</td>
          <td>${s.year || 'N/A'}</td>
          <td>${s.gender || 'N/A'}</td>
          <td><span class="badge ${s.room ? 'badge-present' : 'badge-absent'}">${s.room || 'Not Allocated'}</span></td>
          <td>${s.contact}</td>
          <td><span class="badge badge-${s.hostelStatus === 'Active' ? 'present' : 'absent'}">${s.hostelStatus}</span></td>
          <td>
            <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="editStudentPrompt('${s.regNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteStudentPrompt('${s.regNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-trash-can"></i> Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderLedger();

    // Event Bindings
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLedger(); });
    if (deptSelect) deptSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });

    // Pagination Listeners
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderLedger(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLedger(); });

    // Sort Listeners
    const sortReg = document.getElementById('sort-reg');
    const sortName = document.getElementById('sort-name');
    if (sortReg) sortReg.addEventListener('click', () => {
      toggleSort('regNo');
      renderLedger();
    });
    if (sortName) sortName.addEventListener('click', () => {
      toggleSort('name');
      renderLedger();
    });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    // Modal Control
    const openModal = (title, editMode = false) => {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('edit-mode').value = editMode;
      document.getElementById('student-reg').disabled = editMode; // Cannot edit primary key
      if (modal) HMSModal.open(modal);
    };

    const closeModal = () => {
      if (modal) HMSModal.close(modal);
      if (form) form.reset();
    };

    if (addBtn) addBtn.addEventListener('click', () => openModal('Add New Student Profile', false));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    // Edit Prompt Handler
    window.editStudentPrompt = function(regNo) {
      const s = students.find(x => x.regNo === regNo);
      if (!s) return;

      document.getElementById('student-name').value = s.name;
      document.getElementById('student-reg').value = s.regNo;
      document.getElementById('student-email').value = s.email;
      document.getElementById('student-password').value = ''; // leave blank for no change
      document.getElementById('student-dept').value = s.dept;
      document.getElementById('student-year').value = s.year || '';
      document.getElementById('student-gender').value = s.gender || '';
      document.getElementById('student-phone').value = s.contact;
      document.getElementById('student-parent-phone').value = s.parentPhone || '';
      document.getElementById('student-room').value = s.room || '';
      document.getElementById('student-status').value = s.hostelStatus || 'Active';
      
      // Extra fields
      document.getElementById('student-dob').value = s.dob || '';
      document.getElementById('student-parent-name').value = s.parentName || '';
      document.getElementById('student-address').value = s.address || '';
      document.getElementById('student-bed').value = s.bedNo || '';
      
      document.getElementById('original-reg-no').value = s.regNo;

      openModal('Edit Student Profile', true);
    };

    // Delete Prompt Handler
    window.deleteStudentPrompt = async function(regNo) {
      if (!confirm(`Are you sure you want to completely delete student profile for ${regNo}?`)) return;
      showToast(`Deleting student ${regNo}...`, 'info');

      try {
        const student = students.find(s => s.regNo === regNo);
        
        // Handle room allocation rollback
        if (student && student.room) {
          const roomObj = rooms.find(r => r.roomNo === student.room);
          if (roomObj) {
            const updatedOccupied = roomObj.occupied.filter(id => id !== regNo);
            await HostelDB.updateRoomAllocation(student.room, updatedOccupied);
          }
        }

        await HostelDB.deleteStudent(regNo);
        showToast(`Student profile ${regNo} deleted successfully.`, 'success');
        
        // Reload list
        students = await HostelDB.getStudents();
        renderLedger();
      } catch (err) {
        console.error('Failed to delete student:', err);
        showToast('Failed to delete student. Check your connection.', 'danger');
      }
    };

    // Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editMode = document.getElementById('edit-mode').value === 'true';
        const originalRegNo = document.getElementById('original-reg-no').value;

        const regNo = document.getElementById('student-reg').value.trim().toUpperCase();
        const name = document.getElementById('student-name').value.trim();
        const email = document.getElementById('student-email').value.trim();
        const password = document.getElementById('student-password').value;
        const dept = document.getElementById('student-dept').value;
        const year = document.getElementById('student-year').value;
        const gender = document.getElementById('student-gender').value;
        const contact = document.getElementById('student-phone').value.trim();
        const parentPhone = document.getElementById('student-parent-phone').value.trim();
        const room = document.getElementById('student-room').value;
        const hostelStatus = document.getElementById('student-status').value;
        
        // Extra fields
        const dob = document.getElementById('student-dob').value;
        const parentName = document.getElementById('student-parent-name').value.trim();
        const address = document.getElementById('student-address').value.trim();
        const bedNo = document.getElementById('student-bed').value.trim();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving Profile...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>';

        const studentPayload = {
          regNo, name, email, password, dept, year, gender, contact, parentPhone, room, hostelStatus,
          dob, parentName, address, bedNo
        };

        // Unique Email Validation
        const emailConflict = students.some(s => s.email.toLowerCase() === email.toLowerCase() && (!editMode || s.regNo !== originalRegNo));
        if (emailConflict) {
          showToast(`Student with Email ${email} already exists!`, 'warning');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          return;
        }

        try {
          if (!editMode) {
            // Check for duplicate register number
            const exists = students.some(s => s.regNo === regNo);
            if (exists) {
              showToast(`Student with Register Number ${regNo} already exists!`, 'warning');
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              return;
            }

            // Assign room capacity check
            if (room) {
              const targetRoom = rooms.find(r => r.roomNo === room);
              if (targetRoom && targetRoom.occupied.length >= targetRoom.capacity) {
                showToast(`Room ${room} is already full. Allocate another room.`, 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
                return;
              }
              // Add student to room occupied array
              const updatedOccupied = [...targetRoom.occupied, regNo];
              await HostelDB.updateRoomAllocation(room, updatedOccupied);
            }

            await HostelDB.addStudent(studentPayload);
            showToast(`Student profile ${regNo} created successfully!`, 'success');
          } else {
            // Edit Mode Room change checks
            const originalStudent = students.find(s => s.regNo === originalRegNo);
            const oldRoom = originalStudent ? originalStudent.room : '';
            
            if (oldRoom !== room) {
              // Deallocate old room
              if (oldRoom) {
                const origRoom = rooms.find(r => r.roomNo === oldRoom);
                if (origRoom) {
                  const updatedOccupied = origRoom.occupied.filter(id => id !== originalRegNo);
                  await HostelDB.updateRoomAllocation(oldRoom, updatedOccupied);
                }
              }
              // Allocate new room
              if (room) {
                const targetRoom = rooms.find(r => r.roomNo === room);
                if (targetRoom) {
                  if (targetRoom.occupied.length >= targetRoom.capacity) {
                    showToast(`Target room ${room} is full! Room deallocated.`, 'warning');
                    studentPayload.room = ''; // reset assignment
                  } else {
                    const updatedOccupied = [...targetRoom.occupied, originalRegNo];
                    await HostelDB.updateRoomAllocation(room, updatedOccupied);
                  }
                }
              }
            }

            await HostelDB.updateStudent(originalRegNo, studentPayload);
            showToast(`Student profile ${regNo} updated successfully!`, 'success');
          }

          closeModal();
          
          // Refresh lists
          const refreshData = await Promise.all([
            HostelDB.getStudents(),
            HostelDB.getRooms()
          ]);
          students = refreshData[0];
          rooms = refreshData[1];
          renderLedger();
        } catch (err) {
          console.error('Failed to save student profile:', err);
          showToast('Failed to save student record. Check your network.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }

  } catch (error) {
    console.error('Failed to initialize student management:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load student profiles database.</td></tr>';
    }
  }
}

// 7. Room Management Panel (Warden Exclusive)
async function initRoomManagement() {
  const tbody = document.getElementById('room-ledger-tbody');
  const searchInput = document.getElementById('room-search');
  const blockSelect = document.getElementById('filter-block');
  const statusSelect = document.getElementById('filter-status');
  
  const addBtn = document.getElementById('btn-add-room-modal');
  const modal = document.getElementById('room-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  const form = document.getElementById('room-profile-form');

  const detailsModal = document.getElementById('room-details-modal');
  const closeDetailsBtn = document.getElementById('btn-close-details-modal');
  const closeDetailsFooterBtn = document.getElementById('btn-close-details-footer');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading rooms list...</p></td></tr>';
  }

  let rooms = [];
  let students = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'roomNo';
  let currentSortOrder = 'asc';

  try {
    const refreshData = async () => {
      const data = await Promise.all([
        HostelDB.getRooms(),
        HostelDB.getStudents()
      ]);
      rooms = data[0];
      students = data[1];
    };

    await refreshData();

    function renderAnalytics() {
      const totalRooms = rooms.length;
      let totalCapacity = 0;
      let occupiedBeds = 0;
      let fullRooms = 0;
      let maintenanceRooms = 0;

      rooms.forEach(r => {
        totalCapacity += r.capacity;
        occupiedBeds += (r.occupied ? r.occupied.length : 0);
        if (r.status === 'Maintenance') maintenanceRooms++;
        if (r.occupied && r.occupied.length >= r.capacity) fullRooms++;
      });

      const availableBeds = Math.max(0, totalCapacity - occupiedBeds);

      const elTotal = document.getElementById('stats-total-rooms');
      const elCap = document.getElementById('stats-total-capacity');
      const elOcc = document.getElementById('stats-occupied-beds');
      const elAvail = document.getElementById('stats-available-beds');
      const elFull = document.getElementById('stats-full-rooms');
      const elMaint = document.getElementById('stats-maintenance-rooms');

      if (elTotal) elTotal.textContent = totalRooms;
      if (elCap) elCap.textContent = totalCapacity;
      if (elOcc) elOcc.textContent = occupiedBeds;
      if (elAvail) elAvail.textContent = availableBeds;
      if (elFull) elFull.textContent = fullRooms;
      if (elMaint) elMaint.textContent = maintenanceRooms;
    }

    function renderLedger() {
      if (!tbody) return;

      let filtered = rooms.filter(r => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = r.roomNo.toLowerCase().includes(query);

        const blockVal = blockSelect ? blockSelect.value : '';
        const matchesBlock = !blockVal || r.block === blockVal;

        const statusVal = statusSelect ? statusSelect.value : '';
        const matchesStatus = !statusVal || r.status === statusVal;

        return matchesSearch && matchesBlock && matchesStatus;
      });

      filtered.sort((a, b) => {
        let valA = a[currentSortCol] || '';
        let valB = b[currentSortCol] || '';
        
        if (currentSortCol === 'capacity') {
          return currentSortOrder === 'desc' ? valB - valA : valA - valB;
        }

        if (currentSortOrder === 'desc') {
          return valB.localeCompare(valA);
        }
        return valA.localeCompare(valB);
      });

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      currentPage = Math.max(1, Math.min(currentPage, totalPages));

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      const paginated = filtered.slice(startIndex, endIndex);

      const infoSpan = document.getElementById('pagination-info-rm');
      if (infoSpan) {
        if (totalItems === 0) {
          infoSpan.textContent = 'Showing 0 to 0 of 0 rooms';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} rooms`;
        }
      }

      const prevBtn = document.getElementById('btn-prev-page-rm');
      const nextBtn = document.getElementById('btn-next-page-rm');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (rooms.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No rooms have been created yet.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No rooms configured or matching filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(r => {
        const occCount = r.occupied ? r.occupied.length : 0;
        const availCount = Math.max(0, r.capacity - occCount);
        
        let badgeClass = 'present';
        if (r.status === 'Full') badgeClass = 'absent';
        else if (r.status === 'Maintenance') badgeClass = 'warning';
        else if (r.status === 'Closed') badgeClass = 'absent';

        return `
          <tr>
            <td><strong>${r.roomNo}</strong></td>
            <td>${r.block || 'N/A'}</td>
            <td>Floor ${r.floor || '1'}</td>
            <td>${r.roomType || 'Double'}</td>
            <td>${r.capacity}</td>
            <td><span class="badge badge-progress">${occCount} Beds</span></td>
            <td><span class="badge badge-present">${availCount} Beds</span></td>
            <td><span class="badge badge-${badgeClass}">${r.status}</span></td>
            <td>
              <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="viewRoomPrompt('${r.roomNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-eye"></i> View</button>
                <button class="btn btn-secondary btn-sm" onclick="editRoomPrompt('${r.roomNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRoomPrompt('${r.roomNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-trash-can"></i> Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderAnalytics();
    renderLedger();

    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLedger(); });
    if (blockSelect) blockSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });
    if (statusSelect) statusSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });

    const prevBtn = document.getElementById('btn-prev-page-rm');
    const nextBtn = document.getElementById('btn-next-page-rm');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderLedger(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLedger(); });

    const sortRoomNo = document.getElementById('sort-room-no');
    const sortBlock = document.getElementById('sort-block');
    if (sortRoomNo) sortRoomNo.addEventListener('click', () => { toggleSort('roomNo'); renderLedger(); });
    if (sortBlock) sortBlock.addEventListener('click', () => { toggleSort('block'); renderLedger(); });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    const openRoomModal = (title, editMode = false) => {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('edit-mode').value = editMode;
      document.getElementById('room-number').disabled = editMode;
      if (modal) HMSModal.open(modal);
    };

    const closeRoomModal = () => {
      if (modal) HMSModal.close(modal);
      if (form) form.reset();
    };

    if (addBtn) addBtn.addEventListener('click', () => openRoomModal('Create New Hostel Room', false));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeRoomModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeRoomModal);

    window.editRoomPrompt = function(roomNo) {
      const r = rooms.find(rm => rm.roomNo === roomNo);
      if (!r) return;

      document.getElementById('room-number').value = r.roomNo;
      document.getElementById('room-block').value = r.block || '';
      document.getElementById('room-floor').value = r.floor || '1';
      document.getElementById('room-type').value = r.roomType || 'Double';
      document.getElementById('room-capacity').value = r.capacity;
      document.getElementById('room-status').value = r.status || 'Available';
      document.getElementById('room-desc').value = r.description || '';

      document.getElementById('original-room-no').value = r.roomNo;

      openRoomModal('Edit Room Details', true);
    };

    window.viewRoomPrompt = function(roomNo) {
      const r = rooms.find(rm => rm.roomNo === roomNo);
      if (!r) return;

      const occCount = r.occupied ? r.occupied.length : 0;
      const occupiedPercent = Math.min(100, Math.round((occCount / r.capacity) * 100));

      document.getElementById('detail-room-no').textContent = `Room ${r.roomNo}`;
      
      const statusEl = document.getElementById('detail-room-status');
      statusEl.textContent = r.status;
      statusEl.className = 'badge';
      let badgeClass = 'present';
      if (r.status === 'Full') badgeClass = 'absent';
      else if (r.status === 'Maintenance') badgeClass = 'warning';
      else if (r.status === 'Closed') badgeClass = 'absent';
      statusEl.classList.add(`badge-${badgeClass}`);

      document.getElementById('detail-block').textContent = r.block || 'N/A';
      document.getElementById('detail-floor').textContent = `Floor ${r.floor || '1'}`;
      document.getElementById('detail-type').textContent = r.roomType || 'Double';
      document.getElementById('detail-occupancy').textContent = `${occCount} / ${r.capacity} Beds (${occupiedPercent}%)`;
      document.getElementById('detail-desc').textContent = r.description || 'No description provided.';

      const listEl = document.getElementById('detail-occupants-list');
      if (listEl) {
        const roomStudents = students.filter(s => s.room === roomNo);
        if (roomStudents.length === 0) {
          listEl.innerHTML = '<li class="text-muted" style="font-size: 0.8rem;">No active student occupants.</li>';
        } else {
          listEl.innerHTML = roomStudents.map(s => `
            <li style="font-size: 0.8rem; display: flex; justify-content: space-between; background: var(--bg-secondary); padding: 0.5rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
              <span><strong>${s.name}</strong> (${s.regNo})</span>
              <span class="text-muted">${s.dept} - Year ${s.year || 'N/A'}</span>
            </li>
          `).join('');
        }
      }

      if (detailsModal) HMSModal.open(detailsModal);
    };

    const closeDetailsModal = () => {
      if (detailsModal) HMSModal.close(detailsModal);
    };

    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeDetailsModal);
    if (closeDetailsFooterBtn) closeDetailsFooterBtn.addEventListener('click', closeDetailsModal);

    window.deleteRoomPrompt = async function(roomNo) {
      const r = rooms.find(rm => rm.roomNo === roomNo);
      if (!r) return;

      const occCount = r.occupied ? r.occupied.length : 0;
      if (occCount > 0) {
        if (!confirm(`Warning: Room ${roomNo} has ${occCount} active occupants. Deleting this room will automatically remove all students from this room in the database. Proceed?`)) {
          return;
        }
      } else {
        if (!confirm(`Are you sure you want to completely delete Room ${roomNo}?`)) return;
      }

      showToast(`Deleting room ${roomNo}...`, 'info');

      try {
        if (occCount > 0) {
          const clearPromises = r.occupied.map(regNo => HostelDB.updateStudentRoom(regNo, ''));
          await Promise.all(clearPromises);
        }

        await HostelDB.deleteRoom(roomNo);
        showToast(`Room ${roomNo} deleted successfully.`, 'success');

        await refreshData();
        renderAnalytics();
        renderLedger();
      } catch (err) {
        console.error('Failed to delete room:', err);
        showToast('Failed to delete room. Check your connection.', 'danger');
      }
    };

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editMode = document.getElementById('edit-mode').value === 'true';
        const originalRoomNo = document.getElementById('original-room-no').value;

        const roomNo = document.getElementById('room-number').value.trim().toUpperCase();
        const block = document.getElementById('room-block').value;
        const floor = document.getElementById('room-floor').value;
        const roomType = document.getElementById('room-type').value;
        const capacity = parseInt(document.getElementById('room-capacity').value);
        const status = document.getElementById('room-status').value;
        const description = document.getElementById('room-desc').value.trim();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;

        if (capacity <= 0) {
          showToast('Bed capacity must be greater than zero.', 'warning');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving Config...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>';

        const roomPayload = {
          roomNo, block, floor, roomType, capacity, status, description
        };

        try {
          if (!editMode) {
            const exists = rooms.some(rm => rm.roomNo.toLowerCase() === roomNo.toLowerCase());
            if (exists) {
              showToast(`Room Number ${roomNo} already exists!`, 'warning');
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              return;
            }

            roomPayload.occupied = [];
            await HostelDB.addRoom(roomPayload);
            showToast(`Room ${roomNo} created successfully!`, 'success');
          } else {
            const originalRoom = rooms.find(rm => rm.roomNo === originalRoomNo);
            const currentOccupants = originalRoom ? originalRoom.occupied : [];

            if (capacity < currentOccupants.length) {
              showToast(`Cannot reduce capacity below current occupants count (${currentOccupants.length}). Deallocate students first.`, 'warning');
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              return;
            }

            let updatedStatus = status;
            if (currentOccupants.length >= capacity && status === 'Available') {
              updatedStatus = 'Full';
            } else if (currentOccupants.length < capacity && status === 'Full') {
              updatedStatus = 'Available';
            }
            roomPayload.status = updatedStatus;
            roomPayload.occupied = currentOccupants;

            await HostelDB.updateRoom(originalRoomNo, roomPayload);
            showToast(`Room ${roomNo} config updated successfully!`, 'success');
          }

          closeRoomModal();
          await refreshData();
          renderAnalytics();
          renderLedger();
        } catch (err) {
          console.error('Failed to save room details:', err);
          showToast('Failed to save room details. Check connection.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }

  } catch (error) {
    console.error('Failed to initialize room management page:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load rooms database. Check connection.</td></tr>';
    }
  }
}

// 8. Staff Management Panel
async function initStaffManagement() {
  const tbody = document.getElementById('staff-ledger-tbody');
  const searchInput = document.getElementById('staff-search');
  const roleSelect = document.getElementById('filter-staff-role');
  const deptSelect = document.getElementById('filter-staff-dept');
  const addBtn = document.getElementById('btn-add-staff-modal');
  const modal = document.getElementById('staff-modal');
  const closeModalBtn = document.getElementById('btn-close-staff-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-staff-modal');
  const form = document.getElementById('staff-profile-form');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color" style="margin: 1rem 0;"></i><p>Loading staff profiles...</p></td></tr>';
  }

  let staffList = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let currentSortCol = 'name';
  let currentSortOrder = 'asc';

  try {
    staffList = await HostelDB.getStaff();

    function renderLedger() {
      if (!tbody) return;

      // Filter
      const filtered = staffList.filter(s => {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(query) || 
                              s.regNo.toLowerCase().includes(query);
        
        const roleVal = roleSelect ? roleSelect.value : '';
        const matchesRole = !roleVal || s.role === roleVal;

        const deptVal = deptSelect ? deptSelect.value : '';
        const matchesDept = !deptVal || s.dept === deptVal;

        return matchesSearch && matchesRole && matchesDept;
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

      // Hydrate Table Info
      const infoSpan = document.getElementById('staff-pagination-info');
      if (infoSpan) {
        if (totalItems === 0) {
          infoSpan.textContent = 'Showing 0 to 0 of 0 staff';
        } else {
          infoSpan.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} staff`;
        }
      }

      // Toggle Pagination Buttons
      const prevBtn = document.getElementById('btn-staff-prev-page');
      const nextBtn = document.getElementById('btn-staff-next-page');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;

      if (paginated.length === 0) {
        if (staffList.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No staff profiles created yet.</td></tr>';
        } else {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No staff profiles match the filter options.</td></tr>';
        }
        return;
      }

      tbody.innerHTML = paginated.map(s => `
        <tr>
          <td><strong>${s.regNo}</strong></td>
          <td>${s.name}</td>
          <td><span class="badge badge-${s.role === 'hod' ? 'present' : 'info'}">${s.role.toUpperCase()}</span></td>
          <td>${s.dept}</td>
          <td>${s.contact || 'N/A'}</td>
          <td>${s.email}</td>
          <td>
            <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="editStaffPrompt('${s.regNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteStaffPrompt('${s.regNo}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-trash-can"></i> Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderLedger();

    // Event Bindings
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderLedger(); });
    if (roleSelect) roleSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });
    if (deptSelect) deptSelect.addEventListener('change', () => { currentPage = 1; renderLedger(); });

    // Pagination Listeners
    const prevBtn = document.getElementById('btn-staff-prev-page');
    const nextBtn = document.getElementById('btn-staff-next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderLedger(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderLedger(); });

    // Sort Listeners
    const sortReg = document.getElementById('sort-staff-id');
    const sortName = document.getElementById('sort-staff-name');
    if (sortReg) sortReg.addEventListener('click', () => {
      toggleSort('regNo');
      renderLedger();
    });
    if (sortName) sortName.addEventListener('click', () => {
      toggleSort('name');
      renderLedger();
    });

    function toggleSort(col) {
      if (currentSortCol === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = col;
        currentSortOrder = 'asc';
      }
    }

    // Modal Control
    const openModal = (title, editMode = false) => {
      document.getElementById('staff-modal-title').textContent = title;
      document.getElementById('staff-edit-mode').value = editMode;
      document.getElementById('staff-reg').disabled = editMode; // Cannot edit Employee ID
      if (modal) HMSModal.open(modal);
    };

    const closeModal = () => {
      if (modal) HMSModal.close(modal);
      if (form) form.reset();
    };

    if (addBtn) addBtn.addEventListener('click', () => openModal('Add New Staff Profile', false));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    // Edit Prompt Handler
    window.editStaffPrompt = function(regNo) {
      const s = staffList.find(x => x.regNo === regNo);
      if (!s) return;

      document.getElementById('staff-role').value = s.role;
      document.getElementById('staff-name').value = s.name;
      document.getElementById('staff-reg').value = s.regNo;
      document.getElementById('staff-email').value = s.email;
      document.getElementById('staff-password').value = ''; // blank = keep original
      document.getElementById('staff-dept').value = s.dept;
      document.getElementById('staff-phone').value = s.contact || '';
      
      document.getElementById('staff-original-reg').value = s.regNo;

      openModal('Edit Staff Profile', true);
    };

    // Delete Prompt Handler
    window.deleteStaffPrompt = async function(regNo) {
      if (!confirm(`Are you sure you want to completely delete staff profile for ${regNo}?`)) return;
      showToast(`Deleting staff ${regNo}...`, 'info');

      try {
        await HostelDB.deleteStaff(regNo);
        showToast(`Staff profile ${regNo} deleted successfully.`, 'success');
        
        staffList = await HostelDB.getStaff();
        renderLedger();
      } catch (err) {
        console.error('Failed to delete staff:', err);
        showToast('Failed to delete staff. Check your connection.', 'danger');
      }
    };

    // Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editMode = document.getElementById('staff-edit-mode').value === 'true';
        const originalReg = document.getElementById('staff-original-reg').value;

        const regNo = document.getElementById('staff-reg').value.trim().toUpperCase();
        const name = document.getElementById('staff-name').value.trim();
        const email = document.getElementById('staff-email').value.trim();
        const password = document.getElementById('staff-password').value;
        const role = document.getElementById('staff-role').value;
        const dept = document.getElementById('staff-dept').value;
        const contact = document.getElementById('staff-phone').value.trim();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving Profile...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>';

        const staffPayload = {
          regNo, name, email, role, dept, contact
        };
        if (password) {
          staffPayload.password = password;
        }

        // Unique Email Validation
        const emailConflict = staffList.some(s => s.email.toLowerCase() === email.toLowerCase() && (!editMode || s.regNo !== originalReg));
        if (emailConflict) {
          showToast(`Staff with Email ${email} already exists!`, 'warning');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          return;
        }

        try {
          if (!editMode) {
            // Check for duplicate employee ID
            const exists = staffList.some(s => s.regNo === regNo);
            if (exists) {
              showToast(`Staff with Employee ID ${regNo} already exists!`, 'warning');
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              return;
            }

            await HostelDB.addStaff(staffPayload);
            showToast(`Staff profile ${regNo} created successfully!`, 'success');
          } else {
            await HostelDB.updateStaff(originalReg, staffPayload);
            showToast(`Staff profile ${regNo} updated successfully!`, 'success');
          }

          closeModal();
          staffList = await HostelDB.getStaff();
          renderLedger();
        } catch (err) {
          console.error('Failed to save staff profile:', err);
          showToast('Failed to save staff details. Check connection.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
    }

  } catch (error) {
    console.error('Failed to initialize staff management page:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load staff database. Check connection.</td></tr>';
    }
  }
}

//// 9. Warden Study Hour & Discipline Management Center
// [STUDY HOUR SYSTEM REMOVED]

// 10. Warden Outing Requests Management Controller
async function initWardenOutingRequests() {
  const tbody = document.getElementById('warden-outings-tbody');
  const searchInput = document.getElementById('warden-outing-search');
  const statusFilter = document.getElementById('filter-outing-status');
  const modal = document.getElementById('modal-outing-action');
  const modalClose = document.getElementById('modal-outing-action-close');
  const modalCancel = document.getElementById('btn-cancel-outing-action');
  const form = document.getElementById('form-outing-action');

  if (modalClose) modalClose.addEventListener('click', () => HMSModal.close('#modal-outing-action'));
  if (modalCancel) modalCancel.addEventListener('click', () => HMSModal.close('#modal-outing-action'));

  const loadOutings = async () => {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading outing applications...</td></tr>';
    try {
      const allOutings = await HostelDB.getOutingRequests();
      const students = await HostelDB.getStudents();
      const studentMap = {};
      students.forEach(s => { studentMap[s.regNo] = s; });

      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const statusVal = statusFilter ? statusFilter.value : 'Pending Warden';

      const filtered = allOutings.filter(o => {
        const student = studentMap[o.studentReg] || { name: '', room: '' };
        const matchesSearch = o.id.toLowerCase().includes(query) ||
                              o.destination.toLowerCase().includes(query) ||
                              o.reason.toLowerCase().includes(query) ||
                              student.name.toLowerCase().includes(query) ||
                              o.studentReg.toLowerCase().includes(query);

        const matchesStatus = statusVal === '' || o.status === statusVal;
        return matchesSearch && matchesStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 2.5rem;">No outing requests matching current filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(o => {
        const student = studentMap[o.studentReg] || { name: 'Student', dept: 'CSE', room: '-' };

        let parentBadge = '<span class="badge badge-pending">Pending</span>';
        if (o.parentApprovalStatus === 'Approved') parentBadge = '<span class="badge badge-present">Approved</span>';
        if (o.parentApprovalStatus === 'Rejected') parentBadge = '<span class="badge badge-absent">Rejected</span>';

        let wardenBadge = '<span class="badge badge-pending">Pending</span>';
        if (o.wardenApprovalStatus === 'Approved') wardenBadge = '<span class="badge badge-present">Approved</span>';
        if (o.wardenApprovalStatus === 'Rejected') wardenBadge = '<span class="badge badge-absent">Rejected</span>';

        return `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>
              <strong>${student.name}</strong><br>
              <small class="text-muted">${o.studentReg} (Room ${student.room || '-'})</small>
            </td>
            <td>
              <strong>${formatDateString(o.outingDate)}</strong><br>
              <small>${o.requestedExitTime} - ${o.expectedReturnTime}</small>
            </td>
            <td><span class="badge badge-secondary">${o.destination}</span></td>
            <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${o.reason}</td>
            <td>${parentBadge}</td>
            <td>${wardenBadge}</td>
            <td style="text-align: right;">
              ${o.status === 'Pending Warden' ? `
                <button class="btn btn-success btn-sm" onclick="openOutingActionModal('${o.id}', 'Approved')">
                  <i class="fa-solid fa-check"></i> Approve Outing
                </button>
                <button class="btn btn-danger btn-sm" onclick="openOutingActionModal('${o.id}', 'Rejected')">
                  <i class="fa-solid fa-xmark"></i> Reject
                </button>
              ` : `
                <span class="text-muted" style="font-size: 0.8rem;">${o.wardenApprovedBy ? 'Reviewed by ' + o.wardenApprovedBy : 'Processed'}</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error('Error loading warden outings:', e);
    }
  };

  window.openOutingActionModal = async function(id, actionType) {
    const outings = await HostelDB.getOutingRequests();
    const outing = outings.find(o => o.id === id);
    if (!outing) return;

    const students = await HostelDB.getStudents();
    const student = students.find(s => s.regNo === outing.studentReg) || { name: 'Student' };

    document.getElementById('outing-action-id').value = id;
    document.getElementById('outing-action-type').value = actionType;
    document.getElementById('outing-action-title').textContent = actionType === 'Approved' ? 'Approve Outing Permission' : 'Reject Outing Permission';

    document.getElementById('outing-action-summary').innerHTML = `
      <strong>${student.name} (${outing.studentReg})</strong><br>
      Outing Date: ${outing.outingDate} (${outing.requestedExitTime} - ${outing.expectedReturnTime})<br>
      Destination: ${outing.destination} | Reason: ${outing.reason}
    `;

    HMSModal.open('#modal-outing-action');
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('outing-action-id').value;
      const actionType = document.getElementById('outing-action-type').value;
      const remarks = document.getElementById('outing-action-remarks').value.trim();

      const warden = HMSAuth.getCurrentUser();
      const wardenName = warden ? warden.name : 'Warden';

      try {
        await HostelDB.updateOutingWardenApproval(id, actionType, wardenName, remarks);
        HMSModal.close('#modal-outing-action');
        showToast(`Outing Request ${id} ${actionType.toLowerCase()} successfully.`, actionType === 'Approved' ? 'success' : 'warning');
        await loadOutings();
      } catch (err) {
        console.error('Failed to process outing decision:', err);
        showToast('Failed to process decision.', 'danger');
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', loadOutings);
  if (statusFilter) statusFilter.addEventListener('change', loadOutings);

  await loadOutings();
}

// 11. Warden Gate Control & QR Code Verification Scanner
async function initWardenGateControl() {
  const camBtn = document.getElementById('btn-toggle-camera-gate');
  const camBtnText = document.getElementById('gate-cam-btn-text');
  const manualInput = document.getElementById('manual-qr-input');
  const manualValidateBtn = document.getElementById('btn-validate-manual');
  const scanDetailContainer = document.getElementById('outpass-scan-detail');
  const emptyStateContainer = document.getElementById('outpass-empty-state');
  const overdueListContainer = document.getElementById('overdue-outings-list');
  const overdueBadge = document.getElementById('overdue-count-badge');

  let html5QrcodeScanner = null;
  let isScanning = false;

  // Load & Refresh Overdue Outings
  const refreshOverdueOutings = async () => {
    if (!overdueListContainer) return;
    try {
      const overdue = await HostelDB.getOverdueOutings();
      if (overdueBadge) overdueBadge.textContent = `${overdue.length} Overdue`;

      if (overdue.length === 0) {
        overdueListContainer.innerHTML = '<p class="text-muted text-center" style="font-size: 0.8rem; margin: 1rem 0;">No overdue outings. All exited students returned within window.</p>';
        return;
      }

      overdueListContainer.innerHTML = overdue.map(item => `
        <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--warning); padding: 0.65rem 0.85rem; border-radius: 4px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
          <div>
            <strong>${item.student.name} (${item.student.regNo})</strong><br>
            <span class="text-muted">Expected: ${item.pass.validUntil}</span>
          </div>
          <span class="badge badge-warning">${item.overdueMinutes} Mins Overdue</span>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error refreshing overdue outings:', e);
    }
  };

  // Render Outpass Validation Card
  const renderValidationResult = (res) => {
    if (!scanDetailContainer || !emptyStateContainer) return;

    emptyStateContainer.style.display = 'none';
    scanDetailContainer.style.display = 'block';

    const isValid = res.valid;
    const pass = res.pass;
    const student = res.student || { name: 'Student', regNo: 'REG', dept: 'CSE', room: '-' };
    const details = res.details || {};

    let bannerBg = isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    let bannerColor = isValid ? 'var(--success)' : 'var(--danger)';

    let actionsHtml = '';
    if (isValid && pass) {
      if (pass.status === 'VALID' || pass.status === 'NOT_YET_VALID') {
        actionsHtml = `
          <button class="btn btn-success btn-lg" style="width: 100%; font-weight: 700;" onclick="executeGateExit('${pass.id}')">
            <i class="fa-solid fa-person-walking-arrow-right"></i> RECORD CAMPUS EXIT
          </button>
        `;
      } else if (pass.status === 'EXIT_RECORDED') {
        actionsHtml = `
          <button class="btn btn-primary btn-lg" style="width: 100%; font-weight: 700;" onclick="executeGateReturn('${pass.id}')">
            <i class="fa-solid fa-house-user"></i> RECORD CAMPUS RETURN
          </button>
        `;
      }
    }

    scanDetailContainer.innerHTML = `
      <div style="background: ${bannerBg}; border-radius: var(--border-radius-sm); padding: 0.85rem 1rem; border-left: 4px solid ${bannerColor}; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: ${bannerColor}; margin: 0;">${res.message}</h3>
      </div>

      ${pass ? `
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; background: var(--bg-primary); padding: 0.85rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; flex-shrink: 0;">
            ${student.name ? student.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${student.name}</h4>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0 0;">
              Reg No: <strong>${student.regNo}</strong> | Dept: <strong>${student.dept || 'CSE'}</strong> | Room: <strong>${student.room || '-'}</strong>
            </p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.82rem; margin-bottom: 1.25rem; text-align: left;">
          <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">PASS TYPE</span>
            <strong>${pass.passType === 'HOME_LEAVE' ? 'HOME LEAVE' : 'SHORT OUTING'}</strong>
          </div>
          <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">PASS ID</span>
            <strong>${pass.id}</strong>
          </div>
          <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">PERMITTED EXIT</span>
            <strong>${pass.validFrom}</strong>
          </div>
          <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
            <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">EXPECTED RETURN</span>
            <strong>${pass.validUntil}</strong>
          </div>
        </div>

        ${pass.actualExitTime ? `
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; background: rgba(79, 70, 229, 0.05); padding: 0.5rem 0.75rem; border-radius: 4px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Actual Exit Recorded: <strong>${formatDateString(pass.actualExitTime)}</strong>
          </div>
        ` : ''}

        ${pass.actualReturnTime ? `
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; background: rgba(16, 185, 129, 0.05); padding: 0.5rem 0.75rem; border-radius: 4px;">
            <i class="fa-solid fa-circle-check"></i> Actual Return Recorded: <strong>${formatDateString(pass.actualReturnTime)}</strong>
          </div>
        ` : ''}

        <div style="margin-top: 1rem;">
          ${actionsHtml}
          ${pass.status !== 'REVOKED' && pass.status !== 'RETURNED' ? `
            <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 0.5rem; color: var(--danger);" onclick="openRevokeModal('${pass.id}')">
              <i class="fa-solid fa-ban"></i> Revoke Pass Security Hold
            </button>
          ` : ''}
        </div>
      ` : ''}
    `;
  };

  // Render Study Hour Scan result card
  const renderStudyHourValidationResult = async (res, studentReg, purpose, sessionId) => {
    if (!scanDetailContainer || !emptyStateContainer) return;
    emptyStateContainer.style.display = 'none';
    scanDetailContainer.style.display = 'block';

    const students = await HostelDB.getStudents();
    const student = students.find(s => s.regNo === studentReg) || { name: 'Student', regNo: studentReg, dept: 'CSE', room: '-' };

    let bannerBg = res.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    let bannerColor = res.success ? 'var(--success)' : 'var(--danger)';

    scanDetailContainer.innerHTML = `
      <div style="background: ${bannerBg}; border-radius: var(--border-radius-sm); padding: 0.85rem 1rem; border-left: 4px solid ${bannerColor}; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: ${bannerColor}; margin: 0;">${res.success ? '✓ Attendance Presence Verified' : '✗ Verification Failed'}</h3>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">${res.message}</p>
      </div>

      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; background: var(--bg-primary); padding: 0.85rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; flex-shrink: 0;">
          ${student.name ? student.name.charAt(0).toUpperCase() : 'S'}
        </div>
        <div>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${student.name}</h4>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0 0;">
            Reg No: <strong>${student.regNo}</strong> | Dept: <strong>${student.dept || 'CSE'}</strong> | Room: <strong>${student.room || '-'}</strong>
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.82rem; margin-bottom: 1.25rem; text-align: left;">
        <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">VERIFICATION TYPE</span>
          <strong>STUDY HOUR</strong>
        </div>
        <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">DIRECTION / PHASE</span>
          <strong>${purpose}</strong>
        </div>
        <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">SESSION ID</span>
          <strong>${sessionId}</strong>
        </div>
        <div style="background: var(--bg-primary); padding: 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">VERIFIED TIME</span>
          <strong>${new Date().toLocaleTimeString()}</strong>
        </div>
      </div>
    `;
  };

  // Render Unrecognized QR Scan result card
  const renderUnrecognizedValidationResult = (qrString) => {
    if (!scanDetailContainer || !emptyStateContainer) return;
    emptyStateContainer.style.display = 'none';
    scanDetailContainer.style.display = 'block';

    scanDetailContainer.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.1); border-radius: var(--border-radius-sm); padding: 0.85rem 1rem; border-left: 4px solid var(--warning); margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--warning); margin: 0;">⚠️ Unrecognized QR Format</h3>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">The scanned payload structure is valid but not recognized by Gate Control or Study Hour. It might be for a future system module.</p>
      </div>

      <div style="background: var(--bg-primary); padding: 1rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); text-align: left; margin-bottom: 1.25rem;">
        <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">RAW DECODED TEXT</span>
        <pre style="font-family: monospace; font-size: 0.8rem; margin: 0; background: var(--bg-surface); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${qrString}</pre>
      </div>
    `;
  };

  // Perform Validation Logic
  const handleValidateQrString = async (qrString) => {
    let finalPayloadStr = qrString.trim();

    // 1. Study Hour Scanner Route
    if (finalPayloadStr.startsWith('HMSQR_')) {
      const parts = finalPayloadStr.split('_');
      if (parts.length < 4) {
        showToast('Invalid Study Hour QR format.', 'danger');
        return;
      }
      const purpose = parts[1];
      const sessionId = parts[2];
      const studentReg = parts[3];
      const warden = HMSAuth.getCurrentUser();

      try {
        const res = await HostelDB.verifyQRToken(finalPayloadStr, purpose, sessionId, warden ? warden.name : 'Warden');
        await renderStudyHourValidationResult(res, studentReg, purpose, sessionId);
        if (res.success) {
          showToast('✓ Study Hour QR Verified Successfully!', 'success');
        } else {
          showToast(res.message, 'danger');
        }
      } catch (err) {
        showToast('Error verifying Study Hour QR.', 'danger');
      }
      return;
    }

    // 2. Outpass Scanner Route
    let isOutpass = false;
    let outpassPayload = finalPayloadStr;

    if (finalPayloadStr.startsWith('OP-')) {
      isOutpass = true;
      const passes = await HostelDB.getOutpasses();
      const pass = passes.find(p => p.id === finalPayloadStr);
      if (pass) {
        outpassPayload = JSON.stringify({ op: pass.id, tok: pass.secureToken });
      }
    } else {
      try {
        const parsed = JSON.parse(finalPayloadStr);
        if (parsed && parsed.op && parsed.tok) {
          isOutpass = true;
        }
      } catch (e) {
        // Not a JSON outpass QR
      }
    }

    if (isOutpass) {
      const res = await HostelDB.validateOutpassQR(outpassPayload);
      if (!res.valid) {
        if (window.HMSQRScanner) {
          window.HMSQRScanner.showInvalidPopup(res.message, () => {
            startScanner();
          });
        }
        renderValidationResult(res);
      } else {
        renderValidationResult(res);
        showToast('✓ Outpass QR Verified Successfully!', 'success');
      }
      return;
    }

    // 3. Fallback: Future / Unrecognized QR Route
    renderUnrecognizedValidationResult(finalPayloadStr);
    showToast('Warning: Unrecognized QR Code scanned.', 'warning');
  };

  window.handleGateScanResult = async function(scannedText) {
    await handleValidateQrString(scannedText);
  };

  window.executeGateExit = async function(passId) {
    try {
      const res = await HostelDB.recordOutpassExit(passId);
      showToast(`Campus Exit Recorded for pass ${passId}!`, 'success');
      await handleValidateQrString(passId);
      await refreshOverdueOutings();
    } catch (e) {
      console.error('Exit record error:', e);
      showToast('Failed to record exit.', 'danger');
    }
  };

  window.executeGateReturn = async function(passId) {
    try {
      const res = await HostelDB.recordOutpassReturn(passId);
      if (res.isLate) {
        showToast(`Campus Return Recorded! LATE RETURN by ${res.lateMinutes} mins. Discipline points updated.`, 'warning');
      } else {
        showToast(`Campus Return Recorded on-time for pass ${passId}!`, 'success');
      }
      await handleValidateQrString(passId);
      await refreshOverdueOutings();
    } catch (e) {
      console.error('Return record error:', e);
      showToast('Failed to record return.', 'danger');
    }
  };

  window.openRevokeModal = function(passId) {
    document.getElementById('revoke-pass-id').value = passId;
    HMSModal.open('#modal-revoke-pass');
  };

  // Revoke Modal Form
  const revokeForm = document.getElementById('form-revoke-pass');
  if (revokeForm) {
    revokeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passId = document.getElementById('revoke-pass-id').value;
      const reason = document.getElementById('revoke-reason').value.trim();

      const warden = HMSAuth.getCurrentUser();
      const wardenName = warden ? warden.name : 'Warden';

      try {
        await HostelDB.revokeOutpass(passId, wardenName, reason);
        HMSModal.close('#modal-revoke-pass');
        showToast(`Pass ${passId} revoked!`, 'danger');
        await handleValidateQrString(passId);
        await refreshOverdueOutings();
      } catch (err) {
        console.error('Revocation error:', err);
        showToast('Failed to revoke pass.', 'danger');
      }
    });
  }

  const cancelRevokeBtn = document.getElementById('btn-cancel-revoke');
  const closeRevokeBtn = document.getElementById('modal-revoke-close');
  if (cancelRevokeBtn) cancelRevokeBtn.addEventListener('click', () => HMSModal.close('#modal-revoke-pass'));
  if (closeRevokeBtn) closeRevokeBtn.addEventListener('click', () => HMSModal.close('#modal-revoke-pass'));

  // Manual Input Validator
  if (manualValidateBtn && manualInput) {
    manualValidateBtn.addEventListener('click', async () => {
      const val = manualInput.value.trim();
      if (!val) {
        showToast('Please enter a Pass ID or QR payload string.', 'warning');
        return;
      }
      await handleValidateQrString(val);
    });
  }

  // Launch Fullscreen Scanner
  const startScanner = async () => {
    if (window.HMSQRScanner) {
      window.HMSQRScanner.open({
        title: 'Outpass QR Scanner',
        mainText: 'Align the QR code inside the frame',
        subText: 'The QR will be scanned automatically.',
        allowManual: true,
        onScan: async (decodedText) => {
          await handleValidateQrString(decodedText);
        },
        onManual: () => {
          if (manualInput) manualInput.focus();
        }
      });
    } else if (typeof Html5Qrcode !== 'undefined') {
      html5QrcodeScanner = new Html5Qrcode("gate-qr-reader");
      await html5QrcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 20, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await handleValidateQrString(decodedText);
        },
        () => {}
      );
    }
  };

  // Camera Toggle Handler
  if (camBtn) {
    camBtn.addEventListener('click', async () => {
      await startScanner();
    });
  }

  // Page Unload Camera Cleanup
  window.addEventListener('beforeunload', () => {
    if (window.HMSQRScanner) {
      window.HMSQRScanner.releaseStream();
    }
  });

  await refreshOverdueOutings();
  const overdueInterval = setInterval(refreshOverdueOutings, 15000);
  window.addEventListener('beforeunload', () => clearInterval(overdueInterval));
}


