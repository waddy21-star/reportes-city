@echo off
chcp 65001 >nul
title Empaquetar Sistema de Reportes CityMall
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   EMPAQUETAR — SISTEMA DE REPORTES CITYMALL   ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  Este proceso se ejecuta UNA SOLA VEZ en una PC con Windows.
echo  Genera la carpeta "servidor-citymall" lista para copiar al
echo  servidor y ejecutar con un solo clic (sin instalar nada).
echo.

:: 1. Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ✗ Node.js no está instalado en ESTA PC.
    echo    Descárgalo de https://nodejs.org (versión LTS) y repite.
    echo.
    pause
    exit /b 1
)
echo  ✓ Node.js encontrado:
node --version
echo.

:: 2. Crear .env si no existe (necesario para el build)
if not exist ".env" (
    echo  Creando .env de configuración...
    (
        echo DATABASE_URL="file:./prisma/dev.db"
        echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno"
        echo AUTH_SECRET="citymall-reportes-secreto-2024-interno"
        echo NEXTAUTH_URL="http://localhost:3001"
    ) > .env
    echo  ✓ .env creado.
    echo.
)

:: 3. Instalar dependencias (aquí se baja el binario de SQLite para Windows)
echo  [1/5] Instalando dependencias...
call npm install
if errorlevel 1 ( echo  ✗ Error en npm install & pause & exit /b 1 )
echo.

:: 4. Preparar base de datos con datos iniciales
if not exist "prisma\dev.db" (
    echo  [2/5] Creando base de datos y datos iniciales...
    call npm run db:push
    if errorlevel 1 ( echo  ✗ Error en db:push & pause & exit /b 1 )
    call npm run db:seed
    if errorlevel 1 ( echo  ✗ Error en db:seed & pause & exit /b 1 )
) else (
    echo  [2/5] Base de datos ya existe, se conserva.
)
echo.

:: 5. Compilar en modo standalone
echo  [3/5] Compilando la aplicación (modo standalone)...
call npm run build
if errorlevel 1 ( echo  ✗ Error al compilar & pause & exit /b 1 )
echo.

:: 6. Ensamblar la carpeta final
echo  [4/5] Ensamblando carpeta "servidor-citymall"...
if exist "servidor-citymall" rmdir /s /q "servidor-citymall"
mkdir "servidor-citymall"

:: 6a. El servidor standalone (incluye node_modules mínimos + binario nativo)
xcopy ".next\standalone" "servidor-citymall\" /e /i /q >nul
:: 6b. Archivos estáticos (standalone NO los copia solo)
xcopy ".next\static" "servidor-citymall\.next\static\" /e /i /q >nul
:: 6c. Carpeta public (logo, uploads)
xcopy "public" "servidor-citymall\public\" /e /i /q >nul
:: 6d. Base de datos con datos iniciales
if not exist "servidor-citymall\prisma" mkdir "servidor-citymall\prisma"
copy /y "prisma\dev.db" "servidor-citymall\prisma\dev.db" >nul
:: 6e. Asegurar carpeta de fotos
if not exist "servidor-citymall\public\uploads" mkdir "servidor-citymall\public\uploads"

:: 7. Incluir el node.exe de esta PC para que el servidor NO necesite instalar Node
echo  [5/5] Incluyendo Node portátil...
for /f "delims=" %%n in ('where node') do set "NODE_EXE=%%n" & goto :gotnode
:gotnode
if defined NODE_EXE (
    copy /y "%NODE_EXE%" "servidor-citymall\node.exe" >nul
    echo  ✓ node.exe incluido (servidor sin Node funcionará).
) else (
    echo  ⚠ No se pudo copiar node.exe; el servidor necesitará Node instalado.
)
echo.

:: 8. Crear el lanzador de un clic dentro del paquete
> "servidor-citymall\INICIAR-SERVIDOR.bat" (
    echo @echo off
    echo chcp 65001 ^>nul
    echo title Servidor de Reportes CityMall
    echo cd /d "%%~dp0"
    echo set DATABASE_URL=file:./prisma/dev.db
    echo set NEXTAUTH_SECRET=citymall-reportes-secreto-2024-interno
    echo set AUTH_SECRET=citymall-reportes-secreto-2024-interno
    echo set PORT=3001
    echo set HOSTNAME=0.0.0.0
    echo echo.
    echo echo  ════════════════════════════════════════════
    echo echo    Servidor de Reportes CityMall
    echo echo.
    echo echo    Desde esta PC:  http://localhost:3001
    echo echo    Desde tablets:  http://[IP-DEL-SERVIDOR]:3001
    echo echo.
    echo echo    Usuario:    admin@citymall.com
    echo echo    Contraseña: Admin2024!
    echo echo.
    echo echo    NO cierres esta ventana mientras uses el sistema.
    echo echo  ════════════════════════════════════════════
    echo echo.
    echo if exist "node.exe" (
    echo     start "" "http://localhost:3001"
    echo     "node.exe" server.js
    echo ^) else (
    echo     start "" "http://localhost:3001"
    echo     node server.js
    echo ^)
    echo pause
)

echo  ══════════════════════════════════════════════
echo.
echo   ✓ LISTO. Se generó la carpeta:  servidor-citymall
echo.
echo   Cópiala COMPLETA al servidor de CityMall (USB o red).
echo   En el servidor, entra a esa carpeta y haz doble clic en:
echo.
echo        INICIAR-SERVIDOR.bat
echo.
echo   No necesita instalar Node, ni npm, ni nada más.
echo  ══════════════════════════════════════════════
echo.
pause
