// preload.js
import { contextBridge } from 'electron';

// Example of dynamic import: only load a helper when needed
async function getHelper() {
  const { default: someHelper } = await import('./helper.js');
  return someHelper;
}

contextBridge.exposeInMainWorld('calendarApp', {
  version: '1.0.0',
  loadHelper: async () => {
    const helper = await getHelper();
    return helper();
  }
});
