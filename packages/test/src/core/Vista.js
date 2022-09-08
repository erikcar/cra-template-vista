//import {session} from "@webground/core"
//import { attachDataGraph, attachNavigator } from "../intent/modelIntent";
//import { Context } from "./Model";

export function VistaModel(model) {
    //attachNavigator(model, session.navigate);
    //attachDataGraph(model);
}

const Vista = {
    InitApp: function(INavigate, init){
        /*session.init();
        const ctx = new Context("App");
        session.context = ctx;
        session.navigate = INavigate;
        session.model = ctx.getModel(VistaModel);

        if(init) 
            init(session);

        return session;*/
        return "TEST EXPORT Vista.InitApp";
    }
}

export {Vista};