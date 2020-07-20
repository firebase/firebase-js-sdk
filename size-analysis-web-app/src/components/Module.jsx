import React, { Component } from 'react';
import Function from './Function';
import { BTNTEXT } from '../constants';
class Module extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }

    }
    componentDidMount() {
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
                            onClick={() => { this.props.handleAddModule(this.props.name) }}>
                            *
                            <button
                                className="badge badge-primary yellow-btn">
                                {BTNTEXT.addButtonText}
                            </button>
                        </li>
                        {this.props.module.map((value, key) =>
                            <Function
                                key={this.props.index + value}
                                index={this.props.index + value}
                                moduleName={this.props.name}
                                name={value}
                                handleAddFunction={this.props.handleAddFunction} />
                        )}
                    </div>
                </ul>

            </div>


        );
    }
}

export default Module;