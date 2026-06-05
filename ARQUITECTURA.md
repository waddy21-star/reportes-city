# Arquitectura técnica — Reportes CityMall

Documento de referencia para el equipo de desarrollo. Explica la estructura del
proyecto, el modelo de datos, el flujo de autenticación y las convenciones del
código.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Estilos | Tailwind CSS 4 |
| Autenticación | NextAuth v5 (estrategia JWT, provider de credenciales) |
| ORM | Prisma 7 con el adaptador `@prisma/adapter-better-sqlite3` |
| Base de datos | SQLite (archivo único `prisma/dev.db`) |
| PDF | jsPDF + jspdf-autotable (generación en el cliente) |
| Empaquetado | `output: 'standalone'` (servidor autónomo en `.next/standalone`) |

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (dashboard)/            Rutas protegidas (layout con sesión)
│   │   ├── page.tsx            Dashboard / inicio
│   │   ├── nuevo-reporte/      Crear y editar reportes
│   │   ├── reportes/           Listado y detalle de reportes
│   │   ├── admin/              Gestión de usuarios (solo ADMIN)
│   │   └── layout.tsx          Sidebar + Header + sincronización offline
│   ├── api/                    Route handlers (backend)
│   │   ├── auth/[...nextauth]/ Endpoints de NextAuth
│   │   ├── reports/           CRUD de reportes
│   │   ├── tasks/             Tareas y sus ítems de checklist
│   │   ├── users/             Gestión de usuarios (ADMIN)
│   │   ├── upload/            Subida de fotos
│   │   └── photos/[filename]/ Servir fotos desde disco
│   ├── login/                 Pantalla de acceso (pública)
│   └── layout.tsx             Layout raíz (metadata, favicon)
├── components/                Componentes de UI reutilizables
├── lib/                       Lógica compartida (auth, prisma, pdf, etc.)
└── types/                     Augmentaciones de tipos (next-auth)
prisma/
├── schema.prisma             Modelo de datos
├── seed.ts                   Datos iniciales (admin + tareas por depto)
└── dev.db                    Base de datos SQLite
```

---

## Modelo de datos

Relaciones principales (ver `prisma/schema.prisma` para el detalle):

```
User 1───* Report
Report 1───* ReportTask 1───* ReportChecklistItem
Report 1───* Photo
Report 1───* LocalMaintenanceRecord   (solo Refrigeración)
Task 1───* ChecklistItem
Task 1───* ReportTask
ChecklistItem 1───* ReportChecklistItem
```

- **Task / ChecklistItem**: catálogo de tareas por departamento y sus ítems.
  Las tareas "sembradas" son fijas (`isCustom: false`); los usuarios pueden
  crear tareas personalizadas (`isCustom: true`).
- **Report**: una visita/turno. Agrupa las tareas ejecutadas (`ReportTask`),
  las fotos y, en Refrigeración, los mantenimientos de locales.
- **ReportTask / ReportChecklistItem**: copia del estado marcado en el momento
  del reporte (qué tareas se hicieron, qué ítems se marcaron, incidentes).
- **LocalMaintenanceRecord**: el campo `items` guarda un **JSON string** con la
  lista de verificación del local (estructura flexible, propia de Refrigeración).

### Enumeraciones (guardadas como `String`)

SQLite no tiene tipo enum, por eso se modelan como texto. Los valores válidos
están centralizados en TypeScript (ver "Convenciones"):

- `User.role`: `ADMIN` | `USER`
- `Report.level`: `NORMAL` | `URGENTE`
- `Report.status`: `ACTIVO` | `COMPLETADO`
- `*.department`: `SEGURIDAD` | `ELECTRICO` | `CIVIL` | `REFRIGERACION` | `PARKING_SPORT`

### Multi-departamento

`User.department` admite **uno o varios** departamentos. Se guarda como:
- un código simple (`"SEGURIDAD"`), o
- un **JSON array** cuando son varios (`'["SEGURIDAD","ELECTRICO"]'`).

Siempre se lee con `parseDepts()` y se escribe con `serializeDepts()`
(`src/lib/departments.ts`), nunca parseando el string a mano.

---

## Autenticación

- NextAuth v5 con **provider de credenciales** y estrategia **JWT** (sin tabla
  de sesiones). Ver `src/lib/auth.ts`.
- Las contraseñas se guardan con **bcrypt** (factor 12).
- El rol y el departamento se inyectan en el token JWT y de ahí a la sesión
  (callbacks `jwt` y `session`). Los tipos extra de la sesión están declarados
  en `src/types/next-auth.d.ts`.
- `trustHost: true` permite el acceso desde la IP del servidor en la red local
  (las tablets no entran por `localhost`).
- Las rutas bajo `(dashboard)` exigen sesión; las rutas API revalidan la sesión
  y el rol en cada handler (no se confía solo en el middleware).

---

## Decisiones de diseño relevantes

1. **Adaptador SQLite de Prisma**: se usa `PrismaBetterSqlite3` con la ruta del
   archivo (no la `url` estándar de Prisma). Centralizado en `src/lib/prisma.ts`.

2. **Fotos servidas por API** (`/api/photos/[filename]`): con
   `output: 'standalone'`, Next.js **no** sirve los archivos escritos en
   `public/uploads/` en tiempo de ejecución. Por eso las fotos se leen del disco
   mediante un route handler (con control de sesión y protección de path
   traversal). La subida (`/api/upload`) guarda la ruta como `/api/photos/...`.

3. **Offline-first** (`src/lib/offline.ts` + `components/OfflineSync.tsx`): si el
   servidor no responde al crear un reporte, este se encola en **IndexedDB** y se
   reintenta automáticamente cuando vuelve la conexión. Solo aplica a la
   creación; la edición requiere conexión.

4. **PDF en el cliente** (`src/lib/pdf.ts`): el reporte se genera en el navegador
   con jsPDF, evitando carga en el servidor.

5. **Validación de pertenencia**: al crear/editar un reporte, el backend verifica
   que cada tarea referenciada pertenezca al departamento del reporte, para que
   un cliente no pueda adjuntar tareas de otro departamento.

---

## Convenciones del código

- **Tipos compartidos** en `src/types.ts`: modelos de vista (lo que devuelven las
  APIs), DTOs de las peticiones y los tipos unión de las enumeraciones. Evitar
  redefinir interfaces de dominio en cada página.
- **Etiquetas y colores de departamento** en `src/lib/departments.ts`
  (`DEPT_LABELS`, `DEPT_COLORS`, `deptLabel()`). No hardcodear en componentes.
- **Constantes de Refrigeración** (tipos de AC y ubicaciones) en
  `src/lib/refrigeracion.ts`.
- **Paleta de color** (uso interno, sin design tokens):
  Navy `#1C3557`, Naranja `#F47920`, Rojo `#D64440`, Verde `#22C55E`.
