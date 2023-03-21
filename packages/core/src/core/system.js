import { Binding, DataGraph, DataSource, Graph, SourcePath } from "../data/DataGraph";
import { FileService } from "./Service";
import { syncle } from "./support";
import { VistaApp } from "./Vista";

function breakFlow() { }
export const BreakFlow = new breakFlow();
export function Flow() {
  this.blocks = [];
  this.map = null;
  console.log("FLOW INIT");

  this.Append = function (block, key) {
    this.blocks.push(block);
    console.log("FLOW APPEND", block, this.blocks);
    if (key)
      this.map[key] = block;
  };

  this.Prepend = function (block, key) {
    this.blocks.unshift(block);
    console.log("FLOW PREPEND", block, this.blocks);
    if (key)
      this.map[key] = block;
  };

  this.remove = function (token, emitter) {
    this.blocks = this.blocks.filter((block) => { return (token === null || block.token !== token) && (emitter === undefined || block.emitter !== emitter) }) || [];
    return this.blocks.length === 0;
  }

  this.runOld = async function (value, data, params, context, emitter, model, resolve, reject) {
    if (!params) params = {};
    params.data = data;
    params.model = model;
    //console.log("FLOW RUN", data, params, this.blocks);
    let block; let running = []; let count = 0;
    for (let j = 0; j < this.blocks.length; j++) {
      block = this.blocks[j];
      if ((!block.context || block.context === context) && (!block.emitter || block.emitter === emitter) && (!block.condition || block.condition())) {
        if (model && model === block.model)
          running.splice(count, 0, block);
        else if (block.before) {
          running.unshift(block);
          count++;
        }
        else {
          running.push(block);
        }
      }
    }
  }
  //TODO: implementare supporto ordine esecuzione
  this.run = async function (action, value, data, model, params, context, emitter, control, resolve, reject) {
    if (!params) params = {};

    if (data instanceof DataSource) {
      params.node = data.node;
      params.data = data.data;
      params.source = data;
    }
    else
      params.data = data;

    params.app = control.app;
    params.model = model || new EntityModel(); // === Model (è il model dell'istanza view)
    params.control = control;
    //console.log("FLOW RUN", data, params, this.blocks);
    let block; let running = [];
    if (action) running.push({ action: action });
    for (let j = 0; j < this.blocks.length; j++) {
      block = this.blocks[j];
      if ((!block.context || block.context === context) && (!block.emitter || block.emitter === emitter) && (!block.condition || block.condition())) {
        block.before
          ? running.unshift(block)
          : running.push(block);
      }
    }

    console.log("FLOW RUNNING", running, this.blocks);

    if (running.length === 0)
      return resolve(null);

    let result;

    for (let k = 0; k < running.length; k++) {
      let bf = false;
      //TODO: Gestione di un block come ICommand => command.execute(params);
      result = running[k].action.apply(null, [value, params]);
      //console.log("FLOW-RESULT", result);
      
      if(control.stop){
        delete control.stop;
        reject(false);
        break;
      }

      if (!result) continue;
      else if (result instanceof Promise) {
        result = await result;
        if (!result) continue;
        //result.then((r)=> { if(r instanceof breakFlow)  bf = true;  debugger;} )
      }
      if (bf || result instanceof breakFlow) {
        reject(false);
        break;
      }
      else if (result instanceof Error) {
        reject(result);
        break;
      }
      value = result;
    }
    resolve(result);
  }

  if (arguments && arguments.length > 0) {
    for (let j = 0; j < arguments.length; j++) {
      this.Append(arguments[j]);
    }
  }
}

