import React, { Component, PropTypes } from 'react';
import { observer } from 'mobx-react';
import {
  BrowserRouter,
  Route,
  Link
} from 'react-router-dom';
import {
  Button,
  Icon,
  Container,
  Input,
  Header,
  Divider,
  Label,
  Modal,
  Popup,
  Message,
  Image,
  Segment
} from 'semantic-ui-react';
import projectStore from '../stores/project_store';
import ClipboardButton from 'react-clipboard.js';
import mixpanel from '../analytics';


class ProjectCreatorModal extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      modalOpen: false,
      error: false,
      name: ''
    };
    this.createNewProject = this.createNewProject.bind(this);
    this.nameChange = this.nameChange.bind(this);
  }

  handleOpen = () => {
    this.setState({ modalOpen: true, name: '', error: false });
    mixpanel.track("Opened project creator modal");
  }

  handleClose = () => this.setState({ modalOpen: false });

  createNewProject(e) {
    // TODO: make callback actually work
    if (this.props.projectStore.projects.filter(project => {
      return project.name == this.state.name
    }).length) {
      this.setState({ error: true });
    }
    else {
      this.props.projectStore.createNewProject(this.state.name, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          this.handleClose();
        }
      });
    }
  }

  nameChange(e) {
    this.setState({name: e.target.value});
  }

  render() {
    let error = null;
    if (this.state.error) {
      error = <Header size='tiny' color='red'>Name duplicated</Header>;
    } else {
      error = <div></div>;
    }
    return (
      <Modal size="tiny" style={{width: "550px", top: "20%", margin: "0 0 0 -275px"}} trigger={<Button floated="right" onClick={this.handleOpen}><Icon name='add circle' />Create Project</Button>}
        open={this.state.modalOpen}
        onClose={this.handleClose}>
        <Modal.Header>Create a project</Modal.Header>
        <Modal.Content>
          <Input autoFocus fluid placeholder="Please put your project name here..." value={this.state.name} onChange={this.nameChange} />
          { error }
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={this.createNewProject}>Add Project</Button>
          <Button onClick={this.handleClose}>Close</Button>
        </Modal.Actions>
      </Modal>
    );
  }
}


@observer
class ProjectRowList extends Component {
  constructor(...args) {
    super(...args);

    this.getApiKey = this.getApiKey.bind(this);
    this.showCopy = this.showCopy.bind(this);
    this.hideCopy = this.hideCopy.bind(this);
  }

  getApiKey() {
    return 'I\'ll be copied';
  }

  showCopy(id) {
    this.props.projectStore.showCopy(id);
    if (document.getElementsByClassName("popup")[0])
      document.getElementsByClassName("popup")[0].parentNode.style.display = "block";
  }

  hideCopy(id) {
    this.props.projectStore.hideCopy(id);
    if (document.getElementsByClassName("popup")[0])
      document.getElementsByClassName("popup")[0].parentNode.style.display = "none";
  }

  render() {
    mixpanel.track("Render project row list");
    return (
      <Container style={{paddingTop: 20, paddingBottom: 0}}>
        {
          this.props.projectStore.projectsCurrent.length > 0 ?
            this.props.projectStore.projectsCurrent.map(elem => {
              return (
                <Segment key={elem.id}>
                  <div style={{display: 'flow-root'}}>
                    <Link to={`/${elem.org_name}/${elem.name}`}>
                      <Button content={elem.org_name + "/" + elem.name} basic icon="bar chart" size="huge" labelPosition="left" style={{width: "100%", textAlign: "left"}} />
                    </Link>
                  </div>
                  <Divider />
                  <div>
                    <b>API key:</b>
                    <Input type="text" action style={{ marginLeft: 15 }}>
                      <input value={elem.api_key} className="disable-select" style={{opacity: 1}} />
                      <Popup trigger={<ClipboardButton className="ui icon button clipboard-btn" data-clipboard-text={elem.api_key} onSuccess={() => this.showCopy(elem.id)}><div className="button" onMouseLeave={() => this.hideCopy(elem.id)}><Image src="/images/clippy.svg" style={{ height: 15 }} /></div></ClipboardButton>} content="Copied!" position="bottom center" size="mini" inverted style={{opacity: 0.7}} />
                    </Input>
                    <Link to={`/${elem.org_name}/${elem.name}/settings`}>
                      <Button floated={"right"} ><Icon name='setting' /> Settings</Button>
                    </Link>
                    <Link to={`/${elem.org_name}/${elem.name}/notifications`}>
                      <Button floated={"right"} ><Icon name='alarm outline' /> Notifications</Button>
                    </Link>
                  </div>

                </Segment>
              );
            })
          :
            <Segment>
              <h3>Welcome to Losswise</h3>
              <p>Click on <strong>Create Project</strong> to get started!</p>
            </Segment>
        }
      </Container>
    );
  }
}


