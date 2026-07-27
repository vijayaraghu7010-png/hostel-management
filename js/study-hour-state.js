/* --- Centralized Reactive Study Hour State Management Engine --- */

class StudyHourStateEngine {
  constructor() {
    this.activeSession = null;
    this.attendanceList = [];
    this.studentsList = [];
    this.keywordChecks = [];
    this.keywordResponses = [];
    this.listeners = new Set();
    this.isFetching = false;
    this.pollTimer = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
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
    const attMap = new Map();
    (this.attendanceList || []).forEach(a => attMap.set(a.studentReg, a));

    const totalStudents = this.studentsList.length;
    const presentCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS').length;
    const checkedOutCnt = this.attendanceList.filter(a => a.exitStatus === 'PASS').length;
    const pendingCnt = Math.max(0, totalStudents - presentCnt);
    const insideCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS' && a.exitStatus !== 'PASS').length;
    const completedCnt = this.attendanceList.filter(a => a.entryStatus === 'PASS' && a.exitStatus === 'PASS').length;

    return {
      activeSession: this.activeSession,
      attendanceList: this.attendanceList,
      studentsList: this.studentsList,
      keywordChecks: this.keywordChecks,
      keywordResponses: this.keywordResponses,
      elapsedSeconds: this.elapsedSeconds,
      metrics: {
        totalStudents,
        presentCnt,
        checkedOutCnt,
        pendingCnt,
        insideCnt,
        completedCnt,
        keywordRounds: this.keywordChecks.length
      }
    };
  }

  async refresh() {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      this.activeSession = await HostelDB.getActiveStudySession();
      this.studentsList = await HostelDB.getStudents();

      if (this.activeSession) {
        this.attendanceList = await HostelDB.getStudyAttendance(this.activeSession.id);
        this.keywordChecks = await HostelDB.getKeywordChecks(this.activeSession.id);
        this.keywordResponses = await HostelDB.getKeywordResponses(this.activeSession.id);
        
        // Calculate elapsed time from session created_at / date & startTime
        if (this.activeSession.createdAt) {
          const startTimeMs = new Date(this.activeSession.createdAt).getTime();
          this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
        } else {
          this.elapsedSeconds = 0;
        }
      } else {
        this.attendanceList = [];
        this.keywordChecks = [];
        this.keywordResponses = [];
        this.elapsedSeconds = 0;
      }

      this.notify();
    } catch (err) {
      console.warn('StudyHourState refresh error:', err);
    } finally {
      this.isFetching = false;
    }
  }

  startPolling(intervalMs = 4000) {
    this.stopPolling();

    // Live session timer incrementer every second
    this.timerInterval = setInterval(() => {
      if (this.activeSession) {
        this.elapsedSeconds++;
        this.notify();
      }
    }, 1000);

    // Non-overlapping data sync poll
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
