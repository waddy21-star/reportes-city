#!/bin/bash
set -e

# Colores para la terminal
NAVY='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
ORANGE='\033[0;33m'
NC='\033[0m' # Sin color

echo ""
echo -e "${NAVY} ╔══════════════════════════════════════════╗${NC}"
echo -e "${NAVY} ║     SISTEMA DE REPORTES — CITYMALL       ║${NC}"
echo -e "${NAVY} ╚══════════════════════════════════════════╝${NC}"
echo ""

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED} ✗ Node.js no está instalado.${NC}"
    echo ""
    echo "   Descárgalo de: https://nodejs.org  (versión LTS)"
    echo "   Luego vuelve a ejecutar este script."
    echo ""
    exit 1
fi

echo -e "${GREEN} ✓ Node.js encontrado: $(node --version)${NC}"
echo ""

# Ir al directorio donde está el script
cd "$(dirname "$0")"

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo " Creando archivo de configuración .env ..."
    cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="citymall-reportes-secreto-2024-interno"
NEXTAUTH_URL="http://localhost:3000"
EOF
    echo -e "${GREEN} ✓ Archivo .env creado.${NC}"
    echo ""
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo " Instalando dependencias (esto puede tardar 1-2 minutos)..."
    npm install
    echo -e "${GREEN} ✓ Dependencias instaladas.${NC}"
    echo ""
fi

# Preparar base de datos si no existe
if [ ! -f "prisma/dev.db" ]; then
    echo " Preparando base de datos..."
    npm run db:push
    echo ""
    echo " Cargando datos iniciales (usuarios y tareas)..."
    npm run db:seed
    echo -e "${GREEN} ✓ Base de datos lista.${NC}"
    echo ""
fi

# Compilar si no existe la carpeta .next
if [ ! -d ".next" ]; then
    echo " Compilando la aplicación (primera vez, toma ~1 minuto)..."
    npm run build
    echo -e "${GREEN} ✓ Compilación exitosa.${NC}"
    echo ""
fi

# Obtener IP local
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi

echo " ══════════════════════════════════════════════"
echo ""
echo "   La aplicación está lista."
echo ""
echo -e "   Desde esta PC:     ${ORANGE}http://localhost:3000${NC}"
if [ -n "$LOCAL_IP" ]; then
    echo -e "   Desde tablets:     ${ORANGE}http://$LOCAL_IP:3000${NC}"
fi
echo ""
echo "   Usuario:           admin@citymall.com"
echo "   Contraseña:        Admin2024!"
echo ""
echo "   Para detener el servidor presiona Ctrl+C"
echo " ══════════════════════════════════════════════"
echo ""

# Abrir el navegador automáticamente
sleep 2
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000" 2>/dev/null || true
else
    xdg-open "http://localhost:3000" 2>/dev/null || true
fi

# Iniciar el servidor
npm run start
