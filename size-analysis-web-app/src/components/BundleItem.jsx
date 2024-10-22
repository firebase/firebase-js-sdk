import React, { Component } from 'react';
import { TEXT } from '../constants';

class BundleItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            moduleName: this.props.moduleName,
            symbols: this.props.symbolName

        }
        this.composeImportStatement = this.composeImportStatement.bind(this);
    }
    componentDidMount() {

    }
    componentDidUpdate(prevProps) {
        if (prevProps.symbolName !== this.props.symbolName) {
            this.setState({ symbols: this.props.symbolName });
        }
        if (prevProps.moduleName !== this.props.moduleName) {
            this.setState({ moduleName: this.props.moduleName });
        }

    }
    composeImportStatement(symbolNames, moduleName) {
        if (symbolNames.size === 0) {
            return <p>import {TEXT.moduleRepresentation} from {moduleName}</p>;
        } else {
            return (
                <div>
                    <p style={{ display: "inline" }}>import {'{'}</p>
                    <div>
                        {Array.from(symbolNames).map(symbolName =>
                            <div key={moduleName + symbolName} style={{ display: "inline" }}>
                                <span
                                    className="badge badge-danger light-orange-btn"
                                    onClick={() => { this.props.handleRemoveSymbolFromBundle(symbolName, moduleName) }}>
                                    {symbolName}
                                </span>
                                {' '}
                            </div>
                        )}

                    </div>
                    <p>{'}'} from {moduleName};</p>
                </div>
            );
        }
    }

    render() {
        return (
            <li className="list-group-item d-flex justify-content-between align-items-center">
                {this.composeImportStatement(this.props.symbolName, this.props.moduleName)}
                <button
                    className="badge badge-danger light-orange-btn"
                    onClick={() => { this.props.handleRemoveModuleFromBundle(this.props.moduleName) }}>
                    {TEXT.deleteButtonText}
                </button>

            </li>
        );
    }
}

export default BundleItem;