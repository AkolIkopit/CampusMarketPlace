/*
Module: toast.js
Purpose: Centralized toast/notification helpers used by UI components.
Units: baseToastOptions, showToast helper, exported notify helpers and toastOptions
Flow: Wraps `react-hot-toast` with app-specific styling and convenience functions
  (notify, notifySuccess, notifyError, notifyLoading) used across components.
*/

import { toast } from 'react-hot-toast';

const baseToastOptions = {
  duration: 4500,
  position: 'top-right',
  style: {
    background: 'rgba(13, 27, 42, 0.96)',
    color: '#f7f3ec',
    border: '1px solid #f0a500',
    boxShadow: '0 18px 45px rgba(13, 27, 42, 0.28)',
    borderRadius: '18px',
    padding: '16px 18px',
    fontWeight: 700,
    fontSize: '0.95rem',
    letterSpacing: '0.01em',
  },
  iconTheme: {
    primary: '#f0a500',
    secondary: '#0d1b2a',
  },
};

function showToast(message, action) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    window.alert(message);
    return;
  }

  if (action === 'success') return toast.success(message, baseToastOptions);
  if (action === 'error') return toast.error(message, baseToastOptions);
  if (action === 'loading') return toast.loading(message, baseToastOptions);
  return toast(message, baseToastOptions);
}

export const notify = (message) => showToast(message, 'default');
export const notifySuccess = (message) => showToast(message, 'success');
export const notifyError = (message) => showToast(message, 'error');
export const notifyLoading = (message) => showToast(message, 'loading');
export const toastOptions = baseToastOptions;
