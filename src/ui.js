import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import { toJS } from 'mobx';
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
import {
  BrowserRouter,
  Route,
  Link,
  Switch,
  Redirect,
} from 'react-router-dom';
import sessionStore from './stores/session_store';
import projectStore from './stores/project_store';
import Quickstart from './components/quickstart';
import Project from './components/project';
import ProjectList from './components/project_list';
import AccountSettings from './components/account_settings';
import ProjectSettings from './components/project_settings';
import ProjectNotificationSettings from './components/project_notification_settings';
import { AuthorizeSlack } from './components/notification_authorize';
import mixpanel from './analytics';
mixpanel.track("UI loaded");


@observer
class ProjectDropdown extends Component {
  render() {
    var projectName = this.props.projectName;
    return (
        projectName ?
          <Menu.Item as={Dropdown} text={projectName} className='link item' style={{}}>
            <Dropdown.Menu>
              <Dropdown.Header content='Switch project' />
              {
                projectStore.projectsCurrent.map(elem => {
                  if (projectName && elem.name.toLowerCase() === projectName.toLowerCase()) {
                    return (
                      <Dropdown.Item key={elem.id} as={Link} to={`/${elem.org_name}/${elem.name}`}>{ elem.name }<Icon style={{marginLeft: 10}} name="checkmark"/></Dropdown.Item>
                    );
                  }
                  else {
                    return (
                      <Dropdown.Item key={elem.id} as={Link} to={`/${elem.org_name}/${elem.name}`}>{ elem.name }</Dropdown.Item>
                    );
                  }
                })
              }
            </Dropdown.Menu>
          </Menu.Item>
        :
          <Menu.Item as={Dropdown} text='Projects' className='link item' style={{}}>
            <Dropdown.Menu>
              <Dropdown.Header content='Switch project' />
              {
                projectStore.projectsCurrent.map(elem => {
                  return (
                    <Dropdown.Item key={elem.id} as={Link} to={`/${elem.org_name}/${elem.name}`}>{ elem.name }</Dropdown.Item>
                  );
                })
              }
            </Dropdown.Menu>
          </Menu.Item>
    );
  }
}

@observer
class Navbar extends Component {
  constructor(...args) {
    super(...args);
    this.syncStore = this.syncStore.bind(this);
    this.state = {error: null};
  }
  syncStore(orgName, projectName) {
    // syncs object stores with the URL
    var orgName = orgName || projectStore.organizationName;
    try {
      orgName && projectStore.setOrganization(orgName);
      orgName && projectName && projectStore.setProject(projectName);
      orgName && projectName && sessionStore.setProject(projectStore.projectId);
      this.setState({error: null});
    } catch (err) {
      console.log(err);
      this.setState({error: err.message});
      projectStore.showDashboardMessage(`Project not found!`, `Please check that your project still exists and that you have access to it.`, false);
    }
  }
  componentWillMount() {
    this.syncStore(this.props.match.params.orgName, this.props.match.params.projectName);
  }
  componentWillReceiveProps(nextProps) {
    this.syncStore(nextProps.match.params.orgName, nextProps.match.params.projectName);
  }
  render() {
    if (this.state.error) {
      return <Redirect to="/dashboard"/>;
    }
    var trigger = (
      <Image
        avatar
        style={{height: 34, width: 34}}
        id="user-icon"
        bordered={true}
        src={USER_PICTURE}
      />
    );
    return (
      <Menu fixed='top' style={{zIndex: 2, height:50, textAlign: "center", backgroundColor: "#30323B"}} inverted>
        <Menu.Menu position='left'>
          {
            projectStore.organizationName !== null ?
              <Menu.Item as={Dropdown} text={projectStore.organizationName} className='link item' style={{}}>
                <Dropdown.Menu>
                  <Dropdown.Header content='Switch organization' />
                  {
                    projectStore.organizations.map(elem => {
                      if (elem.id == projectStore.organizationId) {
                        return (
                          <Dropdown.Item key={elem.id} as={Link} to={`/${elem.name}`}>{ elem.name }<Icon style={{marginLeft: 10}} name="checkmark"/></Dropdown.Item>
                        );
                      } else {
                        return (
                          <Dropdown.Item key={elem.id} as={Link} to={`/${elem.name}`}>{ elem.name }</Dropdown.Item>
                        );
                      }
                    })
                  }
                </Dropdown.Menu>
              </Menu.Item>
            :
              null
          }
          {
            projectStore.projectsCurrent.length > 0 ?
              <ProjectDropdown projectName={this.props.match.params.projectName}/>
            :
              null
          }
        </Menu.Menu>
        <Menu.Menu position='right'>
          <Menu.Item name='dashboard' as={Link} to='/dashboard' active={false}>
            Dashboard
          </Menu.Item>
          <Menu.Item name='docs' href='https://docs.losswise.com' target='_blank' active={false}>
            Docs
          </Menu.Item>
          <Dropdown item trigger={trigger} className="top right">
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to={`/${projectStore.organizationName}/account`}><Icon name="settings"/> Settings</Dropdown.Item>
              <Dropdown.Item onClick={(e,v) => { window.location = "/logout" }}><Icon name="sign out"/> Sign out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Menu.Menu>
      </Menu>
    );
  }
}


