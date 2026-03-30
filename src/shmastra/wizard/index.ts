import {ensureApiKey} from './setup'
import {loadEnvToProcess} from "../env";

export async function startShmastraWizard() {
    await ensureApiKey();
    loadEnvToProcess();
}