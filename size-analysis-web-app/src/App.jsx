import React, { Component } from 'react';
import ReactJson from 'react-json-view'
import DropDown from './components/DropDown';
import Module from './components/Module';
import BundlePanel from './components/BundlePanel';
import { SECTION } from './constants';
import { dropdownData, modules, sample_bundle } from './dummy-data';
import './App.css';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedVersion: "",
      allModulesOfSelectedVersion: "",
      currentBundle: new Map(),
      currentBundleReport: null
    }
    this.handleChange = this.handleChange.bind(this);
    this.onNPMVersionSelected = this.onNPMVersionSelected.bind(this);
    this.handleAddModule = this.handleAddModule.bind(this);
    this.handleAddFunction = this.handleAddFunction.bind(this);
    this.handleUpdateBundle = this.handleUpdateBundle.bind(this);
    this.handleOnCalculateBundle = this.handleOnCalculateBundle.bind(this);
  }

  handleUpdateBundle(updatedBundle) {
    this.setState({
      currentBundle: updatedBundle
    })
  }
  handleAddModule(moduleName) {
    // if adding a whole module to the bundle, then an entry in map with key module name and value an empty set 
    // if adding some functions of a module to the bundle, then an entry in map with key module name and value a set of function names 
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    if (!tmpCurrentBundle.has(moduleName)) {
      tmpCurrentBundle.set(moduleName, new Set());
    }

    else {
      tmpCurrentBundle.get(moduleName).clear();
    }
    this.setState({
      currentBundle: tmpCurrentBundle
    });

  }
  handleAddFunction(functionName, moduleName) {
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    if (!tmpCurrentBundle.has(moduleName)) {
      tmpCurrentBundle.set(moduleName, new Set());
    }
    tmpCurrentBundle.get(moduleName).add(functionName);

    this.setState({
      currentBundle: tmpCurrentBundle
    });

  }
  handleChange(e) {

    this.setState({
      [e.target.name]: e.target.value
    });
  }
  componentDidMount() {

  }
  handleOnCalculateBundle() {
    this.setState({
      currentBundleReport: sample_bundle
    });

  }
  onNPMVersionSelected(e) {

    // retrieve the packages and get all the functions
    this.setState({
      [e.target.name]: e.target.value,
      allModulesOfSelectedVersion: modules[e.target.value]
    });


  }
  render() {
    const style = {

      "height": "inherit",

      "overflow": "scroll"
    }
    return (
      <div className="container-fluid wrapper">
        <div className="row">
          <div className="col-8">
            <h2 className="text">{SECTION.bundleCreation}</h2>

          </div>
          <div className="col-4">
            <DropDown
              listItems={dropdownData}
              name="selectedVersion"
              value={this.state.selectedVersion}
              onChange={this.onNPMVersionSelected} />
          </div>
        </div>
        <div className="row">
          <div className="col-4 preview" >
            <div className="row">
              {Object.keys(this.state.allModulesOfSelectedVersion).map(key =>
                <Module
                  key={key}
                  index={key}
                  name={key}
                  module={this.state.allModulesOfSelectedVersion[key]}
                  handleAddFunction={this.handleAddFunction}
                  handleAddModule={this.handleAddModule} />)}

            </div>
          </div>

          <div className="col-8" >
            <div className="row m-2">
              <BundlePanel
                bundle={this.state.currentBundle}
                handleUpdateBundle={this.handleUpdateBundle}
                handleOnCalculateBundle={this.handleOnCalculateBundle}
              />
            </div>

            <div className="row m-2">
              <div className="col bundle-overview">
                {this.state.currentBundleReport ?
                  <ReactJson
                    src={this.state.currentBundleReport}
                    displayDataTypes={false}
                    style={style} />
                  : <h2 className="text-center text-muted text">{SECTION.bundleOverview}</h2>}
              </div>
            </div>


          </div>

        </div>




      </div >

    );

  }
}
export default App;
