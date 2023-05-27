import { Binding, DataGraph, DataSource, Graph, SourcePath } from "../data/DataGraph";
import { Flow, Observer } from "./flow";
import { ApiService, FileService } from "./service";
import { syncle } from "./support";
import { isString } from "./util";
import { VistaApp } from "./Vista";

function Messenger() {

  this.intents = {};

  /**
   * @param {string} intent 
   * @param {string} context 
   * @param {function | string} emitter can be vmodel function or vid. if view has vid defined then is the emitter.
   */
  this.Subscribe = function (intent, emitter, context, control) {
    let flow;
    if (this.intents.hasOwnProperty(intent))
      flow = this.intents[intent];
    else {
      flow = new Flow();
      this.intents[intent] = flow;
    }

    return new Observer(flow, context, emitter, control);
  };

  this.Publish = function (event, value, emitter, task, data, model, context, control) {
    const info = {}; // data || {}
    const intents = this.intents;
    return new Promise(function (resolve, reject) {
      const flow = intents[event]
        ? intents[event]
        : new Flow();

      info.data = data; //Eventualmente commentare
      info.model = model;
      info.state = model?.state;
      info.control = control;
      flow.run(task, value, info, context, emitter, resolve, reject);
    });
  };

  //DA FARE RAGIONAMENTO PER FUNZIONI NON REFERENZIATE, ANCHE PER FARE UNSCRIBE
  this.Unscribe = function (intent, context, emitter) {
    if (this.intents.hasOwnProperty(intent) && this.intents[intent].remove(context, emitter)) {
      delete this.intents[intent];
    }
  };

  this.UnscribeContext = function (context) {
    for (const key in this.intents) {
      if (Object.hasOwnProperty.call(this.intents, key)) {
        if (this.intents[key].remove(context))
          delete this.intents[key];
      }
    }
  }
}

const messenger = new Messenger();

function StateCollection(models) {
  this.source = models;
  this.firstOrDefault = function () {
    if (this.source && this.source.length > 0)
      return this.source[0];
    else
      return null;
  }
}

const sourceHandler = {
  get(target, prop) {
    return DataGraph.findOrCreateGraph(target.etype + "." + prop).source;
  },
  set(target, prop, value) {
    target.root = DataGraph.findOrCreateGraph(target.etype + "." + prop);
    target.root.data = value; //Non è necessario formattare?
    target.root.notify();
    return true;
  }
};

