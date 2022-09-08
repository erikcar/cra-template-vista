import './App.less';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./core/AppContext";
import { MainLayout } from './layout/MainLayout';
import { Model } from './core/Model';
//import { DataGraph, ExecuteQuery, GraphML } from './data/DataGraph';
//import axios from "axios";
import { Welcome } from './vista/welcome';
//import { GraphParser, SqlGraph } from './data/interpreters/ISql';

/*DEFINIRE SERVER URL DI DEPLOYMENT E/O DI PRODUZIONE*/
//axios.defaults.baseURL = "https://localhost:7294/";//"http://app.iconsultant.it/";

function initApp(){

  /*DataGraph.init();

  let model  = new Model();

  model.PrependOn("NAVIGATE", function(state){
    console.log("PREPEND NAV", state);
    if(state === "/"){
      return ExecuteQuery(`list: [visita](dstart=@date){*}`, {date: new Date()});
    }
    else if(state === "/home"){
      return ExecuteQuery(`list: [folder]{id, itype,
      patient: /u patient { id, tname, tsurname },
      doctor: /u doctor {id, tname, tsurname}
    }`, {date: new Date()});
    }
  });

  return model;*/
  return new Model();
}

function App() {
  console.log("START APP");

  const AppModel = initApp();
  return (
    <BrowserRouter basename="/app">
      <AppProvider user={{ name: "user", type: "ADMIN" }}>
        <Routes>
          <Route path="/" element={<MainLayout model={AppModel} />}>
            <Route index element={<Welcome />} />
            <Route path="home" element={<Welcome />} />
            <Route path="profile" element={<Welcome />} />
			      <Route path="dashboard" element={<Welcome />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
