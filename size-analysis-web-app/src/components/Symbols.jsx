import React, { Component } from 'react';
import Symbol from './Symbol';
class Symbols extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }
    componentDidMount() {

    }
    render() {
        return (

            this.props.symbols.map((symbolOfType) =>
                <Symbol
                    key={this.props.index + symbolOfType}
                    index={this.props.index + symbolOfType}
                    moduleName={this.props.moduleName}
                    symbol={symbolOfType}
                    isSymbolAdded={this.props.isSymbolAdded}
                    handleUpdateSymbol={this.props.handleUpdateSymbol} />

            )
        );
    }
}

export default Symbols;