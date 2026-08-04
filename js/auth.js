/* --- Authentication & Session Guards --- */

class HMSAuth {
  static getAppBasePath() {
    const path = window.location.pathname;
    const pagesIndex = path.indexOf('/pages/');
    if (pagesIndex !== -1) {
      return path.substring(0, pagesIndex + 1);
    }
    if (path.endsWith('.html')) {
      return path.substring(0, path.lastIndexOf('/') + 1);
    }
    if (!path.endsWith('/')) {
      return path + '/';
    }
    return path;
  }

  static getRootPath() {
    const attrPath = document.body ? document.body.getAttribute('data-root-path') : null;
    if (attrPath !== null && attrPath !== undefined) return attrPath;

    const path = window.location.pathname;
    if (path.includes('/pages/')) {
      return '../../';
    }
    return '';
  }

  static getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('hms_current_user')) || null;
    } catch (e) {
      return null;
    }
  }

  static async login(email, password, role) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRole = (role || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    try {
      let users = [];
      try {
        if (typeof HostelDB !== 'undefined') {
          users = await HostelDB.getAllUsers();
        }
      } catch (err) {
        console.warn('HostelDB.getAllUsers failed, checking local dataset:', err);
      }

      const defaultUsers = [
        { regNo: 'STU001', name: 'Rahul Sharma', email: 'rahul@gmail.com', password: 'password', role: 'student', dept: 'CSE', room: '77A', contact: '+91 98765 43210' },
        { regNo: '421224104112', name: 'VijayaRaghu', email: 'vijayaraghu7010@gmail.com', password: 'vr1234567', role: 'student', dept: 'CSE', room: '77A', contact: '+91 85318 72494' },
        { regNo: 'warden@gmail.com', name: 'Dr. K. Srinivasan', email: 'warden@gmail.com', password: 'password', role: 'warden' },
        { regNo: 'teacher@gmail.com', name: 'Prof. Animesh Sen', email: 'teacher@gmail.com', password: 'password', role: 'teacher', dept: 'CSE' },
        { regNo: 'hod@gmail.com', name: 'Dr. Rajesh Kumar', email: 'hod@gmail.com', password: 'password', role: 'hod', dept: 'CSE' },
        { regNo: 'ao@gmail.com', name: 'Vikas Malhotra', email: 'ao@gmail.com', password: 'password', role: 'ao' },
        { regNo: 'principal@gmail.com', name: 'Dr. Sandeep Shastri', email: 'principal@gmail.com', password: 'password', role: 'principal' }
      ];

      let localUsers = [];
      if (typeof HostelDB !== 'undefined') {
        localUsers = HostelDB.getData('hms_users') || [];
      }
      
      const combinedUsers = [...defaultUsers, ...(users || []), ...localUsers];

      const matchedUser = combinedUsers.find(u => 
        u && u.email && u.email.trim().toLowerCase() === cleanEmail && 
        (u.password === cleanPassword || u.password === password) && 
        u.role && u.role.trim().toLowerCase() === cleanRole
      );
      
      if (matchedUser) {
        localStorage.setItem('hms_current_user', JSON.stringify(matchedUser));
        return { success: true, user: matchedUser };
      }

      return { success: false, message: 'Invalid credentials or role selection. Please check your email, role, and password.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An unexpected connection error occurred.' };
    }
  }

  static logout() {
    localStorage.removeItem('hms_current_user');
    const basePath = this.getAppBasePath();
    window.location.href = `${basePath}index.html?logout=true`;
  }

  static enforceGuard() {
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || !path.includes('/pages/');

    if (isLoginPage) {
      // If user is logged in with valid role and NOT explicitly logging out, redirect to dashboard
      const user = this.getCurrentUser();
      const isLoggingOut = window.location.search.includes('logout=true');
      if (user && user.role && !isLoggingOut) {
        this.redirectToDashboard(user.role);
      }
      return;
    }

    const user = this.getCurrentUser();
    
    if (!user || !user.role) {
      const basePath = this.getAppBasePath();
      window.location.href = `${basePath}index.html`;
      return;
    }

    // Verify role matches folder path
    const rolePaths = ['student', 'warden', 'teacher', 'hod', 'ao', 'principal'];
    for (const rPath of rolePaths) {
      if (path.includes(`/pages/${rPath}/`) && user.role !== rPath) {
        console.warn(`Unauthorized access attempt by ${user.role} to ${rPath} path.`);
        this.redirectToDashboard(user.role);
        return;
      }
    }
  }

  static redirectToDashboard(role) {
    const basePath = this.getAppBasePath();
    window.location.href = `${basePath}pages/${role}/dashboard.html`;
  }
}

// Run guard check immediately on load
HMSAuth.enforceGuard();
