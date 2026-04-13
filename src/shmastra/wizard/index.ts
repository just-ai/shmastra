import {ensureApiKey} from './setup'
import {loadEnvToProcess} from "../env";

export {getAuthStorage} from './setup'

export async function startShmastraWizard() {
    await ensureApiKey();
    loadEnvToProcess();
}