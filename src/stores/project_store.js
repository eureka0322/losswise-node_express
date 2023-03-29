import { observable, action, computed, useStrict } from 'mobx';
import {toJS} from 'mobx';
import axios from 'axios';


var projectsInit = PROJECTS.filter((val) => val.id);
var organizationsInit = PROJECTS.map(elem => { return {id: elem.org_id, name: elem.org_name} })
    .filter((val, idx, arr) => arr.map((val_arr) => val_arr.id).indexOf(val.id) == idx);


class ProjectStore {
  @observable user = USER_INFO.length ? USER_INFO[0] : null;
  @observable projects = projectsInit;
  @observable organizations = organizationsInit
  @observable organizationIdxSelected = null;
  @observable projectIdx = -1;
  @observable copiedProjectId = -1;
  notifications = observable.array();
  notificationsOrgId = observable("");
  notificationsLoading = observable(false);


  // --- Begin alert handling (TODO: move to separate data store) ---
  dashboardMessages = observable.array();
  accountMessages = observable.array();

  @computed get accountMessage() {
    if (this.accountMessages.length) {
      return this.accountMessages[this.accountMessages.length - 1];
    }
    return null;
  }

  @computed get dashboardMessage() {
    if (this.dashboardMessages.length) {
      return this.dashboardMessages[this.dashboardMessages.length - 1];
    }
    return null;
  }

  @action.bound hideDashboardMessage() {
    this.dashboardMessages.pop();
  }

  @action.bound hideAccountMessage() {
    this.accountMessages.pop();
  }

  @action.bound showDashboardMessage(header, content, success=true) {
    this.dashboardMessages.push({content, header, success});
  }

  @action.bound showAccountMessage(header, content, success=true) {
    this.accountMessages.push({content, header, success});
  }
  // --- End alert handling ---

  @computed get projectId() {
    if (this.projectIdx == -1) {
      return null;
    } else {
      return this.projects[this.projectIdx].id;
    }
  }

  @computed get projectName() {
    if (this.projectIdx == -1 || this.projectIdx >= this.projects.length) {
      return null;
    } else {
      return this.projects[this.projectIdx].name;
    }
  }

  @computed get projectApiKey() {
    if (this.projectIdx == -1 || this.projectIdx >= this.projects.length) {
      return null;
    } else {
      return this.projects[this.projectIdx].api_key;
    }
  }

  @computed get projectNameCap() {
    var projectName = this.projectName;
    if (projectName === null) {
      return null;
    }
    return projectName[0].toUpperCase() + projectName.substring(1);
  }

  @computed get projectsCurrent() {
    return this.projects.map((proj, idx) => { proj.idx = idx; return proj; })
      .filter((proj) => proj.org_id == this.organizationId);
  }

  @computed get organizationIdx() {
    if (this.organizationIdxSelected === null) {
      return this.organizations.length - 1;
    }
    return this.organizationIdxSelected;
  }

  @computed get organizationName() {
    if (this.organizationIdx !== -1) {
      return this.organizations[this.organizationIdx].name;
    } else {
      return null;
    }
  }

  @computed get organizationId() {
    if (this.organizationIdx !== -1) {
      return this.organizations[this.organizationIdx].id;
    } else {
      return null;
    }
  }

  @action.bound renameProject(projectId, nameNew) {
    for (var idx = 0; idx < this.projects.length; idx++) {
      if (this.projects[idx].id === projectId) {
        this.projects[idx].name = nameNew;
        this.showDashboardMessage(`Project successfully renamed to ${nameNew}.`, `You may now use this project's API keys`);
      }
    }
  }

  @action.bound setProjects(projects) {
    this.projects = [...projects];
  }

  @action.bound setProject(projectName) {
    // console.log('set project');
    var projects = toJS(this.projectsCurrent);
    var projectsCurrentIdx = projects.findIndex(elem => elem.name.toLowerCase() == projectName.toLowerCase());
    if (projectsCurrentIdx != -1) {
      this.projectIdx = this.projectsCurrent[projectsCurrentIdx].idx;
    } else {
      throw new Error("Project " + projectName + " does not exist.");
    }
  }

  @action.bound updateNotifications(organizationId=null, projectId=null) {
    var orgId = organizationId || this.organizationId;
    var that = this;
    this.notificationsLoading.set(true);
    axios.get(process.env.API_BASE_URL + '/api/v1/notifications/' + projectId).then((response) => {
      var responseData = response['data'];
      if (responseData['success'] === true) {
        that.notifications = responseData.data;
        that.notificationsOrgId = orgId;
      } else {
        console.log('Server error');
        console.log(responseData);
      }
    })
    .catch((err) => {
      console.log("Server API call for GET notifications failed!");
    })
    .finally(() => {
      that.notificationsLoading.set(false);
    });
  }

  @action.bound setOrganization(orgName) {
    var orgs = toJS(this.organizations);
    var idx = orgs.findIndex(elem => elem.name.toLowerCase() == orgName.toLowerCase());
    if (idx != -1) {
      this.organizationIdxSelected = idx;
    } else {
      throw new Error("Organization " + orgName + " does not exist.");
    }
    // TODO: get notifications here
  }

