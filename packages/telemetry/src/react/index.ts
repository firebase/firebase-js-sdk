import React from 'react';

export interface FirebaseTelemetryBoundaryProps {
  children: React.ReactNode;
}

export class FirebaseTelemetryBoundary extends React.Component<FirebaseTelemetryBoundaryProps> {
  constructor(public props: FirebaseTelemetryBoundaryProps) {
    super(props);

    console.info('init firebase telemetry boundary');
  }

  render(): React.ReactNode {
    console.info('abc');
    return this.props.children;
  }
}