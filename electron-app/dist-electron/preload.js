const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "electron",
  {
    // Send messages to main process
    send: (channel, data) => {
      const validChannels = ["toMain"];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    // Receive messages from main process
    receive: (channel, func) => {
      const validChannels = ["fromMain"];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, data) => func(data));
      }
    },
    // Remove listener
    removeListener: (channel, func) => {
      const validChannels = ["fromMain"];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  }
);
