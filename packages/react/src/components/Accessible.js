import { Button } from "antd";
import { useContext, useMemo } from "react";
import { Route } from "react-router-dom";
import { AppContext, useApp } from "../core/AppContext";

/**
 * Supportare anche disable oltre not visible
 * config (meglio se sta in context)
 * context
 * @param {*} param0 
 * @returns 
 */
export function Accessible({ id, state, states, userAs, includeIn, includeIf, context, children, ...rest }) {

    const ctx = useContext(context || AppContext);

    const accessible = useMemo(
        function () {
            console.log("Accessible useMemo START");
            let result = true;
            let k = 0;
            const conditions = [];

            if (ctx) {
                if (userAs && ctx.user) {
                    const type = ctx.user.type;
                    conditions.push(function () {
                        let values = userAs;
                        if (!type)
                            return false;

                        if (typeof userAs === 'string' || userAs instanceof String) {
                            values = userAs.split(',');
                        }
                        else if (!Array.isArray(userAs))
                            throw new Error("Accessible userAs must be an Array of values or string of comma separated values.");

                        for (let j = 0; j < values.length; j++) {
                            if (type === values[j])
                                return true;
                        }

                        return false;
                    });
                }

                if (ctx.accessible && ctx.accessible.hasOwnProperty(id) && ctx.accessible[id]) {
                    conditions.push(function () {
                        return ctx.accessible[id].accessible;
                    });
                }
            }

            if (rest) {
                for (const key in rest) {
                    if (Object.hasOwnProperty.call(rest, key)) {
                        if (key.length > 7 && key.substring(0, 7) === "include") {
                            const name = key.substring(7);
                            conditions.push(function (_, _states) {
                                if (!_states || !_states.hasOwnProperty(name) || !_states[name])
                                    return false;

                                let values = rest[key];
                                const s = _states[name];
                                if (typeof values === 'string' || values instanceof String) {
                                    values = values.split(',');
                                }
                                else if (!Array.isArray(values))
                                    throw new Error("Accessible " + key + " must be an Array of values or string of comma separated values.");

                                for (let z = 0; z < values.length; z++) {
                                    if (s === values[z])
                                        return true;
                                }

                                return false;
                            });
                        }
                    }
                }
            }

            if (includeIn) {
                conditions.push(function (s) {
                    if (!s)
                        return false;
                    let values = includeIn;
                    if (typeof includeIn === 'string' || includeIn instanceof String) {
                        values = includeIn.split(',');
                    }
                    else if (!Array.isArray(includeIn))
                        throw new Error("Accessible includeIn must be an Array of values or string of comma separated values.");

                    for (let j = 0; j < values.length; j++) {
                        if (s === values[j])
                            return true;
                    }

                    return false;
                });
            }

            if (includeIf) {
                if (!Object.prototype.toString.call(includeIf) === '[object Function]')
                    throw new Error("Accessible includeIf must be a function.");

                conditions.push(function (s, ss) {
                    const result = includeIf.apply(null, s, ss);
                    if (typeof result === 'boolean')
                        return result;
                    else
                        throw new Error("Accessible includeIf must return a boolean type.");
                });
            }

            while (result && k < conditions.length) {
                result = conditions[k](state, states);
                k++;
            }
        }, [id, state, states, userAs, includeIn, includeIf, ctx, rest]);
    return accessible ? children : null;
}

export function When({ states, value, breakpoint }) {

}

export function NotAuthorized({path}) {
    const app = useApp();
    //Multilanguage support, default login request da app.loginRequest(); comportamento di default(popup) che può essere override at initApp
    //Multilanguage caricato at init in base a locale o impostazione utente
    return <>
        <div>Contenuto protetto, effettua il login per accedere.</div>
        {app && app.login
        ? <Button onClick={()=>{app.model.Publish("LOGIN-REQUEST", path)}}>Accedi</Button>
        : null}
    </>
}

export function AuthRoute(props) {
    const app = useApp();

    return !app || app.logged
        ? <Route {...props} />
        : <Route path={props.path} element={app.notAuthorized || <NotAuthorized path={props.path} />} />
}

export function AuthRoutes(props) {
    const app = useApp();

    return !app || app.logged
        ? props.children
        : props.notAuthorized; //At least null;
}

export function BreakPoint({maxWidth, minWidth, size, children}){
    const app = useApp();

    if(app && app.breakpoint[size]){
        minWidth = app.breakpoint[size].min;
        maxWidth = app.breakpoint[size].max;
    }
    
    minWidth = minWidth || 1;
    maxWidth = maxWidth || 10000;
    
    return !app || (minWidth <= app.screenWidth && app.screenWidth <= maxWidth)
    ? children
    : null;
}
