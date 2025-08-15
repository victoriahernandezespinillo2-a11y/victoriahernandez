# 🔥 Configuración de Firebase Authentication

## 📋 Requisitos Previos

1. Cuenta de Google/Firebase
2. Proyecto creado en Firebase Console
3. Autenticación habilitada en Firebase

## 🚀 Pasos de Configuración

### 1. Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto" o "Add project"
3. Ingresa el nombre del proyecto: `polideportivo-platform`
4. Configura Google Analytics (opcional)
5. Crea el proyecto

### 2. Configurar Authentication

1. En el panel izquierdo, ve a **Authentication**
2. Haz clic en **Get started**
3. Ve a la pestaña **Sign-in method**
4. Habilita los siguientes proveedores:
   - **Email/Password**: Habilitar
   - **Google**: Habilitar y configurar

### 3. Configurar Google OAuth

1. En **Google** provider:
   - Habilitar el proveedor
   - Configurar el nombre público del proyecto
   - Configurar el email de soporte
   - Guardar

### 4. Obtener Configuración del Proyecto

1. Ve a **Project Settings** (ícono de engranaje)
2. Scroll hacia abajo hasta **Your apps**
3. Haz clic en **Add app** y selecciona **Web** (</>) 
4. Registra la app con el nombre: `polideportivo-web`
5. Copia la configuración que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 5. Configurar Variables de Entorno

1. Abre el archivo `apps/web/.env.local`
2. Reemplaza los valores placeholder con tu configuración real:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..." # Tu API Key real
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
```

### 6. Configurar Dominios Autorizados

1. En Firebase Console, ve a **Authentication > Settings**
2. En **Authorized domains**, añade:
   - `localhost` (para desarrollo)
   - Tu dominio de producción

## 🔒 Configuración de Seguridad

### Reglas de Firestore (si usas Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Configuración de CORS

En **Authentication > Settings > Authorized domains**, asegúrate de tener:
- `localhost`
- `127.0.0.1`
- Tu dominio de producción

## 🧪 Verificar Configuración

1. Reinicia el servidor de desarrollo:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. Abre la aplicación en el navegador
3. Verifica que no aparezcan errores de Firebase en la consola
4. Prueba el registro/login con email y Google

## 🚨 Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
- Verifica que `NEXT_PUBLIC_FIREBASE_API_KEY` esté configurada correctamente
- Asegúrate de que la API key sea válida en Firebase Console

### Error: "Firebase: Error (auth/unauthorized-domain)"
- Añade tu dominio a **Authorized domains** en Firebase Console

### Error: "Firebase: Error (auth/configuration-not-found)"
- Verifica que todas las variables de entorno estén configuradas
- Reinicia el servidor de desarrollo

## 📚 Recursos Adicionales

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**⚠️ Importante**: Nunca commitees las variables de entorno reales al repositorio. Usa siempre archivos `.env.local` que están en `.gitignore`.