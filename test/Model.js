import { DataGraph, DataSource, Graph } from "../data/DataGraph";

/**
 * ViewModel Base Class
 * @param {*} name 
 */
export function Model(contextid, emitter, ref) {
  //this.schema = null;
  //this.alias = null;
  //this.intents = {};
  //this.form = {};
  this.contextid = contextid;
  this.emitter = emitter;
  this.context = ref;
  
  this.Publish = function (intent, value, data, parameters) {
    messenger.Publish(intent, value, data, parameters, this.contextid, this.emitter, this);
  }

  this.Subscribe = function (intent, action, emitter, context, condition) {
    messenger.Subscribe(intent, action, emitter === undefined ? this.emitter : emitter, context === undefined? this.contextid : context, condition, this, this.contextid);
  };

  this.Unscribe = function (intent, emitter, context) {
    messenger.Unscribe(intent, context || this.contextid, emitter || this.emitter)
  };
/**
 * 
 * @param {function | string} mkey 
 * @param {string} path 
 * @param {Context} context 
 * @returns {DataSource}
 */
  this.getSource = function(mkey, path, context){
    const m = this.get(mkey, context);
    console.log("GET SOURCE", m.source);
    if(path)
      return m.source.discendant(path);
    else
      return m.source;
  }
  
/**
 * 
 * @param {function | string} key 
 * @param {Context} context 
 * @returns {Model}
 */
  this.get = function(key, context){
    context = context || this.context;
    return context.getModel(key);
  }

  /**
   * 
   * @param {DataSource} source 
   * @param {*} values 
   */
  this.mutateValues = function (source, values) {
    const { data, node } = source;
    console.log("DEBUG FORM USE FORM MUTATE", values, node, this.contextid);
    for (const key in values) {
      if (Object.hasOwnProperty.call(values, key)) {
        node.mutate(key, values[key], data);
      }
    }
  }

  this.getForm = function (name) {
    return this.context.getForm(name);
  };

  this.validateForm = async function (name) {
    const form = this.context.getForm(name);
    if(!form) return {isValid: false, form: null};
    let source = form.__source__;
    
    return await form.validateFields()
      .then(values => {
        console.log("DEBUG FORM VALIDATOR OK", name);
        this.mutateValues(form.__source__, form.getFieldsValue(true));
        form.__checked__ = true;
        form.resetFields();
        return { isValid: true, data: source.data, node: source.node, form: form };
      })
      .catch(errorInfo => {
        console.log("DEBUG VALIDATOR ERROR", errorInfo); //Si può fare publish di error che da app viene ascoltatato e riportato a user in modo cetntralizzato
        return { isValid: false, data: source.data, node: source.node, form: form, error: errorInfo};
      });
  };

  this.submitForm = async function (name) {
    const [isValid, source] = await this.validateForm(name);
    if (isValid) {
      source.node.save();
    }
  }

  this.resetForm = function (name) {
    const form = this.context.getForm(name);
    if (form) form.resetFields();
  }

  /**
   * 
   * @param {string} url Url to navigate
   * @param {object} state Optional Data passed to destination path
   */
  this.navigate = function (url, state) {
    if (modelSupport.navigate) {
      modelSupport.navigate(url, state);
    }
  }

  /*attachNavigator(this);
  attachMutation(this);
  attachDataGraph(this);

  this.navigable = null;
  this.Navigable = function (name, navigable) { this.navigable = this.navigable || {}; this.navigable[name] = navigable; }
  this.NavigableContent = function (name, content) { if (this.navigable && this.navigable.hasOwnProperty(name)) { this.navigable[name](content); } }*/
  this.onError = function (info) { console.log("MUTATION ERROR", info) }

  this.dispose = function () {
    if (this.contextid) {
      delete this.contextid;
    }
  }
}

/**
 * 
 * @param {*} props 
 * @param {Model} modelType 
 * @param {string} id nome della function?
 */
export function initModel(props, modelType, id) {
  props.model = props.model || new modelType();
  props.id = props.id || id;
  props.path = props.path + "/" + id;
  if (props.children) {
    //ciclare ed assegnare path al proprio props!
  }
}

export const modelSupport = {};

Object.defineProperty(Model.prototype, "data", {
  get() {
    return DataGraph;
  }
});


