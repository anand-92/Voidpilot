import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Electron app boots', async () => {
  // Use VITE_DEV_SERVER_URL trick to load index.html from dist
  const electronApp = await electron.launch({ 
    args: ['.'],
    env: { ...process.env, VITE_DEV_SERVER_URL: '' }
  });

  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged;
  });
  expect(isPackaged).toBe(false);

  const window = await electronApp.firstWindow();
  
  await window.waitForLoadState('domcontentloaded');
  
  // Dump console logs from the renderer to see why React isn't mounting
  window.on('console', msg => console.log('RENDERER:', msg.text()));
  window.on('pageerror', err => console.log('RENDERER ERROR:', err));
  
  // Wait for React to render
  await window.waitForTimeout(2000);
  
  // screenshot to debug
  await window.screenshot({ path: 'electron-window.png' });
  
  // Test IPC Ping
  const pingResult = await window.evaluate(async () => {
    return await window.electronAPI.ping();
  });
  expect(pingResult).toBe('pong');

  await electronApp.close();
});
