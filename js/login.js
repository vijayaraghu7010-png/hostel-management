/* --- Login Controller --- */

const initLoginPage = () => {
  const loginForm = document.getElementById('login-form');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  // 1. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePasswordBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  // 2. Demo Credentials Autofill & Auto-Submit Helper for Mobile & Desktop
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
      
      showToast(`Logging in as ${role.toUpperCase()}...`, 'info');

      // Auto-trigger form submission for seamless 1-tap mobile login
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

  // 3. Login Form Submission Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('email');
      const roleInput = document.getElementById('role');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const role = roleInput ? roleInput.value : '';
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Enter Dashboard';

      // Simple Validation
      if (!email || !password || !role) {
        showToast('Please fill in all fields (Role, Email, Password).', 'warning');
        return;
      }

      // Enter loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span>Verifying...</span>
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
          showToast(`Welcome back, ${result.user.name}!`, 'success');
          
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
