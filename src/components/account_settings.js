import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import {
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  List,
  Menu,
  Item,
  Segment,
  Visibility,
  Message,
  Modal,
  Loader,
  Popup,
  Statistic,
  Dropdown
} from 'semantic-ui-react';
import { observer } from 'mobx-react';
import {
  BrowserRouter,
  Route,
  Link,
  Redirect
} from 'react-router-dom';

import projectStore from '../stores/project_store';
import accountStore from '../stores/account_store';
import ClipboardButton from 'react-clipboard.js';
import mixpanel from '../analytics';

class PriceCard extends Component {
  render() {
    return (
      <Card raised={true}>
        <Card.Content style={{textAlign: "center"}} header={this.props.planName} />
        <Card.Content>
          <Card.Meta className="center aligned">{this.props.planMeta}</Card.Meta>
          <Card.Description>
            <List>
              { this.props.items.map((elem, idx) => <List.Item key={idx}>{elem}</List.Item>) }
            </List>
          </Card.Description>
        </Card.Content>
        <Card.Content extra>
          { this.props.bottomButtonDisabled ?
              <Button basic fluid>
                <Icon name="check circle outline"/>
                Current plan
              </Button>
            :
              <Button fluid color="blue" content={this.props.bottomButtonContent} />
          }
        </Card.Content>
      </Card>
    );
  }
}


@observer
class SettingsView extends Component {
  constructor(...args) {
    super(...args);
    this.state = {accountName: projectStore.organizationName, accountNameIsNew: false};
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
  }
  handleOnChange(e) {
    this.setState({accountName: e.target.value});
  }
  componentWillReceiveProps(nextProps) {
    this.setState({accountNameIsNew: false});
  }
  handleSaveClick() {
    // TODO: add validation, and check that accountName has indeed changed
    projectStore.renameAccount(this.state.accountName, (err, data) => {
      if (err) {
        console.log('error!');
      } else {
        this.setState({accountName: data.organization_name, accountNameIsNew: true});
        console.log('success!');
      }
    });
  }
  render() {
    if (this.state.accountNameIsNew === true) {
      console.log('redirect');
      return <Redirect to={`/${this.state.accountName}/account`} />;
    }
    return (
      <Item.Group>
          <Header>Account</Header>
          <Divider />
        <Item>
          Company or Organization Name
        </Item>
        <Item>
        <Input name="text" placeholder='Account name' onChange={this.handleOnChange} value={this.state.accountName} />
        </Item>
        <Item>
        <Button content={"Update Name"} onClick={this.handleSaveClick} />
        </Item>
      </Item.Group>
    );
  }
}

