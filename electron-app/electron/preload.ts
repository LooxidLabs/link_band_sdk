const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Send messages to main process
    send: (channel: string, data: any) => {
      // Whitelist channels
      const validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    // Receive messages from main process
    receive: (channel: string, func: (data: any) => void) => {
      const validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, data) => func(data));
      }
    },
    // Remove listener
    removeListener: (channel: string, func: (data: any) => void) => {
      const validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  }
); 