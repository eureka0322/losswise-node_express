import { observable, action, computed, useStrict } from 'mobx';
import {toJS} from 'mobx';
import axios from 'axios';

class AccountStore {
  people = observable.array();
  invites = observable.array();
  peopleLoading = observable(false);
  invitesLoading = observable(false);
  inviteCreating = observable(false);
  plan = observable(null);

  @action.bound inviteNew(orgId, orgName, inviterName, email, callback) {
    this.inviteCreating.set(true);
    axios.post(process.env.API_BASE_URL + '/api/v1/invites/', {
      organization_id: orgId,
      organization_name: orgName,
      email: email,
      inviter_name: inviterName
    }).then((response) => {
      var responseData = response.data;
      if (responseData['success'] === true) {
        var invitesData = responseData.data;
        this.invites.push(invitesData);
        callback(null, invitesData);
      } else {
        callback("Server error! Please refresh page.", null);
      }
      this.inviteCreating.set(false);
    })
    .catch((err) => {
      this.inviteCreating.set(false);
      callback(err && err.response && err.response.data && err.response.data.err, null);
    });
  }

  @action.bound inviteDelete(inviteId, callback) {
    axios.delete(process.env.API_BASE_URL + '/api/v1/invites/' + inviteId)
      .then((response) => {
        var responseData = response.data;
        if (responseData['success'] === true) {
          callback(null, null);
          this.invites.replace(this.invites.filter((invite) => invite.id !== inviteId));
        } else {
          callback("Delete project failed!", null);
        }
    })
    .catch((err) => {
      callback(err && err.response && err.response.data && err.response.data.err, null);
    });
  }

  @action.bound userDelete(orgId, userId) {
    axios.delete(process.env.API_BASE_URL + '/api/v1/organizations/${orgId}/people/${userId}')
      .then((response) => {
        var responseData = response.data;
        if (responseData['success'] === true) {
          callback(null, null);
          this.invites.replace(this.invites.filter((invite) => invite.id !== inviteId));
        } else {
          callback("Delete project failed!", null);
        }
    })
    .catch((err) => {
      callback(err && err.response && err.response.data && err.response.data.err, null);
    });
  }

  @action.bound fetchInvites(orgId) {
    console.log('fetchInvites');
    this.invitesLoading.set(true);
    axios.get(process.env.API_BASE_URL + `/api/v1/invites/${orgId}`)
      .then((response) => {
        var responseData = response.data;
        if (responseData['success'] === true) {
          var invitesData = responseData.data;
          this.invites.replace(invitesData);
        } else {
          // TODO: handle errors
          console.log('Server error!');
        }
        this.invitesLoading.set(false);
      })
      .catch((err) => {
        console.log(err);
        this.invitesLoading.set(false);
      });
  }

  @action.bound fetchPeople(orgId) {
    this.peopleLoading.set(true);
    axios.get(process.env.API_BASE_URL + `/api/v1/organizations/${orgId}/people`)
      .then((response) => {
        var responseData = response.data;
        if (responseData['success'] === true) {
          var peopleData = responseData.data;
          this.people.replace(peopleData);
        } else {
          // TODO: handle errors
          console.log('Server error!');
        }
        this.peopleLoading.set(false);
      })
      .catch((err) => {
        console.log(err);
        this.peopleLoading.set(false);
      });
  }
  @action.bound fetchBilling() {
    // TODO: execute call
  }
}

const accountStore = new AccountStore();

export default accountStore;
