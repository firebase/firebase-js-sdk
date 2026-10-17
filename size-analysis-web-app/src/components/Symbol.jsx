import React, { Component } from 'react';
import { TEXT } from '../constants';
class Symbol extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }
    componentDidMount() {


    }
    render() {
        return (

            <li
                className="list-group-item d-flex justify-content-between align-items-center text list-item-function"
                onClick={() => { this.props.handleUpdateSymbol(this.props.symbol, this.props.moduleName) }}
                key={this.props.index}>
                {this.props.symbol}
                <button
                    className="badge badge-primary light-orange-btn"
                >
                    {this.props.isSymbolAdded(this.props.symbol, this.props.moduleName) ? TEXT.deleteButtonText : TEXT.addButtonText}
                </button>
            </li>


        );
    }
}

export default Symbol;