import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import { firebaseWebConfig } from './firebaseWebConfig'

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseWebConfig)

export const firebaseAuth = getAuth(firebaseApp)

export const googleAuthProvider = new GoogleAuthProvider()
googleAuthProvider.setCustomParameters({ prompt: 'select_account' })

let persistencePromise: Promise<void> | null = null

export function ensureFirebaseAuthPersistence() {
  if (persistencePromise) {
    return persistencePromise
  }

  persistencePromise = setPersistence(firebaseAuth, browserLocalPersistence).catch(
    (error: unknown) => {
      persistencePromise = null
      throw error
    },
  )

  return persistencePromise
}
