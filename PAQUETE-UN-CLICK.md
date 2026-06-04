# Paquete de un clic — Servidor de Reportes CityMall

Esta es la forma **más fácil** de entregar el sistema: se arma una sola vez
y luego en el servidor solo se hace **doble clic**, sin instalar Node, sin
`npm install`, sin compilar, sin errores de configuración.

Los datos **se siguen compartiendo** entre todas las tablets y el admin
(es un servidor central, igual que antes).

---

## Importante: ¿por qué hay un paso de "armado"?

El sistema usa SQLite, que incluye un componente nativo de Windows. Ese
componente solo se obtiene corriendo `npm install` **en Windows**. Por eso el
paquete se arma una vez en una PC con Windows; después ya no se toca.

---

## PARTE 1 — Armar el paquete (una sola vez, en cualquier PC con Windows)

1. Descarga el proyecto (ZIP de GitHub) en una PC con **Windows** que tenga
   **Node.js** instalado (https://nodejs.org, versión LTS).
2. Descomprime el ZIP.
3. Doble clic en **`empaquetar-windows.bat`**.
4. Espera a que termine (instala, compila y arma todo). Al final genera la
   carpeta:

   ```
   servidor-citymall
   ```

Esa carpeta ya contiene **todo**: el servidor, la base de datos con los datos
iniciales, el logo, y hasta una copia de `node.exe` para que el servidor de
CityMall no necesite tener Node instalado.

---

## PARTE 2 — Instalar en el servidor (un clic)

1. Copia la carpeta **`servidor-citymall`** completa a una USB.
2. Pégala en el servidor de CityMall (ej: `C:\servidor-citymall`).
3. Entra a la carpeta y doble clic en **`INICIAR-SERVIDOR.bat`**.

Listo. Se abre el navegador en `http://localhost:3001` y el servidor queda
funcionando.

- **Usuario:** admin@citymall.com
- **Contraseña:** Admin2024!

> La ventana negra que queda abierta ES el servidor. No la cierres mientras
> el sistema esté en uso.

---

## Uso desde las tablets

En el navegador de la tablet, entra a:

```
http://[IP-DEL-SERVIDOR]:3001
```

Para ver la IP del servidor: abre `cmd` y escribe `ipconfig`; usa la
dirección IPv4 (ej: `192.168.1.50`).

La primera vez Windows preguntará si permites el acceso de red: **acepta**,
para que las tablets puedan conectarse.

---

## Respaldos

Toda la información vive dentro de la carpeta `servidor-citymall`, en:

- `prisma\dev.db` — reportes, usuarios, firmas
- `public\uploads\` — fotos

Copia esos dos elementos periódicamente a un lugar seguro.

---

## ¿Necesitas actualizar el sistema?

Si en el futuro hay cambios en el código, vuelve a hacer la PARTE 1
(armar el paquete) y reemplaza la carpeta en el servidor. Para no perder los
datos, antes de reemplazar guarda `prisma\dev.db` y `public\uploads\` y
cópialos de vuelta en la carpeta nueva.
