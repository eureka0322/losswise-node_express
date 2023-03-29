import React, { Component, PropTypes } from 'react';
import styled from 'styled-components';
import {
  BrowserRouter,
} from 'react-router-dom';
import { withState } from 'recompose';
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
import SessionTable from './session_table';
import ChartList from './chart_list';
import DraggableButton from './buttons/draggable';
import mixpanel from '../analytics';


const DraggableComponent = styled(DraggableButton)`
  top: ${({top}) => top}%;
`;


class DashboardComponent extends Component {
  constructor(...args) {
    super(...args);
  }
  render() {
    mixpanel.track("Render project");
    const {topDraggable, setTopDraggable} = this.props;
    return (
      <Container fluid={true}>
        <div style={{overflow: "scroll", overflowX: "hidden", position: "absolute", left: 0, right: 0, top: 0, paddingLeft: 100, paddingTop: 50, height: `${topDraggable}%`}}>
          <SessionTable />
        </div>
        <div style={{ paddingLeft: 100 }}>
          <DraggableComponent top={topDraggable} onDrag={({pageYPercent}) => setTopDraggable(pageYPercent)} />
        </div>
        <div style={{width: "100%!important", overflow: "scroll", position: "absolute", paddingLeft: 100, paddingTop: 10, left: 0, right: 0, bottom: 0, height: `${100 - topDraggable}%`}}>
          <ChartList />
        </div>
      </Container>
    );
  }
}


const dashboardEnhancer = withState('topDraggable', 'setTopDraggable', 45);
const Dashboard = dashboardEnhancer(DashboardComponent);


class Project extends Component {
  constructor(...args) {
    super(...args);
  }

  render() {
    return (
      <BrowserRouter>
        <Container fluid={true}>
          <Dashboard />
        </Container>
      </BrowserRouter>
    );
  }
}


export default Project;
