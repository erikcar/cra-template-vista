import React from "react";
import { Children, useEffect } from "react";
import { useRef } from "react";
import { Context } from "@vista/core";
import { useModel } from "../hook/VistaHook";

export const VistaContext = React.createContext(null);

export default function Vista({ children, context }) {
    if (!context)
        throw new Error("Vista must define a unique id value");

    //const context = useRef(new Context(id));
    useEffect(() => { const ctx = context.current; return () => ctx.dispose() }, [])
    console.log("VISTA", context.current);
    return (
        <VistaContext.Provider value={context.current} >
            {children}
        </VistaContext.Provider>
    )
}

export function useVista(id, modelType, info, etype) {
    const context = useRef(new Context(id));
    const [model, source] = useModel(modelType, info, etype, context.current); 
    console.log("USE VISTA:", model);
    return [context, model, source];
}

function VistaRender({ node, ...rest }) {
    //END CONTEXT
    console.log("END VISTA RENDER", node, rest);
    return null;
}

export const VistaJS = {};

export function Traverse({children}){
    if(Array.isArray(children) === undefined)
       return null;

       const traverse = function(c){
        const arrayChildren = Children.toArray(c);
        React.Children.map(arrayChildren, (child) => {
            //child.props["path"] = child.type.name;
            console.log("TRAVERSE-CHILDREN", child, child.type.name);
            if(child.props.children)
                traverse(child.props.children);
        });
     }

     traverse(children);

     return children;
}

export function Empty(){
    console.log("EMPTY RENDER");
    return null;
}
/*   //Per ogni children passo info in base a ID? e se delle view hanno stesso id => importante non ce ne siano allo stesso livello
   //console.log("CHILDREN", children, props);
   if(Array.isArray(children) === undefined)
       return null;


   const traverse = function(c){
   const arrayChildren = Children.toArray(c);
   React.Children.map(arrayChildren, (child) => {
       //child.props["path"] = child.type.name;
       console.log("CHILDREN", child, child.type.name);
       //if(child.children)
           //traverse(child);
   });
}
traverse(children);*/

    // if(Array.isArray(children)){
    //     React.Children.map(children, (child) => {
    //         console.log("CHILDREN", child, child.type.displayName);
    //     });
    // }
    // else{
    //     console.log("CHILDREN",children, children.type.displayName);
    // }