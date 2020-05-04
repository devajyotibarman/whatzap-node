const { app, BrowserWindow, Menu, Tray, Notification } = require('electron')
const path = require('path')
const url = require('url')
const windowStateKeeper = require('electron-window-state');
const { dialog } = require('electron')
const settings = require('electron-settings');
const ipcMain = require('electron').ipcMain;
const { session } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let WhatzapWindow
let SettingsWindow
let mainWindowState
let systray

global.sharedObj = {
  global_hide_on_minimize: null,
  global_prompt_on_exit: null,
  global_download_location: app.getPath('downloads')
}


// Modify the user agent for all requests to the following urls.
const filter = {
  urls: ['https://web.whatsapp.com/*']
}

ipcMain.on('save-settings', function (event) {
  console.log('Saving...')
  settings.set('setting_hide_on_minimize', global.sharedObj.global_hide_on_minimize)
  settings.set('setting_prompt_on_exit', global.sharedObj.global_prompt_on_exit)
  settings.set('setting_download_location', global.sharedObj.global_download_location)
});

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (WhatzapWindow) {
    if (WhatzapWindow.isMinimized()) {
      WhatzapWindow.restore();
      
    }
    WhatzapWindow.show()
    WhatzapWindow.focus()
  }
});

if (shouldQuit) {
  app.quit()
  return
}

function createWindow() {
  // Create the browser window.
  WhatzapWindow = new BrowserWindow({title: 'Whatzap', 'x': mainWindowState.x, 'y': mainWindowState.y, 'width': mainWindowState.width, 'height': mainWindowState.height, 'icon': path.join(__dirname, '/resources/icons/main-icon.png') })
  mainWindowState.manage(WhatzapWindow)
  // and load the index.html of the app.
  WhatzapWindow.loadURL("https://web.whatsapp.com/", {userAgent: 'Chrome'})

  WhatzapWindow.webContents.session.on('will-download', (event, item, webContents) => {
    // Set the save path, making Electron not to prompt a save dialog.
    item.setSavePath(global.sharedObj.global_download_location + "/" + item.getFilename())

    item.once('done', (event, state) => {
      if (state === 'completed') {
        let myNotification = new Notification({title: 'Downloaded', body: item.getFilename()})
        myNotification.show();
      } else {
        console.log(`Download failed: ${state}`)
      }
    })
  })

  // Open the DevTools.
  // WhatzapWindow.webContents.openDevTools()
  WhatzapWindow.on('close', function (event) {
    if (global.sharedObj.global_prompt_on_exit) {
      response = dialog.showMessageBox({
        type: 'none',
        title: 'Quitting Whatzap',
        message: 'Do you really want to quit Whatzap?',
        buttons: ['OK', 'Cancel'],
      })
      if (response == 1) {
        event.preventDefault()
      }
    }
  })
  // Emitted when the window is closed.
  WhatzapWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.

    WhatzapWindow = null
  })

  WhatzapWindow.on('minimize', () => {
    if (global.sharedObj.global_hide_on_minimize) {
      WhatzapWindow.hide()
    }
  })
}

function showAboutDialog(menuItem, browserWindow, event) {
  dialog.showMessageBox({
    type: 'none',
    title: 'About Whatzap',
    message: 'Created By Devajyoti Barman',
    buttons: ['OK']
  })
}

function showHideWindow(menuItem, browserWindow, event) {
  if (!WhatzapWindow.isVisible()) {
    WhatzapWindow.show()
  } else {
    WhatzapWindow.hide()
  }
}

function showSettings(menuItem, browserWindow, event) {
  // Create the browser window.
  SettingsWindow = new BrowserWindow({ 'title': 'Whatzap Settings', 'width': 450, 'height': 300, 'icon': path.join(__dirname, '/resources/icons/main-icon.png') })

  // and load the index.html of the app.
  SettingsWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'settings.html'),
    protocol: 'file:',
    slashes: true,
    resizable: false,
    maximizable: false,
    modal: true
  }))

  // Open the DevTools.
  //SettingsWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  SettingsWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    SettingsWindow = null
  })
}

function reloadWindow() {
    WhatzapWindow.loadURL("https://web.whatsapp.com/", {userAgent: 'Chrome'})
}


function createTray() {
  systray = new Tray(path.join(__dirname, '/resources/icons/main-icon.png'))
  const contextMenu = Menu.buildFromTemplate([
    { icon: path.join(__dirname, '/resources/icons/settings-icon.png'), label: 'Settings', type: 'normal', click: showSettings },
    { icon: path.join(__dirname, '/resources/icons/about-icon.png'), label: 'About', type: 'normal', click: showAboutDialog },
    { icon: path.join(__dirname, '/resources/icons/reload-icon.png'), label: 'Reload Window', type: 'normal', click: reloadWindow },
    { icon: path.join(__dirname, '/resources/icons/hide-icon.png'), label: 'Show/Hide', type: 'normal', click: showHideWindow },
    { icon: path.join(__dirname, '/resources/icons/exit-icon.png'), label: 'Exit', type: 'normal', role: 'quit' }
  ])

  systray.setContextMenu(contextMenu)

  systray.on('double-click', () => {
    if (!WhatzapWindow.isVisible()) {
      WhatzapWindow.show()
    } else {
      WhatzapWindow.hide()
    }
  })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  //Set up Settings
  if (settings.has('setting_hide_on_minimize')) {
    global.sharedObj.global_hide_on_minimize = settings.get('setting_hide_on_minimize')
  } else {
    global.sharedObj.global_hide_on_minimize = false
    settings.set('setting_hide_on_minimize', global.sharedObj.global_hide_on_minimize)
  }

  if (settings.has('setting_prompt_on_exit')) {
    global.sharedObj.global_prompt_on_exit = settings.get('setting_prompt_on_exit')
  } else {
    global.sharedObj.global_prompt_on_exit = true
    settings.set('setting_prompt_on_exit', global.sharedObj.global_prompt_on_exit)
  }

  if (settings.has('setting_download_location')) {
    global.sharedObj.global_download_location = settings.get('setting_download_location')
  } else {
    settings.set('setting_download_location', global.sharedObj.global_download_location)
  }

  mainWindowState = windowStateKeeper({ defaultWidth: 800, defaultHeight: 600 });

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  createWindow()
  createTray()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (WhatzapWindow === null) {
    createWindow()
  }
})

app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
})


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.