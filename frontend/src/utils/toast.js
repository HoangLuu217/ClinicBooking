// Lightweight reusable toast utility without extra deps
// Usage: import { toast } from '../utils/toast'; toast.info('Message');

const TOAST_CONTAINER_ID = 'app-toast-container';
let TOAST_POSITION = 'bottom-right'; // 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'

function ensureContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.position = 'fixed';
    // position
    const applyPosition = () => {
      // reset first
      container.style.top = '';
      container.style.right = '';
      container.style.bottom = '';
      container.style.left = '';
      switch (TOAST_POSITION) {
        case 'top-left':
          container.style.top = '16px';
          container.style.left = '16px';
          break;
        case 'bottom-left':
          container.style.bottom = '16px';
          container.style.left = '16px';
          break;
        case 'bottom-right':
          container.style.bottom = '16px';
          container.style.right = '16px';
          break;
        default: // top-right
          container.style.top = '16px';
          container.style.right = '16px';
      }
    };
    applyPosition();
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
    // store function for later re-apply on position change
    container.__applyPosition = applyPosition;
  }
  return container;
}

function createToastElement(message, variant = 'info') {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.style.transition = 'opacity 200ms ease, transform 200ms ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(-8px)';
  el.style.maxWidth = '480px';
  el.style.minWidth = '320px';
  el.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.1)';
  el.style.borderRadius = '10px';
  el.style.padding = '14px 16px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '12px';

  // Default colors
  let background = '#2563eb'; // info
  let textColor = '#fff';
  let border = 'none';

  if (variant === 'info') {
    background = '#2563eb'; // blue-600
    textColor = '#fff';
  } else if (variant === 'success') {
    background = '#16a34a'; // green-600
    textColor = '#fff';
  } else if (variant === 'warning') {
    background = '#fef3c7'; // amber-100 (light)
    textColor = '#92400e'; // amber-800
    border = '1px solid #d97706'; // amber-600
  } else if (variant === 'error') {
    // Light red background with red border and dark red text
    background = '#fee2e2'; // red-100
    textColor = '#7f1d1d'; // red-800
    border = '1px solid #ef4444'; // red-500
  } else if (variant === 'light') {
    background = '#f3f4f6'; // gray-100
    textColor = '#111827';
  }

  el.style.background = background;
  el.style.color = textColor;
  el.style.border = border;

  const span = document.createElement('span');
  span.style.flex = '1 1 auto';
  span.style.fontSize = '16px';
  span.style.lineHeight = '22px';
  span.style.fontWeight = '500';
  span.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'inherit';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '20px';
  closeBtn.textContent = '×';

  closeBtn.addEventListener('click', () => fadeOutAndRemove(el));

  el.appendChild(span);
  el.appendChild(closeBtn);
  return el;
}

function fadeIn(el) {
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

function fadeOutAndRemove(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(-8px)';
  setTimeout(() => {
    el.remove();
    const container = document.getElementById(TOAST_CONTAINER_ID);
    if (container && container.childElementCount === 0) {
      container.remove();
    }
  }, 220);
}

function show(message, variant = 'info', durationMs = 2500) {
  const container = ensureContainer();
  const toastEl = createToastElement(message, variant);
  container.appendChild(toastEl);
  // trigger fade-in
  setTimeout(() => fadeIn(toastEl), 10);
  // auto-dismiss
  if (durationMs > 0) {
    setTimeout(() => fadeOutAndRemove(toastEl), durationMs);
  }
}

export const toast = {
  info: (msg, ms) => show(msg, 'info', ms ?? 2500),
  success: (msg, ms) => show(msg, 'success', ms ?? 2500),
  warning: (msg, ms) => show(msg, 'warning', ms ?? 3000),
  error: (msg, ms) => show(msg, 'error', ms ?? 3500),
  setPosition: (pos) => {
    TOAST_POSITION = pos;
    const container = document.getElementById(TOAST_CONTAINER_ID);
    if (container && typeof container.__applyPosition === 'function') {
      container.__applyPosition();
    }
  }
};

export default toast;


