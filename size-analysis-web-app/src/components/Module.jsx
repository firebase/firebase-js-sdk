import React, { Component } from 'react';
import Symbols from './Symbols';
import { TEXT } from '../constants';
class Module extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentBundle: this.props.bundle

        }
        this.handleUpdateSymbol = this.handleUpdateSymbol.bind(this);
        this.handleUpdateModule = this.handleUpdateModule.bind(this);
        this.isSymbolAdded = this.isSymbolAdded.bind(this);
        this.isModuleAdded = this.isModuleAdded.bind(this);

    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        if (prevProps.bundle !== this.props.bundle) {
            this.setState({ currentBundle: this.props.bundle });
        }

    }
    isSymbolAdded(symbolName, moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).has(symbolName)) {
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
    handleUpdateSymbol(symbolName, moduleName) {
        if (this.state.currentBundle.has(moduleName) && this.state.currentBundle.get(moduleName).has(symbolName)) {
            this.props.handleRemoveSymbolFromBundle(symbolName, moduleName);
        } else {
            this.props.handleAddSymbolToBundle(symbolName, moduleName);
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
        const collapsibleReference = this.props.index.replace("@", "").replace("/", "");
        return (

            <div className="container m-2">

                <ul className="list-group">
                    <li
                        className="list-group-item d-flex justify-content-between align-items-center text list-item-module"
                        key={this.props.index}
                        data-toggle="collapse"
                        data-target={"#" + collapsibleReference}
                        aria-expanded="false"
                        aria-controls={this.props.index}
                    >
                        {this.props.name}
                    </li>
                    <div className="collapse" id={collapsibleReference}>
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
                        {Object.keys(this.props.module).map((type) =>
                            <Symbols
                                key={this.props.index + type}
                                index={this.props.index + type}
                                moduleName={this.props.name}
                                symbols={this.props.module[type]}
                                isSymbolAdded={this.isSymbolAdded}
                                handleUpdateSymbol={this.handleUpdateSymbol} />

                        )}
                    </div>
                </ul>

            </div>


        );
    }
}

export default Module;