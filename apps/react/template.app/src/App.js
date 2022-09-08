import './App.scss';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
//import { AppProvider } from '@vista/react';
//import { VistaApp } from "@vista/react";
import { AppSchema } from './schema';
import { Welcome } from './vista/welcome';
import { version, Test } from '@vista/core';
//import { MainLayout } from './layout/MainLayout';
//import { AppProvider } from '@vista/react';
/**
 * 
 * @param {VistaApp} app 
 */
function initApp(app){ 
  const model = app.model;

  model.Subscribe("NAVIGATE", function(path){ //SubscribeAt
    console.log("NAVIGATE ON", path);
    /*if(state === "/"){ //QUi potrei eseguire tutte le query dei graph init o permanent
      return ExecuteQuery(`list@visit-list: [visita](dstart=@date){*}`, {date: new Date()});
    }
    else if(state === "/ms"){
      return ExecuteQuery(`list: [folder]{id, itype,
      patient: /u patient { id, tname, tsurname },
      doctor: /u doctor {id, tname, tsurname}
    }`, {date: new Date()});
    }*/
  });
}

function App() {
  console.log("VERSION", version, Test);
  return (
    <BrowserRouter basename="/app">
      <Routes>
          <Route path="/" element={<Welcome />}>
            <Route index element={<Welcome />} />
            <Route path="home" element={<Welcome />} />
            <Route path="profile" element={<Welcome />} />
			      <Route path="dashboard" element={<Welcome />} />
          </Route>
        </Routes>
      {/* <AppProvider init={initApp} schema={AppSchema}>
      <Routes>
          <Route path="/" element={<Welcome />}>
            <Route index element={<Welcome />} />
            <Route path="home" element={<Welcome />} />
            <Route path="profile" element={<Welcome />} />
			      <Route path="dashboard" element={<Welcome />} />
          </Route>
        </Routes>
      </AppProvider> */}
    </BrowserRouter>
  );
}

export default App;
