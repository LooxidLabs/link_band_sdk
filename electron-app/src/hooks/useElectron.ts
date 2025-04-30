import { useEffect, useState } from 'react';

declare global {
  interface Window {
    electron: {
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (data: any) => void) => void;
      removeListener: (channel: string, func: (data: any) => void) => void;
    };
  }
}

export const useElectron = () => {
  const [response, setResponse] = useState<any>(null);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);

  useEffect(() => {
    // Check if electron API is available
    setIsElectronAvailable(!!window.electron);
  }, []);

  const sendMessage = (data: any) => {
    if (window.electron) {
      window.electron.send('toMain', data);
    } else {
      console.warn('Electron API is not available');
    }
  };

  useEffect(() => {
    if (!window.electron) return;

    const handleResponse = (data: any) => {
      setResponse(data);
    };

    window.electron.receive('fromMain', handleResponse);

    return () => {
      window.electron?.removeListener('fromMain', handleResponse);
    };
  }, []);

  return { sendMessage, response, isElectronAvailable };
}; 