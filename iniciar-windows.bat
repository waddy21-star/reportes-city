@echo off
chcp 65001 >nul
title Sistema de Reportes CityMall

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     SISTEMA DE REPORTES — CITYMALL       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Verificar que Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo  ✗ Node.js no está instalado.
    echo.
    echo  Descárgalo de: https://nodejs.org  (versión LTS)
    echo  Luego vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)

echo  ✓ Node.js encontrado:
node --version
echo.

:: Crear .env si no existe
if not exist ".env" (
    echo  Creando archivo de configuración .env ...
    (
        echo DATABASE_URL="file:./prisma/dev.db"
        echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno"
        echo NEXTAUTH_URL="http://localhost:3001"
    ) > .env
    echo  ✓ Archivo .env creado.
    echo.
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo  Instalando dependencias (esto puede tardar 1-2 minutos)...
    npm install
    if errorlevel 1 (
        echo.
        echo  ✗ Error al instalar dependencias.
        pause
        exit /b 1
    )
    echo  ✓ Dependencias instaladas.
    echo.
)

:: Preparar base de datos si no existe
if not exist "prisma\dev.db" (
    echo  Preparando base de datos...
    call npm run db:push
    if errorlevel 1 (
        echo.
        echo  ✗ Error al crear la base de datos.
        pause
        exit /b 1
    )
    echo.
    echo  Cargando datos iniciales (usuarios y tareas)...
    call npm run db:seed
    if errorlevel 1 (
        echo.
        echo  ✗ Error al cargar datos iniciales.
        pause
        exit /b 1
    )
    echo  ✓ Base de datos lista.
    echo.
)

:: Compilar si no existe la carpeta .next
if not exist ".next" (
    echo  Compilando la aplicación (primera vez, toma ~1 minuto)...
    npm run build
    if errorlevel 1 (
        echo.
        echo  ✗ Error al compilar.
        pause
        exit /b 1
    )
    echo  ✓ Compilación exitosa.
    echo.
)

:: Obtener IP local para mostrarla al usuario
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  ══════════════════════════════════════════════
echo.
echo   La aplicación está lista. Abriendo...
echo.
echo   Desde esta PC:     http://localhost:3001
if defined LOCAL_IP (
    echo   Desde tablets:     http://%LOCAL_IP%:3001
)
echo.
echo   Usuario:           admin@citymall.com
echo   Contraseña:        Admin2024!
echo.
echo   Para detener el servidor cierra esta ventana.
echo  ══════════════════════════════════════════════
echo.

:: Abrir el navegador automáticamente después de 3 segundos
start "" timeout /t 3 >nul
start "" "http://localhost:3001"

:: Iniciar el servidor (la ventana queda abierta mientras corre)
call npm run start

:: Si llegamos aquí, el servidor se detuvo o falló al arrancar.
echo.
echo  ══════════════════════════════════════════════
echo   El servidor se detuvo.
echo.
echo   Si ves un error arriba, toma una foto de la pantalla.
echo   Posibles causas:
echo     - El puerto 3001 ya está en uso por otro programa.
echo     - Falta compilar: borra la carpeta .next y vuelve a ejecutar.
echo  ══════════════════════════════════════════════
echo.
pause
