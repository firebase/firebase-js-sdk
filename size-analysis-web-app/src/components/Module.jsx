import React, { Component } from 'react';
import Function from './Function';
import { TEXT } from '../constants';
class Module extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentBundle: this.props.bundle

        }
        this.handleUpdateFunction = this.handleUpdateFunction.bind(this);
        this.handleUpdateModule = this.handleUpdateModule.bind(this);
        this.isFunctionAdded = this.isFunctionAdded.bind(this);
        this.isModuleAdded = this.isModuleAdded.bind(this);

    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        if (prevProps.bundle !== this.props.bundle) {
            this.setState({ currentBundle: this.props.bundle });
        }

    }
    isFunctionAdded(functionName, moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).has(functionName)) {
            return true;
        }
        return false;
    }
    isModuleAdded(moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).size === 0) {
            return true;
        }
        return false;
    }
    handleUpdateFunction(functionName, moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).has(functionName)) {
            this.props.handleRemoveFunctionFromBundle(functionName, moduleName);
        } else {
            this.props.handleAddFunctionToBundle(functionName, moduleName);
        }
    }
    handleUpdateModule(moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).size === 0) {
            this.props.handleRemoveModuleFromBundle(moduleName);
        } else {
            this.props.handleAddModuleToBundle(moduleName);
        }
    }
    render() {
        return (

            <div className="container m-2">
                <ul className="list-group">
                    <li
                        className="list-group-item d-flex justify-content-between align-items-center text list-item-module"
                        key={this.props.index}
                        data-toggle="collapse"
                        data-target={"#" + this.props.index}
                        aria-expanded="false"
                        aria-controls={this.props.index}
                    >
                        {this.props.name}
                    </li>
                    <div className="collapse" id={this.props.index}>
                        <li
                            className="list-group-item d-flex justify-content-between align-items-center text list-item-module"
                            key={this.props.index + this.props.name}
                            onClick={() => { this.handleUpdateModule(this.props.name) }}>
                            {TEXT.moduleRepresentation}

                            <button
                                className="badge badge-primary yellow-btn">
                                {this.isModuleAdded(this.props.name) ? TEXT.deleteButtonText : TEXT.addButtonText}
                            </button>
                        </li>
                        {this.props.module.map((value, key) =>
                            <Function
                                key={this.props.index + value}
                                index={this.props.index + value}
                                moduleName={this.props.name}
                                name={value}
                                isFunctionAdded={this.isFunctionAdded}
                                handleUpdateFunction={this.handleUpdateFunction} />
                        )}
                    </div>
                </ul>

            </div>


        );
    }
}

export default Module;