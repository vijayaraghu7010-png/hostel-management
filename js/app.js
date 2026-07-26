/* --- HMS Layout Orchestrator & UI Bindings --- */

document.addEventListener('DOMContentLoaded', async () => {
  const rootPath = document.body.getAttribute('data-root-path') || '';
  
  // 1. Inject components dynamically
  const sidebarContainer = document.getElementById('sidebar-container');
  const navbarContainer = document.getElementById('navbar-container');
  const footerContainer = document.getElementById('footer-container');

  if (sidebarContainer) {
    await loadComponent('#sidebar-container', `${rootPath}components/sidebar.html`);
  }
  if (navbarContainer) {
    await loadComponent('#navbar-container', `${rootPath}components/navbar.html`);
  }
  if (footerContainer) {
    await loadComponent('#footer-container', `${rootPath}components/footer.html`);
  }

  // 2. Initialize UI Features
  await initializeGlobalUI();

  // 3. Register all tables for auto-responsive card mode on mobile
  //    Runs immediately, then again after 800ms to catch late-rendered tables
  if (typeof initResponsiveTables === 'function') {
    initResponsiveTables();
    setTimeout(initResponsiveTables, 800);
    setTimeout(initResponsiveTables, 2000);
  }
});

async function initializeGlobalUI() {
  const currentUser = HMSAuth.getCurrentUser();
  if (!currentUser) return;

  const rootPath = document.body.getAttribute('data-root-path') || '';

  // --- Theme Syncing ---
  const activeTheme = localStorage.getItem('hms_theme') || 'light';
  document.body.className = `theme-${activeTheme}`;
  
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    // Set initial icon
    themeBtn.innerHTML = activeTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    
    themeBtn.addEventListener('click', () => {
      const newTheme = document.body.classList.contains('theme-light') ? 'dark' : 'light';
      document.body.className = `theme-${newTheme}`;
      localStorage.setItem('hms_theme', newTheme);
      themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      showToast(`Switched to ${newTheme} theme`, 'info');
    });
  }

  // --- Sidebar Role and Link Marking ---
  const roleBadge = document.getElementById('sidebar-role-badge');
  if (roleBadge) {
    roleBadge.textContent = currentUser.role.toUpperCase();
  }

  // Show active role menu
  const activeMenu = document.getElementById(`menu-${currentUser.role}`);
  if (activeMenu) {
    activeMenu.style.display = 'flex';
  }

  // Highlight active link
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && currentPath.endsWith(href) && link.closest(`.sidebar-menu`).id === `menu-${currentUser.role}`) {
      link.classList.add('active');
    }
  });

  // --- Navbar Profile Info ---
  const avatarEl = document.getElementById('navbar-user-avatar');
  const nameEl = document.getElementById('navbar-user-name');
  const roleEl = document.getElementById('navbar-user-role');

  if (avatarEl) {
    avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
  }
  if (nameEl) {
    nameEl.textContent = currentUser.name;
  }
  if (roleEl) {
    roleEl.textContent = currentUser.role === 'ao' ? 'Admin Officer' : currentUser.role;
  }

  // --- Mobile Off-Canvas Sidebar & Gesture Controls ---
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.toggle('sidebar-open');
    });

    overlay.addEventListener('click', closeSidebar, { passive: true });

    document.addEventListener('click', (e) => {
      const sidebarLink = e.target.closest('.sidebar-link');
      if (sidebarLink) {
        closeSidebar();
      }
    });

    // Touch Swipe to Close Sidebar (Left swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = Math.abs(touchEndY - touchStartY);

      // Swiping left from open sidebar
      if (document.body.classList.contains('sidebar-open') && diffX < -50 && diffY < 100) {
        closeSidebar();
      }
    }, { passive: true });
  }

  // --- Dropdowns Controls ---
  const profileMenuBtn = document.getElementById('user-profile-menu-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const notifBellBtn = document.getElementById('notification-bell-btn');
  const notifDropdown = document.getElementById('notifications-dropdown');

  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
      if (notifDropdown) notifDropdown.classList.remove('active');
    });
  }

  if (notifBellBtn && notifDropdown) {
    notifBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
      if (profileDropdown) profileDropdown.classList.remove('active');
    });
  }

  // Close dropdowns on clicking outside
  document.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.classList.remove('active');
    if (notifDropdown) notifDropdown.classList.remove('active');
  });

  // --- Dynamic Page Title ---
  const pageTitleEl = document.getElementById('navbar-page-title');
  if (pageTitleEl) {
    const title = document.title.replace(' - Hostel ERP', '');
    pageTitleEl.textContent = title;
  }

  // --- Logout Event Listeners ---
  const logoutSidebar = document.getElementById('btn-logout-sidebar');
  const logoutNavbar = document.getElementById('btn-logout-navbar');
  const logoutDirect = document.getElementById('btn-logout-direct');

  if (logoutSidebar) {
    logoutSidebar.addEventListener('click', (e) => {
      e.preventDefault();
      HMSAuth.logout();
    });
  }
  if (logoutNavbar) {
    logoutNavbar.addEventListener('click', (e) => {
      e.preventDefault();
      HMSAuth.logout();
    });
  }
  if (logoutDirect) {
    logoutDirect.addEventListener('click', (e) => {
      e.preventDefault();
      HMSAuth.logout();
    });
  }

  // Profile Redirect link
  const profileRedirectBtn = document.getElementById('btn-profile-redirect');
  if (profileRedirectBtn) {
    profileRedirectBtn.addEventListener('click', () => {
      if (currentUser.role === 'student') {
        window.location.href = `${rootPath}pages/student/profile.html`;
      } else {
        showToast('Profile management is active only for Students.', 'info');
      }
    });
  }

  // Populate system notification listings initially
  await populateNavbarNotifications();
}

