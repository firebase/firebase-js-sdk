import React, { Component } from 'react';
import BundleItem from './BundleItem';
import { TEXT } from '../constants';
class BundlePanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentBundle: this.props.bundle

        }

    }
    componentDidMount() {

    }
    componentDidUpdate(prevProps) {
        if (prevProps.bundle !== this.props.bundle) {
            this.setState({ currentBundle: this.props.bundle });
        }

    }
    render() {
        return (

            <div className="container-fluid code-pad">

                <ul className="list-group m-2 bundle-item">

                    {Array.from(this.state.currentBundle.keys()).map(key =>
                        <BundleItem

                            handleRemoveFunctionFromBundle={this.props.handleRemoveFunctionFromBundle}
                            handleRemoveModuleFromBundle={this.props.handleRemoveModuleFromBundle}
                            index={key} key={key}
                            moduleName={key}
                            functionName={this.state.currentBundle.get(key)} />
                    )}
                </ul>
                <button
                    className="btn text light-orange-btn float-right"
                    onClick={this.props.handleOnCalculateBundle}>
                    {TEXT.calculateBtnText}
                </button>

            </div>


        );
    }
}

export default BundlePanel;