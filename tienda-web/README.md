# El Baúl de Shir — tienda web y panel administrativo

Tienda web con catálogo público y panel privado de administración, construida con
**Astro 5 (SSR)**, **Astro DB (libSQL/SQLite)** y **Tailwind CSS 4**, lista para
desplegarse en **Netlify**.

- Vista pública: catálogo, filtro por categoría, contacto y formas de pago.
- Vista privada (`/admin`): resumen, productos, categorías y configuración.
- Todo lo que el administrador cambia se refleja de inmediato en la tienda,
  porque ambas vistas leen de la misma base de datos.

> **Aviso de verificación.** El proyecto se escribió sin acceso a red, por lo que
> no fue posible ejecutar `npm install`, `astro check` ni `astro build` antes de
> entregarlo. Sigue la sección [Verificación](#verificación) la primera vez que lo
> ejecutes: son los mismos comandos que deben pasar antes de desplegar.

---

## 1. Requisitos

| Herramienta | Versión mínima |
| ----------- | -------------- |
| Node.js     | 20 LTS         |
| npm         | 10             |

Para producción necesitarás además una base de datos **Turso** (libSQL) gratuita
y una cuenta de **Netlify**.

---

## 2. Instalación y primera ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Generar el hash de la contraseña del administrador
npm run auth:hash -- "UnaContraseñaLargaYSegura"
#    Copia la línea ADMIN_PASSWORD_HASH=... que imprime y pégala en .env

# 4. Generar la clave de firma de sesión
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
#    Copia también esa línea en .env

# 5. Arrancar en modo desarrollo (usa la base local persistente)
npm run dev
```

Abre <http://localhost:4321> para la tienda y
<http://localhost:4321/admin> para el panel (te pedirá el correo y la contraseña
que configuraste en `.env`).

En desarrollo la base SQLite queda en `data/tienda.db` y el respaldo legible del
catálogo queda en `data/catalog.json`. Los productos, categorías, URLs e imágenes
relacionadas creados desde el panel se persisten allí aunque cierres o reinicies
el servidor. Las imágenes cargadas localmente quedan por defecto en la carpeta
hermana `../tienda-web-media/`, fuera del repositorio. `catalog.json` conserva
la referencia `/api/media/local/<producto>/<archivo>` y no contiene los bytes de
la imagen. Puedes cambiar esa ubicación con `MEDIA_DIRECTORY`.
`db/seed.ts` restaura primero el respaldo JSON y solo carga datos de demostración
cuando todavía no existe catálogo; no reemplaza ni duplica los datos creados.

---

## 3. Variables de entorno

Todas están documentadas en `.env.example`. El archivo `.env` está ignorado por
git y **nunca** debe subirse.

| Variable | Obligatoria | Para qué sirve |
| -------- | ----------- | -------------- |
| `ADMIN_EMAIL` | Sí | Usuario de ingreso al panel. |
| `ADMIN_PASSWORD_HASH` | Sí | Hash scrypt `salt:hash`. Se genera con `npm run auth:hash`. |
| `AUTH_SECRET` | Sí | Clave para firmar la cookie de sesión (32+ caracteres aleatorios). |
| `SESSION_TTL_HOURS` | No (12) | Duración de la sesión administrativa. |
| `ASTRO_DATABASE_FILE` | No | Archivo SQLite local persistente; por defecto `./data/tienda.db`. |
| `ASTRO_DB_REMOTE_URL` | Solo producción | URL libSQL de Turso. |
| `ASTRO_DB_APP_TOKEN` | Solo producción | Token de acceso de Turso. |
| `MEDIA_DIRECTORY` | No | Carpeta externa para las cargas locales; por defecto `../tienda-web-media`. |
| `PUBLIC_CONTACT_PHONE` | No | Teléfono mostrado en la tienda. |
| `PUBLIC_CONTACT_WHATSAPP` | No | Número de WhatsApp (se usa para el enlace `wa.me`). |
| `PUBLIC_CONTACT_EMAIL` | No | Correo de contacto. |
| `PUBLIC_CONTACT_INSTAGRAM` | No | Usuario de Instagram. |
| `PUBLIC_CONTACT_ADDRESS` | No | Dirección. |
| `PUBLIC_CONTACT_CITY` | No | Ciudad. |

Las variables de contacto se dejan vacías a propósito: **no se inventó ningún
dato real de la empresa**. Los campos sin valor simplemente no se muestran en la
interfaz. Lo mismo ocurre con los datos bancarios de cada forma de pago
(`details` vacío en `src/config/site.ts`).

El esquema de variables se valida en `astro.config.mjs` con `astro:env`, así que
si falta una variable obligatoria la aplicación falla con un mensaje claro en vez
de comportarse de forma extraña.

---

## 4. Base de datos

### Modelo de datos

```
Category                        Product
--------                        -------
id           number  PK         id           number  PK
name         text               name         text
slug         text    unique     slug         text    unique
description  text?              description  text?
isActive     boolean            priceCents   number      ← precio en centavos
createdAt    date               imageUrl     text?
updatedAt    date               imageAlt     text?
                                categoryId   number? FK → Category.id
                                isActive     boolean     ← visible en la tienda
                                inStock      boolean     ← con existencias
                                createdAt    date
                                updatedAt    date
```

Definido en `db/config.ts`.

Dos decisiones que conviene conocer:

- **El precio se guarda en centavos** (entero). Evita errores de redondeo con
  decimales y se formatea con `formatPrice()` (`Intl.NumberFormat`, es-CO/COP).
- **`categoryId` es opcional.** Al eliminar una categoría, sus productos se
  desvinculan (`categoryId = null`) y pasan a mostrarse como «Sin categoría».
  No se generan productos huérfanos ni referencias rotas.

### Local

No requiere configuración: `npm run dev` crea la base y ejecuta el seed.

### Producción (Turso)

```bash
# 1. Crear la base (una sola vez)
turso db create baul-de-shir
turso db show baul-de-shir --url          # → ASTRO_DB_REMOTE_URL
turso db tokens create baul-de-shir       # → ASTRO_DB_APP_TOKEN

# 2. Con esas dos variables en el entorno, aplicar el esquema
npm run db:push

# 3. (Opcional) Cargar los datos de prueba en la base remota
npm run db:seed
```

`npm run db:seed` inserta los productos `[DEMO]`. **No lo ejecutes contra la base
real de la tienda** salvo que quieras esos datos de ejemplo.

---

## 5. Comandos disponibles

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` | Servidor de desarrollo con base de datos local y seed automático. |
| `npm run dev:remote` | Desarrollo conectado a la base remota de Turso. |
| `npm run check` | Verificación de tipos y diagnósticos de Astro/TypeScript. |
| `npm run build` | `astro check` + build de producción (base local). |
| `npm run build:remote` | Build de producción contra la base remota. Es el comando que usa Netlify. |
| `npm run preview` | Sirve la build generada. |
| `npm run db:push` | Aplica el esquema a la base remota. |
| `npm run db:seed` | Ejecuta `db/seed.ts` contra la base remota. |
| `npm run auth:hash -- "clave"` | Genera `ADMIN_PASSWORD_HASH`. |

---

## 6. Estructura del proyecto

```
.
├── db/
│   ├── config.ts                 Esquema de tablas (Astro DB)
│   └── seed.ts                   Datos de prueba, todos marcados [DEMO]
├── public/
│   ├── logo.png                  Logotipo completo (fondo transparente)
│   ├── emblema.png               Solo el baúl, para espacios pequeños
│   ├── favicon.png
│   ├── imagen-no-disponible.svg  Marcador cuando falta la foto del producto
│   └── demo/                     Imágenes de prueba
├── scripts/
│   └── hash-password.mjs
├── src/
│   ├── components/
│   │   ├── ui/                   Alert, Badge, Field, EmptyState, Skeleton
│   │   ├── storefront/           Header, Footer, ProductCard, CategoryFilter
│   │   └── admin/                ProductForm
│   ├── config/site.ts            Marca, paleta, contacto, formas de pago
│   ├── layouts/                  BaseLayout, StorefrontLayout, AdminLayout
│   ├── lib/                      auth, errors, flash, format
│   ├── pages/
│   │   ├── index.astro           Catálogo con filtro por categoría
│   │   ├── contacto.astro
│   │   ├── formas-de-pago.astro
│   │   ├── 404.astro
│   │   ├── admin/                Panel (protegido por middleware)
│   │   └── api/                  Endpoints de auth y de administración
│   ├── services/                 Acceso a datos y reglas de negocio
│   ├── styles/global.css         Tokens de marca y clases de componentes
│   ├── types/                    Modelos del dominio
│   ├── validations/catalog.ts    Esquemas zod
│   ├── middleware.ts             Protección de rutas
│   └── env.d.ts
├── astro.config.mjs
├── netlify.toml
├── .env.example
└── package.json
```

### Separación de responsabilidades

```
página .astro  →  servicio  →  Astro DB
   (UI)          (negocio)     (datos)
```

- Las páginas y componentes **nunca** consultan la base de datos directamente:
  siempre pasan por `src/services/*`.
- Los servicios devuelven modelos del dominio (`src/types/catalog.ts`), no filas
  de la base, de modo que cambiar el motor de datos no obliga a tocar la UI.
- Las validaciones viven en `src/validations/catalog.ts` y se ejecutan **en el
  servidor**, en los endpoints, antes de llegar al servicio.
- Los textos de marca, colores, contacto y formas de pago están centralizados en
  `src/config/site.ts`; ningún componente los repite.

---

## 7. Seguridad

- `/admin/*` y `/api/admin/*` están protegidos por `src/middleware.ts`. Sin
  sesión válida, las páginas redirigen a `/admin/ingresar` y los endpoints
  responden `401`.
- La contraseña **nunca** se guarda en texto plano: se almacena un hash scrypt
  con salt aleatorio en la variable `ADMIN_PASSWORD_HASH`.
- La sesión viaja en una cookie `httpOnly`, `sameSite=lax`, `secure` en
  producción, firmada con HMAC-SHA256 (`AUTH_SECRET`) y con expiración.
- Las comparaciones de contraseña y de firma usan `timingSafeEqual`.
- No hay credenciales, tokens ni claves en el código: todo pasa por variables de
  entorno declaradas en `astro.config.mjs`.
- La redirección posterior al login solo acepta rutas internas que empiecen por
  `/admin` (evita *open redirect*).
- Los errores técnicos se registran en el servidor; al usuario solo le llegan
  mensajes redactados (`src/lib/flash.ts`).

---

## 8. Cómo usar el panel

1. Entra a `/admin` e ingresa con `ADMIN_EMAIL` y tu contraseña.
2. **Crear una categoría**: *Categorías* → formulario «Nueva categoría». Aparece
   al instante en el filtro de la tienda.
3. **Crear un producto**: *Productos* → «Crear producto». Nombre y precio son
   obligatorios; el precio debe ser mayor que cero.
4. **Imagen del producto**: pega una URL pública (`https://...`) o una ruta de
   `public/` (`/demo/producto-labial.svg`). Si falta o falla la carga, la tarjeta
   muestra el marcador «Imagen no disponible» en lugar de romperse.
5. **Ocultar sin borrar**: el botón *Ocultar* desactiva el producto o la
   categoría; siguen en la base pero desaparecen de la tienda.
6. **Eliminar**: pide confirmación antes de ejecutarse. Al borrar una categoría,
   sus productos quedan sin categoría y siguen visibles.

---

## 9. Decisiones arquitectónicas

**Astro con `output: 'server'`.** El catálogo cambia cuando el administrador
edita, así que las páginas se renderizan por petición. Es lo que permite que un
cambio en el panel se vea en la tienda sin reconstruir el sitio.

**Astro DB (libSQL) en vez de un backend separado.** El proyecto no tenía capa de
persistencia previa. Astro DB da esquema tipado, migraciones y seed dentro del
mismo repositorio, se despliega en Netlify sin servidor adicional y su motor
(SQLite/Turso) escala a las funcionalidades pendientes. Si más adelante hace
falta un backend propio, la frontera ya está trazada: basta reimplementar
`src/services/*` sin tocar las vistas.

**Formularios HTML nativos en lugar de fetch.** El panel funciona sin
JavaScript: cada formulario hace POST a un endpoint que valida, ejecuta y
redirige con un código de mensaje. Menos superficie de error, mejor
accesibilidad y feedback consistente.

**Imágenes por URL.** No se incrustan blobs ni base64. Hoy el producto guarda una
URL; para subir archivos desde el panel más adelante basta añadir un servicio de
almacenamiento (Netlify Blobs, Cloudinary o S3) que devuelva una URL y guardarla
en el mismo campo `imageUrl`. El modelo de datos no cambia.

**Contacto y formas de pago en configuración.** Están en `src/config/site.ts`
alimentados por variables de entorno. El siguiente paso natural es una tabla
`Settings` administrable desde el panel; como las vistas ya leen de un único
módulo, ese cambio no las afecta.

### Preparado para crecer

La estructura admite sin refactorizar: inventario (ya existe `inStock`), carrito,
pedidos, usuarios y clientes, e historial de pedidos. Cada uno sería una tabla
nueva en `db/config.ts` y un servicio nuevo en `src/services/`.

---

## 10. Accesibilidad y responsive

- HTML semántico (`header`, `nav`, `main`, `article`, `address`, `fieldset`).
- Todos los campos tienen `label` asociado; los textos de ayuda usan
  `aria-describedby`.
- Imágenes con `alt` descriptivo; las decorativas van con `alt=""` y
  `aria-hidden`.
- Enlace «Ir al contenido» para saltar la navegación con teclado.
- Foco visible en todos los elementos interactivos (`:focus-visible`).
- Los filtros activos se marcan con `aria-current`; los mensajes usan `role`
  `status` o `alert`.
- Se respeta `prefers-reduced-motion`.
- Diseño de una a tres columnas según el ancho, menú hamburguesa en móvil y
  panel administrativo usable en pantallas pequeñas.

---

## 11. Verificación

Ejecuta esto la primera vez, antes de desplegar:

```bash
npm install
npm run check      # tipos y diagnósticos
npm run build      # build de producción
npm run preview    # revisar el resultado
```

Lista de comprobación manual:

- [ ] La tienda carga en `/` y muestra los productos del seed.
- [ ] El filtro por categoría cambia el listado.
- [ ] `/contacto` y `/formas-de-pago` cargan.
- [ ] `/admin` redirige a `/admin/ingresar` sin sesión.
- [ ] El ingreso funciona con las credenciales de `.env`.
- [ ] Se puede crear, editar, ocultar y eliminar un producto.
- [ ] Se puede crear, editar, ocultar y eliminar una categoría.
- [ ] Un producto creado en el panel aparece en la tienda.
- [ ] Una imagen local se guarda fuera del repositorio y su referencia aparece en `data/catalog.json`.
- [ ] Un enlace de Drive compartido como «Cualquier persona con el enlace» muestra la imagen.
- [ ] Al eliminar una categoría con productos, estos quedan «Sin categoría».
- [ ] La vista se ve correcta en móvil.

---

## 12. Despliegue en Netlify

1. Sube el repositorio a GitHub y conéctalo en Netlify.
2. El `netlify.toml` ya define el comando (`npm run build:remote`) y la carpeta
   de publicación (`dist`).
3. En *Site configuration → Environment variables* agrega:
   `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, `ASTRO_DB_REMOTE_URL`,
   `ASTRO_DB_APP_TOKEN` y las `PUBLIC_CONTACT_*` que ya tengas.

> **Imágenes en Netlify.** El almacenamiento local de las funciones serverless
> no es persistente. Para producción, configura `MEDIA_DIRECTORY` hacia un
> almacenamiento persistente disponible para tu runtime o usa URLs externas.

### Enlaces de Google Drive

En Drive, haz clic derecho sobre la imagen, elige **Compartir**, cambia el
acceso general a **Cualquier persona con el enlace** y copia ese enlace. No
necesitas convertirlo manualmente: el panel reconoce enlaces como
`https://drive.google.com/file/d/ID/view` y los sirve mediante un proxy. Si el
archivo sigue privado, Drive devuelve una página HTML y ningún navegador puede
mostrarla como imagen.
4. Ejecuta `npm run db:push` una vez para crear las tablas en Turso.
5. Despliega.

---

## 13. Datos de prueba

`db/seed.ts` crea 4 categorías y 7 productos cuyo nombre empieza por `[DEMO]`,
con precios ficticios e imágenes SVG de marcador. Son datos de ejemplo y deben
borrarse antes de publicar el inventario real. Ningún dato de la empresa
(teléfonos, cuentas, direcciones) fue inventado.