@observer
class PeopleView extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      inviteEmail: '',
      deleteConfirmOpen: false,
      uninviteId: '',
      uninviteEmail: ''
    };
    this.handleInviteClick = this.handleInviteClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleConfirmDelete = this.handleConfirmDelete.bind(this);
    this.handleUninviteClick = this.handleUninviteClick.bind(this);
    this.handleCancelDelete = this.handleCancelDelete.bind(this);
  }
  handleInviteClick(e) {
    if (projectStore.user === null) {
      projectStore.showAccountMessage("Invite failed!", "Please register at /dashboard", false);
      return;
    }
    accountStore.inviteNew(
      projectStore.organizationId,
      projectStore.organizationName,
      projectStore.user.name,
      this.state.inviteEmail,
      (err, success) => {
      console.log(err);
      if (err) {
        projectStore.showAccountMessage(
          'Invite failed.',
          String(err),
          false
        );
      } else {
        console.log(success);
        projectStore.showAccountMessage(
          'Invite was successfully sent!',
          'The recipient shall receive a welcome email shortly',
          true
        );
      }
      this.setState({inviteEmail: ''});
    });
  }
  handleConfirmDelete() {
    accountStore.inviteDelete(this.state.uninviteId, (err, success) => {
      if (err) {
        projectStore.showAccountMessage('Invite failed', err, false);
      } else {
        projectStore.showAccountMessage('Invite deleted', '', true);
      }
      this.setState({deleteConfirmOpen: false});
    });
  }
  handleUninviteClick(inviteId, inviteEmail) {
    this.setState({deleteConfirmOpen: true, uninviteId: inviteId, uninviteEmail: inviteEmail});
  }
  handleCancelDelete() {
    this.setState({deleteConfirmOpen: false});
  }
  handleInputChange(e) {
    this.setState({inviteEmail: e.target.value});
  }
  render() {
    return (
      <Container>
        <Modal size="tiny" style={{width: "550px", top: "20%", margin: "0 0 0 -275px"}}
          open={this.state.deleteConfirmOpen}
          onClose={this.handleCancelDelete}>
          <Modal.Header>Confirm Delete</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              <p>Are you sure you want to delete your invite to <strong>{ this.state.uninviteEmail }</strong>?</p>
              <p>You can reinvite this user anytime you choose.</p>
            </Modal.Description>
          </Modal.Content>
          <Modal.Actions>
            <Button style={{color: "#af0100"}} onClick={this.handleConfirmDelete}>Delete</Button>
            <Button onClick={this.handleCancelDelete}>Cancel</Button>
          </Modal.Actions>
        </Modal>
        <Item.Group>
          <Header>Invites</Header>
          <Divider />
          { accountStore.invitesLoading == true ?
              <Loader active inline='centered'></Loader>
            :
              <div>
                <Segment clearing>
                  <Input placeholder="Enter Email Address" value={this.state.inviteEmail} onChange={this.handleInputChange} name="email" type="text" style={{ width: "100%" }} action={<Button icon="add user" content="Add user" floated="right" onClick={this.handleInviteClick} />} />
                </Segment>
                {
                  accountStore.invites.map((invite, idx) => {
                    return (
                      <Segment key={invite.id} clearing>
                        <Header style={{margin: 0}} as='h3' floated="left">
                          <Icon name='user' />
                          {' '}{invite.email}
                        </Header>
                        <Header style={{margin: 0}} floated="right">
                          <Button
                            onClick={() => this.handleUninviteClick(invite.id, invite.email)}
                            icon="trash"
                            content="Remove"
                          />
                        </Header>
                      </Segment>
                    );
                  })
                }
              </div>
          }
          <Header>Team</Header>
          <Divider />
          { accountStore.peopleLoading == true ?
              <Loader active inline='centered'></Loader>
            :
              <div>
                {
                  accountStore.people.map((user, idx) => {
                    return (
                      <Segment key={user.id} clearing>
                        <Header style={{margin: 0}} as='h3' floated="left">
                          <Icon name='user' />
                          {' '}{user.email} { user.id === (projectStore.user && projectStore.user.id) ? "(you)" : null }
                        </Header>
                        <Header style={{margin: 0}} floated="right">
                          <Button icon="trash" content="Remove" />
                        </Header>
                      </Segment>
                    );
                  })
                }
              </div>
          }
        </Item.Group>
      </Container>
    );
  }
}

const SupportView = () => (
  <div>
    <Header>
    Everyone deserves great monitoring
    </Header>
    <Divider />
    Email us at support@losswise.com if you have any questions or feature requests!
  </div>
);

const InviteView = () => (
  <div>
    <Header>
    Everyone deserves great monitoring
    </Header>
    <Divider />
    Invite your friends to use Losswise by sharing this URL!
    <br />
    <br />
    <Input type="text" action style={{ marginLeft: 15, width: "30em" }}>
      <input value={"https://losswise.com/activate?id=23481234ASD89"} className="disable-select"  style={{opacity: 1}} />
      <Popup trigger={
        <ClipboardButton className="ui icon button clipboard-btn" >
          <div onMouseLeave={ () => {
              if (document.getElementsByClassName("popup")[0]) {
                document.getElementsByClassName("popup")[0].parentNode.style.display = "none";
              } } } className="button">
            <Image src="/images/clippy.svg" style={{ height: 15 }} />
          </div>
        </ClipboardButton>}
        content="Copied!" position="bottom center" size="mini" inverted style={{opacity: 0.7}}
      />
    </Input>
  </div>
);

