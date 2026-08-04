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
      if (currentUser && currentUser.role) {
        window.location.href = `${rootPath}pages/${currentUser.role}/profile.html`;
      }
    });
  }

  // Auto-initialize Profile view if on profile page
  if (window.location.pathname.includes('profile.html')) {
    initProfilePage(currentUser);
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

/* --- UNIVERSAL PROFILE MANAGEMENT & EDIT CONTROLLER --- */
function initProfilePage(currentUser) {
  if (!currentUser) return;

  // 1. Initial hydration of profile fields
  hydrateProfileFields(currentUser);

  // 2. Bind Edit Profile Modal Triggers
  const editBtn = document.getElementById('btn-edit-profile');
  const closeBtn = document.getElementById('btn-close-edit-profile-modal');
  const cancelBtn = document.getElementById('btn-cancel-edit-profile');
  const editForm = document.getElementById('edit-profile-form');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      populateEditForm(currentUser);
      HMSModal.open('edit-profile-modal');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      HMSModal.close('edit-profile-modal');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      HMSModal.close('edit-profile-modal');
    });
  }

  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      await handleSaveProfile(currentUser);
    };
  }
}

function hydrateProfileFields(user) {
  if (!user) return;
  
  let contactObj = {};
  if (user.contact) {
    if (typeof user.contact === 'object') {
      contactObj = user.contact;
    } else if (typeof user.contact === 'string') {
      try {
        if (user.contact.trim().startsWith('{')) {
          contactObj = JSON.parse(user.contact);
        } else {
          contactObj = { studentPhone: user.contact, phone: user.contact };
        }
      } catch (e) {
        contactObj = { studentPhone: user.contact, phone: user.contact };
      }
    }
  }

  const getVal = (val) => {
    if (val === undefined || val === null || val === '' || val === '{}' || (typeof val === 'object' && Object.keys(val).length === 0)) {
      return 'Not Available';
    }
    return val;
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr || dateStr === 'Not Available') return 'Not Available';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const formatRoleName = (role) => {
    switch (role) {
      case 'student': return 'Student / Hosteller';
      case 'warden': return 'Chief Warden';
      case 'teacher': return 'Faculty Member';
      case 'hod': return 'Head of Department';
      case 'ao': return 'Administrative Officer';
      case 'principal': return 'College Principal';
      case 'parent': return 'Parent / Guardian';
      default: return role ? role.toUpperCase() : 'User';
    }
  };

  // Header / Bio Card
  const profileName = document.getElementById('profile-name');
  if (profileName) profileName.textContent = getVal(user.name);

  const profileAvatar = document.getElementById('profile-avatar-big');
  if (profileAvatar) profileAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  const roleBadge = document.getElementById('profile-role-badge');
  if (roleBadge) roleBadge.textContent = formatRoleName(user.role);

  // Credentials List
  const profileNameDetail = document.getElementById('profile-name-detail');
  if (profileNameDetail) profileNameDetail.textContent = getVal(user.name);

  const profileReg = document.getElementById('profile-reg');
  if (profileReg) profileReg.textContent = getVal(user.regNo || user.email);

  const profileRole = document.getElementById('profile-role');
  if (profileRole) profileRole.textContent = formatRoleName(user.role);

  const profileDept = document.getElementById('profile-dept');
  if (profileDept) profileDept.textContent = getVal(user.dept);

  const profileRoom = document.getElementById('profile-room');
  if (profileRoom) profileRoom.textContent = getVal(user.room);

  const profileEmail = document.getElementById('profile-email');
  if (profileEmail) profileEmail.textContent = getVal(user.email);

  const profilePhone = document.getElementById('profile-phone') || document.getElementById('profile-student-phone');
  if (profilePhone) profilePhone.textContent = getVal(contactObj.studentPhone || contactObj.phone || (typeof user.contact === 'string' && !user.contact.startsWith('{') ? user.contact : ''));

  const profileParentPhone = document.getElementById('profile-parent-phone');
  if (profileParentPhone) profileParentPhone.textContent = getVal(contactObj.parentPhone || user.parentPhone);

  const profileGender = document.getElementById('profile-gender');
  if (profileGender) profileGender.textContent = getVal(contactObj.gender || user.gender);

  const profileDob = document.getElementById('profile-dob');
  if (profileDob) profileDob.textContent = formatDateStr(getVal(contactObj.dob || user.dob));

  const profileParentName = document.getElementById('profile-parent-name');
  if (profileParentName) profileParentName.textContent = getVal(contactObj.parentName || user.parentName);

  const profileBed = document.getElementById('profile-bed');
  if (profileBed) profileBed.textContent = getVal(contactObj.bedNo || user.bedNo);

  const profileAddress = document.getElementById('profile-address');
  if (profileAddress) profileAddress.textContent = getVal(contactObj.address || user.address);

  // Summary badges on left card
  const residenceCard = document.getElementById('profile-residence-card');
  if (residenceCard) {
    residenceCard.textContent = user.room ? user.room : (user.dept ? user.dept : 'KVCET Campus');
  }
  const statusCard = document.getElementById('profile-status-card');
  if (statusCard) {
    statusCard.textContent = getVal(contactObj.status || 'Active Account');
  }

  // Toggle student-specific fields
  const studentFields = document.querySelectorAll('.student-field');
  studentFields.forEach(el => {
    el.style.display = user.role === 'student' ? '' : 'none';
  });
}

