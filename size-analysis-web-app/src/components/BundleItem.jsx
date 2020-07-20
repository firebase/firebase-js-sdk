import React, { Component } from 'react';
import { BTNTEXT } from '../constants';

class BundleItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            moduleName: this.props.moduleName,
            functions: this.props.functionName

        }
        this.composeImportStatement = this.composeImportStatement.bind(this);
    }
    componentDidMount() {

    }
    componentDidUpdate(prevProps) {
        if (prevProps.functionName !== this.props.functionName) {
            this.setState({ functions: this.props.functionName });
        }
        if (prevProps.moduleName !== this.props.moduleName) {
            this.setState({ moduleName: this.props.moduleName });
        }

    }
    composeImportStatement(functionNames, moduleName) {
        if (functionNames.size === 0) {
            return <p>import * from {moduleName}</p>;
        } else {
            return (
                <div>
                    <p style={{ display: "inline" }}>import {'{'}</p>
                    <div>
                        {Array.from(functionNames).map(functionName =>
                            <div key={moduleName + functionName} style={{ display: "inline" }}>
                                <span
                                    className="badge badge-danger light-orange-btn"
                                    onClick={() => { this.props.removeFunctionFromModule(functionName, moduleName) }}>
                                    {functionName}
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
                {this.composeImportStatement(this.props.functionName, this.props.moduleName)}
                <span
                    className="badge badge-danger light-orange-btn"
                    onClick={() => { this.props.removeModuleFromBundle(this.props.moduleName) }}>
                    {BTNTEXT.deleteButtonText}
                </span>

            </li>
        );
    }
}

export default BundleItem;