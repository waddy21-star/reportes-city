# Sistema de Reportes — CityMall

Herramienta interna para el registro de recorridos, mantenimientos e incidentes
en el centro comercial. Pensada para uso en **tablets** (personal de campo) y
**web** (administración), funcionando en el servidor interno de CityMall.

La base de datos es **SQLite** (un solo archivo), así que no necesitas instalar
ningún motor de base de datos aparte.

---

## Departamentos

- **Seguridad** — 17 tareas con horarios y listas de verificación
- **Eléctrico** — subestaciones, elevadores, gradas, cuartos eléctricos e
  iluminación, más recorridos de iluminación y de gradas por horario
- **Civil** — 13 tareas de inspección y mantenimiento
- **Refrigeración** — dos áreas:
  - **Mall**: equipos centrales (UMAs, chillers, torres, bombas, etc.)
  - **Locales**: mantenimiento individual de cada local (tipo de AC, ubicación,
    13 puntos de checklist)
- **Parking Sport** — área de parqueos y parte administrativa del parqueo

## Características

- Reportes con nivel **Normal** o **Urgente** (los urgentes se destacan)
- Listas de verificación por tarea, con marca de **incidente** y nota
- **Firma digital** del responsable
- **Fotografías** (cámara de la tablet)
- Guardado **offline**: si se pierde la conexión, el reporte se guarda en la
  tablet y se sincroniza solo cuando el servidor vuelve
- Panel de **administración** de usuarios (roles Admin / Usuario, uno o varios
  departamentos por usuario)
- Búsqueda y filtrado de reportes por fecha, departamento, nivel y texto
- Exportación de cada reporte a **PDF**

## Tecnología

- **Next.js 16** (App Router, TypeScript)
- **Prisma 7** con **SQLite** (un solo archivo, sin servidor de BD aparte)
- **NextAuth v5** para autenticación
- **Tailwind CSS** para la interfaz

---

## 1. Requisitos del servidor

- Una PC o servidor con **Windows, Linux o macOS**
- **Node.js 20 o superior** — descárgalo de https://nodejs.org (versión LTS)
- Conexión a la red interna de CityMall (para que las tablets accedan)
- Internet durante la **primera** instalación (para descargar dependencias)

Para verificar Node.js, abre una terminal y escribe:

```bash
node --version
```

Debe mostrar `v20.x.x` o superior.

---

## 2. Arranque rápido (recomendado)

Copia la carpeta del proyecto al servidor y ejecuta el script de arranque. Hace
todo automáticamente (instala, crea la base de datos, compila y arranca):

- **Windows:** doble clic en `iniciar-windows.bat`
- **Mac/Linux:** `./iniciar-mac-linux.sh`

La primera vez tarda unos minutos; las siguientes arranca al instante.

---

## 3. Instalación manual (alternativa)

Si prefieres hacerlo paso a paso desde una terminal dentro de la carpeta:

```bash
npm install        # instalar dependencias (1ª vez)
npm run db:push    # crear las tablas (1ª vez)
npm run db:seed    # cargar datos iniciales (1ª vez)
npm run build      # compilar
npm run start      # arrancar en http://localhost:3001
```

El archivo de configuración `.env` se crea solo al usar los scripts de
arranque. Si lo creas a mano, en la raíz del proyecto:

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="cambia-esto-por-una-frase-secreta-larga-y-unica"
NEXTAUTH_URL="http://localhost:3001"
```

### Acceso desde las tablets

Las tablets entran por la **IP del servidor** en su navegador:
`http://IP-DEL-SERVIDOR:3001` (ej. `http://192.168.1.50:3001`).

Para saber la IP del servidor: en Windows ejecuta `ipconfig`; en Linux/Mac
ejecuta `ip addr` o `ifconfig`.

> El servidor y las tablets deben estar en la **misma red** interna.

---

## 4. Acceso inicial

- **Usuario:** `admin@citymall.com`
- **Contraseña:** `Admin2024!`

> Cambia esta contraseña desde el panel de Administración tras el primer ingreso.

---

## 5. Dejarlo funcionando siempre (opcional)

Para que la app se reinicie sola y siga corriendo aunque se cierre la terminal,
usa **PM2**:

```bash
npm install -g pm2
pm2 start npm --name reportes-city -- start
pm2 save
pm2 startup
```

Comandos útiles:
- `pm2 status` — ver si está corriendo
- `pm2 logs reportes-city` — ver registros
- `pm2 restart reportes-city` — reiniciar
- `pm2 stop reportes-city` — detener

---

## 6. Datos y respaldos (importante)

Toda la información vive en **dos lugares**:

- `prisma/dev.db` — base de datos (reportes, usuarios, firmas)
- `public/uploads/` — fotografías

**Respaldar = copiar esos dos elementos** a un lugar seguro (USB, disco de red,
etc.) periódicamente. Hacerlo mientras la app está detenida o en un momento de
poca actividad es suficiente para un respaldo completo.
