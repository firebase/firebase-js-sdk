export interface ActionCodeSettings {
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  handleCodeInApp?: boolean;
  iOS?: { 
    bundleId: string,
    appStoreId: string,
  };
  url: string;
  dynamicLinkDomain?: string;
 };


export interface ActionCodeInfo {
  data: {
    email?: string | null;
    fromEmail?: string | null;
  };
  operation: string;
 }