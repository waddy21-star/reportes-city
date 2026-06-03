# Entrega e Instalación en el Servidor — CityMall

Guía para entregar e instalar el sistema en el servidor de CityMall usando una
memoria USB. **El servidor debe tener internet** durante la primera instalación
(solo para descargar las dependencias).

---

## PARTE A — Preparar la USB (lo haces tú)

1. Entra a GitHub: https://github.com/waddy21-star/reportes-city
2. Asegúrate de estar en la rama **`main`**
3. Botón verde **`Code`** → **`Download ZIP`**
4. Copia ese `.zip` a la memoria USB

> El `.zip` ya incluye **todo lo necesario**: el código, la base de datos con
> los datos iniciales, y los scripts de arranque. NO incluye las dependencias
> (se descargan solas en el paso siguiente porque pesan mucho).

---

## PARTE B — Instalar en el servidor (una sola vez)

### 1. Instalar Node.js (si no lo tiene)
- Ir a https://nodejs.org y descargar la versión **LTS**
- Instalarlo con las opciones por defecto

### 2. Copiar el proyecto
- Copia el `.zip` de la USB al disco del servidor (ej: `C:\reportes-city`)
- Descomprímelo ahí (clic derecho → "Extraer todo")

### 3. Ejecutar el script de arranque

**En Windows:**
- Doble clic en **`iniciar-windows.bat`**

**En Linux:**
- Abrir terminal en la carpeta y ejecutar: `./iniciar-mac-linux.sh`

El script hace TODO automáticamente la primera vez:
- ✅ Verifica Node.js
- ✅ Crea la configuración
- ✅ Descarga las dependencias (necesita internet, ~2 min)
- ✅ Prepara la base de datos
- ✅ Compila la aplicación
- ✅ Arranca el servidor y abre el navegador

Cuando termine, verás algo así:

```
══════════════════════════════════════════════
  La aplicación está lista.

  Desde esta PC:     http://localhost:3001
  Desde tablets:     http://192.168.1.50:3001

  Usuario:           admin@citymall.com
  Contraseña:        Admin2024!
══════════════════════════════════════════════
```

---

## PARTE C — Uso diario

- **Para arrancar:** doble clic en `iniciar-windows.bat` (ya no descarga nada,
  arranca en segundos)
- **Para detener:** cierra la ventana negra del servidor
- **Desde las tablets:** abrir el navegador en `http://IP-DEL-SERVIDOR:3001`
  (la IP aparece cuando arrancas el script)

> 💡 Para que la app arranque sola al encender el servidor y no haya que abrir
> el script manualmente, se puede configurar con PM2 (ver `INSTALACION.md`).

---

## Notas importantes

- **Primer ingreso:** cambia la contraseña del admin desde el panel de
  Administración, y crea los usuarios reales de cada departamento.
- **Firewall (Windows):** la primera vez Windows preguntará si permites el
  acceso de red — acepta, para que las tablets puedan conectarse.
- **Respaldos:** copia periódicamente `prisma/dev.db` y la carpeta
  `public/uploads/` a un lugar seguro. Ahí está toda la información.

---

## Resumen de un vistazo

```
1. GitHub → Download ZIP → copiar a USB
2. En el servidor: instalar Node.js + descomprimir el zip
3. Doble clic en iniciar-windows.bat
4. Listo: http://localhost:3001  (admin@citymall.com / Admin2024!)
```
