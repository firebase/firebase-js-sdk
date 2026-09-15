import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Visualization from './components/Visualization';
import BundleCreation from './components/BundleCreation';
export default function App() {


    return (
        <Router >
            <Switch>
                <Route path="/visualization" component={Visualization} />
                <Route path="/" exact component={BundleCreation} />
            </Switch>
        </Router>
    );
}
