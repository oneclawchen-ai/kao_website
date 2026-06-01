/* =========================================================
   Common JS - Navigation, Countdown, Toast
   ========================================================= */

// Nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Active nav
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });

  // Countdown
  const target = new Date('2026-09-16T09:30:00+08:00').getTime();
  const updateCountdown = () => {
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(v).padStart(2, '0');
    };
    set('cd-days', days);
    set('cd-hours', hours);
    set('cd-mins', mins);
    set('cd-secs', secs);
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);
});

// Toast helper
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${message}</span>`;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 3500);
}
