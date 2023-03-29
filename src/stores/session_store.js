import {observable, action, computed, autorun, toJS} from 'mobx';
import axios from 'axios';
import PubNub from 'pubnub';
import parallel from 'async/parallel';


class SessionStore {
  pubnub = new PubNub({ subscribeKey: "sub-c-849258a2-8917-11e7-9760-3a607be72b06", ssl: true });
  @observable sessionSelectAll = false;
  @observable isPubnubListening = false;
  projectId = observable("");
  projectLoading = observable(false);
  projectMap = observable.map();
  chartLoading = observable.map();
  graphNodeMap = observable.map();
  highchartsMap = observable.map();
  sessionList = observable.array();
  sessionState = observable.map();
  pointBuffer = observable.map();
  curvesMap = new Map();
  graphCreatedHere = new Map();
  nameMap = new Map();
  chartDataMap = new Map();
  @computed get chartList() {
    let chartMap = new Map();
    this.chartDataMap.clear();
    this.nameMap.clear();
    this.sessionListSelected.forEach((session, idx) => {
      let graphs = session.graphs || [];
      graphs = graphs && toJS(graphs);
      graphs = JSON.parse(JSON.stringify(graphs));
      graphs.forEach((graph, idx) => {
        graph.session_id = session.id;
        if (chartMap.get(graph.title)) {
          chartMap.get(graph.title).push(graph);
        } else {
          chartMap.set(graph.title, [graph]);
        }
      });
    });
    // TODO: sort by 'selected' date
    let chartList = [];
    chartMap.forEach((graph_list, title) => {
      const graph_id_list = graph_list.map((graph) => graph.id);
      const chart_id = graph_id_list.join("_");
      chartList.push({
        graph_list: graph_list,
        chart_id: chart_id,
        renderChart: this.renderChart,
        onComponentWillUnmount: () => this.onGraphUnmount(chart_id, graph_id_list),
        onChartRender: (chart) => this.onChartRender(chart_id, chart)
      });
      graph_list.forEach((graph) => this.chartDataMap.set(graph.id, {
        session_id: graph.session_id,
        graph_list: graph_list,
        chart_id: chart_id
      }));
    });
    return chartList;
  }
  @computed get sessionListSelected() {
    return this.sessionList.filter(elem => elem.is_selected);
  }
  @action.bound sessionSelectAllSwitch() {
    this.sessionSelectAll = !this.sessionSelectAll;
    for (var i = 0; i < this.sessionList.length; i++) {
      var session = this.sessionList[i];
      session.is_selected = this.sessionSelectAll;
    }
  }
  @action.bound sessionSelectSwitch(id) {
    for (var i = 0; i < this.sessionList.length; i++) {
      var session = this.sessionList[i];
      if (session.id == id) {
        session.is_selected = !session.is_selected;
      }
    }
  }
  @action.bound sessionSelectUnique(id) {
    this.sessionSelectAll = false;
    for (var i = 0; i < this.sessionList.length; i++) {
      var session = this.sessionList[i];
      if (session.id == id) {
        session.is_selected = true;
      } else {
        session.is_selected = false;
      }
    }
  }
  @action.bound onSessionNew(session) {
    session.is_selected = false;
    this.sessionList.unshift(session);
    this.sessionState.set(session.id, session);
  }
  @action.bound onSessionUpdate(stateUpdate) {
    var session_id = stateUpdate.session_id;
    var sessionState = this.sessionState.get(session_id);
    if (sessionState) {
      sessionState = toJS(sessionState);
      Object.keys(stateUpdate).forEach(key => {
        sessionState[key] = stateUpdate[key];
      });
      this.sessionState.set(session_id, sessionState);
    } else {
      this.sessionState.set(session_id, stateUpdate);
    }
  }
  @action.bound onGraphNew(graph) {
    for (var idx = 0; idx < this.sessionList.length; idx++) {
      var session = this.sessionList[idx];
      if (session.id == graph.session_id) {
        session.graphs.push(graph);
        this.graphCreatedHere.set(graph.id, true);
      }
    }
  }
  @action.bound onGraphUnmount(chart_id, graph_id_list) {
    var chart = this.highchartsMap.get(chart_id);
    chart && chart.destroy();
    this.highchartsMap.delete(chart_id);
    this.graphNodeMap.delete(chart_id);
    graph_id_list.forEach((graph_id) => this.pointBuffer.delete(graph_id));
  }
  @action.bound onChartRender(chart_id, chart) {
    this.highchartsMap.set(chart_id, chart);
  }
  @action.bound registerHighchartsNode(chart_id, domNode) {
    this.graphNodeMap.set(chart_id, domNode);
  }
  @action.bound onPointNew(point) {
    var graph_id = point.graph_id;
    var pointList = this.pointBuffer.get(graph_id);
    if (pointList) {
      pointList.push(point);
    }
    var chartData = this.chartDataMap.get(graph_id);
    var chart_id = chartData && chartData.chart_id;
    var chart = chart_id && this.highchartsMap.get(chart_id);
    var seriesChart = chart && chart.series;
    var x = point.x;
    var y = point.y;
    var curves;
    for (var key in y) {
      if (seriesChart) {
        var name = this.nameMap.get([graph_id, key].join("."));
        if (name) {
          var idx = seriesChart.findIndex(elem => elem.name == name);
          if (idx != -1) {
            seriesChart[idx].addPoint([x, y[key]]);
          } else {
            console.log('THIS SHOULD NEVER HAPPEN');
          }
        } else {
          // check if multiple graphs here
          var mergeCount = chartData.graph_list.length;
          var nameNew = mergeCount == 1 ? key : `${key} (${chartData.session_id.slice(0,4)}...)`;
          this.nameMap.set([graph_id, key].join("."), nameNew);
          chart.addSeries({
            name: nameNew,
            data: [[x, y[key]]]
          });
        }
      }
      curves = this.curvesMap.get(graph_id);
      if (curves) {
        if (curves[key]) {
          curves[key].push([x, y[key]]);
        } else {
          curves[key] = [[x, y[key]]];
        }
      } else {
        // don't create new entries in curvesMap unless we have ALL graph data
        if (this.graphCreatedHere.get(graph_id)) {
          this.curvesMap.set(graph_id, {[key]: [[x, y[key]]]});
        }
      }
    }
  }
  @action.bound renderChart(chart_id, graph_list) {
    var graph_id_list = graph_list.map((graph) => graph.id);
    parallel(graph_id_list.map((graph_id, idx) => {
      return (callback) => {
        this.chartLoading.set(chart_id, true);
        if (this.curvesMap.get(graph_id)) {
          var curves = this.curvesMap.get(graph_id);
          this.chartLoading.set(chart_id, false);
          callback(null, curves);
          return;
        }
        this.pointBuffer.set(graph_id, []);
        axios.get(process.env.API_BASE_URL + '/api/v1/graphs/' + graph_id)
          .then((response) => {
            var responseData = response.data;
            if (responseData['success'] === true) {
              var pointList = responseData.data;
              var pointListNew = this.pointBuffer.get(graph_id);
              this.pointBuffer.delete(graph_id);
              pointListNew = pointListNew && toJS(pointListNew);
              pointList.push(...pointListNew);
              var curves = {};
              for (var idx = 0; idx < pointList.length; idx++) {
                var point = pointList[idx];
                var y = point.y;
                var x = point.x;
                for (var key in y) {
                  if (y.hasOwnProperty(key)) {
                    if (key in curves) {
                      curves[key].push([x, y[key]]);
                    } else {
                      curves[key] = [[x, y[key]]];
                    }
                  }
                }
              }
              this.curvesMap.set(graph_id, curves);
              this.chartLoading.set(chart_id, false);
              callback(null, curves);
            }
          });
      }
    }),
      (err, curvesList) => {
        this.setHighcharts(
          curvesList,
          graph_list,
          chart_id);
      }
    );
  }
  @action.bound setHighcharts(curvesList,
                              graph_list,
                              chart_id) {
    var mergeCount = curvesList.length;
    var series = [];
    curvesList.forEach((curves, idx) => {
      Object.keys(curves).forEach((key) => {
        var dataSorted = curves[key].sort(function(a, b) {return a[0] - b[0];});
        var name = mergeCount == 1 ? key : `${key} (${graph_list[idx].session_id.slice(0,4)}...)`;
        this.nameMap.set([graph_list[idx].id, key].join("."), name);
        series.push({
          'data': dataSorted,
          'name': name,
        });
      });
    });
    var domNode = this.graphNodeMap.get(chart_id);
    var title = graph_list[0].title;
    var xlabel = graph_list[0].xlabel;
    var ylabel = graph_list[0].ylabel;
    var chart = Highcharts.chart(domNode, {
      credits: false,
      chart: {
        marginBottom: 100,
        panning: true,
        panKey: "shift",
        zoomType: 'x',
        animation: true,
        resetZoomButton: {
          position: {
            x: -50,
            y: 0,
          },
          relativeTo: 'chart'
        }
      },
      title: {
        text: title
      },
      subtitle: {
        text: "Drag to zoom, hold shift key to pan."
      },
      xAxis: {
        title: {
          text: xlabel
        }
      },
      yAxis: {
        title: {
          text: ylabel
        }
      },
      tooltip: {
        crosshairs: [true]
      },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0
      },
      series: series,
    }, (chart) => this.highchartsMap.set(chart_id, chart));
    this.chartLoading.set(chart_id, false);
  }
  @action.bound setProject(project_id) {
    // TODO: use projectMap
    console.log("setProject invoked with project id: ", project_id);
    if (this.projectId == project_id) {
      return;
    }
    this.projectLoading.set(true);
    this.curvesMap.clear();
    this.highchartsMap.clear();
    this.sessionList.clear();
    this.sessionState.clear();
    this.pointBuffer.clear();
    this.graphCreatedHere.clear();
    axios.get(process.env.API_BASE_URL + '/api/v1/sessions/' + project_id)
      // TODO: handle errors
      .then((response) => {
        this.projectLoading.set(false);
        var responseData = response.data;
        if (responseData['success'] === true) {
          var sessionList = responseData.data;
          sessionList.forEach((session) => {
            session.is_selected = false;
            this.sessionState.set(session.id, session);
          });
          this.projectId.set(project_id);
          this.sessionList.replace(sessionList);
        } else {
          console.log('server failed');
        }
      })
      .catch((error) => {
        console.log('error:');
        console.log(error);
        this.projectLoading.set(false);
      });
    this.pubnub.unsubscribeAll();
    this.pubnub.subscribe({
      channels: [project_id],
    });
    // NOTE: never add listeners twice! one listener, channel may change
    if (!this.isPubnubListening) {
      this.pubnub.addListener({
        message: (m) => {
          var msg = m.message;
          switch (msg.eventType) {
            case 'onSessionNew':
              this.onSessionNew(msg);
              break;
            case 'onSessionUpdate':
              this.onSessionUpdate(msg);
              break;
            case 'onPointNew':
              this.onPointNew(msg);
              break;
            case 'onGraphNew':
              this.onGraphNew(msg);
              break;
            default:
              console.log(`Unkown event: ${msg.eventType}`);
              break;
          }
        }
      });
      this.isPubnubListening = true;
    }
  }
}

const sessionStore = new SessionStore();
export default sessionStore;
