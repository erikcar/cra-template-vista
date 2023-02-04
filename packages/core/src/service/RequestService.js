import { ApiService } from "../index";

export function AppService() {

    ApiService.call(this, { apiUrl: 'app/' });

    this.login = (user, password, admin) => {
        const op = admin? "elogin" : "login";
        return this.ExecuteApi(op, { username: user, password: password });
    }

    this.adminLogin = (user, password, itype) => {
        if(itype === undefined) itype = 0;
        return this.ExecuteApi("elogin", { username: user, password: password, itype: itype });
    }

    this.testupload = () => {
        return this.ExecuteApi("testupload");
    }

    this.test = (data) => {
        return this.ExecuteApi("jlesson", data);
    }

    this.signin = (email, password) => {
        return this.ExecuteApi("esignin", { email: email, password: password });
    }

    this.signinWithConfirm = (email, password, route) => {
        return this.ExecuteApi("csignin", { email: email, password: password, route: route });
    }

    this.emailConfirm = (request) => {
        return this.ExecuteApi("emailconfirm", request);
    }

    this.invitein = (user, route) => {
        user.route = route || '';
        return this.ExecuteApi("invitein", { tname: user.tname, tsurname: user.tsurname, temail: user.temail, itype: user.itype, route: route || '' });
    }

    this.passwordRequest = (email, route) => {
        return this.ExecuteApi("passrequest", { email: email, route: route });
    }

    this.passwordReset = (request) => {
        return this.ExecuteApi("passreset", request);
    }

    this.changePassword = (user) => {
        return this.ExecuteApi("passchange", { currentPassword: user.tpassword, newPassword: user.npassword });
    }

    this.updateProfile = (user) => {
        return this.ExecuteApi("updateprofile", this.getMutation(user));
    }

    this.validate = (token) => {
        return this.ExecuteApi("validate", { token: token }).catch(e => console.log(e));
    }

    this.checkSession = (app) => {
        return this.ExecuteApi("session").then(r => {
            if (r === 'NACK')
                app.navigate("/login");
            else
                app.onlogin(r);
        }).catch(() => app.navigate("/login"));
    }
}