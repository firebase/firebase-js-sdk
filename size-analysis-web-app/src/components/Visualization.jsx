import React, { Component } from 'react';
import { TEXT } from '../constants';
import '../App.css';
import ReactJson from 'react-json-view'
import { HorizontalBar } from 'react-chartjs-2';
import Alert from './Alert';


class Symbol {
    constructor(name, dependencies, sizeInBytes, sizeInBytesWithExternalDeps) {
        this.name = name;
        this.dependencies = dependencies;
        this.sizeInBytes = sizeInBytes;
        this.sizeInBytesWithExternalDeps = sizeInBytesWithExternalDeps;
    }
}
class Visualization extends Component {
    constructor(props) {
        super(props);
        this.state = {
            errorMsg: "",
            symbols: [],
            symbolsOnDisplay: new Set(),
            symbolsOffDisplay: new Set(),
            jsonReport: {},
            symbolReport: {},
            symbolNameofReportOnDisplay: "root",
            chartOptions: {
                onClick: (e, item) => this.showReport(this.state.chartData.labels[item[0]._index]),
                scales: {
                    yAxes: [{
                        ticks: {
                            fontColor: 'white'
                        },
                    }],
                    xAxes: [{
                        ticks: {
                            fontColor: 'white'
                        },
                    }]
                },
                legend: {

                    labels: {
                        fontColor: 'white'
                    },

                }
            },
            chartData: {
                labels: [],
                datasets: [
                    {
                        label: 'Symbols Size Comparison',

                        backgroundColor: 'rgba(255,203,43,0.2)',
                        borderColor: 'rgba(255,203,43,1)',
                        borderWidth: 2,
                        hoverBackgroundColor: 'rgba(255,203,43,0.4)',
                        hoverBorderColor: 'rgba(255,203,43,1)',
                        data: []
                    }
                ]
            }

        }
        this.handleOnFileUpload = this.handleOnFileUpload.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.extractChartLabel = this.extractChartLabel.bind(this);
        this.extractChartData = this.extractChartData.bind(this);
        this.updateSymbolDisplay = this.updateSymbolDisplay.bind(this);
        this.isSymbolOnDisplay = this.isSymbolOnDisplay.bind(this);
        this.isSymbolOnDisplay = this.isSymbolOnDisplay.bind(this);
        this.clearErrorMessage = this.clearErrorMessage.bind(this);
    }

    clearErrorMessage() {
        this.setState({
            errorMsg: ""
        });
    }
    isSymbolOnDisplay(symbol) {
        return !this.state.symbolsOffDisplay.has(symbol);
    }
    updateSymbolDisplay(e, symbol) {
        e.stopPropagation();
        const charDataClone = Object.assign({}, this.state.chartData);
        const symbolsOnDisplay = new Set(this.state.symbolsOnDisplay);
        const symbolsOffDisplay = new Set(this.state.symbolsOffDisplay);
        if (symbolsOffDisplay.has(symbol)) {
            symbolsOnDisplay.add(symbol);
            symbolsOffDisplay.delete(symbol);

        } else {
            symbolsOnDisplay.delete(symbol);
            symbolsOffDisplay.add(symbol);

        }
        const symbolsOnDisplayArray = Array.from(symbolsOnDisplay);
        symbolsOnDisplayArray.sort((a, b) => b.sizeInBytes - a.sizeInBytes);
        const chartLabel = this.extractChartLabel(symbolsOnDisplayArray);
        const chartData = this.extractChartData(symbolsOnDisplayArray);
        charDataClone.labels = chartLabel;
        charDataClone.datasets[0].data = chartData;
        this.setState({

            symbolsOffDisplay: symbolsOffDisplay,
            symbolsOnDisplay: symbolsOnDisplay,
            chartData: charDataClone
        });


    }
    handleOnFileUpload(e) {
        const reportUploaded = e.target.files[0];
        if (reportUploaded.type.localeCompare('application/json') !== 0) {
            this.setState({
                errorMsg: "file uploaded has to be in json format!"
            });
            e.target.value = null;
            return;
        }
        const reader = new FileReader()
        reader.onload = async (e) => {
            const jsonReport = JSON.parse(e.target.result);
            const symbols = [];
            const symbolsOnDisplay = new Set();
            for (let key of Object.keys(jsonReport)) {
                const symbol = new Symbol(key, jsonReport[key].dependencies, jsonReport[key].sizeInBytes, jsonReport[key].sizeInBytesWithExternalDeps);
                symbols.push(symbol);
                symbolsOnDisplay.add(symbol);

            }
            // sort symbols in descending order 
            symbols.sort((a, b) => b.sizeInBytes - a.sizeInBytes);
            const chartLabel = this.extractChartLabel(symbols);
            const chartData = this.extractChartData(symbols);
            const charDataClone = Object.assign({}, this.state.chartData);
            charDataClone.labels = chartLabel;
            charDataClone.datasets[0].data = chartData;

            this.setState({
                symbols: symbols,
                jsonReport: jsonReport,
                symbolReport: jsonReport,
                symbolsOnDisplay: symbolsOnDisplay,
                chartData: charDataClone
            });

        };
        reader.readAsText(reportUploaded);

    }

