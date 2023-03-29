import React, { Component, PropTypes } from 'react';
import {
  Container,
  Loader
} from 'semantic-ui-react';
import axios from 'axios';
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_SECRET_KEY = process.env.SLACK_SECRET_KEY;

class AuthorizeSlackComponent extends Component {
  constructor(...args) {
    super(...args);
  }

  componentWillMount() {
    const params = this.props.location.search;
    let match, urlParams = {};
    const  pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      that = this
    while (match = search.exec(params.substring(1)))
      urlParams[decode(match[1])] = decode(match[2]);

    const slackNotiInfo = JSON.parse(localStorage.getItem('slackNotiInfo'));
    if(slackNotiInfo)
      localStorage.removeItem('slackNotiInfo');

    axios.get(`https://slack.com/api/oauth.access?client_id=${SLACK_CLIENT_ID}&client_secret=${SLACK_SECRET_KEY}&code=${urlParams['code']}`)
      .then((response) => {
        const data = response.data;
        if(data.ok === true) {
          const {ok, ...filteredData} = data;
          axios.post(process.env.API_BASE_URL + '/api/v1/authorize/slack', {
            ...filteredData,
            ...slackNotiInfo,
          }).then((res) => {
            console.log(res);
            that.props.history.push(`/${slackNotiInfo.org_name}/${slackNotiInfo.proj_name}/notifications`);
          })
          .catch((err) => {
            console.log(err);
            callback("Server API call failed!", null);
            that.props.history.push(`/${slackNotiInfo.org_name}/${slackNotiInfo.proj_name}/notifications`);
          });
        }
      }).catch((err) => {
        console.log("Server API call failed!");
      }).finally(() => {
        console.log('finally here!');
      });
  }

  render() {
    return (
      <Container fluid={true}>
        <div style={{overflow: "scroll", overflowX: "hidden", position: "absolute", left: 50, right: 0, top: 50, paddingTop: 50, height: "100%"}}>
          <span><h2><Loader active />Authorizing...</h2></span>
        </div>
      </Container>
    );
  }
}

export const AuthorizeSlack = AuthorizeSlackComponent;
