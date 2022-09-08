import { Vista } from '@vista/core';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { openPopup } from '../components/Popup';
import { isReactComponent } from './core';

export const AppContext = React.createContext(null);

//Posso fare un object login {component: , request: , path: } oppure scelgo in base a tipo login (React component, function or string)
export const AppProvider = ({ init, schema, login, noBreakPoint, children }) => {

    console.log("APP PROVIDER");

    const nav = useNavigate(); 

    const [app, updateApp] = useState({current: Vista.InitApp(nav, init)});
    
    useEffect(() => {
        console.log("EFFECT APP SCHEMA");
        if (schema) schema();
    }, [schema]);

    useEffect(() => {
        console.log("EFFECT APP BREAK-POINT");
        const App = app.current;
        !noBreakPoint && (App.onbreakpoint = (info, media, breakpoint) => {
            updateApp({...app});
        });
    }, [noBreakPoint]);

    useEffect(() => {
        console.log("EFFECT APP LOGIN");
        
        const App = app.current;

        if(App.login)
            App.model.Unscribe("LOGIN-REQUEST", App.login); 
        
        const ln = login; // || <AppLogin />; (Default Login)

        App.login = isReactComponent(ln) || typeof ln === "string" ? (path) => {
            typeof ln === "string"
                ? App.navigate(ln, path)
                : openPopup(ln, "Login", path);
        } : ln;

        App.model.Subscribe("LOGIN-REQUEST", App.login);

    }, [login]); //Se è component ripassa ad ogni rendering ???

    return (
        <AppContext.Provider value={app} >
            {children}
        </AppContext.Provider>
    )
}

export const useApp = () => React.useContext(AppContext).current;