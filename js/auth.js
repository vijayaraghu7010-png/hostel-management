/* --- Authentication & Session Guards --- */

class HMSAuth {
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

    try {
      let users = [];
      try {
        if (typeof HostelDB !== 'undefined') {
          users = await HostelDB.getAllUsers();
        }
      } catch (err) {
        console.warn('HostelDB.getAllUsers failed, checking local dataset:', err);
      }

      let localUsers = [];
      if (typeof HostelDB !== 'undefined') {
        localUsers = HostelDB.getData('hms_users') || [];
      }
      
      const combinedUsers = [...(users || []), ...localUsers];

      const matchedUser = combinedUsers.find(u => 
        u && u.email && u.email.trim().toLowerCase() === cleanEmail && 
        u.password === password && 
        u.role && u.role.trim().toLowerCase() === cleanRole
      );
      
      if (matchedUser) {
        localStorage.setItem('hms_current_user', JSON.stringify(matchedUser));
        return { success: true, user: matchedUser };
      }

      return { success: false, message: 'Invalid credentials or role selection.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An unexpected connection error occurred.' };
    }
  }

  static logout() {
    localStorage.removeItem('hms_current_user');
    const rootPath = this.getRootPath();
    window.location.href = `${rootPath}index.html`;
  }

  static enforceGuard() {
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path === '/' || path.endsWith('/pro') || path.endsWith('/pro/');

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
    const rootPath = this.getRootPath();
    
    if (!user || !user.role) {
      window.location.href = `${rootPath}index.html`;
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
    const rootPath = this.getRootPath();
    window.location.href = `${rootPath}pages/${role}/dashboard.html`;
  }
}

// Run guard check immediately on load
HMSAuth.enforceGuard();
