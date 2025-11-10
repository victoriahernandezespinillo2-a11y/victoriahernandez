#!/usr/bin/env node
/**
 * Script de verificación end-to-end para el flujo de registro e inicio de sesión.
 *
 * Pasos:
 * 1. Registra un usuario nuevo mediante POST /api/auth
 * 2. Valida que el backend devuelva tokens de acceso/refresh
 * 3. Inicia sesión con POST /api/auth/signin usando las mismas credenciales
 * 4. Verifica que también se entreguen tokens válidos en el login
 */

const BASE_URL = process.env.E2E_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3002';

async function main() {
  const timestamp = Date.now();
  const email = `qa+${timestamp}@example.com`;
  const password = 'Test12345!';

  const registrationPayload = {
    firstName: 'QA',
    lastName: 'E2E',
    email,
    phone: '+34900000000',
    password,
    acceptTerms: true,
  };

  console.log('--- E2E Registro & Login ---');
  console.log('API base:', BASE_URL);
  console.log('Usuario de prueba:', email);

  // Paso 1: Registro
  const registerResponse = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registrationPayload),
  });

  const registerBody = await safeJson(registerResponse);
  console.log('\n[Registro] Status:', registerResponse.status);
  console.log('[Registro] Cuerpo:', summarizeResponse(registerBody));

  if (!registerResponse.ok) {
    throw new Error(`El registro falló con status ${registerResponse.status}`);
  }

  const registerTokens = extractTokens(registerBody);
  if (!registerTokens) {
    throw new Error('El registro no devolvió tokens válidos');
  }

  console.log('[Registro] Tokens recibidos OK');

  // Paso 2: Login
  const loginResponse = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const loginBody = await safeJson(loginResponse);
  console.log('\n[Login] Status:', loginResponse.status);
  console.log('[Login] Cuerpo:', summarizeResponse(loginBody));

  if (!loginResponse.ok) {
    throw new Error(`El login falló con status ${loginResponse.status}`);
  }

  const loginTokens = extractTokens(loginBody);
  if (!loginTokens) {
    throw new Error('El login no devolvió tokens válidos');
  }

  console.log('[Login] Tokens recibidos OK');

  console.log('\n✅ Flujo de registro + login verificado con éxito.');
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return { raw: await response.text().catch(() => null) };
  }
}

function extractTokens(body) {
  if (!body) return null;
  const data = body.data || body;
  if (data && data.tokens && data.tokens.accessToken && data.tokens.refreshToken) {
    return data.tokens;
  }
  if (data && data.accessToken && data.refreshToken) {
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }
  return null;
}

function summarizeResponse(body) {
  if (!body) return body;
  const clone = JSON.parse(JSON.stringify(body));

  const data = clone.data || clone;
  if (data && data.tokens) {
    const tokens = data.tokens;
    data.tokens = {
      accessToken: truncate(tokens.accessToken),
      refreshToken: truncate(tokens.refreshToken),
      expiresIn: tokens.expiresIn,
    };
  }
  return clone;
}

function truncate(value) {
  if (typeof value !== 'string') return value;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

main().catch((error) => {
  console.error('\n❌ Error durante la prueba E2E:', error);
  process.exit(1);
});