/*
let models = new Map();
function EmptyModel(model) { return model; }
export function getModel(context, key, state) {
  context = context || models;
  key = key || EmptyModel;

  console.log("GET MODEL CTX", context, key);
  if (!context.has(key)) {
    const model = new Model(state);
    key(model, context);
    if (context.map?.has(key))
      context.get(key)(model);
    context.set(key, model);
  }
  console.log("GET MODEL ", context.get(key));
  return context.get(key);
}

export function clearModel(key) {
  if (models.hasOwnProperty(key))
    delete models[key];
}

function Formixer(form) {
  this.form = form;

  this.validate = function () {
    let isValid = false;
    this.form.validateFields().then(v => isValid = true)
    return isValid;
  };

  this.submit = function () {

  };

  this.mutate = function (state, validate) {
    if (validate)
      this.validate();

    console.log("FORM ERROR", form.getFieldsError());
    if (form.isFieldsTouched()) {
      const mutated = this.form.getFieldsValue(true);
      const node = state.node;
      const data = state.source;
      for (const key in mutated) {
        node.mutate(key, mutated[key], data);
      }
    }
  }
}
*/
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
  }

  this.Prepend = function (block, key) {
    this.blocks.unshift(block);
    console.log("FLOW PREPEND", block, this.blocks);
    if (key)
      this.map[key] = block;
  }

  this.remove = function (token, emitter) {
    this.blocks = this.blocks.filter((block) => { return (token === null || block.token !== token) && (emitter === undefined || block.emitter !== emitter) });
    return this.blocks.length === 0;
  }

  //TODO: implementare supporto ordine esecuzione
  this.run = async function (value, data, params, context, emitter, model, resolve, reject) {
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

    console.log("FLOW RUNNING", running, this.blocks);
    if (running.length === 0)
      return resolve(null);

    let result; 
    for (let k = 0; k < running.length; k++) {
      let bf = false;
      result = running[k].action.apply(null, [value, params]);
      console.log("FLOW-RESULT", result);
      if (!result) continue;
      else if (result instanceof Promise){
        result = await result;
        //result.then((r)=> { if(r instanceof breakFlow)  bf = true;  debugger;} )
      }
      if ( bf || result instanceof breakFlow || result instanceof Error) {
        reject(result);
        break;
      }
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
  this.Subscribe = function (intent, action, emitter, context, condition, model, token) {
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

    if (typeof action === 'function')
      flow.Append({ action: action, context: context, emitter: emitter, condition: condition, model: model, token: token });
    else {
      if (action.hasOwnProperty("before"))
        flow.Prepend({ action: action.before, before: true, context: context, emitter: emitter, consition: condition, model: model, token: token });
      if (action.hasOwnProperty("after"))
        flow.Append({ action: action.after, context: context, emitter: emitter, consition: condition, model: model, token: token });
    }
  };

  this.Publish = function (intent, value, data, parameters, context, emitter, model) {
    console.log("INTENT", intent, value, data, parameters, context, emitter, model, this.intents);
    //if (data === undefined) data = {};
    if (this.intents[intent]) {
      /**
       * @type {Flow}
       */
      const flow = this.intents[intent];
      console.log("FLOW", intent, flow);
      return new Promise(function (resolve, reject) {
        flow.run(value, data, parameters, context, emitter, model, resolve, reject);
      });
    }
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

export function Context(name) {
  //DataContext.call(this, name);
  this.name = name;
  this.forms = {};
  this.models = new Map();
  this.model = new Model(name);
  this.graphs = new Set();
  /**
   * 
   * @param {Graph} graph 
   */
  this.registerGraph = function (key) {
    if (!this.graphs.has(key))
      this.graphs.add(key);
  }

  this.registerForm = function (name, form) {
    this.forms[name] = form;
  }

  this.getForm = function (name) {
    return this.forms[name];
  }
/**
 * 
 * @param {function | string} mkey 
 * @returns {Model}
 */
  this.getModel = function (mkey, data) {
    if (!this.models.has(mkey)) {
      const m = new Model(this.name, mkey, this);
      mkey(m, data);
      this.models.set(mkey, m);
    }
    return this.models.get(mkey);
  }

  this.dispose = function () {
    for (let item of this.graphs.values()) {
      DataGraph.unregisterGraph(item);
    }
    messenger.UnscribeContext(this.name);
    console.log("CONTEXT DISPOSE", this.name);
  }
}

/*export function VistaApp() {
  Context.call(this);
  this.user = { type: 'guest' };
}*/

//export const VistaApp = { context: new Context("App"), user: { type: 'guest' } };

