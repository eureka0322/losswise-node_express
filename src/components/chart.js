import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

import axios from 'axios';
import { Segment, Container, Loader } from 'semantic-ui-react'


class Chart extends Component {
  constructor(...args) {
    super(...args);
  }

  componentDidMount() {
    const domNode = ReactDOM.findDOMNode(this.refs[this.props.chart_id]);
    this.props.registerHighchartsNode(this.props.chart_id, domNode);
    this.props.renderChart(this.props.chart_id, this.props.graph_list);
  }

  render() {
    const display = this.props.loading ? 'none' : 'initial';
    return (
      <Segment style={{display: 'flex', alignItems: 'center', margin: 'auto', width: "100%", height: "100%"}}>
        {
          this.props.loading ?
            <Loader active inline='centered'>Loading</Loader>
          :
            null
        }
        {
          <div style={{height: "100%", width: "100%", display: display}} ref={this.props.chart_id} />
        }
      </Segment>
    );
  }

  componentWillUnmount() {
    this.props.onComponentWillUnmount();
  }

}

export default Chart;
