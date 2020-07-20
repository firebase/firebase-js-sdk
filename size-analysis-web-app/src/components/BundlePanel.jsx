import React, { Component } from 'react';
import BundleItem from './BundleItem';
import { BTNTEXT } from '../constants';
class BundlePanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentBundle: this.props.bundle

        }
        this.removeModuleFromBundle = this.removeModuleFromBundle.bind(this);
        this.removeFunctionFromModule = this.removeFunctionFromModule.bind(this);
    }
    componentDidMount() {

    }
    componentDidUpdate(prevProps) {
        if (prevProps.bundle !== this.props.bundle) {
            this.setState({ currentBundle: this.props.bundle });
        }

    }
    removeModuleFromBundle(moduleNameTobeRemoved) {
        let tmpCurrentBundle = new Map(this.state.currentBundle);
        tmpCurrentBundle.delete(moduleNameTobeRemoved);
        this.props.handleUpdateBundle(tmpCurrentBundle);
    }
    removeFunctionFromModule(functionNameTobeRemoved, moduleName) {
        let tmpCurrentBundle = new Map(this.state.currentBundle);
        tmpCurrentBundle.get(moduleName).delete(functionNameTobeRemoved);
        if (tmpCurrentBundle.get(moduleName).size === 0) {
            tmpCurrentBundle.delete(moduleName);
        }
        this.props.handleUpdateBundle(tmpCurrentBundle);

    }
    render() {
        return (

            <div className="container-fluid code-pad">

                <ul className="list-group m-2 bundle-item">

                    {Array.from(this.state.currentBundle.keys()).map(key =>
                        <BundleItem
                            removeModuleFromBundle={this.removeModuleFromBundle}
                            removeFunctionFromModule={this.removeFunctionFromModule}
                            index={key} key={key}
                            moduleName={key}
                            functionName={this.state.currentBundle.get(key)} />
                    )}
                </ul>
                <button
                    className="btn text light-orange-btn float-right"
                    onClick={this.props.handleOnCalculateBundle}>
                    {BTNTEXT.calculateBtnText}
                </button>

            </div>


        );
    }
}

export default BundlePanel;