export function Controller() {
  this.skin = null;
  this.api = null;
  this.navigator = null;
  this.context = null;
  this.contextid = null;
  this.app = null;
  this.popup = null;
  this.model = new EntityModel();
  this.inject = true;

  //quando setto command guardo se per component ( o view ) associata al controller esiste override e apllico eventualmente
  this.intent = { NAVIGATE: (url, state) => { this.navigator(url, state) }, };

  this.navigate = function (url, data) {
    /*if(typeof url !== 'string'){
      state = url.state;
      url = url.path;
    }*/
    if (data && !data.state) data = { state: data };
    this.navigator(url, data)
  };

  /** PER COMPATIBILITA => TBD */
  this.form = function (name) {
    return this.context.getElement(name);
  }

  this.getState = function (skin) {
    skin = skin || this.skin;
    const state = this.context.state.get(skin);
    return new StateCollection(state ? [...state] : null);
  };

  this.validate = async function (skin, key) {
    let state = this.getState(skin).source;
    const result = { isValid: false, model: state };
    if (state) {
      if (state[0].form && state[0].form.hasOwnProperty(key)) {
        result.isValid = true;
        result.validation = [];
        const len = state.length;
        for (const model of state) {
          const r = await model.form[key].validate();
          if (len === 1) {
            r.model = model;
            return r;
          }
          result.isValid &&= r.isValid;
          result.validation.push(r);
        }
      }
    }
    return result;
  }

  this.Subscribe = function (intent, emitter, context) {
    return messenger.Subscribe(intent, emitter === undefined ? this.skin : emitter, context === undefined ? this.context : context, this);
  };

  this.publish = function (intent, value, task, data, model) {
    return messenger.Publish(intent, value, this.skin, task, data, model, this.context, this);
  }

  this.execute = function (intent, value, data, model) {
    return this.publish(intent, value, this.intent[intent], data, model).catch((r) => console.log(r));
  }

  this.observe = function (emitter, intent, context) {
    if (!intent) return;
    return this.Subscribe(intent, emitter, context);
  }

  this.ResolveClass = function (classType) {
    return VistaApp.icontainer.ResolveClass(classType);
  }

  this.upload = function (option) {
    const file = VistaApp.icontainer.ResolveClass(FileService);
    return file.Upload(option);
  }

  this.request = function (s, f) {
    let service = VistaApp.icontainer.ResolveClass(s);
    return f(service);
  }

  this.openPopup = function (component, title, width, info) {
    /*if(typeof component === "string")
      component = <div>{component}</div>;*/
    if (this.popup)
      this.popup.open(component, title, width, info); //Deve diventare popup inject o iservice in generale dove c'è navigator, popup ecc.
  }

  this.closePopup = () => { if (this.popup) this.popup.close(); }

  this.show = function (view, info, state, path) {
    path = path || 'formvista';
    info = info || {};
    info.view = view;
    DataGraph.setSource("system.view", info);
    this.navigator(path, state);
  }

  this.source = function(model){
    //TOBE: controllo se c'è un override per model
    return new Proxy({etype: isString(model)? model : VistaApp.icontainer.ResolveClass(model).etype}, sourceHandler);
  }

  this.getGlobal = function (key) {
    return DataGraph.getGlobalState(key);
  }

  this.setGlobal = function (key, value) {
    DataGraph.setGlobalState(key, value);
  }

  this.graph = function (etype) {
    const path = etype.indexOf(":") > -1 ? etype : DataGraph.getSchema(etype);
    return new Graph(path, null, false, null, true).root;
  }

  this.bind = function (obj) {
    if (!obj)
      return obj; // Oppure obj = {} ???

    if (Array.isArray(obj)) {
      for (let k = 0; k < obj.length; k++) {
        obj[k].__tolink__ = true;
      }
    }
    else {
      obj.__tolink__ = true;
    }

    return obj;
  }

  //this.StopFlow = () => BreakFlow;//function() {this.stop = true;}

  this.getSyncle = () => syncle
}


//ViewModel / StateModel
export function EntityModel(vid) {
  this.vid = vid;
  this.control = null;
  this.state = { __val: null, __refresh: null };
  
  this.parent = null;

  this.ancestor = function(skin){
    let p = this.parent;
    while(p){
      if(p.skin === skin) break;
      p = p.parent;
    }
    return p;
  }

  this.rise = function(step){
    let p = this;
    for (let k = 0; k < step; k++) {
      if(!p.parent) break; //Restituisco root
      p = p.parent;
    }
    return p;
  }

  this.discendant = function(path){
    let child = this.child;

    for (let k = 0; k < path.length; k++) {
      const node = path[k];
      while(child){
        if(child === node || child.vid === node) break;
        child = child.brother;
      }
      if(!child) break;
    }

    return child;
  }

  this.read = function (m, f) {
    let model;
    if (f) {
      model = VistaApp.icontainer.ResolveClass(m);
      return f(model);
    }
    else {
      model = new DataModel();
      return m(model);
    }
  }

  this.emit = function (intent, value, data) {
    return this.control.execute(intent, value, data, this);
    //messenger.Publish(intent, value, this.skin, task, data, model, this.context, this);
  }

  this.request = function (m, f) {
    return this.read(m, f);
  }

  this.initSchema = function (schema, validators) {
    if (!schema || !validators || !Array.isArray(validators)) return null;
    const obj = {}
    validators.forEach((v) => v(schema, obj));
    return obj;
  }

  this.getGlobal = function (key) {
    return DataGraph.getGlobalState(key);
  }

  this.setGlobal = function (key, value) {
    DataGraph.setGlobalState(key, value);
  }

  //this.setSource = function (path, source) { DataGraph.setSource(path, source); }

  this.setSource = function (path, source, name) {
    return this.source(path, name, source);
  }

  this.getSource = function (path) { return DataGraph.getSource(path); }

  this.source = function (etype, name, data) {
    let path;
    let root;
    if (Object.prototype.toString.call(etype) !== "[object String]") {
      const m = VistaApp.icontainer.ResolveClass(etype);
      path = m.etype + "." + (name || "temp");
    }
    else
      path = etype + "." + (name || "temp");

    root = DataGraph.findOrCreateGraph(path);

    if (data)
      root.setData(data)

    const s = new DataSource(data, root);
    s.binding = new Binding();
    return s;
  }

  this.setItem = function (model, item) {
    const m = VistaApp.icontainer.ResolveClass(model);
    DataGraph.setSource(m.etype + '.' + m.itemName(), item);
  }

  this.addData = function (source, data, parent, format) {
    data = data || {};
    //if(format === undefined) format = true;
    source.node.addData(data || {}, parent, format, true);
    return data;
  }

  this.refresh = function (path) {
    this.state.__refresh(!this.state.__val);
    /*const n = DataGraph.findGraph(path);
    if (n) n.notify();*/
  }
}

