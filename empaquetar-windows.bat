@echo off
chcp 65001 >nul
title Empaquetar Sistema de Reportes CityMall
setlocal enabledelayedexpansion

echo.
echo  ============================================
echo   EMPAQUETAR - SISTEMA DE REPORTES CITYMALL
echo  ============================================
echo.
echo  Este proceso se ejecuta UNA SOLA VEZ en una PC con Windows.
echo  Genera la carpeta "servidor-citymall" lista para copiar al
echo  servidor y ejecutar con un solo clic (sin instalar nada).
echo.

:: 1. Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js no esta instalado en esta PC.
    echo  Descargalo de https://nodejs.org (version LTS) y repite.
    echo.
    pause
    exit /b 1
)
echo  OK - Node.js encontrado:
node --version
echo.

:: 2. Crear .env si no existe
if not exist ".env" (
    echo  Creando archivo .env...
    (
        echo DATABASE_URL="file:./prisma/dev.db"
        echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno"
        echo AUTH_SECRET="citymall-reportes-secreto-2024-interno"
        echo NEXTAUTH_URL="http://localhost:3001"
    ) > .env
    echo  OK - .env creado.
    echo.
)

:: 3. Instalar dependencias
echo  [1/5] Instalando dependencias (descarga el componente de SQLite para Windows)...
call npm install
if errorlevel 1 (
    echo  ERROR en npm install.
    pause
    exit /b 1
)
echo.

:: 4. Preparar base de datos
if not exist "prisma\dev.db" (
    echo  [2/5] Creando base de datos con datos iniciales...
    call npm run db:push
    if errorlevel 1 ( echo  ERROR en db:push & pause & exit /b 1 )
    call npm run db:seed
    if errorlevel 1 ( echo  ERROR en db:seed & pause & exit /b 1 )
) else (
    echo  [2/5] Base de datos existente conservada.
)
echo.

:: 5. Compilar en modo standalone
echo  [3/5] Compilando la aplicacion...
call npm run build
if errorlevel 1 (
    echo  ERROR al compilar.
    pause
    exit /b 1
)
echo.

:: 6. Ensamblar carpeta final
echo  [4/5] Armando carpeta "servidor-citymall"...
if exist "servidor-citymall" rmdir /s /q "servidor-citymall"
mkdir "servidor-citymall"

xcopy ".next\standalone" "servidor-citymall\" /e /i /q >nul
if not exist "servidor-citymall\.next" mkdir "servidor-citymall\.next"
xcopy ".next\static" "servidor-citymall\.next\static\" /e /i /q >nul
xcopy "public" "servidor-citymall\public\" /e /i /q >nul
if not exist "servidor-citymall\prisma" mkdir "servidor-citymall\prisma"
copy /y "prisma\dev.db" "servidor-citymall\prisma\dev.db" >nul
if not exist "servidor-citymall\public\uploads" mkdir "servidor-citymall\public\uploads"

:: 7. Copiar node.exe para que el servidor no necesite tener Node instalado
echo  [5/5] Incluyendo Node portable...
for /f "delims=" %%n in ('where node 2^>nul') do (
    set "NODE_EXE=%%n"
    goto :gotnode
)
:gotnode
if defined NODE_EXE (
    copy /y "%NODE_EXE%" "servidor-citymall\node.exe" >nul
    echo  OK - node.exe incluido.
) else (
    echo  AVISO: no se pudo copiar node.exe; el servidor necesitara Node instalado.
)
echo.

:: 8. Crear el lanzador de un clic dentro del paquete
echo @echo off > "servidor-citymall\INICIAR-SERVIDOR.bat"
echo chcp 65001 ^>nul >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo title Servidor de Reportes CityMall >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo cd /d "%%~dp0" >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo set DATABASE_URL=file:./prisma/dev.db >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo set NEXTAUTH_SECRET=citymall-reportes-secreto-2024-interno >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo set AUTH_SECRET=citymall-reportes-secreto-2024-interno >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo set PORT=3001 >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo set HOSTNAME=0.0.0.0 >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo  ============================================ >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   Servidor de Reportes CityMall >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   Desde esta PC:  http://localhost:3001 >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   Desde tablets:  http://[IP-DEL-SERVIDOR]:3001 >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   Usuario:    admin@citymall.com >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   Contrasena: Admin2024! >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo   NO cierres esta ventana mientras el sistema este en uso. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo  ============================================ >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo if exist "node.exe" ( >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo     start "" "http://localhost:3001" >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo     "node.exe" server.js >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo ) else ( >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo     start "" "http://localhost:3001" >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo     node server.js >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo ) >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo. >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo echo  El servidor se detuvo. Cierra esta ventana o vuelve a ejecutar INICIAR-SERVIDOR.bat >> "servidor-citymall\INICIAR-SERVIDOR.bat"
echo pause >> "servidor-citymall\INICIAR-SERVIDOR.bat"

echo.
echo  ============================================
echo.
echo  LISTO. Carpeta generada:  servidor-citymall
echo.
echo  Copiala completa al servidor de CityMall
echo  (por USB o red local).
echo.
echo  En el servidor, entra a esa carpeta y haz
echo  doble clic en:
echo.
echo       INICIAR-SERVIDOR.bat
echo.
echo  No necesita instalar Node ni nada mas.
echo  ============================================
echo.
pause
