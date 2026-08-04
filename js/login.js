/* --- LUXURY SPLIT-SCREEN ENTERPRISE LOGIN CONTROLLER --- */

const initLoginPage = () => {
  const loginForm = document.getElementById('login-form');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  // Password Visibility Eye Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePasswordBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  // Quick 1-Tap Demo Credentials Autofill Handler
  const autofillButtons = document.querySelectorAll('.demo-autofill-btn');
  autofillButtons.forEach(btn => {
    const handleAutofill = (e) => {
      e.preventDefault();
      const email = btn.getAttribute('data-email');
      const role = btn.getAttribute('data-role');
      
      const emailInput = document.getElementById('email');
      const roleInput = document.getElementById('role');

      if (emailInput) emailInput.value = email;
      if (passwordInput) passwordInput.value = 'password';
      if (roleInput) roleInput.value = role;
      
      showToast(`Selected ${role.toUpperCase()} Demo Profile`, 'info');

      // Auto-trigger submission for seamless testing
      if (loginForm) {
        if (typeof loginForm.requestSubmit === 'function') {
          loginForm.requestSubmit();
        } else {
          loginForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };

    btn.addEventListener('click', handleAutofill);
  });

  // Login Form Submission Handler (Main Auth Gateway)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('email');
      const roleInput = document.getElementById('role');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const role = roleInput ? roleInput.value : '';
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Sign In';

      // Validation
      if (!email || !password || !role) {
        showToast('Please fill in all required fields (Role, Email, Password).', 'warning');
        return;
      }

      // Enter loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span>Verifying Credentials...</span>
          <i class="fa-solid fa-circle-notch fa-spin"></i>
        `;
      }

      try {
        if (typeof HostelDB !== 'undefined') {
          await HostelDB.init();
        }
        // Perform Login action
        const result = await HMSAuth.login(email, password, role);

        if (result.success) {
          const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);
          if (submitBtn) {
            submitBtn.innerHTML = `
              <span>Redirecting to ${roleTitle} Dashboard...</span>
              <i class="fa-solid fa-spinner fa-spin"></i>
            `;
          }
          showToast(`Welcome back, ${result.user.name}! Redirecting to ${roleTitle} Dashboard...`, 'success');
          
          // Redirect with a tiny delay for user feedback
          setTimeout(() => {
            HMSAuth.redirectToDashboard(role);
          }, 600);
        } else {
          showToast(result.message || 'Invalid credentials or role selection.', 'danger');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
        }
      } catch (error) {
        console.error('Login process failed:', error);
        showToast('An unexpected connection error occurred.', 'danger');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
  initLoginPage();
}