/* --- REUSABLE HMS MODAL SYSTEM CONTROLLER --- */
window.HMSModal = {
  open(modalIdOrElement) {
    let modal = null;
    if (typeof modalIdOrElement === 'string') {
      const cleanId = modalIdOrElement.replace(/^#/, '');
      modal = document.getElementById(cleanId) || document.querySelector(modalIdOrElement);
    } else {
      modal = modalIdOrElement;
    }
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Focus first interactive input inside modal
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea, button:not(.modal-close)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  },

  close(modalIdOrElement) {
    let modal = null;
    if (typeof modalIdOrElement === 'string') {
      const cleanId = modalIdOrElement.replace(/^#/, '');
      modal = document.getElementById(cleanId) || document.querySelector(modalIdOrElement);
    } else {
      modal = modalIdOrElement;
    }
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('active');
    modal.classList.add('hidden');
    
    // Check if any other modals are active before unlocking scroll
    const activeModals = document.querySelectorAll('.modal-backdrop.active, .modal-backdrop[style*="display: flex"], .modal-overlay.active, .modal-overlay[style*="display: flex"]');
    if (!activeModals || activeModals.length === 0) {
      document.body.classList.remove('modal-open');
    }
  },

  setLoading(buttonElement, isLoading, loadingText = 'Processing...') {
    if (!buttonElement) return;
    if (isLoading) {
      buttonElement.dataset.originalHtml = buttonElement.innerHTML;
      buttonElement.disabled = true;
      buttonElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${loadingText}</span>`;
    } else {
      if (buttonElement.dataset.originalHtml) {
        buttonElement.innerHTML = buttonElement.dataset.originalHtml;
      }
      buttonElement.disabled = false;
    }
  }
};

// Global Keyboard Escape key dismissal for open modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModals = document.querySelectorAll('.modal-backdrop, .modal-overlay');
    activeModals.forEach(m => {
      if (m.style.display === 'flex' || m.classList.contains('active')) {
        HMSModal.close(m);
      }
    });
  }
});

// Global Backdrop click listener
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay')) {
    HMSModal.close(e.target);
  }
});

