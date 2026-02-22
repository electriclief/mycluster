import { Tray, Menu, BrowserWindow, app, nativeImage, NativeImage } from 'electron';

let tray: Tray | null = null;

// Create a simple colored icon programmatically
function createTrayIcon(): NativeImage {
  const size = 16;
  const color = '#e94560'; // Match app theme color
  
  // Create SVG data URI for a simple rounded square
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}" rx="2"/>
    </svg>
  `;
  
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  );
}

export function setupTray(mainWindow: BrowserWindow): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  
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
