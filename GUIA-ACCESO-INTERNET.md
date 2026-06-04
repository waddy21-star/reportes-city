# Acceso por Internet — Reportes CityMall

Esta guía permite que las **tablets se conecten desde cualquier red**
(datos móviles, WiFi de casa, otra sucursal) **sin estar en la misma red
del servidor** y con una **URL fija** que nunca cambia.

Se usa **ngrok**, que regala 1 dominio fijo gratis y no requiere comprar
ningún dominio propio. El servidor sigue corriendo en la misma PC de
siempre.

---

## Configuración inicial (una sola vez, ~5 minutos)

### Paso 1 — Crear cuenta gratis en ngrok
1. Entra a **https://ngrok.com** y regístrate (gratis).
2. Confirma tu correo e inicia sesión.

### Paso 2 — Copiar tu authtoken
1. En el panel de ngrok, ve al menú **"Your Authtoken"**
   (o **Getting Started → Your Authtoken**).
2. Copia el token (una cadena larga de letras y números).
3. Abre el archivo **`ngrok-authtoken.txt`** (está junto a este documento;
   si no existe, créalo) y **pega ahí el token**. Guarda y cierra.

### Paso 3 — Crear tu dominio fijo gratis
1. En el panel de ngrok ve a **"Domains"** (o **Universal Gateway → Domains**).
2. Haz clic en **"+ New Domain"** / **"Create Domain"**.
   ngrok te dará un dominio gratis, por ejemplo:
   `reportes-citymall.ngrok-free.app`
3. Copia ese dominio y pégalo en el archivo **`ngrok-dominio.txt`**
   (créalo si no existe). **Solo el dominio**, sin `https://` y sin barras.
   Ejemplo correcto:
   ```
   reportes-citymall.ngrok-free.app
   ```
   Guarda y cierra.

> ✅ Eso es todo lo que se configura una sola vez.

---

## Uso diario

1. Doble clic en **`iniciar-internet.bat`**.
2. Se abren **dos ventanas**:
   - una es el **servidor** de la aplicación,
   - la otra es el **túnel a internet** (muestra la URL y las visitas).
3. En las tablets, abre el navegador y entra a tu URL fija:
   ```
   https://reportes-citymall.ngrok-free.app
   ```
   (usa el dominio que creaste en el Paso 3).
4. Para que sea cómodo, en cada tablet **agrega la página a la pantalla de
   inicio** (menú del navegador → "Agregar a pantalla de inicio"). Así
   queda como un ícono de app.

**Para detener todo:** cierra las dos ventanas.

> 💡 La URL es siempre la misma, así que solo configuras las tablets una
> vez. Mientras la PC esté encendida y el `.bat` corriendo, las tablets
> funcionan desde cualquier lugar con internet.

---

## Datos de acceso por defecto
- **Usuario:** `admin@citymall.com`
- **Contraseña:** `Admin2024!`

---

## Preguntas frecuentes

**¿La PC tiene que estar prendida?**
Sí. El servidor vive en esa PC; si se apaga, las tablets no podrán entrar
(igual que antes). Si quieres que funcione 24/7 aunque apaguen la PC, hay
que mover la app a un servidor en la nube — pídelo y te ayudo.

**¿Y si se cae el internet del local?**
Las tablets siguen guardando los reportes **sin conexión** y se sincronizan
solos cuando el servidor vuelve a estar disponible (esa función ya está
incluida).

**¿Es seguro?**
El acceso es por HTTPS (cifrado) y la app pide usuario y contraseña. Aun
así, no compartas la URL ni las credenciales fuera del equipo de trabajo.

**El plan gratis de ngrok, ¿tiene límites?**
Para este uso (un equipo interno subiendo reportes) el plan gratis alcanza
bien. Si algún día crece mucho el tráfico, ngrok tiene planes de pago o se
puede migrar a un servidor en la nube.

---

## Alternativa: URL fija con Cloudflare (si compras un dominio)

Si prefieres Cloudflare y estás dispuesto a comprar un dominio barato
(~1-10 USD/año), se puede lograr una URL tipo `reportes.tudominio.com`:

1. Compra un dominio (Namecheap, Cloudflare Registrar, etc.) y agrégalo a
   una cuenta gratis de **Cloudflare**.
2. En **Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel**,
   crea un túnel y copia su **token**.
3. Agrega un **Public Hostname**: `reportes.tudominio.com` →
   servicio `http://localhost:3001`.
4. En la PC servidor ejecuta el conector:
   `cloudflared.exe tunnel run --token <TU_TOKEN>`

Si quieres seguir este camino, pídeme el `.bat` equivalente para Cloudflare
y te lo preparo.
