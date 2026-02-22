import { Tray, Menu, BrowserWindow, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): Tray {
  // Use default Electron icon or custom if available
  const iconPath = path.join(__dirname, '../../icon.png');
  
  tray = new Tray(iconPath || app.getAppPath());
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open MyCluster',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Close App',
      click: () => {
        global.__APP_IS_QUITING = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('MyCluster - LAN API Control');
  tray.setContextMenu(contextMenu);

  // Show window on tray click
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}
