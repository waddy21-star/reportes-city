@echo off
chcp 65001 >nul
title Empaquetar Sistema de Reportes CityMall

echo.
echo  ============================================
echo   EMPAQUETAR - SISTEMA DE REPORTES CITYMALL
echo  ============================================
echo.
echo  Se ejecuta UNA SOLA VEZ en una PC con Windows.
echo  Genera la carpeta servidor-citymall lista para
echo  copiar al servidor y usar con un solo clic.
echo.

REM 1. Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 goto sin_node
echo  OK - Node.js encontrado:
node --version
echo.

REM 2. Crear .env si no existe
if exist ".env" goto env_ok
echo  Creando archivo .env...
echo DATABASE_URL="file:./prisma/dev.db"> .env
echo NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo AUTH_SECRET="citymall-reportes-secreto-2024-interno">> .env
echo NEXTAUTH_URL="http://localhost:3001">> .env
echo  OK - .env creado.
echo.
:env_ok

REM 3. Instalar dependencias
echo  [1/5] Instalando dependencias...
call npm install
if errorlevel 1 goto err_install
echo.

REM 4. Preparar base de datos
if exist "prisma\dev.db" goto db_ok
echo  [2/5] Creando base de datos con datos iniciales...
call npm run db:push
if errorlevel 1 goto err_db
call npm run db:seed
if errorlevel 1 goto err_db
goto db_done
:db_ok
echo  [2/5] Base de datos existente conservada.
:db_done
echo.

REM 5. Compilar
echo  [3/5] Compilando la aplicacion...
call npm run build
if errorlevel 1 goto err_build
echo.

REM 6. Armar carpeta final
echo  [4/5] Armando carpeta servidor-citymall...
if exist "servidor-citymall" rmdir /s /q "servidor-citymall"
mkdir "servidor-citymall"
xcopy ".next\standalone" "servidor-citymall\" /e /i /q >nul
if not exist "servidor-citymall\.next" mkdir "servidor-citymall\.next"
xcopy ".next\static" "servidor-citymall\.next\static\" /e /i /q >nul
xcopy "public" "servidor-citymall\public\" /e /i /q >nul
if not exist "servidor-citymall\prisma" mkdir "servidor-citymall\prisma"
copy /y "prisma\dev.db" "servidor-citymall\prisma\dev.db" >nul
if not exist "servidor-citymall\public\uploads" mkdir "servidor-citymall\public\uploads"

REM 7. Copiar node.exe (sin goto dentro de for)
echo  [5/5] Incluyendo Node portable...
set "NODE_EXE="
for %%i in (node.exe) do set "NODE_EXE=%%~$PATH:i"
if not defined NODE_EXE goto sin_nodeexe
copy /y "%NODE_EXE%" "servidor-citymall\node.exe" >nul
echo  OK - node.exe incluido.
goto nodeexe_done
:sin_nodeexe
echo  AVISO: el servidor necesitara Node instalado.
:nodeexe_done
echo.

REM 8. Crear el lanzador de un clic
set "L=servidor-citymall\INICIAR-SERVIDOR.bat"
echo @echo off> "%L%"
echo chcp 65001 ^>nul>> "%L%"
echo title Servidor de Reportes CityMall>> "%L%"
echo cd /d "%%~dp0">> "%L%"
echo set DATABASE_URL=file:./prisma/dev.db>> "%L%"
echo set NEXTAUTH_SECRET=citymall-reportes-secreto-2024-interno>> "%L%"
echo set AUTH_SECRET=citymall-reportes-secreto-2024-interno>> "%L%"
echo set PORT=3001>> "%L%"
echo set HOSTNAME=0.0.0.0>> "%L%"
echo echo.>> "%L%"
echo echo  Servidor de Reportes CityMall>> "%L%"
echo echo  Desde esta PC:  http://localhost:3001>> "%L%"
echo echo  Desde tablets:  http://IP-DEL-SERVIDOR:3001>> "%L%"
echo echo  Usuario:    admin@citymall.com>> "%L%"
echo echo  Contrasena: Admin2024!>> "%L%"
echo echo  NO cierres esta ventana mientras el sistema este en uso.>> "%L%"
echo echo.>> "%L%"
echo start "" "http://localhost:3001">> "%L%"
echo if exist "node.exe" goto usar_local>> "%L%"
echo node server.js>> "%L%"
echo goto fin>> "%L%"
echo :usar_local>> "%L%"
echo "node.exe" server.js>> "%L%"
echo :fin>> "%L%"
echo pause>> "%L%"

echo.
echo  ============================================
echo   LISTO. Carpeta generada: servidor-citymall
echo.
echo   Copiala completa al servidor de CityMall.
echo   Alli, doble clic en INICIAR-SERVIDOR.bat
echo  ============================================
echo.
pause
goto :eof

:sin_node
echo  ERROR: Node.js no esta instalado en esta PC.
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
