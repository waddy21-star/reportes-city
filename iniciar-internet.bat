@echo off
chcp 65001 >nul
title Sistema de Reportes CityMall - Acceso por Internet

echo.
echo  ============================================
echo    REPORTES CITYMALL - ACCESO POR INTERNET
echo  ============================================
echo.

REM ----- Verificar Node.js -----
node --version >nul 2>&1
if errorlevel 1 goto sin_node
echo  OK - Node.js encontrado:
node --version
echo.

REM ----- Leer configuracion de ngrok (creada una sola vez) -----
if not exist "ngrok-authtoken.txt" goto falta_config
if not exist "ngrok-dominio.txt" goto falta_config
set /p NGROK_TOKEN=<ngrok-authtoken.txt
set /p NGROK_DOMINIO=<ngrok-dominio.txt
if "%NGROK_TOKEN%"=="" goto falta_config
if "%NGROK_DOMINIO%"=="" goto falta_config

REM ----- Crear .env si no existe -----
if exist ".env" goto env_ok
echo  Creando archivo de configuracion .env...
echo DATABASE_URL="file:./prisma/dev.db"> .env
echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo AUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo NEXTAUTH_URL="https://%NGROK_DOMINIO%">> .env
echo  OK - .env creado.
echo.
:env_ok

REM ----- Instalar dependencias si no existen -----
if exist "node_modules" goto deps_ok
echo  Instalando dependencias (puede tardar 1-2 minutos)...
call npm install
if errorlevel 1 goto err_install
echo  OK - dependencias instaladas.
echo.
:deps_ok

REM ----- Preparar base de datos si no existe -----
if exist "prisma\dev.db" goto db_ok
echo  Preparando base de datos...
call npm run db:push
if errorlevel 1 goto err_db
echo  Cargando datos iniciales...
call npm run db:seed
if errorlevel 1 goto err_db
echo  OK - base de datos lista.
echo.
:db_ok

REM ----- Compilar si no existe la carpeta .next -----
if exist ".next" goto build_ok
echo  Compilando la aplicacion (primera vez, ~1 minuto)...
call npm run build
if errorlevel 1 goto err_build
echo  OK - compilacion exitosa.
echo.
:build_ok

REM ----- Descargar ngrok.exe si no existe -----
if exist "ngrok.exe" goto ngrok_ok
echo  Descargando ngrok (primera vez)...
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'; Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force; Remove-Item 'ngrok.zip' } catch { exit 1 }"
if not exist "ngrok.exe" goto err_ngrok
echo  OK - ngrok descargado.
echo.
:ngrok_ok

REM ----- Configurar el token de ngrok (idempotente) -----
echo  Configurando ngrok...
ngrok.exe config add-authtoken %NGROK_TOKEN% >nul 2>&1

echo  ============================================
echo    Iniciando servidor y tunel a internet...
echo.
echo    URL FIJA (desde cualquier red / datos moviles):
echo      https://%NGROK_DOMINIO%
echo.
echo    Usuario:    admin@citymall.com
echo    Contrasena: Admin2024!
echo.
echo    Se abrira una segunda ventana con el tunel.
echo    Para detener TODO cierra ambas ventanas.
echo  ============================================
echo.

REM ----- Levantar el tunel en su propia ventana -----
start "CityMall - Tunel Internet" ngrok.exe http --url=%NGROK_DOMINIO% 3001

REM ----- Levantar la aplicacion en esta ventana -----
call npm run start

echo.
echo  El servidor se detuvo.
echo  Si ves un error arriba, toma una foto de la pantalla.
echo.
pause
goto :eof

:falta_config
echo  ============================================
echo    FALTA CONFIGURAR EL ACCESO POR INTERNET
echo  ============================================
echo.
echo  Antes de usar este archivo debes hacer una
echo  configuracion de UNA SOLA VEZ (5 minutos):
echo.
echo   1) Crea una cuenta gratis en  https://ngrok.com
echo   2) Copia tu "authtoken" del panel y pegalo en el
echo      archivo:   ngrok-authtoken.txt
echo   3) En el panel, crea tu dominio gratis (Domains)
echo      y pega el dominio (ej: reportes-cm.ngrok-free.app)
echo      en el archivo:   ngrok-dominio.txt
echo.
echo  Tienes el paso a paso con imagenes en:
echo      GUIA-ACCESO-INTERNET.md
echo.
pause
goto :eof

:sin_node
echo  ERROR: Node.js no esta instalado.
echo  Descargalo de https://nodejs.org  version LTS
echo  Luego vuelve a ejecutar este script.
echo.
pause
goto :eof

:err_install
echo  ERROR durante npm install.
pause
goto :eof

:err_db
echo  ERROR al preparar la base de datos.
pause
goto :eof

:err_build
echo  ERROR al compilar.
pause
goto :eof

:err_ngrok
echo  ERROR al descargar ngrok.
echo  Revisa tu conexion a internet e intenta de nuevo.
pause
goto :eof
