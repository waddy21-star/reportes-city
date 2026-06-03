# Guía de Instalación — Sistema de Reportes CityMall

Esta guía explica cómo instalar y ejecutar el sistema de reportes en un
servidor o PC dentro de CityMall. La base de datos es **SQLite** (un solo
archivo), así que no necesitas instalar ningún motor de base de datos aparte.

---

## 1. Requisitos del servidor

- Una PC o servidor con **Windows, Linux o macOS**
- **Node.js 20 o superior** — descárgalo de https://nodejs.org (versión LTS)
- Estar conectado a la red interna de CityMall (para que las tablets accedan)

Para verificar que Node.js está instalado, abre una terminal y escribe:

```bash
node --version
```

Debe mostrar algo como `v20.x.x` o superior.

---

## 2. Instalar la aplicación

1. Copia la carpeta del proyecto al servidor (por ejemplo en `C:\reportes-city`
   o `/opt/reportes-city`).

2. Abre una terminal **dentro de esa carpeta** y ejecuta:

```bash
npm install
```

Esto descarga todo lo necesario (toma unos minutos la primera vez).

3. Crea el archivo de configuración `.env` en la raíz del proyecto con este
   contenido (cambia el `NEXTAUTH_SECRET` por una frase secreta propia):

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="cambia-esto-por-una-frase-secreta-larga-y-unica"
NEXTAUTH_URL="http://localhost:3000"
```

> 💡 Si vas a acceder desde tablets, cambia `NEXTAUTH_URL` por la IP del
> servidor, por ejemplo `http://192.168.1.50:3000`.

---

## 3. Preparar la base de datos

La primera vez, crea las tablas y carga los datos iniciales (usuario admin,
tareas de cada departamento):

```bash
npm run db:push
npm run db:seed
```

Esto crea el usuario administrador:

- **Email:** admin@citymall.com
- **Contraseña:** Admin2024!

> ⚠️ Cambia esta contraseña desde el panel de Administración después del
> primer ingreso.

---

## 4. Compilar y arrancar

```bash
npm run build
npm run start
```

La app quedará disponible en `http://localhost:3000`.

Para que las **tablets** accedan, usa la IP del servidor en su navegador:
`http://IP-DEL-SERVIDOR:3000` (ej: `http://192.168.1.50:3000`).

> Para saber la IP del servidor: en Windows ejecuta `ipconfig`, en Linux/Mac
> ejecuta `ip addr` o `ifconfig`.

---

## 5. Dejarlo funcionando siempre (recomendado)

Para que la app se reinicie sola y siga corriendo aunque cierres la terminal,
usa **PM2**:

```bash
npm install -g pm2
pm2 start npm --name reportes-city -- start
pm2 save
pm2 startup
```

Con esto, la app arranca automáticamente cada vez que se enciende el servidor.

Comandos útiles de PM2:
- `pm2 status` — ver si está corriendo
- `pm2 logs reportes-city` — ver registros
- `pm2 restart reportes-city` — reiniciar
- `pm2 stop reportes-city` — detener

---

## 6. Respaldos (importante)

Toda la información vive en **dos lugares**:

1. La base de datos: `prisma/dev.db` (reportes, usuarios, firmas)
2. Las fotos: carpeta `public/uploads/`

Para respaldar, simplemente **copia esos dos elementos** a un lugar seguro
(USB, disco de red, etc.) periódicamente. Mientras la app esté detenida o en
un momento de poca actividad, copiar `dev.db` y `public/uploads/` es suficiente
para tener un respaldo completo.

> 📌 Cuando estés listo te puedo preparar un script que haga este respaldo
> automáticamente cada día.

---

## Resumen rápido

```bash
npm install            # 1ª vez: instalar
npm run db:push        # 1ª vez: crear tablas
npm run db:seed        # 1ª vez: datos iniciales
npm run build          # compilar
npm run start          # arrancar (o usar PM2)
```

---

## Soporte

Credenciales iniciales del administrador:
- admin@citymall.com / Admin2024!

Departamentos configurados:
- Seguridad (17 tareas con horarios)
- Eléctrico (20 equipos)
- Civil (13 tareas)
- Refrigeración (Mall: 7 tareas · Locales: mantenimiento dinámico)
