import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import { toJS } from 'mobx';
import Chart from './chart';
import sessionStore from '../stores/session_store';
import ReactJson from 'react-json-view';
import {
  Container,
  Header,
  Icon,
  List,
  Image,
  Menu,
  Item,
  Dropdown
} from 'semantic-ui-react';


@observer
class ParameterTable extends Component {
  constructor(...args) {
    super(...args);
  }
  render() {
    return sessionStore.sessionListSelected.map((elem, idx) => {
      return (
        <div key={elem.id}>
          <strong>{elem.tag}</strong>
          <ReactJson enableClipboard={false} displayDataTypes={false} src={toJS(elem.params)} />
        </div>
      )
    })
  }
}


@observer
class ChartList extends Component {
  constructor(...args) {
    super(...args);
    this.handleClickGraph = this.handleClickGraph.bind(this);
    this.handleClickParam = this.handleClickParam.bind(this);
    this.state = {
      selection: 'graphs'
    };
  }
  handleClickGraph() {
    this.setState({ selection: 'graphs' });
  }
  handleClickParam() {
    this.setState({ selection: 'params' });
  }
  render() {
    if (sessionStore.chartList.length == 0) {
      return (
        <h4 style={{textAlign: 'left', paddingLeft: 24, paddingTop: 12}}><strong>Select a session above</strong></h4>
      );
    }
    return (
      <div>
        <Menu tabular style={{paddingLeft: 20}}>
          <Menu.Item name='graphs' active={this.state.selection === 'graphs'} onClick={this.handleClickGraph} />
          <Menu.Item name='parameters' active={this.state.selection === 'params'} onClick={this.handleClickParam} />
        </Menu>
        {
          this.state.selection === 'graphs' ?
            <div style={{display: 'flex',flexWrap: "wrap"}} className="graphList">
              {
                sessionStore.chartList.map((chart, idx) => {
                  return (
                    <div key={chart.chart_id} style={{display: 'flex', flex: "0 0 600px", marginLeft: 20, marginBottom: 20, height: "350px"}} className="graphDiv">
                      <Chart
                        renderChart={chart.renderChart}
                        registerHighchartsNode={sessionStore.registerHighchartsNode}
                        loading={sessionStore.chartLoading.get(chart.chart_id)}
                        graph_list={chart.graph_list}
                        chart_id={chart.chart_id}
                        onComponentWillUnmount={chart.onComponentWillUnmount}
                      />
                    </div>
                  );
                })
              }
            </div>
          :
            null
        }
        {
          this.state.selection === 'params' ?
            <div style={{ paddingLeft: 20 }}>
              <ParameterTable />
            </div>
          :
            null
        }
      </div>
    );
  }
}


export default ChartList;
