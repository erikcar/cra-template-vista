import { DataModel } from "../core/system";

export function SystemModel() {
  DataModel.call(this, "system");
}

export function AppModel() {
    
    DataModel.call(this, "app");
  
    this.login = (user, password) => {
      return this.ExecuteApi("login: app {*}", { username: user, password: password }, { apiUrl: 'app/' });
    }
  
    this.testupload = () => {
      return this.ExecuteApi("testupload: app {*}");
    }
  
    this.test = (data) => {
      return this.ExecuteApi("jlesson: app {*}", data);
    }
  
    this.signin = (email, password) => {
      return this.ExecuteApi("esignin: app {*}", { email: email, password: password }, { apiUrl: 'app/' });
    }
  
    this.invitein = (user, route) => {
      user.route = route || '';
      return this.ExecuteApi("invitein: app {*}", { tname: user.tname, tsurname: user.tsurname, temail: user.temail, itype: user.itype, route: route || '' }, { apiUrl: 'app/' });
    }
  
    this.passwordRequest = (email, route) => {
      return this.ExecuteApi("passrequest: app {*}", {email:email, route: route}, { apiUrl: 'app/' });
    }
  
    this.passwordReset = (request) => {
      return this.ExecuteApi("passreset: app {*}", request, { apiUrl: 'app/' });
    }
  
    this.changePassword = (user) => {
      return this.ExecuteApi("passchange: app {*}", { currentPassword: user.tpassword, newPassword: user.npassword }, { apiUrl: 'app/' });
    }
  
    this.updateProfile = (user) => {
      return this.ExecuteApi("updateprofile: app {*}", this.getMutation(user), { apiUrl: 'app/' });
    }
  
    this.validate = (token) => {
      return this.ExecuteApi("validate: app {*}", { token: token }, { apiUrl: 'app/' }).catch(e => console.log(e));
    }
  
    this.checkSession = (app) => {
      return this.ExecuteApi("session: app {*}", null, { apiUrl: 'app/' }).then(r => {
        if (r === 'NACK')
          app.navigate("/login");
        else
          app.onlogin(r);
      }).catch(() => app.navigate("/login"));
    }
  }