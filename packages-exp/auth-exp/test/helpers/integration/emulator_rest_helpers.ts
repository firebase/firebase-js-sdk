import {Auth} from '@firebase/auth-exp';
import {getApps} from '@firebase/app-exp';

interface VerificationSession {
  code: string;
  phoneNumber: string;
  sessionInfo: string;
}

interface VerificationCodesResponse {
  verificationCodes: VerificationSession[];
}

export async function getPhoneVerificationCodes(auth: Auth): Promise<Record<string, VerificationSession>> {
  assertEmulator(auth);
  const url = getEmulatorUrl(auth, 'verificationCodes');
  const response: VerificationCodesResponse = await (await fetch(url)).json();
  
  return response.verificationCodes.reduce((accum, session) => {
    accum[session.sessionInfo] = session;
    return accum;
  }, {} as Record<string, VerificationSession>);
}

function getEmulatorUrl(auth: Auth, endpoint: string): string {
  const {host, port, protocol} = auth.emulatorConfig!;
  const projectId = getProjectId(auth);
  return `${protocol}://${host}:${port}/emulator/v1/projects/${projectId}/${endpoint}`;
}

function getProjectId(auth: Auth): string {
  return getApps().find(app => app.name === auth.name)!.options.projectId!;
}

function assertEmulator(auth: Auth): void {
  if (!auth.emulatorConfig) {
    throw new Error('Can\'t fetch OOB codes against prod API');
  }
}