function Messenger() {

  this.intents = {};

  /**
   * @param {string} intent 
   * @param {function | object} action if function is append else object define when and order ex . {before: function, after: function}, {before: {order: -2, action: function}}
   * @param {string} context 
   * @param {function | string} emitter can be vmodel function or vid. if view has vid defined then is the emitter.
   * @param {function} condition 
   */
  this.Subscribe = function (intent, action, emitter, context, condition, model, token, prepend) {
    /*if(intent === "POPUP-CONFIRM"){
      //console.trace("MESSENGER SUBSCRIBE", intent, emitter, context);
      debugger;
    }*/

    let flow;
    if (this.intents.hasOwnProperty(intent))
      flow = this.intents[intent];
    else {
      flow = new Flow();
      this.intents[intent] = flow;
    }

    if (typeof action === 'function'){
      const block = { action: action, context: context, emitter: emitter, condition: condition, model: model, token: token };
      prepend? flow.Prepend(block): flow.Append(block);
    }
      
    else {
      if (action.hasOwnProperty("before"))
        flow.Prepend({ action: action.before, before: true, context: context, emitter: emitter, consition: condition, model: model, token: token });
      if (action.hasOwnProperty("after"))
        flow.Append({ action: action.after, context: context, emitter: emitter, consition: condition, model: model, token: token });
    }
  };

  this.Publish = function (intent, action, value, data, model, parameters, context, emitter, control) {
    //console.log("INTENT", intent, value, data, parameters, context, emitter, model, this.intents);
    const intents = this.intents;
    return new Promise(function (resolve, reject) {
      const flow = intents[intent]
        ? intents[intent]
        : new Flow();
      //console.log("FLOW", intent, flow);
      flow.run(action, value, data, model, parameters, context, emitter, control, resolve, reject);
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

function StateCollection(models){
  this.source = models;
  this.firstOrDefault = function(){
    if(this.source && this.source.length>0)
      return this.source[0];
    else
      return null;
  }
}

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
  /*function (IApi, INavigator, IPopup) {
    this.api = IApi;
    this.navigator = INavigator;
    this.popup = IPopup;
  }*/

  //quando setto command guardo se per component ( o view ) associata al controller esiste override e apllico eventualmente
  this.command = { NAVIGATE: (url, state) => { this.navigator(url, state) }, };
  //Quando creo faccio injection dei service Un unico service instance e poi utilizzo questo per tutto o inject dei singoli service (Possibile fare tipo nect core individuare injection da constructor?) 
  //this.service = null;

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

  this.Subscribe = function (intent, action, emitter, context, condition, prepend) {
    messenger.Subscribe(intent, action, emitter === undefined ? this.skin : emitter, context === undefined ? this.contextid : context, condition, this, this.contextid, prepend);
  };

  this.publish = function (intent, value, data, model, parameters) {
    messenger.Publish(intent, null, value, data, model, parameters, this.contextid, this.skin, this);
  }

  this.execute = function (intent, value, data, model, parameters) {
    messenger.Publish(intent, this.command[intent], value, data, model, parameters, this.contextid, this.skin, this).catch((r) => console.log(r));
  }

  this.observe = function (emitter, actions) {
    if (!actions) return;
    for (const key in actions) {
      if (Object.hasOwnProperty.call(actions, key)) {
        this.Subscribe(key, actions[key], emitter, this.contextid, null, true)
      }
    }
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

  this.setSource = function (path, source, name) {
    return this.source(path, name, source);
    DataGraph.setSource(path, source).datasource;
  }

  this.getSource = function (path) { return DataGraph.getSource(path); }

  this.source = function (etype, name, data) {
    let path = etype + "." + (name || "temp");
    let root;
    if (Object.prototype.toString.call(etype) !== "[object String]") {
      const m = VistaApp.icontainer.ResolveClass(etype);
      path = m.etype + "." + name;
    }
    else if (etype.indexOf(':') > -1)
      root = new Graph(etype).root;

    root = DataGraph.findOrCreateGraph(path);

    if (data)
      root.setData(data)

    return root;
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

  this.StopFlow = ()=> BreakFlow;//function() {this.stop = true;}

  this.getSyncle = () => syncle
}

export function EntityModel(vid) {
  this.vid = vid;
  this.control = null;
  this.state = {__val: null, __refresh: null};
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

  this.emit = function (intent, data, param, source) {
    this.control.execute(intent, data, source, this, param);
  }

  this.request = function (m, f) {
    return this.read(m, f);
  }

  this.initSchema = function (schema, validators){
    if(!schema || !validators || ! Array.isArray(validators)) return null;
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
    let path = etype + "." + (name || "temp");
    let root;
    if (Object.prototype.toString.call(etype) !== "[object String]") {
      const m = VistaApp.icontainer.ResolveClass(etype);
      path = m.etype + "." + name;
    }
    else if (etype.indexOf(':') > -1)
      root = new Graph(etype).root;

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

export function DataModel(etype, op) {
  this.etype = etype;
  this.op = op;

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

  this.ExecuteApi = function (query, params, op, permanent) {
    let opt;
    if (typeof op === 'string')
      opt = { apiOp: op };
    else if (op)
      opt = op;

    return new Graph(query, params, permanent).ExecuteApi(opt);
  };

  this.ExecuteApiWithSchema = function (query, params, op, permanent) {
    let opt;
    if (typeof op === 'string')
      opt = { apiOp: op };
    else if (op)
      opt = op;

    const values = query.split(':');
    //new Graph(DataGraph.getSchema(p), params, permanent)
    /*let p = new SourcePath(values[1].trim() + '.' + values[0].trim()); // gestire anche condition con path?
    
    const graph = 
    graph.isCollection = p.isCollection;
    graph.deep = true;*/
    const root = DataGraph.findOrCreateGraph(values[1].trim() + '.' + values[0].trim());
    root.graph.params = params;
    root.graph.permanent = permanent;
    console.log("GRAPH-PARSE-WITH-SCHEMA", root.graph);
    return root.graph.ExecuteApi(opt);
  };

  this.CallApi = function (name, params) {
    return this.ExecuteApi(name + ": " + this.etype + " {*}", params, op[name]);
  }

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
var uuid = 0;
export function Context(name) {
  //DataContext.call(this, name);
  uuid++;
  this.name = name + uuid;
  this.elements = {};
  this.controls = new Map();
  this.app = null;
  this.state = new Map();
  this.inject = true;

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
    let s = this.state.get(skin);
    if (!s) {
      s = new Set();
      s
      this.state.set(skin, s);
    }
    //model.index = s.size;
    s.add(model);
  }

  this.unregister = function (skin, model) {
    if (this.state.has(skin))
      this.state.get(skin).delete(model);
    else
      console.log("WARNING UNREGISTER SKIN NOT FOUND");
  }

  this.dispose = function () {
    messenger.UnscribeContext(this.name);
    this.controls.clear();
    this.state.clear();
    /*for (let key of this.controls.keys()){
        key._model = null;
    }*/
    //foreach in this.models.key => delete key._model
    console.log("CONTEXT DISPOSE", this.name);
  }
}

export function Observer(fields, emitter) {
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
}

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

/*export const VistaApp = {
  icontainer: new Container(),
  context: new Context("App"),
  sessiom: { type: -1 }, //GUEST
  logged: false,
  initialized: false,
  current: this,
  setValue: (name, value) => {
    VistaApp[name] = value;
    VistaApp.current[name] = value;
  },
  model: new Model()
};*/