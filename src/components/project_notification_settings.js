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
import projectStore from '../stores/project_store';
import axios from 'axios';
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;

@observer
class ProjectNotificationSettings extends Component {
  constructor(props) {
    super(props);
    this.handleDeleteNotification = this.handleDeleteNotification.bind(this);
    this.handleAddSlack = this.handleAddSlack.bind(this);
    this.handleConfirmDelete = this.handleConfirmDelete.bind(this);
    this.handleCancelDelete = this.handleCancelDelete.bind(this);

    this.state = {
      deleteConfirmOpen: false,
      selectedNotification: true
    }
  }

  componentWillMount() {
    projectStore.updateNotifications(projectStore.organizationId, projectStore.projectId)
  }

  handleAddSlack() {
    var scope = 'incoming-webhook';

    localStorage.setItem('slackNotiInfo', JSON.stringify({
      pid: projectStore.projectId,
      org_id: projectStore.organizationId,
      org_name: this.props.match.params.orgName,
      proj_name: this.props.match.params.projectName
    }));
    console.log(process.env.SLACK_CLIENT_ID)
    if (SLACK_CLIENT_ID) {
      location.href = `https://slack.com/oauth/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scope}`;
    }
  }

  handleDeleteNotification(notification) {
    this.setState({
      deleteConfirmOpen: true,
      selectedNotification: notification
    })
  }

  handleCancelDelete() {
    this.setState({ deleteConfirmOpen: false })
  }
  handleConfirmDelete() {
    this.setState({ deleteConfirmOpen: false })
    if(this.state.selectedNotification && this.state.selectedNotification.info && this.state.selectedNotification.info.access_token) {
      projectStore.notificationsLoading.set(true);
      const token = this.state.selectedNotification.info.access_token;
      axios.get(`https://slack.com/api/auth.revoke?token=${token}`)
        .then((response) => {
          if (response.data.ok === true || response.data.error == "token_revoked") {
            console.log('token revoked!')
            axios.delete(process.env.API_BASE_URL + '/api/v1/notifications/' + this.state.selectedNotification.id)
              .then((res) => {
                projectStore.updateNotifications(projectStore.organizationId, projectStore.projectId)
              })
              .catch((err) => {
                console.log(err);
                callback("Server API call failed!", null);
              });
          }
        }).catch((err) => {
          console.log("Server API call failed!");
        }).finally(() => {
          console.log('finally here!');
        });
    } else {
      axios.delete(process.env.API_BASE_URL + '/api/v1/notifications/' + this.state.selectedNotification.id)
        .then((res) => {
          projectStore.updateNotifications(projectStore.organizationId, projectStore.projectId)
        })
        .catch((err) => {
          console.log(err);
          callback("Server API call failed!", null);
        });
    }
  }

  render() {
    return (
      <Container style={{paddingTop: 110, fontSize: 18, paddingBottom: 90}}>
        <Modal size="tiny" style={{width: "550px", top: "20%", margin: "0 0 0 -275px"}}
               open={this.state.deleteConfirmOpen}
               onClose={this.handleCancelDelete}>
          <Modal.Header>Confirm Delete</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              <p>Are you sure you want to delete your notification?</p>
            </Modal.Description>
          </Modal.Content>
          <Modal.Actions>
            <Button style={{color: "#af0100"}} onClick={this.handleConfirmDelete}>Delete</Button>
            <Button onClick={this.handleCancelDelete}>Cancel</Button>
          </Modal.Actions>
        </Modal>
        <Container text>
          <Header as='h1'>{projectStore.projectNameCap} notifications</Header>
            { projectStore.notificationsLoading.get() ?
                <Loader active inline='centered' />
              :
                projectStore.notifications.map((notification, idx) => {
                  return (
                    <Segment key={notification.id} clearing>
                      <Header style={{margin: 0}} as='h3' floated="left">
                        <Icon name='user' />
                        {' '}{notification.type}
                      </Header>
                      <Header style={{margin: 0}} floated="right">
                        <Button
                          onClick={() => this.handleDeleteNotification(notification)}
                          icon="trash"
                          content="Remove"
                        />
                      </Header>
                    </Segment>
                  );
                })
            }
          { projectStore.notificationsLoading.get() ?
              null
            :
              <Segment clearing>
                <Header style={{margin: 0}} as='h3' floated="left">
                  <Image src="/images/slack.png" style={{ display: 'inline', marginRight: 10 }} />
                  Slack
                </Header>
                <Header style={{margin: 0}} floated="right">
                  <Button
                    onClick={() => this.handleAddSlack()}
                    icon="add"
                    content="Add"
                  />
                </Header>
              </Segment>
          }
        </Container>
      </Container>
    )
  }
}

export default ProjectNotificationSettings;
