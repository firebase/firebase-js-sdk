'use client'

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getString } from "firebase/remote-config";
import { getInstallations } from "firebase/installations";
import { getAnalytics } from "firebase/analytics";

function Screen({ isLoading, rollout, abt } = { isLoading: false, rollout: "", abt: "" }) {
  if (isLoading) {
    return (<div>Loading...</div>)
  }
  return (
    <div>
      <div>
        Config Loaded
      </div>
      <br></br>
      <div>
        Rollout value: {rollout}
        <br></br>
        ABT value: {abt}
      </div>
    </div>
  )
}

export default function Home() {

  useEffect(() => {
    const firebaseConfig = {
    };
    console.log(process.env.API_KEY);

    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const config = getRemoteConfig(app);
    config.settings.minimumFetchIntervalMillis = 0;

    const installations = getInstallations(app);

    fetchAndActivate(config).then(success => {
      setIsLoading(false);
      setRolloutValue(getString(config, 'web_param_rollout'));
      setAbtValue(getString(config, 'web_param_abt'));
    });
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showRolloutValue, setRolloutValue] = useState("rolloutValue");
  const [showAbtValue, setAbtValue] = useState("abtValue");


  return (
    <Screen isLoading={isLoading} rollout={showRolloutValue} abt={showAbtValue}></Screen>
  );
}