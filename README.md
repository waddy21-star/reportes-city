# Sistema de Reportes — CityMall

Herramienta interna para el registro de recorridos, mantenimientos e incidentes
en el centro comercial. Pensada para uso en **tablets** (personal de campo) y
**web** (administración), funcionando en el servidor interno de CityMall.

## Departamentos

- **Seguridad** — 17 tareas con horarios y listas de verificación
- **Eléctrico** — equipos (subestaciones, elevadores, gradas, iluminación)
- **Civil** — 13 tareas de inspección y mantenimiento
- **Refrigeración** — dos áreas:
  - **Mall**: equipos centrales (UMAs, chillers, torres, bombas, etc.)
  - **Locales**: mantenimiento individual de cada local (tipo de AC, ubicación,
    13 puntos de checklist)

## Características

- Reportes con nivel **Normal** o **Urgente** (los urgentes se destacan)
- Listas de verificación por tarea, con marca de **incidente** y nota
- **Firma digital** del responsable
- **Fotografías** (cámara de la tablet)
- Panel de **administración** de usuarios (roles Admin / Usuario)
- Búsqueda y filtrado de reportes por fecha, departamento, nivel y texto

## Tecnología

- **Next.js 16** (App Router, TypeScript)
- **Prisma 7** con **SQLite** (un solo archivo, sin servidor de BD aparte)
- **NextAuth v5** para autenticación
- **Tailwind CSS** para la interfaz

## Puesta en marcha

Toda la información para instalar y arrancar está en:

- **`ENTREGA.md`** — entrega vía USB e instalación en el servidor
- **`INSTALACION.md`** — guía detallada (Node.js, base de datos, PM2, respaldos)

Arranque rápido:

```bash
npm install        # instalar dependencias
npm run db:push    # crear la base de datos
npm run db:seed    # cargar datos iniciales
npm run build      # compilar
npm run start      # arrancar en http://localhost:3000
```

O simplemente ejecuta el script de arranque:
- Windows: doble clic en `iniciar-windows.bat`
- Mac/Linux: `./iniciar-mac-linux.sh`

## Acceso inicial

- Usuario: `admin@citymall.com`
- Contraseña: `Admin2024!`

> Cambia esta contraseña desde el panel de Administración tras el primer ingreso.

## Datos y respaldos

Toda la información vive en dos lugares:
- `prisma/dev.db` — base de datos (reportes, usuarios, firmas)
- `public/uploads/` — fotografías

Respaldar = copiar esos dos elementos a un lugar seguro periódicamente.
