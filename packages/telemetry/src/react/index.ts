import { getApp } from '@firebase/app';
import { captureError, getTelemetry } from '../api';
import { Component, ReactNode } from 'react';

export interface FirebaseTelemetryBoundaryProps {
  children: ReactNode;
}

export class FirebaseTelemetryBoundary extends Component<FirebaseTelemetryBoundaryProps> {
  constructor(public props: FirebaseTelemetryBoundaryProps) {
    super(props);
  }

  componentDidMount(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // TODO: This will be obsolete once the SDK has a default endpoint
    process.env.OTEL_ENDPOINT = window.location.origin;

    const telemetry = getTelemetry(getApp());

    console.info(telemetry);

    window.addEventListener('error', (event: ErrorEvent) => {
      captureError(telemetry, event.error, {'example_attribute': 'hello'});
    });

    // TODO: add listener for unhandledrejection

  }

  render(): ReactNode {
    return this.props.children;
  }
}