//import { Context } from "./system";
import { DataGraph} from "../data/DataGraph";
import { Apix } from "@essenza/webground";
import {Context, Controller, EntityModel} from "./system";

/*export const Vista = {
    InitApp: function (INavigate, init) {
        session.init();
        const ctx = new Context("App");
        session.context = ctx;
        session.navigate = INavigate;
        session.model = ctx.getModel(VistaModel);

        if (init)
            init(session);

        return session;
    }
}*/

const BreakPoint = { xs: 0, sm: 2, md: 4, lg: 8, xl: 16, xxl: 32 }

function BreakPointer(breakpoints) {
    this.count = 0;
    this.breakpoints = breakpoints || [{ label: 'xs', value: 576 }, { label: 'sm', value: 768 }, { label: 'md', value: 992 }, { label: 'lg', value: 1200 }, { label: 'xl', value: 1600 }, { label: 'xxl', value: 100000 }];
    this.listening = false;
    this.point = null;
    this.index = 0;
    this.lastw = 0;
    this.state = null;

    this.getState = function () {
        if (!this.listening)
            this.sync();

        return this.state;
    }

    this.init = function (breakpoints) {
        this.points = [];
        this.state = {};
        for (let k = 0; k < breakpoints.length; k++) {
            const p = breakpoints[k];
            //BreakPoint[p.label] = k*2;
            this.points.push(p.value);
            this.state[p.label] = p;
        }
    }

    this.sync = function () {
        this.lastw = window.innerWidth || 0;

        let i = 0;
        while (this.lastw > this.points[i]) {
            this.breakpoints[i].active = true
            i++;
        }
        this.point = this.breakpoints[i];
        this.index = i;
        console.log("SYNC-BP", this.point, i, this.lastw);
    };

    this.register = function (size, listener) {
        this.count++;
        const bp = this.state[size];
        if (!bp.observers) bp.observers = [];
        bp.observers.push(listener);

        if (!this.listening) {
            window.addEventListener('resize', this.onresize.bind(this));
            this.listening = true;
            this.sync();
        }
    }

    this.unregister = function (size, listener) {
        const obs = this.state[size].observers;

        for (let k = 0; k < obs.length; k++) {
            if (obs[k] === listener) {
                obs.splice(k, 1);
                break;
            }
        }

        this.count--;

        if (this.count < 1) {
            window.removeEventListener('resize', this.onresize);
            this.listening = false;
            //Non serve perche quando parte listening comunque faccio sync
            const bp = this.breakpoints;
            for (let k = 0; k < this.index; k++) {
                bp[k].active = false;
            }
        }
    }

    this.onresize = function () {
        const w = window.innerWidth;
        console.log(w, this.lastw);
        if (w > this.lastw) {
            if (w > this.point.value) {
                const bp = this.breakpoints;
                this.point.active = true
                let obs = this.point.observers || [];
                let i = ++this.index;
                while (w > this.points[i]) {
                    bp[i].active = true
                    if (bp[i].observers)
                        obs = obs.concat(bp[i].observers);
                    i++;
                }
                this.point = bp[i];
                this.index = i;
                this.notify(obs);
            }
        }
        else if (w < this.points[this.index - 1]) {
            const bp = this.breakpoints;
            let i = this.index - 1;

            let obs = [];

            while (w < this.points[i]) {
                bp[i].active = false;
                if (bp[i].observers)
                    obs = obs.concat(bp[i].observers);
                i--;
            }
            i++;
            this.point = bp[i];
            this.index = i;
            this.notify(obs);
        }
        this.lastw = w;
    }

    this.notify = function (obs) {
        const s = { ...this.state };
        console.log("BP-NOTIFY", obs, s);
        for (let k = 0; k < obs.length; k++) {
            obs[k](s);
        }
    }

    this.init(this.breakpoints);
}

export function Container() {
    this.service = { IApi: Apix }
    //qui configuro override di controller e config in generale che applico al resolve dell'istanza
    this.ResolveClass = function (classType) {
        const t = new classType();
        if (t.hasOwnProperty("inject")) {
            if (t.hasOwnProperty("api")) t.api = this.service.IApi;
            if (t.hasOwnProperty("navigator")) t.navigator = this.service.INavigator;
            if (t.hasOwnProperty("app")) t.app = this.service.IApp;
            if (t.hasOwnProperty("popup")) t.popup = this.service.IPopup;
            /*const p = GetParamsName(t.inject);
            for (let k = 0; k < p.length; k++) {
              console.log("ResolveClass", p, p[k]);
              p[k] = this.service[p[k]];
            }
            console.log("ResolveClass", p);
            t.inject.apply(t, p);*/
        }

        return t;
    }
}

export const AppConfig = {serviceRoute: "app/"};

export const VistaApp = {
    icontainer: new Container(),
    context: new Context("App"),
    session: { type: -1 }, //GUEST //new session from webground???
    logged: false,
    initialized: false,
    current: this,
    model: new EntityModel(),
    breakpoint: new BreakPointer(),
    settings: {usertype: 0, defaultRole: 0, roles:["admin"], route:[''], defaultRoute: ''},
    
    setValue: function(name, value){
        VistaApp[name] = value;
        if(VistaApp.current){
            VistaApp.current[name] = value;
        }  
    },

    init: function(navigator, controller, onlogin, popup) {
        this.navigate = navigator;
        this.icontainer.service.INavigator = navigator;
        this.icontainer.service.IPopup = popup;
        this.icontainer.service.IApp = VistaApp;
        this.control = this.context.getControl(controller || new Controller());
        this.onlogin = onlogin;
        return this;
    },

    login: function(session) {
        this.setValue("session", session);
        this.setValue("logged", true);
        //axios.defaults.withCredentials = true;
        //axios.defaults.headers.common['Access-Control-Allow-Credentials'] = true;
        const channel = this.icontainer.service.IApi.channel;
        channel.addHeader('Access-Control-Allow-Headers','*');
        channel.addHeader('Access-Control-Allow-Origin','*');
        channel.addHeader('Access-Control-Expose-Headers','Authorization');
        channel.addHeader('Authorization','Bearer ' + session.token);

        if (this.onlogin)
            this.onlogin(VistaApp);
        this.refresh();
    },

    setSchema: s => DataGraph.setSchema(s),

    isAdmin: function(){
        const usertype = VistaApp.settings.usertype;
        const itype = parseInt(VistaApp.session.itype);
        console.log("APP-IS-ADMIN", usertype, itype);
        if(!VistaApp.logged)
            return false;
        else if( itype < 0 )
            return true;
        else if(Array.isArray(usertype)){
            return itype === usertype[0];
        }
        else
            return itype === usertype;
    }
};