class ProjectOrganizationSetup extends Component {
  constructor(...args) {
    super(...args);
    this.handleOrgNameChange = this.handleOrgNameChange.bind(this);
    this.handleProjectNameChange = this.handleProjectNameChange.bind(this);
    this.handleUserNameChange = this.handleUserNameChange.bind(this);
    this.handleUserEmailChange = this.handleUserEmailChange.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
    this.dismissError = this.dismissError.bind(this);
    this.state = { inputError: "", organizationName: "", projectName: "", userName: "", userEmail: "" };
  }
  handleOrgNameChange(e) {
    this.setState({organizationName: e.target.value});
  }
  handleUserNameChange(e) {
    this.setState({userName: e.target.value});
  }
  handleUserEmailChange(e) {
    this.setState({userEmail: e.target.value});
  }
  handleProjectNameChange(e) {
    this.setState({projectName: e.target.value});
  }
  handleSaveClick() {
    var emailIsValid = this.state.userEmail.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i);
    if (!emailIsValid) {
      // TODO: do something
      this.setState({inputError: "Invalid email!"});
      return;
    }
    if (this.state.userName.length == 0) {
      this.setState({inputError: "Invalid user name!"});
      return;
    }
    if (projectStore.organizations.length == 0) {
      if (this.state.projectName.length == 0) {
        this.setState({inputError: "Invalid project name!"});
        return;
      }
      if (this.state.organizationName.length == 0) {
        this.setState({inputError: "Invalid organization name!"});
        return;
      }
      projectStore.createUserOrgProject(
        this.state.userName,
        this.state.userEmail,
        this.state.projectName,
        this.state.organizationName,
        (err, projectNew) => {
          if (err) {
            this.setState({inputError: String(err)});
          } else {
            projectStore.showDashboardMessage(
              `Your account ${projectNew.org_name} was created successfully!`,
              `Get started with your first project by clicking on your project of interest.`
            );
            this.props.history.push(`${projectNew.org_name}/${projectNew.name}/quickstart`);
          }
        }
      );
    } else {
      projectStore.createUser(
        this.state.userName,
        this.state.userEmail,
        (err, userData) => {
          if (err) {
            this.setState({inputError: String(err)});
          } else {
            projectStore.showDashboardMessage(
              `Your user account was created successfully!`,
              `Get started with your first project by clicking on your project of interest.`
            );
          }
        }
      );
    }
  }
  dismissError() {
    this.setState({inputError: ""});
  }
  render() {
    mixpanel.track("Render project organization setup");
    return (
      <Container>
        {
          this.state.inputError.length ?
            <Message
            negative
            header="Invalid values"
            content={this.state.inputError}
            onDismiss={() => { this.dismissError(); }}
            />
          :
            null
        }
        <Segment>
          <span>User name</span>
          <Input type="text" autoFocus placeholder="" value={this.state.userName} onChange={this.handleUserNameChange} style={{width: "100%"}} />
          <Divider />
          <span>Preferred contact email</span>
          <Input type="text" name="email" placeholder="" value={this.state.userEmail} onChange={this.handleUserEmailChange} style={{width: "100%"}} />
          <Divider />
          { projectStore.organizations.length == 0 ?
              <div>
                <span>Account / Company name</span>
                <Input type="text" placeholder="" value={this.state.organizationName} onChange={this.handleOrgNameChange} style={{width: "100%"}} />
                <Divider />
                <span>New project name</span>
                <Input type="text" placeholder="" value={this.state.projectName} onChange={this.handleProjectNameChange} style={{width: "100%"}} />
                <Divider />
              </div>
            :
              null
          }
          <div>
            <Button content="Save" onClick={this.handleSaveClick} />
          </div>
        </Segment>
      </Container>
    );
  }
}


@observer
class ProjectsViewer extends Component {
  constructor(...args) {
    super(...args);
  }
  render() {
    mixpanel.track("Render projects viewer");
    if (this.props.projectStore.user && this.props.projectStore.organizations) {
      return (
        <Container text style={{paddingTop: 110, paddingBottom: 80}}>
          <Header as="h1" textAlign="left">
            Dashboard
            <ProjectCreatorModal projectStore={this.props.projectStore} />
          </Header>
          {
            this.props.projectStore.dashboardMessage !== null ?
              <Message
              negative={this.props.projectStore.dashboardMessage.success === false ? true : undefined}
              success={this.props.projectStore.dashboardMessage.success === true ? true : undefined}
              header={this.props.projectStore.dashboardMessage.header}
              content={this.props.projectStore.dashboardMessage.content}
              onDismiss={() => { this.props.projectStore.hideDashboardMessage(); }}
              />
            :
              null
          }
          <ProjectRowList projectStore={this.props.projectStore} />
        </Container>
      );
    } else  {
      return (
        <Container text style={{paddingTop: 110, paddingBottom: 80}}>
          <Header as="h1" textAlign="left">
            Welcome to Losswise!
          </Header>
          <Header as="h3">
          Create an account name and your first project to get started.
          </Header>
          <ProjectOrganizationSetup history={this.props.history} />
        </Container>
      );
    }
  }
}


@observer
class ProjectList extends Component {
  constructor(...args) {
    super(...args);
  }

  componentDidMount() {
    document.getElementById('loading-ui-container').style.display = 'none'
  }

  render() {
    return (
      <Container>
        <ProjectsViewer history={this.props.history} projectStore={projectStore} />
      </Container>
    );
  }
}

export default ProjectList;
