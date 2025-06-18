@echo off
title Four One Solutions - Instalador
color 0a

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    FOUR ONE SOLUTIONS                        ║
echo  ║                  Sistema ERP Empresarial                     ║
echo  ║                                                              ║
echo  ║           Instalador para Windows - Version 1.0             ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Este instalador creará accesos directos para Four One Solutions
echo  en tu sistema Windows.
echo.
echo  Características:
echo  • Acceso directo en el escritorio
echo  • Acceso directo en el menú inicio
echo  • Configuración de navegador predeterminado
echo  • Modo aplicación web (sin barras del navegador)
echo.
pause

echo.
echo  [INFO] Iniciando instalación...
echo.

:: Create desktop shortcut
set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT_DESKTOP=%DESKTOP%\Four One Solutions.url

echo  [1/4] Creando acceso directo en el escritorio...
echo [InternetShortcut] > "%SHORTCUT_DESKTOP%"
echo URL=https://fourone.com.do >> "%SHORTCUT_DESKTOP%"
echo IconFile=https://fourone.com.do/favicon.ico >> "%SHORTCUT_DESKTOP%"
echo IconIndex=0 >> "%SHORTCUT_DESKTOP%"

:: Create start menu shortcut
set STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
set SHORTCUT_START=%STARTMENU%\Four One Solutions.url

echo  [2/4] Creando acceso directo en el menú inicio...
echo [InternetShortcut] > "%SHORTCUT_START%"
echo URL=https://fourone.com.do >> "%SHORTCUT_START%"
echo IconFile=https://fourone.com.do/favicon.ico >> "%SHORTCUT_START%"
echo IconIndex=0 >> "%SHORTCUT_START%"

:: Create app mode shortcut for Chrome
set CHROME_SHORTCUT=%DESKTOP%\Four One Solutions (App).lnk
echo  [3/4] Configurando modo aplicación...

:: Create PowerShell script to create Chrome app shortcut
echo $WshShell = New-Object -comObject WScript.Shell > "%TEMP%\create_shortcut.ps1"
echo $Shortcut = $WshShell.CreateShortcut("%CHROME_SHORTCUT%") >> "%TEMP%\create_shortcut.ps1"
echo $Shortcut.TargetPath = "chrome.exe" >> "%TEMP%\create_shortcut.ps1"
echo $Shortcut.Arguments = "--app=https://fourone.com.do --disable-web-security --user-data-dir=%TEMP%\FourOne" >> "%TEMP%\create_shortcut.ps1"
echo $Shortcut.WorkingDirectory = "%ProgramFiles%\Google\Chrome\Application" >> "%TEMP%\create_shortcut.ps1"
echo $Shortcut.IconLocation = "https://fourone.com.do/favicon.ico" >> "%TEMP%\create_shortcut.ps1"
echo $Shortcut.Save() >> "%TEMP%\create_shortcut.ps1"

powershell -ExecutionPolicy Bypass -File "%TEMP%\create_shortcut.ps1" >nul 2>&1

echo  [4/4] Finalizando instalación...
del "%TEMP%\create_shortcut.ps1" >nul 2>&1

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                   ¡INSTALACIÓN COMPLETADA!                  ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Se han creado los siguientes accesos directos:
echo  • Escritorio: Four One Solutions.url
echo  • Menú Inicio: Four One Solutions.url  
echo  • Escritorio: Four One Solutions (App).lnk (Modo App)
echo.
echo  Para mejor experiencia, recomendamos usar el modo App que
echo  abre la aplicación sin las barras del navegador.
echo.
echo  ¿Desea abrir Four One Solutions ahora? (S/N)
set /p choice="Ingrese su opción: "

if /i "%choice%"=="S" (
    echo.
    echo  Abriendo Four One Solutions...
    start https://fourone.com.do
)

echo.
echo  ¡Gracias por elegir Four One Solutions!
echo  Para soporte técnico visite: https://fourone.com.do/soporte
echo.
timeout /t 5 >nul
exit