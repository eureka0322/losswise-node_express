import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import {
  Button,
  Card,
  Container,
  Confirm,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  List,
  Menu,
  Item,
  Modal,
  Segment,
  Visibility,
  Message,
  Loader,
  Popup,
  Statistic,
  Dropdown
} from 'semantic-ui-react';
import {
  Redirect,
} from 'react-router-dom';
import projectStore from '../stores/project_store';
import mixpanel from '../analytics';


@observer
class ProjectSettings extends Component {
  constructor(...args) {
    super(...args);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
    this.handleDeleteButton = this.handleDeleteButton.bind(this);
    this.handleConfirmDelete = this.handleConfirmDelete.bind(this);
    this.handleCancelDelete = this.handleCancelDelete.bind(this);
    this.state = {
      projectNameOld: projectStore.projectName,
      projectName: projectStore.projectName,
      projectNameNew: null,
      deleted: false,
      deleteConfirmOpen: false,
    }
  }
  handleSaveClick() {
    // if name hasn't changed
    if (this.state.projectName == this.state.projectNameOld) {
      this.setState({projectNameNew: this.state.projectName});
      return
    }
    projectStore.projectNameNew(this.state.projectName, (err, projectNameNew) => {
      if (err === null) {
        this.setState({projectNameNew: projectNameNew});
      } else {
        // TODO: handle error in case of server error
      }
    });
  }
  handleNameChange(e) {
    this.setState({projectName: e.target.value});
  }
  handleDeleteButton() {
    this.setState({deleteConfirmOpen: true});
  }
	handleConfirmDelete() {
    projectStore.deleteProject(projectStore.projectId, (err, data) => {
      if (err === null) {
        this.setState({deleted: true, deleteConfirmOpen: false});
      } else {
        this.setState({deleteConfirmOpen: false});
      }
    });
	}

	handleCancelDelete = () => this.setState({ deleteConfirmOpen: false })

  render() {
    if (this.state.projectNameNew !== null || this.state.deleted === true) {
      return <Redirect to="/dashboard"/>;
    }
    mixpanel.track("Render project settings");
    return (
      <Container style={{paddingTop: 110, fontSize: 18, paddingBottom: 90}}>
        <Modal size="tiny" style={{width: "550px", top: "20%", margin: "0 0 0 -275px"}}
          open={this.state.deleteConfirmOpen}
          onClose={this.handleCancelDelete}>
          <Modal.Header>Confirm Delete</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              <p>Are you sure you want to delete your project <strong>{ projectStore.projectName }</strong>?</p>
              <p>This operation cannot be undone.</p>
            </Modal.Description>
          </Modal.Content>
          <Modal.Actions>
            <Button style={{color: "#af0100"}} onClick={this.handleConfirmDelete}>Delete</Button>
            <Button onClick={this.handleCancelDelete}>Cancel</Button>
          </Modal.Actions>
        </Modal>
        <Container text>
          <Header as='h1'>{projectStore.projectNameCap} settings</Header>
          <Segment>
            <span>Name</span>
            <Input type="text" value={this.state.projectName} onChange={this.handleNameChange} style={{width: "100%"}} />
            <Divider />
            <div>
              <Button content="Save" onClick={this.handleSaveClick} />
              <Button style={{color: "#af0100"}} onClick={this.handleDeleteButton} floated="right" content="Delete this project" />
            </div>
          </Segment>
        </Container>
      </Container>
    )
  }
}


export default ProjectSettings;
