import React, { Component } from 'react';
import { BTNTEXT } from '../constants';
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
                onClick={() => { this.props.handleAddFunction(this.props.name, this.props.moduleName) }}
                key={this.props.index}>
                {this.props.name}
                <span
                    className="badge badge-primary light-orange-btn"
                >
                    {BTNTEXT.addButtonText}
                </span>
            </li>


        );
    }
}

export default Function;