const BillingView = () => (
  <Item.Group>
    <Header>Plans</Header>
    <Divider />
    <Item>
      <div>You are in luck! As a beta user, you may enjoy <strong>Pro</strong> access untill December 1st! We will email you at least 2 weeks in advance about any updates to your billing plan.</div>
    </Item>
    <Card.Group itemsPerRow={3}>
      <PriceCard
        planName="Free"
        items={[
          <span><strong>750</strong> experiment hours of monitoring per month</span>,
          <span><strong>100,000</strong> data points per month</span>,
          <span><strong>1 week</strong> data history</span>,
        ]}
        bottomButtonDisabled={false}
        bottomButtonContent="Downgrade"
      />
      <PriceCard
        planName="Pro"
        items={[
          <span><strong>$0.1</strong> per experiment hour monitored</span>,
          <span><strong>$0.05</strong> per 1000 data points logged</span>,
          <span><strong>1 year</strong> data history</span>,
        ]}
        bottomButtonDisabled={false}
        bottomButtonContent="Downgrade"
      />
      <PriceCard
        planName="Enterprise"
        items={[
          <span>On premise</span>,
          <span>SLA</span>,
          <span>Volume discounts</span>,
          <span>Contact us</span>,
        ]}
        bottomButtonDisabled={true}
        bottomButtonContent="Upgrade"
      />
    </Card.Group>
  </Item.Group>
);

@observer
class SettingSidebar extends Component {
  constructor(...args) {
    super(...args);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.fetchData = this.fetchData.bind(this);
    var url = window.location.pathname;
    var urlSplit = url.split('/');
    this.state = {
      activeItem: url.endsWith('account') ? 'settings' : urlSplit[urlSplit.length - 1],
    }
    this.fetchData();
  }
  fetchData() {
    accountStore.fetchPeople(projectStore.organizationId, (err, success) => {
      if (err) {
        console.log(err);
      } else {
        console.log(success);
      }
    });
    accountStore.fetchInvites(projectStore.organizationId, (err, success) => {
      if (err) {
        console.log(err);
      } else {
        console.log(success);
      }
    });
  }
  handleItemClick(e, { name }) {
    this.setState({ activeItem: name });
  }
  render() {
    var { activeItem } = this.state;
    return (
      <Menu fluid vertical tabular style={{backgroundColor: '#f9f9f9', borderRadius: "5px 0 0 5px", border: "1px solid #ddd", padding: "10px 0px 10px 10px"}}>
        <Menu.Item name="settings" as={Link} to={`/${this.props.match.params.orgName}/account`} active={activeItem === 'settings'} onClick={this.handleItemClick}>
          <Icon name="setting" style={{float: "left", margin: "0 0.5em"}} />
          Settings
        </Menu.Item>
        <Menu.Item name="people" as={Link} to={`/${this.props.match.params.orgName}/account/people`} active={activeItem === 'people'} onClick={this.handleItemClick}>
          <Icon name="users" style={{float: "left", margin: "0 0.5em"}} />
          People
        </Menu.Item>
        <Menu.Item name="billing" as={Link} to={`/${this.props.match.params.orgName}/account/billing`} active={activeItem === 'billing'} onClick={this.handleItemClick}>
          <Icon name="payment" style={{float: "left", margin: "0 0.5em"}} />
          Billing
        </Menu.Item>
        <Menu.Item name="support" as={Link} to={`/${this.props.match.params.orgName}/account/support`} active={activeItem === 'support'} onClick={this.handleItemClick}>
          <Icon name="help circle" style={{float: "left", margin: "0 0.5em"}} />
          Support
        </Menu.Item>
      </Menu>
    )
  }
}

@observer
class AccountSettings extends Component {
  render() {
    console.log(this.props.match.params);
    mixpanel.track("Render account settings");
    return (
      <BrowserRouter>
        <Container style={{paddingTop: 110, fontSize: 18, paddingBottom: 90}}>
          <Header as='h1'>Settings</Header>
          {
            projectStore.accountMessage !== null ?
              <Message
              negative={projectStore.accountMessage.success === false ? true : undefined}
              success={projectStore.accountMessage.success === true ? true : undefined}
              header={projectStore.accountMessage.header}
              content={projectStore.accountMessage.content}
              onDismiss={() => { projectStore.hideAccountMessage(); }}
              />
            :
              null
          }
          <Segment>
            <Grid container={true}>
              <Grid.Column width={4}>
                <Route path="/:orgName/account" component={SettingSidebar} />
              </Grid.Column>

              <Grid.Column stretched width={12}>
                <Segment>
                  <Route exact path={`/:orgName/account`} component={SettingsView}/>
                  <Route exact path={`/:orgName/account/people`} component={PeopleView}/>
                  <Route exact path={`/:orgName/account/billing`} component={BillingView}/>
                  <Route exact path={`/:orgName/account/support`} component={SupportView}/>
                </Segment>
              </Grid.Column>
            </Grid>
          </Segment>
        </Container>
      </BrowserRouter>
    )
  }
}

export default AccountSettings;