function populateEditForm(user) {
  if (!user) return;

  let contactObj = {};
  if (user.contact) {
    if (typeof user.contact === 'object') {
      contactObj = user.contact;
    } else if (typeof user.contact === 'string') {
      try {
        if (user.contact.trim().startsWith('{')) {
          contactObj = JSON.parse(user.contact);
        } else {
          contactObj = { studentPhone: user.contact, phone: user.contact };
        }
      } catch (e) {
        contactObj = { studentPhone: user.contact, phone: user.contact };
      }
    }
  }

  const nameInput = document.getElementById('edit-profile-name');
  if (nameInput) nameInput.value = user.name || '';

  const emailInput = document.getElementById('edit-profile-email');
  if (emailInput) emailInput.value = user.email || '';

  const phoneInput = document.getElementById('edit-profile-phone');
  if (phoneInput) phoneInput.value = contactObj.studentPhone || contactObj.phone || (typeof user.contact === 'string' && !user.contact.startsWith('{') ? user.contact : '') || '';

  const deptInput = document.getElementById('edit-profile-dept');
  if (deptInput) deptInput.value = user.dept || '';

  const genderSelect = document.getElementById('edit-profile-gender');
  if (genderSelect) genderSelect.value = contactObj.gender || user.gender || '';

  const dobInput = document.getElementById('edit-profile-dob');
  if (dobInput) dobInput.value = contactObj.dob || user.dob || '';

  const addressInput = document.getElementById('edit-profile-address');
  if (addressInput) addressInput.value = contactObj.address || user.address || '';

  const parentNameInput = document.getElementById('edit-profile-parent-name');
  if (parentNameInput) parentNameInput.value = contactObj.parentName || user.parentName || '';

  const parentPhoneInput = document.getElementById('edit-profile-parent-phone');
  if (parentPhoneInput) parentPhoneInput.value = contactObj.parentPhone || user.parentPhone || '';

  const passInput = document.getElementById('edit-profile-password');
  if (passInput) passInput.value = '';

  const studentExtra = document.getElementById('student-extra-fields');
  if (studentExtra) {
    studentExtra.style.display = user.role === 'student' ? 'block' : 'none';
  }
}

