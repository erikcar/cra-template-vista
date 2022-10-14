//import React from "react";

import React, { useEffect } from "react";

export function TestComponent(){
    useEffect(()=>{
        console.log("TEST EFFECT");
    },[]) 
    return <div>TEST</div>;
}