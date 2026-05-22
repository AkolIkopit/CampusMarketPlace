import { toast } from 'react-hot-toast';
import { notify, notifyError, notifyLoading, notifySuccess, toastOptions } from './toast';

jest.mock('react-hot-toast', () => {
  const baseToast = jest.fn();
  baseToast.success = jest.fn();
  baseToast.error = jest.fn();
  baseToast.loading = jest.fn();
  return { toast: baseToast };
});

describe('toast helpers', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAlert = window.alert;
  const originalProcess = global.process;

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(global, 'process', {
      value: originalProcess,
      configurable: true
    });
    Object.defineProperty(originalProcess.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    });
    window.alert = originalAlert;
  });

  it('uses alert instead of toast libraries in test mode', () => {
    notifySuccess('Saved');

    expect(window.alert).toHaveBeenCalledWith('Saved');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('delegates each notification type to react-hot-toast outside test mode', () => {
    Object.defineProperty(global, 'process', {
      value: undefined,
      configurable: true
    });

    notify('General');
    notifySuccess('Saved');
    notifyError('Failed');
    notifyLoading('Loading');

    expect(toast).toHaveBeenCalledWith('General', toastOptions);
    expect(toast.success).toHaveBeenCalledWith('Saved', toastOptions);
    expect(toast.error).toHaveBeenCalledWith('Failed', toastOptions);
    expect(toast.loading).toHaveBeenCalledWith('Loading', toastOptions);
  });
});