- Las rutas API devuelven errores como `{ error: string }` con el código HTTP
  correspondiente y mensajes en español (orientados al usuario final).
- Comentarios de intención en español; nombres de variables/símbolos en
  inglés/español según el contexto existente del archivo.

---

## Comandos

```bash
npm run dev        # desarrollo (http://localhost:3000)
npm run build      # compilar (genera Prisma Client + build de Next)
npm run start      # producción (http://localhost:3001)
npm run db:push    # aplicar el schema a la base de datos
npm run db:seed    # cargar datos iniciales
npm run db:studio  # explorador visual de la base de datos (Prisma Studio)
npm run lint       # ESLint
```

---

## Estado de ESLint

`npm run build` y `npx tsc --noEmit` pasan sin errores. `npm run lint` reporta
algunas advertencias de reglas **estrictas del React Compiler** (paquete
`react-hooks`), principalmente `set-state-in-effect`: marcan los `useEffect` que
hacen `fetch` y luego `setState` para cargar datos. Es un patrón válido y muy
común de React; no son defectos ni afectan el build ni el runtime. Se dejan
visibles a propósito (sin silenciar la regla) para que el equipo decida si
adopta esos lineamientos o migra esa carga de datos a otro patrón (p. ej.
React Query o Server Components).

---

## Puntos a tener en cuenta para evolucionar

- **SQLite** es adecuado para el uso interno actual (un servidor, baja
  concurrencia). Si crece el número de usuarios concurrentes, considerar migrar a
  PostgreSQL (el adaptador de Prisma facilita el cambio).
- Las **fotos** y la **base de datos** son el estado persistente: cualquier
  estrategia de respaldo o migración debe contemplar `prisma/dev.db` y
  `public/uploads/`.
- El campo `items` de `LocalMaintenanceRecord` es JSON libre; si esa estructura
  se estabiliza, podría normalizarse en tablas propias.
