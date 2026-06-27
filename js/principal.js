/* --- Principal Portal Controller --- */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof HostelDB !== 'undefined') {
    await HostelDB.init();
  }
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser || currentUser.role !== 'principal') return;

  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    await initDashboard();
  } else if (pagePath.includes('student-analytics.html')) {
    await initStudentAnalytics();
  } else if (pagePath.includes('complaint-analytics.html')) {
    await initComplaintAnalytics();
  } else if (pagePath.includes('leave-analytics.html')) {
    await initLeaveAnalytics();
  } else if (pagePath.includes('reports.html')) {
    await initReports();
  }
});

// Helper: Calculate Executive Statistics
async function getExecutiveStats() {
  const [students, leaves, complaints, attendance] = await Promise.all([
    HostelDB.getStudents(),
    HostelDB.getLeaves(),
    HostelDB.getComplaints(),
    HostelDB.getAttendanceRecords()
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance[todayStr] || {};

  let activeLeave = 0;
  let illegalAbsence = 0;
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
      }
    }
  });

  return {
    totalStudents: students.length,
    hostelStudents: hostelResidents,
    leaveStudents: activeLeave,
    illegalStudents: illegalAbsence,
    totalComplaints: complaints.length,
    resolvedComplaints: complaints.filter(c => c.status === 'Resolved').length
  };
}

