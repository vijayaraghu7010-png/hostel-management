/* --- Toast Dispatcher & Notification Hub --- */

function showToast(message, type = 'info') {
  // Ensure container exists
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast card
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Decide icon
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  if (type === 'danger') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
    <span class="toast-message">${message}</span>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  `;

  // Append to wrapper
  container.appendChild(toast);

  // Close event listener
  const closeBtn = toast.querySelector('.toast-close');
  const dismissToast = () => {
    toast.classList.add('toast-closing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  };
  
  closeBtn.addEventListener('click', dismissToast);

  // Auto remove
  setTimeout(dismissToast, 4000);
}

// Populate the navbar notifications dropdown
async function populateNavbarNotifications() {
  const notifDot = document.getElementById('notification-dot');
  const notifList = document.getElementById('navbar-notification-list');
  if (!notifList) return;

  try {
    const list = await HostelDB.getNotifications();
    const unread = list.filter(n => !n.read);

    // Control dot visibility
    if (notifDot) {
      if (unread.length > 0) {
        notifDot.classList.remove('hidden');
      } else {
        notifDot.classList.add('hidden');
      }
    }

    // Populate list
    if (list.length === 0) {
      notifList.innerHTML = `
        <div class="dropdown-item text-center text-muted" style="font-size: 0.75rem;">
          No notifications
        </div>
      `;
      return;
    }

    notifList.innerHTML = list.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <span class="notification-text" style="font-weight: ${n.read ? '500' : '600'};">${n.title}</span>
        <span class="notification-text" style="color: var(--text-secondary); font-size: 0.75rem;">${n.text}</span>
        <span class="notification-time">${n.time}</span>
      </div>
    `).join('');

    // Add click handler to read notifications
    notifList.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async function() {
        const id = parseInt(this.getAttribute('data-id'));
        try {
          await HostelDB.markNotificationRead(id);
          await populateNavbarNotifications();
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

// Add system helper to add notification
async function addSystemNotification(title, text) {
  const newNotif = {
    title: title,
    text: text,
    time: 'Just now',
    read: false
  };
  try {
    await HostelDB.addNotification(newNotif);
    await populateNavbarNotifications();
    showToast(`${title}: ${text}`, 'info');
  } catch (err) {
    console.error('Failed to add system notification:', err);
    // Local fallback/alert toast
    showToast(`${title}: ${text}`, 'info');
  }
}
