import { test, expect, _electron as electron } from '@playwright/test';

test('Electron app boots', async () => {
  const electronApp = await electron.launch({ args: ['.'] });

  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    // This runs in Electron's main process, parameter here is always
    // the result of the require('electron') in the main app script.
    return app.isPackaged;
  });

  expect(isPackaged).toBe(false);

  // Wait for the first BrowserWindow to open
  // and return its Page object
  const window = await electronApp.firstWindow();
  await window.screenshot({ path: 'electron-window.png' });
  
  // You can also access the window title.
  // const title = await window.title();
  
  // expect(title).toBeTruthy();

  await electronApp.close();
});
