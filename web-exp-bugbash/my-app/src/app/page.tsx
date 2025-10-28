'use client'

import { useEffect, useState } from "react";
import { initializeApp } from "@firebase/app";
import { getRemoteConfig, fetchAndActivate, getString } from "@firebase/remote-config";
import { getAnalytics } from "@firebase/analytics";

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
      apiKey: "AIzaSyAjV1YKBW-eRbnGJSGAj9o3RiLxToYtwSg",
      authDomain: "fir-web-abt-test.firebaseapp.com",
      projectId: "fir-web-abt-test",
      storageBucket: "fir-web-abt-test.firebasestorage.app",
      messagingSenderId: "606109706131",
      appId: "1:606109706131:web:c571494af2f72000886a66",
      measurementId: "G-X818YSYRDK"
    };
    console.log(process.env.API_KEY);

    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const config = getRemoteConfig(app);
    config.settings.minimumFetchIntervalMillis = 0;

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