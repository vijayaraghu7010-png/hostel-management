/* --- Centralized Reactive Study Hour State Management Engine --- */

class StudyHourStateEngine {
  constructor() {
    this.activeSession = null;
    this.attendanceList = [];
    this.studentsList = [];
    this.parentAlerts = [];
    this.listeners = new Set();
    this.isFetching = false;
    this.pollTimer = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.settings = {
      creditThreshold: 700,
      autoSendAlerts: false
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(fn => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('StudyHourState notification error:', err);
      }
    });
  }

  getSnapshot() {
    const totalStudents = this.studentsList.length;
    const presentCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS').length;
    const checkedOutCnt = this.attendanceList.filter(a => a.exitStatus === 'PASS').length;
    const pendingCnt = Math.max(0, totalStudents - presentCnt);
    const insideCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS' && a.exitStatus !== 'PASS').length;
    const completedCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS' && a.exitStatus === 'PASS').length;

    // Filter alerts to pending review
    const pendingAlerts = this.parentAlerts.filter(a => a.status === 'PENDING');

    return {
      activeSession: this.activeSession,
      attendanceList: this.attendanceList,
      studentsList: this.studentsList,
      parentAlerts: this.parentAlerts,
      pendingAlerts: pendingAlerts,
      elapsedSeconds: this.elapsedSeconds,
      settings: this.settings,
      metrics: {
        totalStudents,
        presentCnt,
        checkedOutCnt,
        pendingCnt,
        insideCnt,
        completedCnt,
        avgAttendance: totalStudents ? Math.round((presentCnt / totalStudents) * 100) : 0,
        totalAlertsPending: pendingAlerts.length
      }
    };
  }

  async refresh() {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      this.activeSession = await HostelDB.getActiveStudySession();
      this.studentsList = await HostelDB.getStudents();
      this.parentAlerts = await HostelDB.getParentAlerts();

      if (this.activeSession) {
        this.attendanceList = await HostelDB.getStudyAttendance(this.activeSession.id);
        
        if (this.activeSession.createdAt) {
          const startTimeMs = new Date(this.activeSession.createdAt).getTime();
          this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
        } else {
          this.elapsedSeconds = 0;
        }
      } else {
        this.attendanceList = [];
        this.elapsedSeconds = 0;
      }

      // Automated parent alert monitor based on credits
      await this.monitorStudentCredits();

      this.notify();
    } catch (err) {
      console.warn('StudyHourState refresh error:', err);
    } finally {
      this.isFetching = false;
    }
  }

  async monitorStudentCredits() {
    try {
      let alertsChanged = false;
      const threshold = this.settings.creditThreshold;

      for (const s of this.studentsList) {
        const balance = await HostelDB.getCreditBalance(s.regNo);
        if (balance < threshold) {
          // Check if parent alert already exists for low credit (pending or sent)
          const exists = this.parentAlerts.some(
            a => a.studentReg === s.regNo && a.alertType === 'DISCIPLINE_WARNING'
          );

          if (!exists) {
            const riskProfile = await HostelDB.getStudentRiskProfile(s.regNo);
            const msg = `Dear Parent, your ward ${s.name} (${s.regNo}) has low discipline credit rating of ${balance}/1000. Risk level: ${riskProfile.riskLevel}. Please contact the hostel warden.`;
            
            await HostelDB.createParentAlert({
              studentReg: s.regNo,
              alertType: 'DISCIPLINE_WARNING',
              language: 'ENGLISH',
              messageText: msg,
              status: this.settings.autoSendAlerts ? 'SENT_CONFIRMED' : 'PENDING'
            });
            alertsChanged = true;
          }
        }
      }

      if (alertsChanged) {
        this.parentAlerts = await HostelDB.getParentAlerts();
      }
    } catch (err) {
      console.warn('monitorStudentCredits error:', err);
    }
  }

  startPolling(intervalMs = 4000) {
    this.stopPolling();

    this.timerInterval = setInterval(() => {
      if (this.activeSession) {
        this.elapsedSeconds++;
        this.notify();
      }
    }, 1000);

    const runPoll = async () => {
      await this.refresh();
      this.pollTimer = setTimeout(runPoll, intervalMs);
    };

    runPoll();
  }

  stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTimer() {
    const hours = Math.floor(this.elapsedSeconds / 3600);
    const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
    const seconds = this.elapsedSeconds % 60;
    
    const pad = num => String(num).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}

window.StudyHourState = new StudyHourStateEngine();
