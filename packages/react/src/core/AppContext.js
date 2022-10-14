//import { VistaApp } from '@vista/core';
import { VistaApp, DataGraph, AppModel } from '@vista/core';
import React, { useEffect, useState, useRef } from 'react';
//import { useNavigate, useSearchParams } from '../../node_modules/react-router-dom/dist/index';
import { useNavigate, useSearchParams } from 'react-router-dom'; 

//import { useNavigate, useSearchParams } from 'react-router-dom';


export const AppContext = React.createContext(null);

//Posso fare un object login {component: , request: , path: } oppure scelgo in base a tipo login (React component, function or string)
export const AppProvider = ({ init, schema, onlogin, baseurl, control, children }) => {

    console.log("APP PROVIDER");

    const navigator = useNavigate();
    const [qp] = useSearchParams(); 
    console.log("APP PROVIDER NAV");
    const [app, updateApp] = useState(()=>{
        return VistaApp.init(navigator, control, onlogin);
        //return Vist
    });
    console.log("APP PROVIDER STATE");
    /*if(qp.has("fareq")){
        app.irequest = {type: 'FA', data: qp};
    }*/

    const oninit = useRef(()=>{
        //Devo scambiare ordine??? cioè prima faccio check session?
        if (init) 
            init(VistaApp);
        if(!VistaApp.irequest) 
            app.model.request(AppModel, m=>m.checkSession(app));
    });

    console.log("APP PROVIDER", app);

    if (schema && !DataGraph.schema.DEFAULT) schema();

    if (!app.initialized) {

        VistaApp.refresh = () => { 
            updateApp({...VistaApp});
        }

        //Prima di init e che avvenga prima chiamata api
        VistaApp.icontainer.service.IApi.onManagedError = e => {
            VistaApp.control.openPopup(<div>{e.message}</div>, "ATTENZIONE");
        }

        VistaApp.icontainer.service.IApi.onError = e => {
            VistaApp.control.openPopup(<div>{e}</div>, "ATTENZIONE");
        }

        if(baseurl) VistaApp.icontainer.service.IApi.channel.setBaseurl(baseurl);
        //axios.defaults.withCredentials = true;
        app.initialized = true;
    }

    useEffect(() => {
        oninit.current();
    }, []);

    useEffect(() => {
        VistaApp.current = app;
    }, [app]);

    return (
        <AppContext.Provider value={app} >
            {children}
        </AppContext.Provider>
    )
}

export const useApp = () => React.useContext(AppContext).current;