//EntityModel
export function DataModel(etype, defaultOption) {
  ApiService.call(this, defaultOption);

  this.etype = etype;

  this.itemName = () => "item";

  this.ExecuteQuery = (query, params, permanent) => {
    return new Graph(query, params, permanent).ExecuteQuery();
  };

  this.list = function (condition, permanent, schema, complete) { //Select da schema senza filgi di default e se si vuole cambiare query?
    return new Graph(null, null, permanent).fromSchema(this.etype, "list", true, condition, complete, schema).ExecuteQuery();
  };

  this.item = function (pk) { //Completo da schema
    return new Graph(null, { id: pk }).fromSchema(this.etype, "item", false, "id=@id", true).ExecuteQuery();
  };

  this.Where = (condition, params, complete, schema) => {
    return new Graph(null, params).fromSchema(this.etype, complete ? "item" : "list", condition, complete, schema).ExecuteQuery();
  };

  this.GraphApi = function (schema, params, op, permanent) {
    let opt;
    if (typeof op === 'string')
      opt = { apiOp: op };
    else if (op)
      opt = op;

    let path;
    if (schema.charAt(0) === '[') {
      path = '[' + this.etype + ']' + '.' + schema.substring(1,schema.length-1);
    }
    else {
      path = schema.indexOf(':') > -1 ? schema : this.etype + '.' + schema;
    }

    const root = DataGraph.findOrCreateGraph(path, null);
    root.graph.params = params;
    root.graph.permanent = permanent;
    console.log("GRAPH-PARSE-WITH-SCHEMA", root.graph);
    return root.graph.ExecuteApi(opt);
  };

  this.getMutation = el => {
    if (Array.isArray(el)) {
      const mutated = [];
      for (let i = 0; i < el.length; i++) {
        const data = DataGraph.getMutation(el[i]);
        if (data)
          mutated.push(data);
      }
      return mutated;
    }
    else {
      return DataGraph.getMutation(el);
    }
  }
}

/*DataModel.register = function(type, etype, option){
  type.prototype = new DataModel(etype, option);
}*/

function ModelMap(){
  this.root = null;
  this.parent = null;
  this.last = null;

  this.link = function(model){
    if(this.parent){
      if(this.parent.child){
        model.brother = this.parent.child;
      }
      this.parent.child = model;
      model.parent = this.parent;
    }
    
    this.parent = model; //Lo faccio in modo separato?
  }

  this.unlink = function(model){
    this.parent = model.parent;
  }

}

var uuid = 0;
export function Context(name) {
  //DataContext.call(this, name);
  uuid++;
  this.id = uuid;
  this.name = name;// + uuid;
  this.elements = {};
  this.controls = new Map();
  this.app = null;
  this.state = new Map();
  this.inject = true;

  this.map = new ModelMap();

  this.registerElement = function (name, element) {
    this.elements[name] = element;
  }

  this.getElement = function (name) {
    return this.elements[name];
  }
  /**
   * 
   * @param {function } controller 
   */
  this.getControl = function (controller) {
    if (!controller) return null;
    if (!this.controls.has(controller)) {
      const c = VistaApp.icontainer.ResolveClass(Controller);
      c.contextid = this.name;
      c.context = this;
      controller(c);
      this.controls.set(controller, c);
    }
    return this.controls.get(controller);
  }

  /**
   * 
   * @param {function } controller 
   */
  this.getController = function (skin, controller) {
    if (!skin) return null;
    if (!this.controls.has(skin)) {
      const c = VistaApp.icontainer.ResolveClass(Controller);
      c.contextid = this.name;
      c.context = this;
      controller(c);
      this.controls.set(skin, c);
    }
    return this.controls.get(skin);
  }

  this.setController = function (skin, controller, locked) {
    if (!locked || !this.controls.has(skin)) {
      const c = VistaApp.icontainer.ResolveClass(Controller);
      c.contextid = this.name;
      c.context = this;
      controller(c);
      this.controls.set(skin, c);
      return c;
    }
    return null;
  }

  this.register = function (skin, model) {
    model.skin = skin;
    this.map.link(model);
    return model;
  }

  this.unregister = function (skin, model) {
    /*if(model === model.parent.child) model.parent.child = model.brother;
    else{
      let child = model.parent.child;
      while(child.brother !== model){ //Getione caso non esiste come child(che dovrebbe essere impossibile)
        child = child.brother;
      }
      child.brother = model.brother;
    }*/
  }

  this.dispose = function () {
    messenger.UnscribeContext(this);
    this.controls.clear();
    //this.state.clear();
    /*for (let key of this.controls.keys()){
        key._model = null;
    }*/
    //foreach in this.models.key => delete key._model
    console.log("CONTEXT DISPOSE", this.name);
  }
}