    extractChartLabel(symbols) {
        const labels = [];
        for (const symbol of symbols) {
            labels.push(symbol.name);
        }
        return labels;
    }
    showReport(symbolName) {
        for (let key of Object.keys(this.state.jsonReport)) {
            if (key.localeCompare(symbolName) === 0) {
                this.setState({
                    symbolReport: this.state.jsonReport[key],
                    symbolNameofReportOnDisplay: symbolName
                });
                break;
            }
        }

    }
    extractChartData(symbols) {
        const data = [];
        for (const symbol of symbols) {
            data.push(symbol.sizeInBytes);
        }
        return data;

    }
    handleChange(e) {

        this.setState({
            [e.target.name]: e.target.value
        });
    }
    render() {
        const style = {

            "height": "inherit",

            "overflow": "scroll"
        }


        return (
            <div className="container-fluid wrapper">
                <div className="row mx-1">
                    {this.state.errorMsg ? <Alert errorMessage={this.state.errorMsg} clearErrorMessage={this.clearErrorMessage} /> : <div className="input-group">
                        <div className="custom-file">
                            <input type="file" className="custom-file-input" id="filePicker" onChange={this.handleOnFileUpload} aria-describedby="inputGroupFileAddon01" />
                            <label className="custom-file-label" htmlFor="filePicker">{TEXT.chooseFile}</label>
                        </div>
                    </div>}

                </div>
                <div className="row m-1">
                    <div className="col-7 visualization ">
                        <ul className="list-group">
                            {this.state.symbols.map(each =>
                                <li
                                    className="list-group-item d-flex justify-content-between align-items-center text list-item-function"
                                    onClick={() => { this.showReport(each.name) }}
                                    key={each.name} >
                                    {each.name} {each.sizeInBytes} {TEXT.unit}
                                    <button
                                        className="badge badge-primary light-orange-btn"
                                        onClick={(e) => { this.updateSymbolDisplay(e, each) }}
                                    >
                                        {this.isSymbolOnDisplay(each) ? TEXT.deleteButtonText : TEXT.addButtonText}
                                    </button>
                                </li>


                            )}
                        </ul>

                    </div>
                    <div className="col-5 visualization ">
                        <ReactJson
                            name={this.state.symbolNameofReportOnDisplay}
                            src={this.state.symbolReport}
                            displayDataTypes={false}
                            style={style} />

                    </div>
                </div>
                <div className="row m-1  visualization">
                    <div className="col">
                        <HorizontalBar data={this.state.chartData} options={this.state.chartOptions} />
                    </div>
                </div>
            </div>
        );
    }
}
export default Visualization;