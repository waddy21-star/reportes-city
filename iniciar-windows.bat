@echo off
chcp 65001 >nul
title Sistema de Reportes CityMall

echo.
echo  ============================================
echo    SISTEMA DE REPORTES - CITYMALL
echo  ============================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 goto sin_node
echo  OK - Node.js encontrado:
node --version
echo.

REM Crear .env si no existe
if exist ".env" goto env_ok
echo  Creando archivo de configuracion .env...
echo DATABASE_URL="file:./prisma/dev.db"> .env
echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo AUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo NEXTAUTH_URL="http://localhost:3001">> .env
echo  OK - .env creado.
echo.
:env_ok

REM Instalar dependencias si no existen
if exist "node_modules" goto deps_ok
echo  Instalando dependencias (puede tardar 1-2 minutos)...
call npm install
if errorlevel 1 goto err_install
echo  OK - dependencias instaladas.
echo.
:deps_ok

REM Preparar base de datos si no existe
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

REM Compilar si no existe la carpeta .next
if exist ".next" goto build_ok
echo  Compilando la aplicacion (primera vez, ~1 minuto)...
call npm run build
if errorlevel 1 goto err_build
echo  OK - compilacion exitosa.
echo.
:build_ok

REM Obtener IP local
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do if not defined LOCAL_IP set "LOCAL_IP=%%a"
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"

echo  ============================================
echo    La aplicacion esta lista. Abriendo...
echo.
echo    Desde esta PC:  http://localhost:3001
if defined LOCAL_IP echo    Desde tablets:  http://%LOCAL_IP%:3001
echo.
echo    Usuario:    admin@citymall.com
echo    Contrasena: Admin2024!
echo.
echo    Para detener el servidor cierra esta ventana.
echo  ============================================
echo.

start "" "http://localhost:3001"
call npm run start

echo.
echo  El servidor se detuvo.
echo  Si ves un error arriba, toma una foto de la pantalla.
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
