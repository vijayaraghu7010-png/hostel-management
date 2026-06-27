/* --- Login Controller --- */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  // 1. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePasswordBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  // 2. Demo Credentials Autofill Helper
  const autofillButtons = document.querySelectorAll('.demo-autofill-btn');
  autofillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const role = btn.getAttribute('data-role');
      
      document.getElementById('email').value = email;
      passwordInput.value = 'password';
      document.getElementById('role').value = role;
      
      showToast(`Autofilled credentials for ${role.toUpperCase()}. Click Enter!`, 'success');
    });
  });

  // 2. Login Form Submission Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = passwordInput.value;
      const role = document.getElementById('role').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;

      // Simple Validation
      if (!email || !password || !role) {
        showToast('Please fill in all fields.', 'warning');
        return;
      }

      // Enter loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span>Verifying...</span>
        <i class="fa-solid fa-circle-notch fa-spin"></i>
      `;

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
          }, 800);
        } else {
          showToast(result.message, 'danger');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      } catch (error) {
        console.error('Login process failed:', error);
        showToast('An unexpected connection error occurred.', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }
});
