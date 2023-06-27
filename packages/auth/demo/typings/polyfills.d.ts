interface CredentialRequestOptions {
  otp: OTPOptions;
}
  
interface OTPOptions {
  transport: string[];
}

interface OTPCredential extends Credential{
  code: String;
}
