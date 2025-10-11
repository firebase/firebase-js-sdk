'use client'

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate, getAll, setCustomSignals, getString } from "firebase/remote-config";
import { getInstallations } from "firebase/installations";

function Screen({isLoading, welcomeMessage} = {isLoading: false, welcomeMessage: ""}) {
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
        {welcomeMessage}
        <br></br>
        <button>Fetch Config</button>
      </div>
    </div>
  )
}

export default function Home() {

  useEffect(() => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_API_KEY,
      authDomain: "rc-test-123.firebaseapp.com",
      databaseURL: "https://rc-test-123-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "rc-test-123",
      storageBucket: "rc-test-123.firebasestorage.app",
      messagingSenderId: "985821706564",
      appId: "1:985821706564:web:56b260fbd62e4ad09a7f11",
      measurementId: "G-96PZ0KC1WS"
    };

    console.log(process.env.API_KEY);

    const app = initializeApp(firebaseConfig);
    const config = getRemoteConfig(app);
    config.settings.minimumFetchIntervalMillis = 0;

    const installations = getInstallations(app);
    
    setCustomSignals(config, {'test_signal': 'test'});

    fetchAndActivate(config).then(success => {
      console.log(success, getAll(config));
      setIsLoading(false);
      setWelcomeMessage(getString(config, 'welcome_message'));
    });
  });

  const [isLoading, setIsLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState("welcome");

  return (
    <Screen isLoading={isLoading} welcomeMessage={welcomeMessage}></Screen>
  );
}