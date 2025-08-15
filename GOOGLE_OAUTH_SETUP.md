# 🔐 Configuración de Google OAuth para Firebase

## 🚨 Problema Identificado

El error "Error al sincronizar la sesión de Google" se debe a que el dominio `localhost:3001` no está autorizado en Google Console para OAuth.

## 🛠️ Solución Paso a Paso

### 1. Configurar Google Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto: `polideportivo-6c500`
3. Ve a **APIs & Services** > **Credentials**
4. Busca tu OAuth 2.0 Client ID: `657306818863-ap0pt1vc32hk0jssp62mqsp7md7stpuh.apps.googleusercontent.com`
5. Haz clic en el ícono de editar (lápiz)

### 2. Configurar Authorized Redirect URIs

En la sección **Authorized redirect URIs**, añade las siguientes URLs:

```
http://localhost:3001/api/auth/callback/google
http://localhost:3001/__/auth/handler
http://127.0.0.1:3001/api/auth/callback/google
http://127.0.0.1:3001/__/auth/handler
https://polideportivo-6c500.firebaseapp.com/__/auth/handler
```

### 3. Configurar Authorized JavaScript Origins

En la sección **Authorized JavaScript origins**, añade:

```
http://localhost:3001
http://127.0.0.1:3001
https://polideportivo-6c500.firebaseapp.com
```

### 4. Configurar Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `polideportivo-6c500`
3. Ve a **Authentication** > **Settings**
4. En **Authorized domains**, verifica que estén:
   - `localhost`
   - `polideportivo-6c500.firebaseapp.com`
   - Si usas un dominio personalizado, añádelo también

### 5. Verificar Variables de Entorno

Asegúrate de que en `apps/web/.env.local` tengas:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=tu-secret-aqui

# Google OAuth
GOOGLE_CLIENT_ID="657306818863-ap0pt1vc32hk0jssp62mqsp7md7stpuh.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="polideportivo-6c500.firebaseapp.com"
```

### 6. Reiniciar el Servidor

Después de hacer los cambios:

```bash
cd apps/web
pnpm dev
```

## 🔍 Verificación

1. Abre `http://localhost:3001`
2. Intenta iniciar sesión con Google
3. Deberías ver el popup de Google OAuth sin errores
4. Después de autorizar, deberías ser redirigido correctamente

## 🚨 Errores Comunes

### Error: "redirect_uri_mismatch"
- **Causa**: La URL de redirección no está autorizada
- **Solución**: Verifica que `http://localhost:3001/api/auth/callback/google` esté en Authorized redirect URIs

### Error: "unauthorized_client"
- **Causa**: El dominio no está autorizado
- **Solución**: Añade `http://localhost:3001` a Authorized JavaScript origins

### Error: "access_denied"
- **Causa**: El usuario canceló la autorización o hay un problema de configuración
- **Solución**: Verifica que todas las URLs estén correctamente configuradas

## 📝 Notas Importantes

1. **Desarrollo vs Producción**: Estas configuraciones son para desarrollo local. Para producción, reemplaza `localhost:3001` con tu dominio real.

2. **Propagación de Cambios**: Los cambios en Google Console pueden tardar unos minutos en propagarse.

3. **HTTPS en Producción**: En producción, todas las URLs deben usar HTTPS.

4. **Seguridad**: Nunca expongas `GOOGLE_CLIENT_SECRET` en el código del cliente.

## 🔗 Enlaces Útiles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Console](https://console.firebase.google.com/)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Firebase Auth Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices)