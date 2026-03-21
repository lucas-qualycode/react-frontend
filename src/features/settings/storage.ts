import { getStorage } from 'firebase/storage'
import { app } from '@/app/firebase'

export const settingsStorage = getStorage(app)
settingsStorage.maxUploadRetryTime = 15_000
settingsStorage.maxOperationRetryTime = 15_000
