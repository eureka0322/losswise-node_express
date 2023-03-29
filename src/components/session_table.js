import React, { Component, PropTypes } from 'react';
import ReactTable from 'react-table'
import {observer} from 'mobx-react';
import {toJS} from 'mobx';
import {
  Button,
  Checkbox,
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
import sessionStore from '../stores/session_store';

const GitUrlParse = require("git-url-parse");
var moment = require('moment');


@observer
class SessionTable extends Component {
  constructor(...args) {
    super(...args);
    this.state = { data: null };
  }

  onRowSelect(data, isCheckbox) {
    if(!data)
      return;

// TODO: data.row.id API is depracated and should be removed
    const rowSelectId = data.row.id || data.row.session_info.id;
    if (isCheckbox) {
      sessionStore.sessionSelectSwitch(rowSelectId);
    } else {
      sessionStore.sessionSelectUnique(rowSelectId);
    }
  }

  render() {
    var columns = [
      {
        sortable: false,
        accessor: 'is_selected',
        maxWidth: 50,
        Header: props => (<Checkbox
              name="is_selected"
              type="checkbox"
              onClick={sessionStore.sessionSelectAllSwitch}
              checked={sessionStore.sessionSelectAll} />),
        Cell: props => (<Checkbox
              name="is_selected"
              type="checkbox"
              checked={props.value} />),
      },
      {
        accessor: (row) => { return { 'id': row.id, 'env': row.env } },
        maxWidth: 75,
        id: 'session_info',
        Header: props => <strong>ID</strong>,
        filterable: true,
        filterMethod: (filter, row) => {
          if (row.session_info.id.startsWith(filter.value)) {
            return true;
          } else {
            return false;
          }
        },
        sortable: false,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'right', cursor:'pointer' } };
        },
        Cell: props => {
          if (props.value.env && props.value.env.BUILDKITE_BUILD_URL) {
            return (
              <span>
                <a style={{color: 'black'}} target="_blank" href={props.value.env.BUILDKITE_BUILD_URL}>
                  <Image src="/images/buildkite.svg" style={{ display: 'inline', height: 15, marginRight: 10 }} />
                </a>
                { props.value.id.slice(0,4) }
              </span>
            );
          }
          return props.value.id.slice(0,4);
        }
      },
      {
        id: 'tag_info',
        minWidth: 120,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'left', paddingLeft: 10, cursor:'pointer' } };
        },
        accessor: (row) => { return { 'tag': row.tag, 'env': row.env } },
        filterable: true,
        filterMethod: (filter, row) => {
          if (row.tag_info.tag.startsWith(filter.value)) {
            return true;
          } else {
            return false;
          }
        },
        Header: props => <strong>Tag</strong>,
        sortable: false,
        Cell: props => {
          if (props.value.env && props.value.env.BUILDKITE_REPO) {
            var githubUrl = GitUrlParse(props.value.env.BUILDKITE_REPO).toString("https");
            if (githubUrl.endsWith('.git')) {
              githubUrl = githubUrl.slice(0, githubUrl.length - 4);
            }
            if (props.value.env.BUILDKITE_BRANCH) {
              githubUrl = githubUrl + "/compare/" + props.value.env.BUILDKITE_BRANCH;
            }
            return (
              <span>
                <a style={{ color: 'black', textDecoration: 'none' }} target="_blank" href={githubUrl}>
                  <Icon name='github' size='large' style={{ display: 'inline', height: 15, marginRight: 10 }} />
                </a>
                { props.value.tag }
              </span>
            );
          }
          return props.value.tag;
        }
      },
      {
        accessor: 'status',
        Header: props => <strong>Status</strong>,
        Cell: (props) => {
          const value = props.value;
          const cappedVal = value[0].toUpperCase() + value.substring(1);
          return (
            <span>
              <span style={{
                color: value === 'cancelled' ? '#ff2e00'
                  : value === 'active' ? '#ffbf00'
                  : '#57d500',
                transition: 'all .3s ease'
              }}>
                &#x25cf;
              </span> { cappedVal }
            </span>
          );
        },
        filterable: true,
        sortable: false,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'left', cursor:'pointer' } };
        },
      },
      {
        minWidth: 110,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'left', cursor:'pointer' } };
        },
        accessor: 'created_at',
        Header: props => <strong>Created at</strong>,
        Cell: props => props.value && props.value.format('ddd h:mm a (DD/MM/YY)'),
      },
      {
        minWidth: 110,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'left', cursor:'pointer' } };
        },
        accessor: 'done_at',
        Header: props => <strong>Done at</strong>,
        Cell: props => props.value && props.value.format('ddd h:mm a (DD/MM/YY)'),
      },
      {
        accessor: 'max(x)',
        maxWidth: 90,
        Header: props => <strong>Iter</strong>,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'right', cursor:'pointer' } };
        },
      },
      {
        accessor: 'elapsed',
        maxWidth: 90,
        Header: props => <strong>Elapsed</strong>,
        Cell: props => {
          var outputStr = "";
          // calculate (and subtract) whole days
          var delta = props.value;
          var days = Math.floor(delta / 86400);
          delta -= days * 86400;
          if (days > 0) outputStr = days + "d";

          // calculate (and subtract) whole hours
          var hours = Math.floor(delta / 3600) % 24;
          delta -= hours * 3600;
          if (hours > 0) outputStr = outputStr + " " + hours + "h";

          // calculate (and subtract) whole minutes
          var minutes = Math.floor(delta / 60) % 60;
          delta -= minutes * 60;
          outputStr = outputStr + " " + minutes + "m";
          return  outputStr;
        },
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'center', cursor:'pointer' } };
        },
      },
      {
        accessor: 'max(xper)',
        Header: props => <strong>Per</strong>,
        maxWidth: 75,
        getProps: (state, rowInfo, column) => {
          return { style: {textAlign: 'right' } };
        },
        Cell: props => {
          if (props.value) {
            var per = 100 * props.value;
            return `${per.toFixed(2)}%`;
          } else {
            return null;
          }
        },
        getProps: (state, rowInfo, column) => {
          return { style: {cursor:'pointer' } };
        }
      },
    ];
    var columnsNew = [];
    var columnsName = [];
    var rows = []

    for (var i = 0; i < sessionStore.sessionList.length; i++) {
      const session = sessionStore.sessionList[i];
      var sessionState = sessionStore.sessionState.get(session.id);
      var dateModifiedMoment = moment(sessionState.modified_at || sessionState.created_at);
      var dateCreatedMoment = moment(session.created_at);
      var elapsed = dateModifiedMoment.diff(dateCreatedMoment, 'seconds');
      var row = {
        id: session.id,
        status: sessionState.status,
        created_at: dateCreatedMoment,
        modified_at: dateModifiedMoment,
        tag: session.tag,
        is_selected: session.is_selected,
        env: session.env,
        elapsed: elapsed
      };
      rows.push(row);
      var stats = sessionState.stats;
      if (!stats) {
        continue;
      }
      Object.keys(stats).forEach(function(graphId) {
        var statsGraph = stats[graphId];
        Object.keys(statsGraph).forEach(function(trackedName) {
          var nameStats = statsGraph[trackedName];
          Object.keys(nameStats).forEach(function(kind) {
            var nameNew = kind + "(" + trackedName + ")";
            // handle special columns
            if (nameNew == 'max(x)' || nameNew == 'max(xper)') {
              if (row[nameNew]) {
                row[nameNew] = Math.max(nameStats[kind], row[nameNew]);
              } else {
                row[nameNew] = nameStats[kind];
              }
            } else {
              row[nameNew] = nameStats[kind];
              var sortDesc = kind == "max" ? true : false;
              if (!columnsName.includes(nameNew)) {
                var colNew = {
                  Header: props => <strong>{nameNew}</strong>,
                  accessor: nameNew,
                  Cell: props => props.value && props.value.toFixed(5),
                  defaultSortDesc: sortDesc,
                  sortMethod: (a,b) => {
                    // TODO: make this work for either sort direction
                    // force null and undefined to the bottom
                    var defaultValue = sortDesc == true ? -Infinity : Infinity;
                    a = (a === null || a === undefined) ? defaultValue : a;
                    b = (b === null || b === undefined) ? defaultValue : b;
                    if (a > b) {
                      return 1;
                    }
                    if (a < b) {
                      return -1;
                    }
                    return 0;
                  },
                  getProps: (state, rowInfo, column) => {
                    return { style: {cursor:'pointer' } };
                  }
                };
                columnsNew.push(colNew);
                columnsName.push(nameNew);
              }
            }
          });
        });
      });
      var per = row['max(xper)'];
      if (per) {
        var estimatedSeconds = dateModifiedMoment.clone().diff(dateCreatedMoment, 'seconds') / per;
        var doneEstimatedMoment = dateCreatedMoment.clone().add(estimatedSeconds, 'seconds');
        row['done_at'] = doneEstimatedMoment;
      }
    }
    columnsNew.sort();
    columns = columns.concat(columnsNew);

    return (
      <ReactTable
        getTdProps={(state, rowInfo, column, instance) => ({
            onClick: (e, handleOriginal) => this.onRowSelect(rowInfo, column.id == 'is_selected'),
            style: {
              background: rowInfo && rowInfo.row && rowInfo.row.is_selected ? "#eaf3fe" : null,
              textAlign: 'center',
              padding: 3
            }
        })}
        className='-highlight'
        noDataText=''
        defaultPageSize={10}
        showPaginationTop={true}
        showPaginationBottom={false}
        data={rows}
        defaultSortDesc={true}
        columns={columns}
        loading={sessionStore.projectLoading == true}
      />
      );
  }
}


export default SessionTable;
