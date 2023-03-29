# Losswise

### Usage
Monitoring for machine learning / deep learning.

This repo uses node as a web server and a python client.  The routes that are hit direclty by the python client live in `api.js`.

To install and run: 

```bash
npm install -g webpack
cd losswise
webpack
npm install
node app.js
```

Please follow the directions on losswise.com or at the /dashboard route to start sending data to the server from Python.  You'll need to run:

```bash
sudo pip install losswise
``` 

to install the Python client.  The Python client is also contained inside this actual repo! You can make changes to the client code in the /losswise-python directory
and then I can deploy them to PyPI whenever.

If you want the python script to send data to your _local_ server because you are trying out API changes, you can use the `set_base_url` function in the `losswise` package.
For example:

```python
import time
import random
import losswise

losswise.set_api_key('your_api_key')
losswise.set_base_url('http://localhost:3000')

# create Losswise session object, tagged with SESSION_TAG string
session = losswise.Session(tag='test', max_iter=10)

# create tracker for loss
graph = session.Graph('loss', kind='min')
graph2 = session.Graph('acc', kind='max')

# track artificial loss over time
for x in xrange(100):
    train_loss = 1. / (0.1 + x + 0.1 * random.random())
    test_loss = 1.5 / (0.1 + x + 0.2 * random.random())
    graph.append(x, {'train_loss': 0.8 * random.random(), 'test_loss': 0.4 * random.random()})
    graph2.append(x, {'train_acc': 0.8 * random.random(), 'test_acc': 0.4 * random.random()})
    time.sleep(1)
session.done()
```

### Deploying

Changes are deployed to ElasticBeanstalk via CircleCI.  See circle.yml to understand how this happens and to observe some of the config differences between dev and prod environments.
Please create pull requests for any important structural changes in the code.
Small changes can be pushed directly to master.

### Key database tables

You can look at the PostgreSQL database to get an idea how things are set up (credentials are in repo) but here's a quick summary.

* Users  

Saves user information and API keys.  New rows are inserted when the user logs in for the first time.  A little awkward it's not directly connected to auth0's database but it works.

* Sessions

A session is like one run of training a model over a dataset.  A single session can have multiple graphs for different 
quantities that vary over time.

* Graphs

A graph has a name and an ID.  It may be a visualization of multiple related quantities that vary over time.

* Points

The raw data.  The `x` column has integer type and the `y` column has jsonb type.  The reason is that we may track multiple quantities on the same graph, for example training loss and test loss, by having the clients provide dictionary inputs as `y`, for example `y = {'test_loss': 0.2, 'train_loss: 0.1}`.  This works nicely on the client side as well (I think)
