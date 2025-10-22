import { createContext, useContext, useState } from 'react';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  /**
   * Displays an alert or a confirmation modal.
   * @param {string} type - The type of alert ('success', 'error', 'info', 'confirm').
   * @param {string} message - The message to display.
   * @param {Function} [onConfirm] - The callback function for the 'Confirm' button. Required for 'confirm' type.
   * @param {string} [confirmText='Confirm'] - The text for the 'Confirm' button.
   * @param {Function} [onCancel] - The callback function for the 'Cancel' button.
   */
  const showAlert = (type, message, onConfirm, confirmText = 'Confirm', onCancel) => {
    setAlert({ type, message, onConfirm, confirmText, onCancel });
  };

  const hideAlert = () => {
    setAlert(null);
  };

  return (
    <AlertContext.Provider value={{ alert, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);