const Sidebar = ({ match }) =>
  <div>
    <Menu inverted fixed="left" icon='labeled'
      vertical style={{width: 100, marginTop: 50, backgroundColor: "#555555", zIndex: 1}}>
      <Link to={`/${match.params.orgName}/${match.params.projectName}`} style={{ textDecoration: 'none' }}>
        <Menu.Item name='video camera' className="skip-lines" active={ match.path =='/:orgName/:projectName' }>
          <Icon name='line chart' />
          Sessions
        </Menu.Item>
      </Link>
      <Link style={{ textDecoration: 'none' }} to={`/${match.params.orgName}/${match.params.projectName}/quickstart`}>
        <Menu.Item name='that' className="skip-lines" active={ match.path.endsWith('quickstart') } >
          <Icon name='newspaper' />
          Quickstart
        </Menu.Item>
      </Link>
      <Link style={{ textDecoration: 'none' }} to={`/${match.params.orgName}/${match.params.projectName}/notifications`}>
        <Menu.Item name='that' className="skip-lines" active={ match.path.endsWith('notifications') } >
          <Icon name='feed' />
          Alerts
        </Menu.Item>
      </Link>
      <Link style={{ textDecoration: 'none' }} to={`/${match.params.orgName}/${match.params.projectName}/settings`}>
        <Menu.Item name='that' className="skip-lines" active={ match.path.endsWith('settings') } >
          <Icon name='settings' />
          Settings
        </Menu.Item>
      </Link>
    </Menu>;
  </div>


// TODO: introduce new way of synchronizing state with URL and then disconnect navbar from this file
const Root = () =>
  <BrowserRouter>
    <Container fluid={true}>
      <Switch>
        <Route exact path="/dashboard" component={Navbar}/>
        <Route path="/authorize/slack" component={Navbar}/>
        <Route path="/:orgName/account" component={Navbar}/>
        <Route exact path="/:orgName/:projectName" component={Navbar}/>
        <Route exact path="/:orgName/:projectName/quickstart" component={Navbar}/>
        <Route exact path="/:orgName/:projectName/notifications" component={Navbar}/>
        <Route exact path="/:orgName/:projectName/settings" component={Navbar}/>
        <Route exact path="/:orgName" component={Navbar}/>
      </Switch>
      <Switch>
        <Route exact path="/:orgName/:projectName/quickstart" component={Sidebar}/>
        <Route exact path="/:orgName/:projectName/settings" component={Sidebar}/>
        <Route exact path="/:orgName/:projectName/notifications" component={Sidebar}/>
        <Route exact path="/:orgName/:projectName" component={Sidebar}/>
      </Switch>
      <Switch>
        <Route exact path="/dashboard" component={ProjectList}/>
        <Route path="/authorize/slack" component={AuthorizeSlack}/>
        <Route path="/:orgName/account" component={AccountSettings}/>
        <Route exact path="/:orgName/:projectName/quickstart" component={Quickstart}/>
        <Route exact path="/:orgName/:projectName/settings" component={ProjectSettings}/>
        <Route exact path="/:orgName/:projectName/notifications" component={ProjectNotificationSettings}/>
        <Route exact path="/:orgName/:projectName" component={Project}/>
        <Route exact path="/:orgName" component={ProjectList}/>
      </Switch>
    </Container>
  </BrowserRouter>;


ReactDOM.render(
    <Root />,
    document.getElementById('main')
);
