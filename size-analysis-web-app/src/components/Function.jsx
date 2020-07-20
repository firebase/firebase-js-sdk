import React, { Component } from 'react';
import { TEXT } from '../constants';
class Function extends Component {
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
                onClick={() => { this.props.handleUpdateFunction(this.props.name, this.props.moduleName) }}
                key={this.props.index}>
                {this.props.name}
                <button
                    className="badge badge-primary light-orange-btn"
                >
                    {this.props.isFunctionAdded(this.props.name, this.props.moduleName) ? TEXT.deleteButtonText : TEXT.addButtonText}
                </button>
            </li>


        );
    }
}

export default Function;