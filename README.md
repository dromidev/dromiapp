# Dromi

Landing de transporte en [app/page.tsx](app/page.tsx) y **sistema de votaciones en vivo** para asambleas de copropietarios en el subdominio [encuesta.dromi.lat](https://encuesta.dromi.lat).

## Requisitos

- Node.js 20+
- PostgreSQL (Neon, Supabase, RDS, local, etc.)

## Variables de entorno

Copia [.env.example](.env.example) a `.env` o `.env.local` y completa al menos:

- `DATABASE_URL` — cadena PostgreSQL
- `DASHBOARD_USER_ID` **o** `SEED_ADMIN_EMAIL` / `DASHBOARD_ADMIN_EMAIL` — qué fila de `public.users` usa el panel (sin login)
- `AUTH_SECRET` — recomendado para CSV y NextAuth legacy; en prod `NEXTAUTH_URL` si usas `/api/auth`
- `NEXT_PUBLIC_ENCUESTA_ORIGIN` — base usada en los códigos QR (opcional en local)

### Supabase (`DATABASE_URL`)

En **Project Settings → Database → Connection string** suele aparecer el **Transaction pooler** (puerto **6543**), por ejemplo:

`postgresql://postgres.TUREF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres`

- Usuario: **`postgres.TUREF`** (con el ref del proyecto), no solo `postgres`.
- Contraseña: la de la base de datos; si tiene caracteres especiales, **URL-encode** en la URI.
- Esta app usa el cliente con `prepare: false`, compatible con el pooler en modo transacción.
- **No uses el Session pooler (puerto 5432) para la app en marcha**: el límite de clientes es muy bajo y verás `MaxClientsInSessionMode` / `max clients reached`. Para Next.js usa siempre la URI del **Transaction pooler (6543)**.
- Si **`npm run db:migrate`** falla con el pooler **6543**, prueba temporalmente la URI de **Session mode (5432)** o la conexión **directa** (`db.xxx.supabase.com`) solo para migraciones, y luego vuelve al **6543** para la app.
- **`DATABASE_POOL_MAX`** (opcional): por defecto el cliente usa **2** conexiones por proceso con el pooler **6543** y **1** con **5432** (sesión). Con muchas réplicas de la app, baja a **`1`** por instancia si saturaras el plan.
- Para importar CSV de asistentes: `ASSISTANT_VOTING_CODE_SECRET` o `AUTH_SECRET` (secreto estable)

**Panel (`/dashboard`): acceso directo** (sin contraseña). Configura `DASHBOARD_USER_ID` (uuid en `public.users`) o el mismo `SEED_ADMIN_EMAIL` que usaste con `db:seed-admin`. Solo se listan y gestionan asambleas de ese usuario (`created_by_user_id`).

Los **códigos de copropietario** del CSV se hashean con `ASSISTANT_VOTING_CODE_SECRET` o, si no existe, con `AUTH_SECRET` (si cambias el secreto, los códigos importados dejan de coincidir).

### Despliegue (Vercel / producción) — `encuesta.dromi.lat`

Si tras el deploy ves **“Application error: a server-side exception…”**, casi siempre faltan variables en el proyecto de Vercel:

| Variable | Ejemplo / notas |
|----------|------------------|
| `DATABASE_URL` | URI del pooler **6543** (transacción) de Supabase |
| `DASHBOARD_USER_ID` o `SEED_ADMIN_EMAIL` | Usuario del panel (fila en `public.users`) |
| `AUTH_SECRET` o `NEXTAUTH_SECRET` | CSV / legacy; genera: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **`https://encuesta.dromi.lat`** si usas rutas NextAuth |
| `NEXT_PUBLIC_ENCUESTA_ORIGIN` | `https://encuesta.dromi.lat` (QR y enlaces públicos) |

Tras guardar variables, **vuelve a desplegar**. Sin usuario de panel (`DASHBOARD_USER_ID` o email), el dashboard carga pero las acciones fallan.

## Base de datos

Generar y aplicar migraciones (con `DATABASE_URL` definida):

```bash
npm run db:migrate
```

Si el panel falla al leer `users` con *Failed query* en Supabase: si el mensaje habla de **RLS** o permisos, aplica **`0001_disable_rls_for_drizzle`**. Si habla de **`MaxClientsInSessionMode`**, cambia `DATABASE_URL` al pooler **6543** (transacción), no 5432 (sesión).

En desarrollo también puedes usar:

```bash
npm run db:push
```

## Usuario en `public.users` (obligatorio para el panel)

Con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en el entorno:

```bash
npm run db:seed-admin
```

Si el email ya existe, la fila no se duplica (la contraseña **no** se actualiza). Para cambiar contraseña, borra la fila en la BD o usa otro email.

## Desarrollo

```bash
npm run dev
```

- Marketing: [http://localhost:3000](http://localhost:3000)
- Panel: [http://localhost:3000/dashboard](http://localhost:3000/dashboard), votación pública en `/votar/[publicId]`.
- `/login` redirige a `/dashboard`.

En **producción**, el dominio principal solo sirve la landing; rutas `/dashboard`, `/votar`, `/proyeccion` y `/api/*` se redirigen al origen en `NEXT_PUBLIC_ENCUESTA_ORIGIN` si el host no es el de encuesta (ver [middleware.ts](middleware.ts)).

## Despliegue (Vercel)

1. Conecta el mismo proyecto a **dos dominios**: raíz (marketing) y `encuesta.dromi.lat`.
2. Variables: `DATABASE_URL`, URLs/QR, y secretos para CSV si aplica.
3. Migraciones contra la BD de producción (`npm run db:seed-admin` / `db:migrate` según corresponda).

**Seguridad:** sin login, cualquiera con la URL del panel puede gestionar datos. Protege con red/VPN, Basic Auth del hosting, o vuelve a añadir autenticación si lo necesitas.

## Flujo de votación

1. En el panel se crea una **asamblea**, se importan **asistentes** (CSV) y **preguntas**.
2. Por cada pregunta: **QR** y **código de acceso**.
3. El copropietario vota con códigos; **una vez** por pregunta.
4. Resultados en vivo en el panel y en **proyección** (`/proyeccion/[publicId]`).
5. **Exportar** descarga PDF tipo acta.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run db:generate` | Generar migración desde el esquema Drizzle |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:push` | Sincronizar esquema (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed-admin` | Crear fila en `users` |

## Referencias

- [Next.js](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
