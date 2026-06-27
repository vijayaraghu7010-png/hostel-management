/* --- Authentication & Session Guards --- */

class HMSAuth {
  static getCurrentUser() {
    return JSON.parse(localStorage.getItem('hms_current_user')) || null;
  }

  static async login(email, password, role) {
    try {
      const users = await HostelDB.getAllUsers();
      const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
      
      if (matchedUser) {
        localStorage.setItem('hms_current_user', JSON.stringify(matchedUser));
        return { success: true, user: matchedUser };
      }
      return { success: false, message: 'Invalid credentials or role selection.' };
    } catch (error) {
      console.error('Login error, checking localStorage fallback:', error);
      const users = HostelDB.getData('hms_users');
      const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
      
      if (matchedUser) {
        localStorage.setItem('hms_current_user', JSON.stringify(matchedUser));
        return { success: true, user: matchedUser };
      }
      return { success: false, message: 'Invalid credentials or role selection.' };
    }
  }

  static logout() {
    localStorage.removeItem('hms_current_user');
    const rootPath = document.body.getAttribute('data-root-path') || '';
    window.location.href = `${rootPath}index.html`;
  }

  static enforceGuard() {
    // Skip guard for the login page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('pro/')) {
      // If user is already logged in, redirect them to their respective dashboard
      const user = this.getCurrentUser();
      if (user) {
        this.redirectToDashboard(user.role);
      }
      return;
    }

    const user = this.getCurrentUser();
    const rootPath = document.body.getAttribute('data-root-path') || '';
    
    if (!user) {
      window.location.href = `${rootPath}index.html`;
      return;
    }

    // Verify role matches folder path
    const path = window.location.pathname;
    const rolePaths = ['student', 'warden', 'teacher', 'hod', 'ao', 'principal'];
    
    // Check if path contains a role folder that the user is NOT authorized to access
    for (const rPath of rolePaths) {
      if (path.includes(`/pages/${rPath}/`) && user.role !== rPath) {
        console.warn(`Unauthorized access attempt by ${user.role} to ${rPath} path.`);
        this.redirectToDashboard(user.role);
        return;
      }
    }
  }

  static redirectToDashboard(role) {
    const rootPath = document.body.getAttribute('data-root-path') || '';
    window.location.href = `${rootPath}pages/${role}/dashboard.html`;
  }
}

// Run guard check immediately on load
HMSAuth.enforceGuard();