// 1. Principal Dashboard
async function initDashboard() {
  const statsIds = ['exec-total-students', 'exec-hostel-students', 'exec-leave-students', 'exec-illegal-students', 'exec-complaints', 'exec-resolved-complaints'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  const feed = document.getElementById('principal-activity-feed');
  if (feed) {
    feed.innerHTML = '<div class="text-center" style="padding:2rem 0;"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color"></i><p style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-secondary);">Loading activity logs...</p></div>';
  }

  try {
    const [stats, complaints, leaves] = await Promise.all([
      getExecutiveStats(),
      HostelDB.getComplaints(),
      HostelDB.getLeaves()
    ]);
    
    // Stats counters
    document.getElementById('exec-total-students').textContent = stats.totalStudents;
    document.getElementById('exec-hostel-students').textContent = stats.hostelStudents;
    document.getElementById('exec-leave-students').textContent = stats.leaveStudents;
    document.getElementById('exec-illegal-students').textContent = stats.illegalStudents;
    document.getElementById('exec-complaints').textContent = stats.totalComplaints;
    document.getElementById('exec-resolved-complaints').textContent = stats.resolvedComplaints;

    // Hydrate activity feed
    if (feed) {
      // Combine activities
      const activities = [];
      
      complaints.slice(0, 3).forEach(c => {
        activities.push({
          title: `Complaint Raised (${c.id})`,
          text: `Student ${c.studentName} raised issue: "${c.description.substring(0, 45)}..."`,
          time: formatDateString(c.date),
          icon: 'fa-screwdriver-wrench'
        });
      });

      leaves.slice(0, 3).forEach(l => {
        activities.push({
          title: `Leave Application (${l.id})`,
          text: `Student ${l.studentName} requested outstation leave. Status: ${l.status}`,
          time: formatDateString(l.dateRaised || l.fromDate),
          icon: 'fa-plane-departure'
        });
      });

      if (activities.length === 0) {
        feed.innerHTML = '<div class="text-center text-muted">No recent activity found.</div>';
        return;
      }

      feed.innerHTML = activities.map(a => `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fa-solid ${a.icon}"></i>
          </div>
          <div class="activity-details">
            <span class="activity-title">${a.title}</span>
            <span style="font-size:0.8rem; color: var(--text-secondary); margin-top:0.15rem;">${a.text}</span>
            <span class="activity-time">${a.time}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load Principal dashboard:', error);
    statsIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
    if (feed) {
      feed.innerHTML = '<div class="text-center text-danger">Failed to load recent activities.</div>';
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

/// 2. Student Analytics (Pie & Bar)
async function initStudentAnalytics() {
  const chartsContainers = ['pie-student-status', 'bar-dept-occupancy'];
  chartsContainers.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const p = canvas.parentNode;
      const spinner = document.createElement('div');
      spinner.className = 'chart-spinner text-center';
      spinner.style.padding = '3rem 0';
      spinner.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color"></i><p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">Querying students database...</p>';
      p.insertBefore(spinner, canvas);
      canvas.style.display = 'none';
    }
  });

  try {
    const [stats, students] = await Promise.all([
      getExecutiveStats(),
      HostelDB.getStudents()
    ]);

    // Remove spinners
    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const p = canvas.parentNode;
        const spinner = p.querySelector('.chart-spinner');
        if (spinner) spinner.remove();
      }
    });

    if (students.length === 0) {
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

    // Pie Chart
    HMSCharts.renderPie(
      'pie-student-status',
      ['Hostel Residents', 'On Active Leave', 'Illegal Absence'],
      [stats.hostelStudents - stats.leaveStudents - stats.illegalStudents, stats.leaveStudents, stats.illegalStudents],
      ['#4f46e5', '#f59e0b', '#ef4444']
    );

    // Bar Chart: Dept Hostel Students (CSE vs ECE vs ME)
    const deptCount = { 'CSE': 0, 'ECE': 0, 'MECH': 0, 'IT': 0, 'EEE': 0, 'CIVIL': 0, 'AI & DS': 0 };
    students.forEach(s => {
      if (s.room && deptCount[s.dept] !== undefined) {
        deptCount[s.dept]++;
      }
    });

    const barDatasets = [
      { label: 'Hostel Residents', data: Object.values(deptCount), backgroundColor: '#0ea5e9', borderRadius: 4 }
    ];

    HMSCharts.renderBar(
      'bar-dept-occupancy',
      Object.keys(deptCount),
      barDatasets,
      'Occupancy by Department'
    );
  } catch (error) {
    console.error('Failed to load student analytics charts:', error);
    chartsContainers.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const p = canvas.parentNode;
        const spinner = p.querySelector('.chart-spinner');
        if (spinner) spinner.innerHTML = '<p class="text-danger">Failed to render chart data.</p>';
      }
    });
  }
}

// 3. Complaint Analytics (Line)
async function initComplaintAnalytics() {
  const canvas = document.getElementById('line-complaints-monthly');
  let spinner;
  if (canvas) {
    const p = canvas.parentNode;
    spinner = document.createElement('div');
    spinner.className = 'chart-spinner text-center';
    spinner.style.padding = '3rem 0';
    spinner.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color"></i><p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">Querying complaints database...</p>';
    p.insertBefore(spinner, canvas);
    canvas.style.display = 'none';
  }

  try {
    const complaints = await HostelDB.getComplaints();
    if (spinner) spinner.remove();

    if (complaints.length === 0) {
      if (canvas) {
        const p = canvas.parentNode;
        const errDiv = document.createElement('div');
        errDiv.className = 'text-center text-muted';
        errDiv.style.padding = '3rem 0';
        errDiv.innerHTML = '<i class="fa-solid fa-chart-line fa-2x" style="margin-bottom: 0.5rem;"></i><p>Not enough data to generate analytics.</p>';
        p.insertBefore(errDiv, canvas);
        canvas.style.display = 'none';
      }
      return;
    }

    if (canvas) canvas.style.display = 'block';

    // Calculate complaints count by month dynamically based on complaint raise dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCounts = Array(12).fill(0);
    
    complaints.forEach(c => {
      if (c.date) {
        const m = new Date(c.date).getMonth();
        monthlyCounts[m]++;
      }
    });

    // Get current month index
    const currentMonth = new Date().getMonth();
    const activeMonths = months.slice(0, currentMonth + 1);
    const activeCounts = monthlyCounts.slice(0, currentMonth + 1);

    HMSCharts.renderLine(
      'line-complaints-monthly',
      activeMonths,
      'Monthly Filed Tickets',
      activeCounts,
      'rgba(124, 58, 237, 1)',
      false
    );
  } catch (error) {
    console.error('Failed to load complaints analytics charts:', error);
    if (spinner) spinner.innerHTML = '<p class="text-danger">Failed to render chart data.</p>';
  }
}

// 4. Leave Analytics (Area)
async function initLeaveAnalytics() {
  const canvas = document.getElementById('area-leave-trends');
  let spinner;
  if (canvas) {
    const p = canvas.parentNode;
    spinner = document.createElement('div');
    spinner.className = 'chart-spinner text-center';
    spinner.style.padding = '3rem 0';
    spinner.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary-color"></i><p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">Querying leaves database...</p>';
    p.insertBefore(spinner, canvas);
    canvas.style.display = 'none';
  }

  try {
    const leaves = await HostelDB.getLeaves();
    if (spinner) spinner.remove();

    if (leaves.length === 0) {
      if (canvas) {
        const p = canvas.parentNode;
        const errDiv = document.createElement('div');
        errDiv.className = 'text-center text-muted';
        errDiv.style.padding = '3rem 0';
        errDiv.innerHTML = '<i class="fa-solid fa-chart-line fa-2x" style="margin-bottom: 0.5rem;"></i><p>Not enough data to generate analytics.</p>';
        p.insertBefore(errDiv, canvas);
        canvas.style.display = 'none';
      }
      return;
    }

    if (canvas) canvas.style.display = 'block';

    const weekdayCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    leaves.forEach(l => {
      if (l.dateRaised) {
        const d = new Date(l.dateRaised);
        const dayName = weekdays[d.getDay()];
        if (weekdayCounts[dayName] !== undefined) {
          weekdayCounts[dayName]++;
        }
      }
    });

    const trendData = [
      weekdayCounts['Mon'],
      weekdayCounts['Tue'],
      weekdayCounts['Wed'],
      weekdayCounts['Thu'],
      weekdayCounts['Fri'],
      weekdayCounts['Sat'],
      weekdayCounts['Sun']
    ];

    HMSCharts.renderLine(
      'area-leave-trends',
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      'Active Leave Registrations',
      trendData,
      'rgba(14, 165, 233, 1)',
      true // Fill area
    );
  } catch (error) {
    console.error('Failed to load leaves analytics:', error);
    if (spinner) spinner.innerHTML = '<p class="text-danger">Failed to render chart data.</p>';
  }
}

// 5. Reports Portal
async function initReports() {
  const statsIds = ['rep-total-students', 'rep-hostel-students', 'rep-active-leaves', 'rep-illegal-absences'];
  statsIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  try {
    const stats = await getExecutiveStats();
    
    document.getElementById('rep-total-students').textContent = stats.totalStudents;
    document.getElementById('rep-hostel-students').textContent = stats.hostelStudents;
    document.getElementById('rep-active-leaves').textContent = stats.leaveStudents;
    document.getElementById('rep-illegal-absences').textContent = stats.illegalStudents;
  } catch (error) {
    console.error('Failed to load Principal executive reports:', error);
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