  // TODO: rename this function, weird there's also a rename method
  @action projectNameNew(nameNew, callback) {
    // TODO: add callback for error handling
    var projectId = this.projectId;
    if (projectId === null) {
      return callback("Project ID is null.", null);
    }
    axios.patch(process.env.API_BASE_URL + '/api/v1/projects/' + projectId, {
      name: nameNew
    }).then((response) => {
      var responseData = response.data;
      if (responseData['success'] === true) {
        this.renameProject(projectId, responseData.name);
        callback(null, responseData.name);
      } else {
        callback("Unable to change name.", null);
        console.log('server failed');
      }
    })
    .catch((err) => {
      callback("Server API call failed!", null);
    });

  }

  @action deleteProject(project_id, callback) {
    if (project_id === null) {
      callback("Project ID is null.", null);
      return;
    }
    axios.delete(process.env.API_BASE_URL + '/api/v1/projects/' + project_id)
      .then((response) => {
        var responseData = response.data;
        if (responseData['success'] === true) {
          var projectDeletedList = this.projects.filter(project => project.id == project_id);
          this.setProjects(this.projects.filter(project => project.id != project_id));
          if (projectDeletedList.length) {
            var nameDeleted = projectDeletedList[0].name;
            this.showDashboardMessage(`Project ${nameDeleted} was successfully deleted!`);
          }
          callback(null, project_id);
        } else {
          callback("Project ID is null.", null);
          console.log('server failed');
        }
    })
    .catch((err) => {
      callback("Server API call failed.", null);
      console.log(err);
    });
  }

  @action renameAccount(nameNew, callback) {
    // TODO: proper error handling
    var organizationId = this.organizationId;
    if (organizationId === null) {
      return callback("Organization ID is null.", null);
    }
    axios.patch(process.env.API_BASE_URL + '/api/v1/organizations/' + organizationId, {
      organization_name: nameNew
    }).then((response) => {
      var serverData = response.data;
      if (serverData['success'] === true) {
        var data = serverData.data;
        var organization_name = data.organization_name;
        for (var idx = 0; idx < this.organizations.length; idx++) {
          if (this.organizations[idx].id === organizationId) {
            this.organizations[idx].name = nameNew;
          }
        }
        this.projects.filter((proj) => proj.org_id == organizationId).forEach((elem) => elem.org_name = organization_name);
        this.showAccountMessage(`Account successfully renamed to ${organization_name}.`, `You may continue using your current projects as usual.`);
        callback(null, data);
      } else {
        callback("Unable to create user.", null);
        console.log('server failed');
      }
    })
    .catch((err) => {
      console.log(err);
      callback("Server API call failed!", null);
    });
  }

  @action createUser(userName, userEmail, callback) {
    // used within invites
    axios.post(process.env.API_BASE_URL + '/api/v1/users', {
      user_name: userName,
      user_email: userEmail,
    }).then((response) => {
      var serverData = response.data;
      if (serverData['success'] === true) {
        var userData = serverData.data;
        this.user = userData;
        callback(null, userData);
      } else {
        callback("Unable to create user.", null);
        console.log('server failed');
      }
    })
    .catch((err) => {
      callback("Server API call failed!", null);
    });
  }

  @action createUserOrgProject(userName, userEmail, projectName, organizationName, callback) {
    // used upon new account creation
    axios.post(process.env.API_BASE_URL + '/api/v1/user-org-project', {
      user_name: userName,
      user_email: userEmail,
      project_name: projectName,
      organization_name: organizationName
    }).then((response) => {
      var serverData = response.data;
      if (serverData['success'] === true) {
        var data = serverData.data;
        var projectNew = {
          id: data.project_id,
          api_key: data.api_key,
          name: data.project_name,
          org_id: data.org_id,
          org_name: data.org_name
        };
        this.projects.unshift(projectNew);
        var organizationNew = {
          id: data.org_id,
          name: data.org_name,
        }
        this.organizations.unshift(organizationNew);
        this.user = { name: data.user_name, email: data.user_email };
        callback(null, projectNew);
      } else {
        callback("Unable to create user.", null);
        console.log('server failed');
      }
    })
    .catch((err) => {
      console.log(err);
      callback("Server API call failed!", null);
    });
  }

  // TODO: rename to createProject
  @action createNewProject(name, callback) {
    var organization_id = this.organizationId;
    var organization_name = this.organizationName;
    axios.post(process.env.API_BASE_URL + '/api/v1/projects', {
      project_name: name,
      organization_id: organization_id,
      organization_name: organization_name
    }).then((response) => {
      var data = response.data;
      if (data['success'] === true) {
        var projectData = data.data;
        var projectNew = {
          id: projectData.id,
          api_key: projectData.api_key,
          name: projectData.name,
          org_id: organization_id,
          org_name: organization_name
        };
        this.projects.unshift(projectNew);
        this.showDashboardMessage(
          `Your project ${projectData.name} was created successfully!`,
          `Use the clipboard button to copy and start using your API keys.`
        );
        callback(null, projectNew);
      } else {
        callback("Unable to change name.", null);
        console.log('server failed');
      }
    })
    .catch((err) => {
      console.log(err);
        this.showDashboardMessage(
          `Server Failure!`,
          `Please contact support@losswise.com`,
          false
        );
      callback("Server API call failed!", null);
    });
  }

  @action showCopy(id) {
    this.copiedProjectId = id;
  }

  @action hideCopy(id) {
    this.copiedProjectId = -1;
  }
}

const projectStore = new ProjectStore();

export default projectStore;
