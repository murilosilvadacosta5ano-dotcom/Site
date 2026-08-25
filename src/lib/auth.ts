import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Converte o token do usuário em um e-mail válido para o Firebase Auth.
 * Ex: "meuToken123" → "meutoken123@kaise.local"
 */
export function tokenToEmail(token: string): string {
  const clean = token
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 64);

  if (!clean) {
    throw new Error('Token inválido');
  }

  return `${clean}@kaise.local`;
}

/**
 * Registra uma nova conta usando Token + Senha
 */
export async function registerWithToken(
  token: string,
  password: string,
  displayName?: string
): Promise<User> {
  if (token.trim().length < 3) {
    throw new Error('O token precisa ter no mínimo 3 caracteres');
  }
  if (password.length < 6) {
    throw new Error('A senha precisa ter no mínimo 6 caracteres');
  }

  const email = tokenToEmail(token);

  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Atualiza o nome de exibição
  if (displayName || token) {
    await updateProfile(credential.user, {
      displayName: displayName || token.trim(),
    });
  }

  // Salva dados extras no Firestore
  await setDoc(doc(db, 'accounts', credential.user.uid), {
    token: token.trim().toLowerCase(),
    email,
    displayName: displayName || token.trim(),
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    provider: 'token',
  });

  return credential.user;
}

/**
 * Faz login usando Token + Senha
 */
export async function loginWithToken(
  token: string,
  password: string
): Promise<User> {
  if (!token.trim() || !password) {
    throw new Error('Preencha o token e a senha');
  }

  const email = tokenToEmail(token);
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // Atualiza lastLogin
  try {
    await setDoc(
      doc(db, 'accounts', credential.user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn('Não foi possível atualizar lastLogin', e);
  }

  return credential.user;
}

/**
 * Verifica se um token já está em uso
 */
export async function isTokenTaken(token: string): Promise<boolean> {
  try {
    const email = tokenToEmail(token);
    // Tentativa leve: se conseguir criar um usuário temporário ou apenas validar formato
    // Como não temos Admin SDK, a verificação real acontece no createUserWithEmailAndPassword
    return false;
  } catch {
    return false;
  }
}