/*export function Observer(fields, emitter) {
  this.actions = [];
  this.fields = fields;
  this.emitter = emitter;

  this.Apply = function (info) {
    console.log("INIT APPLY", info, this.fields, this.emitter);
    if ((',' + this.fields + ',').indexOf(',' + info.field + ',') === -1 || (this.emitter && (',' + this.emitter + ',').indexOf(',' + info.emitter + ',') === -1))
      return;

    console.log("PASSA APPLY");
    info.fields = this.fields;

    for (let k = 0; k < this.actions.length; k++) {
      if (!this.actions[k].apply(null, [info, info.target]) || info.stop)
        break;
    }
  }

  this.hasValue = function () {
    this.actions.push((info) => {
      const fields = info.fields.split(',');
      console.log("HAS VALUE", fields);
      let v;
      for (let k = 0; k < fields.length; k++) {
        v = info.values[fields[k]];
        if (v && v.hasOwnProperty("value")) v = v.value;
        if (!v) return false;
      }
      return true;
    });

    return this;
  }

  this.Validate = function (propage) {
    this.actions.push((info) => {
      info.valid = true;
      if (!info.schema)
        return true;
      //Validation
      return propage || info.valid;
    });

    return this;
  }

  this.make = function (action) {
    this.actions.push(action);
    return this;
  }
}*/

/**
 * Osservable is associate with one data source (item or array) and osserve state change on that data
 * @param {*} target 
 * @param {*} emitters 
 */
export function Observable(target, source, emitters, schema, oclass) {
  this.target = target;
  this.source = source;
  this.mutation = source ? { ...source } : {};
  this.emitters = emitters || [];
  this.observers = [];
  this.schema = schema;
  this.oclass = oclass || Observer;

  //Qualunque sia l'emitter o posso anche selezionare???
  /**
   * 
   * @param {*} fields stringa separata da virgola
   * @param {*} emitters stringa separata da virgola
   */
  this.observe = function (fields, emitters) {
    if (fields === '*') {
      fields = ",";
      for (const key in this.source) {
        fields += key + ','
      }
    }
    const observer = new this.oclass(fields, emitters);
    this.observers.push(observer);
    return observer;
  };

  this.addEmitter = function (emitter) {
    emitter.observable = this;
  };

  this.notify = function (info) {
    info.target = this.target;
    info.source = this.source;
    info.schema = this.schema;
    for (let k = 0; k < this.observers.length; k++) {
      this.observers[k].Apply(info);
    }
  };

  this.onPublish = function (value, data) {
    //const data = info.data;
    const field = data.field;
    if (data.value && data.value.hasOwnProperty('label')) {
      data.value = data.value.value;
      data.values = { ...data.values };
      data.values[field] = data.value;
      data.values[field + "_label"] = data.value.label;
    }
    console.log("OBS ON PUBLISH BEFORE", value, data, this.mutation);
    /*if (this.mutation[field] === data.value)
      return;*/
    this.mutation[field] = data.value;
    console.log("OBS ON PUBLISH", value, data);
    data.emitter = value;
    this.notify(data);
  }
}

export function emitter(name) {
  this.name = name;
  this.observable = null;

  this.emit = function (info) {
    info.emitter = this.name;
    if (this.observable)
      this.observable.notify(info);
  }
}
