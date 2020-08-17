import React, { Component } from 'react';
import ReactJson from 'react-json-view'
import DropDown from './components/DropDown';
import Module from './components/Module';
import BundlePanel from './components/BundlePanel';
import { SECTION, ENDPOINTS, API_ROOT, TEXT } from './constants';
import './App.css';


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedVersion: "",
      allModulesOfSelectedVersion: [],
      currentBundle: new Map(),
      currentBundleReport: null,
      isCurrentBundleReportValid: false,
      dropDownData: [],
      isDropDownLoaded: false,
      areModulesLoaded: false,
      isBundleOverviewLoaded: true
    }
    this.handleChange = this.handleChange.bind(this);
    this.onFirebaseVersionSelected = this.onFirebaseVersionSelected.bind(this);
    this.handleAddModuleToBundle = this.handleAddModuleToBundle.bind(this);
    this.handleAddSymbolToBundle = this.handleAddSymbolToBundle.bind(this);
    this.handleUpdateBundle = this.handleUpdateBundle.bind(this);
    this.handleOnCalculateBundle = this.handleOnCalculateBundle.bind(this);
    this.handleRemoveModuleFromBundle = this.handleRemoveModuleFromBundle.bind(this);
    this.handleRemoveSymbolFromBundle = this.handleRemoveSymbolFromBundle.bind(this);
    this.populateDropDownData = this.populateDropDownData.bind(this);
    this.extractAllUserSelectedSymbolsFromCurrentModule = this.extractAllUserSelectedSymbolsFromCurrentModule.bind(this);

  }

  handleUpdateBundle(updatedBundle) {
    this.setState({
      isCurrentBundleReportValid: false,
      currentBundle: updatedBundle
    })
  }
  handleRemoveModuleFromBundle(moduleNameTobeRemoved) {
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    tmpCurrentBundle.delete(moduleNameTobeRemoved);
    this.handleUpdateBundle(tmpCurrentBundle);
  }
  handleRemoveSymbolFromBundle(symbolNameTobeRemoved, moduleName) {
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    tmpCurrentBundle.get(moduleName).delete(symbolNameTobeRemoved);
    if (tmpCurrentBundle.get(moduleName).size === 0) {
      tmpCurrentBundle.delete(moduleName);
    }
    this.handleUpdateBundle(tmpCurrentBundle);

  }
  extractAllUserSelectedSymbolsFromCurrentModule(moduleName, userSelectedSymbols) {
    let module = this.state.allModulesOfSelectedVersion.filter(module => module.moduleName.localeCompare(moduleName) === 0);

    const symbols = {
      functions: [],
      classes: [],
      enums: [],
      variables: []
    };

    if (module.length === 0) return symbols;
    module = module[0];
    if (userSelectedSymbols.size === 0) return module.symbols;
    Object.keys(module.symbols).forEach(type => {
      symbols[type] = module.symbols[type].filter(symbol => userSelectedSymbols.has(symbol));

    });
    return symbols;
  }

  handleAddModuleToBundle(moduleName) {
    // if adding a whole module to the bundle, then an entry in map with key module name and value an empty set 
    // if adding some functions of a module to the bundle, then an entry in map with key module name and value a set of function names 
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    if (!tmpCurrentBundle.has(moduleName)) {
      tmpCurrentBundle.set(moduleName, new Set());
    }

    else {
      tmpCurrentBundle.get(moduleName).clear();
    }
    this.handleUpdateBundle(tmpCurrentBundle);


  }
  handleAddSymbolToBundle(symbolName, moduleName) {
    let tmpCurrentBundle = new Map(this.state.currentBundle);
    if (!tmpCurrentBundle.has(moduleName)) {
      tmpCurrentBundle.set(moduleName, new Set());
    }
    tmpCurrentBundle.get(moduleName).add(symbolName);

    this.handleUpdateBundle(tmpCurrentBundle);

  }
  handleChange(e) {

    this.setState({
      [e.target.name]: e.target.value
    });
  }
  componentDidMount() {
    this.populateDropDownData();
  }

  populateDropDownData() {
    fetch(`${API_ROOT}${ENDPOINTS.retrieveFirebaseVersionFromNPM}`, {
      method: "GET",
      headers: {
        'Accept': 'application/json'
      },

    })
      .then(res => res.json())
      .then(
        (result) => {
          this.setState(prevState => ({
            isDropDownLoaded: true,
            dropDownData: [...prevState.dropDownData, ...result]
          }))
        },
        (error) => {
          console.log(error);
        }
      );


  }
  handleOnCalculateBundle() {
    this.setState({
      isBundleOverviewLoaded: false,
      currentBundleReport: null
    });
    const requestBodySymbolsField = [];

    for (const moduleName of this.state.currentBundle.keys()) {

      requestBodySymbolsField.push({
        moduleName: moduleName,
        symbols: this.extractAllUserSelectedSymbolsFromCurrentModule(moduleName, this.state.currentBundle.get(moduleName))
      });
    }

    const requestBody = {
      version: this.state.selectedVersion,
      symbols: requestBodySymbolsField
    };
    fetch(`${API_ROOT}${ENDPOINTS.generateSizeAnalysisReportGivenCustomBundle}`, {
      method: "POST",
      headers: {
        'content-type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    })
      .then(res => res.json())
      .then(
        (report) => {
          this.setState({
            isBundleOverviewLoaded: true,
            isCurrentBundleReportValid: true,
            currentBundleReport: report
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }
  onFirebaseVersionSelected(e) {

    // retrieve the packages and get all the functions
    this.setState({
      [e.target.name]: e.target.value,
      areModulesLoaded: false
    });
    const requestBody = { version: e.target.value };
    fetch(`${API_ROOT}${ENDPOINTS.downloadPackageFromNPMGivenVersionAndReturnExportedSymbols}`, {
      method: "POST",
      headers: {
        'content-type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    })
      .then(res => res.json())
      .then(
        (modules) => {
          console.log(modules);
          this.setState({
            areModulesLoaded: true,
            allModulesOfSelectedVersion: modules
          });
        },
        (error) => {
          console.log(error);
        }
      );
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
            {
              this.state.isDropDownLoaded ?

                <DropDown
                  listItems={this.state.dropDownData}
                  name="selectedVersion"
                  value={this.state.selectedVersion}
                  onChange={this.onFirebaseVersionSelected} /> :

                <div className="text-center">
                  <div className="spinner-border my-2 text" role="status">
                  </div>
                </div>
            }
          </div>
        </div>
        <div className="row">
          <div className="col-4 preview" >

            {
              this.state.areModulesLoaded ?

                this.state.allModulesOfSelectedVersion.map(module =>
                  <Module
                    key={module.moduleName}
                    index={module.moduleName}
                    name={module.moduleName}
                    handleAddSymbolToBundle={this.handleAddSymbolToBundle}
                    handleAddModuleToBundle={this.handleAddModuleToBundle}
                    handleRemoveSymbolFromBundle={this.handleRemoveSymbolFromBundle}
                    handleRemoveModuleFromBundle={this.handleRemoveModuleFromBundle}
                    bundle={this.state.currentBundle}
                    module={module.symbols}

                  />) :

                <div className="text-center">
                  <div className="spinner-border my-2 text" role="status">
                  </div>
                </div>
            }

          </div>

          <div className="col-8" >
            <div className="row m-2">
              <BundlePanel
                bundle={this.state.currentBundle}
                handleRemoveSymbolFromBundle={this.handleRemoveSymbolFromBundle}
                handleRemoveModuleFromBundle={this.handleRemoveModuleFromBundle}
                handleOnCalculateBundle={this.handleOnCalculateBundle}
              />
            </div>

            <div className="row m-2">
              <div className="col bundle-overview">
                {this.state.currentBundleReport ?
                  <div >
                    <div className="row">
                      <div className="col-4">
                        <p className="text text-muted">{TEXT.sizePrompt}: {this.state.currentBundleReport.size} {TEXT.unit}</p>
                      </div>
                      <div className="col-4">
                        <p className="text text-muted">{TEXT.sizeAfterGzipPrompt}: {this.state.currentBundleReport.sizeAfterGzip} {TEXT.unit}</p>
                      </div>
                      <div className="col-4">
                        {this.state.isBundleOverviewLoaded && !this.state.isCurrentBundleReportValid ? <span className="badge badge-warning">{TEXT.outdatedBadgeText}</span> : null}
                      </div>
                    </div>


                    <ReactJson
                      src={this.state.currentBundleReport.dependencies}
                      displayDataTypes={false}
                      name="dependencies"
                      collapsed={true}
                      style={style} />
                  </div>
                  : this.state.isBundleOverviewLoaded ?
                    <h2 className="text-center text-muted">{SECTION.bundleOverview}</h2> :

                    <div className="text-center">
                      <div className="spinner-border my-2" role="status">
                      </div>
                    </div>

                }
              </div>
            </div>


          </div>

        </div>




      </div >

    );

  }
}
export default App;