async function handleSaveProfile(currentUser) {
  const saveBtn = document.getElementById('btn-save-profile-submit');
  HMSModal.setLoading(saveBtn, true, 'Saving changes...');

  try {
    const newName = document.getElementById('edit-profile-name').value.trim();
    const newEmail = document.getElementById('edit-profile-email').value.trim();
    const newPhone = document.getElementById('edit-profile-phone') ? document.getElementById('edit-profile-phone').value.trim() : '';
    const newDept = document.getElementById('edit-profile-dept') ? document.getElementById('edit-profile-dept').value.trim() : '';
    const newGender = document.getElementById('edit-profile-gender') ? document.getElementById('edit-profile-gender').value : '';
    const newDob = document.getElementById('edit-profile-dob') ? document.getElementById('edit-profile-dob').value : '';
    const newAddress = document.getElementById('edit-profile-address') ? document.getElementById('edit-profile-address').value.trim() : '';
    const newPassword = document.getElementById('edit-profile-password') ? document.getElementById('edit-profile-password').value.trim() : '';

    const newParentName = document.getElementById('edit-profile-parent-name') ? document.getElementById('edit-profile-parent-name').value.trim() : '';
    const newParentPhone = document.getElementById('edit-profile-parent-phone') ? document.getElementById('edit-profile-parent-phone').value.trim() : '';

    if (!newName || !newEmail) {
      if (typeof showToast === 'function') showToast('Full Name and Email are required.', 'error');
      HMSModal.setLoading(saveBtn, false);
      return;
    }

    let contactObj = {};
    if (typeof currentUser.contact === 'object' && currentUser.contact !== null) {
      contactObj = { ...currentUser.contact };
    } else if (typeof currentUser.contact === 'string') {
      try {
        if (currentUser.contact.trim().startsWith('{')) contactObj = JSON.parse(currentUser.contact);
        else contactObj = { studentPhone: currentUser.contact, phone: currentUser.contact };
      } catch (e) {
        contactObj = { studentPhone: currentUser.contact, phone: currentUser.contact };
      }
    }

    contactObj.studentPhone = newPhone;
    contactObj.phone = newPhone;
    contactObj.gender = newGender;
    contactObj.dob = newDob;
    contactObj.address = newAddress;
    if (newParentName) contactObj.parentName = newParentName;
    if (newParentPhone) contactObj.parentPhone = newParentPhone;

    const updatedUser = {
      ...currentUser,
      name: newName,
      email: newEmail,
      dept: newDept || currentUser.dept || '',
      gender: newGender || currentUser.gender || '',
      dob: newDob || currentUser.dob || '',
      address: newAddress || currentUser.address || '',
      contact: contactObj
    };

    if (newPassword) {
      updatedUser.password = newPassword;
    }

    // 1. Update current user in session
    localStorage.setItem('hms_current_user', JSON.stringify(updatedUser));

    // 2. Update hms_users in LocalStorage
    try {
      let users = JSON.parse(localStorage.getItem('hms_users')) || [];
      const idx = users.findIndex(u => (u.regNo && currentUser.regNo && u.regNo === currentUser.regNo) || (u.email && u.email.toLowerCase() === currentUser.email.toLowerCase()));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updatedUser };
      } else {
        users.push(updatedUser);
      }
      localStorage.setItem('hms_users', JSON.stringify(users));
    } catch (err) {
      console.warn('Error updating hms_users list:', err);
    }

    // 3. Sync navbar display
    const avatarEl = document.getElementById('navbar-user-avatar');
    const nameEl = document.getElementById('navbar-user-name');
    if (avatarEl) avatarEl.textContent = updatedUser.name.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = updatedUser.name;

    // 4. Hydrate profile fields immediately
    hydrateProfileFields(updatedUser);

    HMSModal.close('edit-profile-modal');
    if (typeof showToast === 'function') {
      showToast('Profile updated successfully!', 'success');
    }
  } catch (err) {
    console.error('Save profile error:', err);
    if (typeof showToast === 'function') showToast('Failed to save profile changes.', 'error');
  } finally {
    HMSModal.setLoading(saveBtn, false);
  }
}


