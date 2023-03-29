import React, { Component, PropTypes } from 'react';
import { observer } from 'mobx-react';

import {
  Button,
  Container,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  List,
  Menu,
  Segment,
  Visibility,
  Dropdown
} from 'semantic-ui-react';

import projectStore from '../stores/project_store';
import mixpanel from '../analytics';

@observer
class QuickstartTutorial extends Component {
  constructor(...args) {
    super(...args);
  }
  componentDidMount() {
    PR.prettyPrint();
  }
  render() {
    mixpanel.track("Render quickstart");
    var apiKey = projectStore.projectApiKey;
    var projectName = projectStore.projectName;
    var organizationName = projectStore.organizationName;
    var projectURL = `/${organizationName}/${projectName}`;
    return (
      <Container style={{paddingTop: 110, fontSize: 18, paddingBottom: 90}}>
        <Container text>
          <Header as='h1'>Quickstart</Header>
          <p>To use Losswise you must first install Losswise's <a href="https://github.com/Losswise/losswise-python" target="_blank"> Python client</a>:</p>
          <Segment>
            <code className="prettyprint display-linebreak" style={{}}>sudo pip install losswise</code>
          </Segment>
          <p>This client library is robust against network failures and logs the data asynchronously in a separate thread for near zero overhead.</p>
          <p>The last thing we would ever want is to slow down your application, or crash it because your colleague or roomate trips over an ethernet cable.</p>
          <p>Let's run a toy example to get comfortable with how Losswises works.</p>
          <p>
          Simply copy paste the following snippet into your favorite text editor and save it as <code>test.py</code>, no changes necessary.
          </p>
          <Segment>
          <code className="prettyprint display-linebreak" style={{}}>{
  `import random
import losswise
import time
losswise.set_api_key('${apiKey}') # api_key for "${projectName}"
session = losswise.Session(tag='my_dilated_convnet', max_iter=10)
graph = session.Graph('loss', kind='min')
for x in range(10):
    train_loss = 1. / (0.1 + x + 0.1 * random.random())
    test_loss = 1.5 / (0.1 + x + 0.2 * random.random())
    graph.append(x, {'train_loss': train_loss, 'test_loss': test_loss})
    time.sleep(1.)
session.done()`} </code>
          </Segment>
          <p>
          Once you have saved the file, run the following command inside your terminal:
          </p>
          <Segment>
            <code className="prettyprint display-linebreak" style={{}}>python test.py</code>
          </Segment>
          <p>Now click on the "Sessions" button to the left to monitor the progress of your script.  Congrats, you're now ready to do some serious machine learning.</p>
          <p>If you want a more in depth explanation of the core concepts used throughout Losswise, make sure to check out our <a href="https://docs.losswise.com" target="_blank">docs page</a>.</p>
          <p>
          Please share your thoughts and any feature requests with us directly at support@losswise.com.
          </p>
        </Container>
      </Container>
    );
  }
}

export default QuickstartTutorial;
