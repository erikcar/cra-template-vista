//import { Apix } from "@webground/core";
//import axiosChannel from "@webground/core";
import { SqlGraph } from "./interpreters/ISql";
import { checkGroup, checkToken, GraphParser, searchData } from "./GraphSupport";

const Apix = {};
const axiosChannel = {};

function EmptyData() {
}

function Entity(schema) {
  this.schema = schema; // key -> Link || defaultSchema
  this.relations = null;
  this.sources = new Set();
  this.etype = schema.etype;
  this.index = 0;

  this.shareNode = function (node) {
    console.log("ENTITY SHARE SOURCE", this.etype, node.name, node.source, node.sourceName());
    if (!this.sources.has(node))
      this.sources.add(node);
  }

  this.unshareNode = function (node) {
    console.log("ENTITY UNSHARE SOURCE", this.etype, node.name, node.source, node.sourceName());
    this.sources.delete(node);
  }

  this.nextIndex = function () {
    return --this.index;
  }

  this.syncronize = function (item) {
    console.log("SYNC SOURCES", this.sources);
    let source;
    for (const key in this.sources) {
      source = this.sources[key];
      if (source instanceof GraphNode) {
        console.log("SYNC SOURCE", key, source);
        source.syncronize(item);
      }
    }
  }

  this.clear = function () {
    for (const key in this.sources) {
      if (Object.hasOwnProperty.call(this.sources, key)) {
        const obs = this.sources[key].observers;
        let active = false;
        for (let i = 0; i < obs.length; i++) {
          if (obs[i].active) {
            active = true;
            break;
          }
        }
        if (!active) {
          this.removeSource(key);
        }
      }
    }
  }
}

export function Graph(query, params, context) {
  /**
   * @type {GraphNode}
   */
  this.root = null;
  this.query = query;
  this.interpreted = null;
  this.params = params;
  this.typedef = null;
  this.parameters = null;
  this.context = context;
  this.uid = null;
  this.key = 0; //Deve essere string perchè non si può rischiare due risultati diversi
  this.keyp = 0;
  this.nonQuery = false;

  /**
   * @type {number}
   * Cache strategy of Graph Source. Default rule clean data source when no observer are observing graph.
   */
  this.cacheRule = 0;

  this.getKey = function () {
    if (this.root)
      return this.root.getKey()
    else
      throw new Error("getKey error: Graph not parsed.")
  }

  this.parse = function () {
    if (!this.query) return false;
    if (this.root === null) {
      this.root = GraphParser(this);
      this.share();
      DataGraph.registerGraph(this);
    }
    return true;
  };

  this.share = function () {
    this.root.traverse((node) => {
      DataGraph.shareNode(node);
    }, true);
  }

  this.unshare = function () {
    this.root.traverse((node) => {
      DataGraph.unshareNode(node);
    }, true);
  }

  this.absorb = function (graph) {
    if (graph.root && this.root) {
      this.root.observers = this.root.observers.concat(graph.root.observers);
      console.log("ABSORB",  graph.root.observers, this.root.observers);
    }
  }

  this.ExecuteQuery = (option) => {
    if (!this.parse())
      return Promise.reject("Query non impostata o formalmente errata.")

    const root = this.root;
    let table = DataGraph.getEntity(root.etype);
    option = DataGraph.formatOption(option, table);
    let int = option.interpreter || DataGraph.getInterpreter(option.etype);
    this.interpreted = int.translate(this);

    console.log("EXECUTE QUERY ", root.condition, this.interpreted, this.typedef, this.parameters, option.op);

    let ds = table.getNode(root.name || DataGraph.config.defaultSource || "data");
    //Come confronto condition???
    if (ds.Equal(root)) //Non rendirizzo di nuovo è la stesso source
    {
      //deve avere stesse condizioni e stessa struttura
      ds.notify(root.condition, ds.source);//???
      return Promise.resolve(ds.source);
    }
    else {
      let data = { interpreted: this.interpreted, typedef: this.typedef };
      if (this.parameters)
        data.parameters = this.parameters;
      return Apix.call(option.dataOp, data, option).then((result) => {
        console.log("DATA REQUEST" + root.etype + "." + root.name + " RESULT:", result);
        root.setSource(result.data);
        /*root.traverse((node) => {
          DataGraph.setSource(node);
        }, true);*/
        //Creare DataSource da risultato e graph
        //Devo assicurarmi di rimuovere i dati quando vista viene smontata
        return result.data;
      }, er => console.log("ERROR Graph ExecuteQuery", er));
    }
  };

  this.ExecuteApi = function (option) {
    if (!this.parse())
      return Promise.reject("Struttura Graph non impostata o formalmente errata.");

    const root = this.root;
    let table = DataGraph.getEntity(root.etype);
    option = DataGraph.formatOption(option, table);
    return Apix.call(option.apiUrl + root.name, this.params, option).then((result) => {
      console.log("DATA REQUEST" + root.etype + "." + root.name + " RESULT:", result);
      //root.source = result.data;
      root.traverse((node, source) => {
        if (node.isRoot())
          node.source = source;
        else if (source)
          node.source = source[node.name];

        console.log("EXECUTE API NODE", node, source);
        node.notify();
      }, true, result.data);
      //Creare DataSource da risultato e graph
      //Devo assicurarmi di rimuovere i dati quando vista viene smontata
      return result.data;
    }, er => console.log("ERROR Graph ExecuteQuery", er));
  };

  this.clear = function () {
    //Clear DataSource Three
    DataGraph.unregisterGraph(this);
  };

  this.isParentOf = function (ancestor, node) {
    return node && ancestor.hasOwnProperty(node.name) && !ancestor.hasOwnProperty("__ancestor__");
  };

  this.findParent = function (ancestor, node) {
    if (this.isParentOf(ancestor, node))
      return ancestor;

    if (ancestor.hasOwnProperty("__ancestor__")) {
      //return this.createParentOf(ancestor, ancestor.__ancestor__, node);
      const p = node.path.split('.');
      node = ancestor.__ancestor__ || this.root;
      let parent, isCollection;

      for (let k = 0; k < p.length - 1; k++) {
        isCollection = node.isCollection;
        node = node.getChild(p[k]);
        parent = ancestor[p[k]];

        if (isCollection) {
          if (!parent) {
            parent = [];
            ancestor[p[k]] = parent;
          }
          ancestor = node.newItem(ancestor); //Passo ancestor come parent e poi al return diventa il nuovo item creato
          parent.push(ancestor);
        }
        else {
          if (!parent) {
            parent = node.newItem(ancestor);
            ancestor[p[k]] = parent;
          }
          ancestor = parent;
        }
      }

      return ancestor;
    }
    else {
      //Potrei provare a fare ricerca se non ci fosse nessuno node isCollction...
      return null;
    }
  };

  if (query)
    this.parse();
}

export function ExecuteQuery(query, params, relations) {
  return new Graph(query, params, relations).ExecuteQuery();
}

export function ExecuteApi(query, params, relations) {
  return new Graph(query, params, relations).ExecuteApi();
}

export const LinkDirection = { DOWN_WISE: 'd', UP_WISE: 'u', BIDIRECTIONAL: 'b' };

export function GraphLink(pk, fk, direction, association) {
  this.pk = pk;
  this.fk = fk;
  this.direction = direction;
  this.association = association;
}

export function BottomLink(pk, fk, direction, association) {
  GraphLink.call(this, pk, fk, direction, association);
  /**
   * 
   * @param {*} parent 
   * @param {*} child 
   * @param {GraphNode} node 
   */
  this.apply = function (parent, child, node) {
    const link = node.link;
    const schema = node.parent; //node.parent.schema;
    if (parent.id <= 0) {
      child.__tempkey = {};
      child.__tempkey[link.fk] = parent.id;
    }
    if (schema.identity) {
      node.mutate(link.fk, parent[link.pk], child);
    }
    else {
      const keys = link.pk.split(',');
      let field;
      for (let k = 0; k < keys.length; k++) {
        field = keys[k];
        node.mutate(field + schema.etype, parent[field], child);
      }
    }
    child.__linked = true;
  }
}

export function TopLink(pk, fk, direction, association) {
  GraphLink.call(this, pk, fk, direction, association);
  this.apply = function (parent, child, node) {
    const link = node.link;
    if(child.id<1){
      child.__tempkey = {};
      child.__tempkey[link.fk] = parent.id;
    }

    if (node.identity) {
      node.parent.mutate(link.fk, child[link.pk], parent);
    }
    else {
      const keys = link.pk.split(',');
      let field;
      for (let k = 0; k < keys.length; k++) {
        field = keys[k];
        node.mutate(field + node.etype, child[field], parent);
      }
    }

    child.__linked = true;
  }
}

export function DoubleLink(pk, fk, direction, association) {
  GraphLink.call(this, pk, fk, direction, association);
  this.apply = function (parent, child, node) {
    const link = node.link;
    const linked = {};
    const mutation = {};
    linked.tempkey = {};

    if (parent.id < 1)
      linked.tempkey[link.pk] = parent.id;

    mutation[link.pk] = parent.id;

    if (child.id < 1)
      linked.tempkey[link.fk] = child.id;

    mutation[link.fk] = child.id;
    linked.mutated = mutation;

    child.__linked = linked;
  }
}

export function DataSource(source, node, enode) {
  this.data = source;
  /**
   * @type {GraphNode}
   */
  this.node = node || new GraphNode("temp");
  this.enode = enode;

  this.get = function (name) {
    return new DataSource(this.data ? this.data[name] : null, this.node?.getChild(name))
  }

  this.getData = function (path) {
    let d = null;
    if (this.data) {
      d = path ? this.data[path] : this.data;
      if (Array.isArray(d)) d = [...d]; else d = { ...d };
    }
    console.log("DS GET DATA", d);
    return d;
  }

  this.discendant = function (path) {
    return this.node ? this.node.discendant(path)?.datasource : null;
  }

  this.clear = function(){
    if(this.node && this.data){
      //debugger;
      this.node.traverse((node, data)=>{
        if(data){
          if (!Array.isArray(data))
            data = [data];
          for (let k = 0; k < data.length; k++) {
            node.Mutation.delete(data[k].id); 
          }
        }
      }, true, this.data)
    }
  }
}

export function DataSourceGroup(source) {
  if (source) {
    for (const key in source) {
      if (Object.hasOwnProperty.call(source, key)) {
        this[key] = source[key] instanceof DataSource ? source[key] : new DataSource(source[key]);
      }
    }
  }
}

export function GraphNode(name, uid, parent, graph) {
  this.name = name;
  this.uid = uid || 0; //(graph.uid << 16) & uid;
  this.parent = parent;
  this.graph = graph;
  //this.source = null;
  this.datasource = new DataSource(null, this);
  this.condition = new nodeCondition();
  this.children = null;
  this.observers = [];
  this.isCollection = false;
  //this.mutation = undefined;

  /**
   * Indexing è dedicato a mutation, questo potrebbe generare confusione con implementazione futura di indicizzazione di source.
   */
  this.Mutation = new Map();

  Object.defineProperty(this, "source", {
    get() {
      return this.datasource.data; //Remote lib check for null???
    },
    set(v) {
      this.datasource = new DataSource(v, this)
    }
  });

  this.etype = null;
  this.identity = true;
  this.primarykey = "id";
  this.link = {};
  this.link.direction = 'd';
  this.path = parent ? parent.path + (parent.isRoot() ? "" : ".") + name : "";
  //this.linkDirection = 1;

  this.joined = null;
  this.fields = "";
  this.orderby = null;
  this.groupby = null;
  this.lastUdpated = new Date();

  this.isRoot = function () { return this.uid === 0 };
  this.getKey = function () { return this.etype + '.' + this.name; }
  this.sourceName = function () { return this.uid === 0 ? this.name : (this.name + "_" + this.graph.uid + "_" + this.uid); }

  this.addField = function (field) {
    this.fields += this.fields !== "" ? "," + field : field;
  }
  this.orderBy = function (field) {
    this.orderby = this.orderby ? this.orderby + "," + field : field;
  };
  this.groupBy = function (field) {
    this.groupby = this.groupby ? this.groupby + "," + field : field;
  };
  this.addCondition = function (c) {
    if (!this.condition) { this.condition = new nodeCondition(); }
    this.condition.add(c)
  };
  this.push = function (c) {
    if (!this.children) { this.children = []; }
    this.children.push(c);
  };

  this.setSchema = function (schema) {
    this.etype = schema.etype;
    this.primarykey = schema.primarykey;
    this.identity = schema.identity;
  }

  this.getSchema = function (schema) {
    return { etype: this.etype, primarykey: this.primarykey, identity: this.identity }
  }
  /**
 * This callback is displayed as a global member.
 * @callback traverseCallback
 * @param {GraphNode} node
 */

  /**
   * 
   * @param {traverseCallback} callback 
   * @param {boolean} deep  
   * @param {boolean} deep 
   * @returns void
   */
  this.traverse = function (callback, deep, source, ancestor, generate) {
    callback(this, source, ancestor);
    if (!this.children) return;
    for (let k = 0; k < this.children.length; k++) {
      if (generate)
        source[this.children[k].name] = {};
      if (deep) {
        if (source) {
          if (Array.isArray(source)) {
            for (let j = 0; j < source.length; j++) {
              const parent = source[j];
              this.children[k].traverse(callback, deep, parent[this.children[k].name], parent, generate);
            }
          }
          else
            this.children[k].traverse(callback, deep, source[this.children[k].name], source, generate);
        }
        else
          this.children[k].traverse(callback, deep, null, source, generate);
      }
      else
        callback(this.children[k], source ? source[this.children[k].name] : null, source, generate);
    }
  }

  this.getChild = function (name) {
    if (!this.children)
      return null;

    for (let k = 0; k < this.children.length; k++) {
      if (this.children[k].name === name)
        return this.children[k];
    }

    return null;
  }

  this.discendant = function (path) {
    if (!path)
      return null;
    console.log("NODE DISCENDANT", path)
    const p = path.split('.');
    let n = this;
    for (let k = 0; k < p.length; k++) {
      n = n.getChild(p[k]);
      console.log("NODE DISCENDANT CHILD", n);
      /*if(!n)
        error handle*/
    }

    return n;
  }
  /**
   * 
   * @param {GraphNode} node 
   * @returns {boolean} 
   */
  this.Equal = function (node) {
    if (this.condition.value !== node.condition.value)
      return false;

    if (!this.children) {
      return (!node.children)
    }

    if (this.children.length !== node.children.length)
      return false;

    for (let k = 0; k < this.children.length; k++) {
      if (!this.children[k].Equal(node.children[k]))
        return false;
    }

    return true;
  }

  /**
   * 
   * @param {object} item key value object of fields to set on new item
   * @param {*} parent 
   * @param {boolean} excludeAdd 
   * @returns 
   */
  this.formatData = function (data, parent) {
    console.log("DEBUG-NODE", data);
    if (!data) return;

    if (!Array.isArray(data))
      data = [data];

    const nolink = data.hasOwnProperty("__nolink__");

    for (let k = 0; k < data.length; k++) {
      const source = data[k];
      let mutated = source.hasOwnProperty("__mutation");

      if (!source.hasOwnProperty("id")) {
        source.id = DataGraph.getEntity(this.etype).nextIndex();

        if (!mutated) {
          source["__mutation"] = { id: source.id, mutated: {}, count: 0 };
          mutated = true;
        }

        for (const key in source) {
          if (Object.hasOwnProperty.call(source, key) && !this.getChild(key) && key !== "__mutation" && key !== "id") {
            source["__mutation"].mutated[key] = source[key];
            source["__mutation"].count++;
          }
        }

        /*if (mutated) {
          source["__mutation"].mutated.id = source.id;
          source["__mutation"].count++;
        }
        else {
          source["__mutation"] = { id: source.id, mutated: { id: source.id }, count: 1 };
          mutated = true;
        }*/
      }

      if (mutated)
        this.Mutation.set(source.id, source); // Sempre vero che va aggiunto o solo se mutated?

      if (parent && !nolink) //è possibile capire se ha già link impostato? es quando aggiungo da un node o query dove data è già formattata
        this.link.apply(parent, source, this);

      console.log("DEBUG-NODE", parent, source, this.link, this);
    }
  }

  /**
   * Solo per settare root source
   * @param {*} value 
   * @param {*} parent 
   * @param {boolean} format sia per relazioni che per registrare mutation
   * @param {*} notNotify 
   */
  this.setSource = function (value, parent, format, notNotify) {
    
    this.clearMutation();

    if (format) {
      this.traverse((node, data, parent) => {
        node.formatData(data, parent);
      }, true, value, parent);
    }
    else
      this.formatData(value, parent);

    DataGraph.setItem(value, this, parent, true);
    /*if (this.isRoot()) {
      this.source = value;
    }
    else if (parent) {
      DataGraph.setItem(value, this, parent, true);
    }*/

    if (!notNotify) this.notify();
  }

  this.getSource = function (ancestor, path) {
    if (this.isRoot)
      return this.source;
    else if (ancestor) {
      if (path) {
        //TODO
      }
      return ancestor[this.name];
    }
    return null; //Oppure root, oppure provo se esiste path senza collection e ricavo?
  }

  this.addData = function (item, ancestor, format, notnotify) { //Root o direttamente parent?? supportare entrambi??
    
    if(!this.isCollection)
      this.clearMutation();

    if (format) {
      this.traverse((node, data, parent) => {
        node.formatData(data, parent);
      }, true, item, ancestor);
    }
    else
      this.formatData(item, ancestor);

    DataGraph.setItem(item, this, ancestor);

    if (!notnotify)
      this.notify(); //Optional??? Come cambia source nel caso collection affichè ci sia update in useState...

    console.log("DEBUG-NODE ADD SOURCE", item);
  }

  this.absorb = function (node) {
    /*this.traverse((node, data, parent) => {
      node.formatData(data, parent);
    }, true, item, parent);*/
  }

  this.mutate = function (field, value, obj) {
    const data = DataGraph.mutate(field, value, obj);
    console.log("Node Mutation result: ", data);
    if (data.mutated) {
      if (!this.Mutation.has(obj.id))
        this.Mutation.set(obj.id, obj);
    }
    else if (data.removed)
      this.Mutation.delete(obj.id);

    console.log("Node Mutating: ", this.Mutation);

    /*if (setvalue) {
      obj[field] = value;
    }*/

    return data;

    /**
    * TODO: controllo se esiste un altro node dello stesso etype che ha questa istanza in mutating
    * DataGraph.getEntity(this.etype).checkConflict(obj);
    */
  }

  this.clearMutation = function(){
    this.traverse((node) => {
      node.Mutation.clear();
    }, true);
  }

  this.checkMutation = function (item) {
    if (item && item.__mutation) {
      const obj = this.Mutation.get(item.id);
      if (!obj)
        this.Mutation.set(item.id, item);
      else if (obj !== item) {
        const m = item.__mutation.mutated;
        if (!m) return;
        const om = obj.__mutation.mutated
        for (const key in m) {
          if (Object.hasOwnProperty.call(m, key)) {
            //this.mutate(key, m[key], item);
            om[key] = m[key];
          }
        }
      }
    }
  }

  this.getMutated = function (id) {
    if (!this.mutation)
      return null;

    for (let k = 0; k < this.mutation.length; k++) {
      if (this.mutation[k].id === id);
      return this.mutation[k];
    }

    return null;
  }

  this.addMutated = function (item) {
    if (!item || !item.hasOwnProperty("id") || !item.mutated)
      return; //Oppure throw error ???

    let m;
    if (!this.mutation)
      this.mutation = [];
    else
      m = this.getMutated(item.id);

    if (m) {
      const mutated = item.mutated;
      for (const key in mutated) {
        if (Object.hasOwnProperty.call(mutated, key)) {
          m.mutated[key] = mutated[key];
        }
      }
    }
    else
      this.mutation.push(item);
  }

  this.removeMutated = function (id) {
    if (!this.mutation)
      return false;

    for (let k = 0; k < this.mutation.length; k++) {
      if (this.mutation[k].id === id) {
        this.splice.splice(k, 1);
        return true;
      }
    }

    return false;
  }
  /**
   * 
   * @param {bool} root se si desidera salvare solo mutation del node e non le mutation dei nodi discendenti
   * @returns 
   */
  this.save = function (option, root) {
    option = DataGraph.formatOption(option, this.etype);
    const data = {};/*JSON.stringify(this, (name, val) => {
      // convert RegExp to string
      if (name === "root" || name === "parent" || name === "graph" || name === "source" || name === "condition" || name === "source")
        return undefined;
      else if (name === "Mutation") {
        if (val.size < 1)
          return null; //Remote lib check for null???
        else {
          let mutation = [];
          val.forEach(function (value, key) {
            if (value.hasOwnProperty("__mutation"))
              mutation.push(value.__mutation);
          });
          return mutation;
        }
      }
      else {
        return val; // return as is
      }
    }); */ //["name","uid","children","isCollection","Mutation","etype","identity","primarykey","link","pk","fk","path","direction","id","association","mutated"]);

    this.traverse((node, source, parent) => {
      if (parent) {
        if (!parent.hasOwnProperty("children"))
          parent.children = [];
        parent.children.push(source);
        delete parent[node.name];
      }
      source.name = node.name;
      source.etype = node.etype;
      source.identity = node.identity;
      source.isCollection = node.isCollection;
      source.primarykey = node.primarykey;
      source.path = node.path;
      source.link = node.link;
      if (node.Mutation.size > 0) {
        source.Mutation = [];
        /*node.Mutation.forEach(function (value, key) {
          if (value.hasOwnProperty("__mutation"))
            source.Mutation.push(value.__mutation);
        });*/

        let mutated;
        let data;
        node.Mutation.forEach(function (value, key) {
          data = { id: value.id, tempkey: value.__tempkey, linked: value.__linked};
          mutated = value.__mutation?.mutated;
          if (mutated) {
            data.mutated = {};
            for (const key in mutated) {
              if (Object.hasOwnProperty.call(mutated, key)) {
                data.mutated[key] = value[key];
              }
            }
            source.Mutation.push(data);
          }
        });
      }
      //source.typeSChema = node.typeSChema;
    }, true, data, null, true);

    //const d = JSON.stringify(data);
    //this.graph = null;
    //this.children = null;
    console.log("SAVE Node JSON: ", data);
    option.excludeParams = true;
    return Apix.call(option.queryOp, data, option).then((result) => {
      console.log("Node Save RESULT:", result);
      this.traverse((node) => {
        node.Mutation.clear();
      }, true);
      return result;
    }, er => {
      console.log("ERROR GraphNode Save", er);
      this.traverse((node) => {
        node.Mutation.clear();
      }, true);
      //openPopup(<div >Si è verificato un errore si prega di riprovare.</div>, "Errore", "OK");
  });
  }

  this.notify = function () {
    //Da gestire caso in cui non è root
    //A: notify root node (aggiorno tutto)
    //B: risalgo su ancestor fino a che non trovo un node che è un source diretto (ovvero ha observers????) e come faccio in questo caso a fornire source da root e path
    //considerando che nel path ci possono essere delle collection?
    //Per ora non prevedo di usare un child direttamente come source, quindi aggiorno sempre da root tutto
    console.log("NOTIFY");
    if (this.isRoot() || this.source) {
      this.datasource = new DataSource(this.source, this);//{ data: this.source, node: this };
      console.log("NOTIFY ROOT", this.datasource);
      for (let i = 0; i < this.observers.length; i++) {
        this.observers[i](this.datasource);
      }
    }
    else {
      this.graph.root.notify();
    }

    this.udpated = new Date();
  }

  this.observe = function (observer) {
    console.log("Node Observer", this.sourceName())
    this.observers.push(observer);
  }

  this.unobserve = function (observer) {
    for (let i = 0; i < this.observers.length; i++) {
      if (this.observers[i] === observer) {
        this.observers.slice(i, 1);
        break;
      }
    }

    return this.observers.length === 0;
  }

  this.syncronize = function (item, ref, shouldNotify) { //Se ho chiave diversa da id? o multichiave, per ora testo con caso chiave è id
    //Da gestire se è add, update o remote
    if (!item) return;

    if (item.crud === 'ADD') {
      //Check condition
      if (!this.condition || this.condition.check(item)) {
        //Se è root faccio set altrimenti devo cercare in base a info relazione
        if (this.isRoot()) {
          DataGraph.setItem(item, this);
        }
        else {
          const result = searchData(this.graph.root.source, item.id, this.path);
          if (result) {
            DataGraph.setItem(item, this, result.parent);
          }
          else {
            //Qualche notifica???
          }
        }
      }
    }
    else if (item.crud === 'UPD') {
      const obj = searchData(this.graph.root.source, this.path.split(','), item.id); // Qui tutto il path però
      if (obj)
        DataGraph.updateItem(obj, item.mutation);
    }
    else if (item.crud === 'DEL') {
      const parent = searchData(this.graph.root.source, this.path.split(','), item.id); //oppure restituisce sia parent che ite
      if (parent)
        DataGraph.removeItem(item, this, parent);
    }
    else {
      throw new Error("Sync data on " + this.etype + "." + this.name + " crud operation: " + item.crud + " not supported.");
    }

    if (shouldNotify)
      this.notify();
  }
}

function nodeCondition() {
  this.condition = [];
  this.fcheck = null;
  this.value = "";
  this.add = function (c) {
    this.value += typeof c === 'string' ? c : (c.not ? " !(" : " ") + c.field + (jsINT[c.operator] || c.operator) + c.value + (c.not ? ") " : " ");
    this.condition.push(c);
  }

  this.check = function (item) {
    if (this.condition.length === 0)
      return true;
    return checkGroup(new checkToken(this.condition, item));
  }

  this.length = () => this.condition.length;
  this.at = index => this.condition[index];
}

const jsINT = { "&": "&&", "|": "||", "=": "==" }

export function EntitySchema(etype) {
  this.etype = etype;
  this.primarykey = "id";
  this.identity = true;
}

export function DataContext(name) {
  this.name = name;
  this.graphs = {};
  /**
   * 
   * @param {Graph} graph 
   */
  this.registerGraph = function (graph) {
    const key = graph.getKey();
    if (!key) return; // Worning for develop state?
    const g = this.graphs[key];
    if (g) {
      g.unshare();
      graph.absorb(g)
    }
    this.graphs[key] = graph;
    graph.share();
  }

  this.unregisterGraph = function (key) {
    delete this.graphs[key];
  }

  this.getGraph = function (key) { return this.graphs[key]; }
}

const DataGraph = {
  isPrefixMode: true,

  entities: {},

  channels: { default: new axiosChannel() },

  interpreters: { default: new SqlGraph() },

  schema: {},

  graphs: { uid: 0 },

  context: new DataContext("datagraph"),

  state: new Map(),

  init: function (typedef) {
    if (typedef) {
      let def = JSON.parse(typedef)
      def.forEach(t => this.getEntity(t.table).typedef = t.typedef);
    }
  },
  /**
   * 
   * @param {string | SourcePath} etype 
   * @returns {Entity}
   */
  getEntity: function (etype) {
    if (!etype) {
      etype = "__global";
    }
    if (!this.entities[etype]) {
      this.entities[etype] = new Entity(new EntitySchema(etype));
    }
    return this.entities[etype];
  },

  getESchema: function (etype) {
    return this.getEntity(etype).schema;
  },

  getSchema: function (path) { //per schema default come collection
    let name = path.schema || 'DEFAULT';
    let etype = path.etype;
    let s = this.schema[etype]?.[name];
    if (path.isCollection)
      etype = '[' + etype + ']';
    console.log("GET-SCHEMA", path, s, this.schema);
    return path.name + ': ' + (s ? s : etype + ' {*}');
  },

  setSchema: function (schema, etype, name) {
    if (!this.schema[etype])
      this.schema[etype] = {};

    this.schema[etype][name || 'DEFAULT'] = schema;
    console.log("SET-GET-SCHEMA", schema, etype, name, this.schema);
  },

  getChannel: function (etype) {
    return this.channels[etype] || this.channels.default;
  },

  setChannel: function (etype, channel) {
    this.channels[etype] = channel;

    /*if (this.tables[etype]) {
      this.tables[etype].channel = channel;
    }*/
  },

  getInterpreter: function (etype) {
    return this.interpreters[etype] || this.interpreters.default;
  },

  setInterpreter: function (etype, interpeter) {
    this.interpreters[etype] = interpeter;
  },

  registerGraph: function (graph) {
    console.log("REGISTER GRAPH", graph, this.context);
    this.context.registerGraph(graph);
  },

  unregisterGraph: function (key) {
    this.context.unregisterGraph(key);
  },

  setGlobalState: function(key, data, setter, context){
    this.state.set(key, {value:data, setter: setter, context: context});
  },

  getGlobalState: function(key){
    return this.state.get(key)?.value;
  },

  clearGlobalState: function(context){
    this.state.forEach((v, k) => {if( v && v.context === context) this.state.delete(k); } )
  },

  shareNode: function (node) {
    console.log("DG SHARE NODE")
    if (node)
      this.getEntity(node.etype).shareNode(node);
  },

  unshareNode: function (node) {
    console.log("DG SHARE NODE")
    if (node)
      this.getEntity(node.etype).unshareNode(node);
  },

  /**
   * 
   * @param {string | SourcePath} path 
   * @param {DataContext} context
   * @returns {GraphNode} 
   */
  findGraph: function (path, context) {
    let graph;
    if (!path) {
      throw new Error("Graph Path can not be null.")
    }
    path = new SourcePath(path);
    context = this.context;
    console.log("DEBUG find Graph", context, path, graph);
    graph = context.getGraph(path.value);
    console.log("DEBUG find Graph", context, path, graph);
    return graph?.root;
  },

  /**
   * @param {string | SourcePath} path 
   * @param {DataContext} context
   * @returns {GraphNode}
   */
  findOrCreateGraph: function (path, context) {
    path = new SourcePath(path);
    context = this.context;
    let root = this.findGraph(path, context);
    if (!root) {
      console.log("FIND GET SCHEMA ", path.schema, path, path.isSchema);
      if (path.isSchema)
        root = new Graph(path.schema, null, context).root;
      else
        root = new Graph(this.getSchema(path), null, context).root;
    }
    if (!root) {
      console.warn("findOrCreateGraph wrong path format.");
    }
    return root;
  },

  getSource: function (path, ancestor, apath, any) {
    const root = this.findGraph(path, any);
    if (!root) return null;
    return root.getSource(ancestor, apath);
  },

  /**
   * Deve supportare anche path annidati, nel caso source non esiste si salta set o si crea graph?
   * @param {GraphNode | String} path 
   * @param {*} data 
   * @param {*} parent 
   * @param {bool} format
   * @param {bool} notify     
   * @returns 
   */
  setSource: function (path, data, context, parent, format, notify = true) {
    console.log("DataGraph SET SOURCE:", path, data);
    /**
     * @type {GraphNode} 
     */
    let node = this.findOrCreateGraph(path, context);
    node.setSource(data, parent, format, !notify);
    return node;
  },

  addSource: function (path, data, context, parent, format, notnotify) {
    let node = this.findOrCreateGraph(path, context);
    node.addData(data, parent, format, notnotify);
  },

  setItem: function (item, node, parent, override) {
    let name;
    if (parent) {
      name = node.name;
      node = node.parent;
    }
    else {
      parent = node;
      name = "source";
    }

    if (node.isCollection && !override) {//in teoria non dovrebbe esistere questa ipotesi
      if (!parent[name]) parent[name] = [];
      parent[name].push(item);
    }
    else
      parent[name] = item;

    console.log("DATA-DEBUG", item, node, name);
  },

  updateItem: function (target, source) {
    if (source.hasOwnProperty("changed")) {
      const changed = source.changed;
      for (const key in changed) {
        if (Object.hasOwnProperty.call(changed, key)) {
          target[key] = changed[key];
        }
      }
    }
  },

  deleteItem: function (item, node, parent) {
    const el = parent[node.name];
    if (Array.isArray(el)) {
      for (let k = 0; k < el.length; k++) {
        if (el[k].id === item.id) {
          el.splice(k, 1);
          break;
        }
      }
    }
    else
      parent[node.name] = null;
  },

  mutate: function (field, value, obj) {
    console.log("DataGraph Mutate: ", field, value, obj)
    const result = { mutated: false };
    let mutation = obj.__mutation;
    if (obj[field] === value) { return result; }
    else if (mutation && mutation.mutated[field] === value) {
      delete mutation.mutated[field];
      mutation.count--;

      if (mutation.count === 0) {
        delete obj.__mutation;
        result.removed = true;
      }
    }
    else {
      if (!mutation) {
        mutation = { id: obj.id, mutated: {}, count: 0 };
        obj.__mutation = mutation;
      }

      if (!mutation.mutated.hasOwnProperty(field)) {
        mutation.mutated[field] = obj[field];//value;
        mutation.count++;
      }

      result.mutated = true;
      obj[field] = value;
    }

    return result;
  },

  formatOption: function (opt, table) {
    if (table) {
      if (!table instanceof Entity)
        table = DataGraph.getEntity(table)
    }
    else
      table = {};
    opt = opt || {};
    //table = table || {};
    //opt.parser = opt.parser || table.parser || this.config.parser || Apix.parser;
    opt.dataOp = opt.dataOp || table.dataOp || this.dataOp || Apix.dataOp;
    opt.queryOp = opt.queryOp || table.queryOp || this.queryOp || Apix.queryOp;
    opt.apiUrl = opt.apiUrl || Apix.apiUrl;
    opt.channel = opt.channel || DataGraph.getChannel(table.etype) || this.channel || Apix.channel;
    for (let key in this.config) {
      if (!opt.hasOwnProperty(key)) {
        opt[key] = this.config[key];
      }
    }
    console.log("FORMATTED Option: ", opt);
    return opt;
  },
};

Object.freeze(DataGraph);

/**
 * 
 * @param {string | SourcePath} path 
 * @returns 
 */
export function SourcePath(path) {
  if (path instanceof SourcePath)
    return path;

  this.context = null;
  this.schema = 'DEFAULT'
  this.isSchema = path.indexOf(':') > -1;

  if (this.isSchema) {
    this.schema = path;
    path = path.split(':');
    let name = path[0].trim();
    let i = path.split('@');
    if (i.length > 1) {
      this.context = i[1];
    }
    this.name = name = i[0];

    name = path[1];
    let index = 0;
    while (index < name.length - 1 && name[index] !== '(' && name[index] !== '{') {
      index++;
    }
    name = name.substring(0, index).trim();
    this.etype = name[0] === '[' ? name.substring(1, name.length - 2) : name;
  }
  else {
    if (path.indexOf(':') > -1)
      this.isCollection = path.charAt(0) === '[';
    let i = path.split('@');
    if (i.length > 1) {
      this.context = i[1];
    }
    path = i[0];
    i = path.split('#');
    if (i > 1) {
      this.schema = i[1];
    }
    path = i[0];
    path = path.split('.');
    if (path.length === 1)
      path.push(this.isCollection ? 'list' : 'item');
    this.etype = this.isCollection ? path[0].substring(1, path[0].length - 2) : path[0];
    this.name = path[1];
  }

  this.value = this.etype + '.' + this.name;
}

/**
 * Proxy for Entity data source istance to trace mutation on node
 * e se setto un target che rappresenta un identity diverso?
 * @param {GraphNode} node 
 * @param {*} target 
 */
export function DataProxy(node, target, formatter) {
  if (!target && node)
    this._target = node.source;
  else
    this._target = target;

  if (!this._target) //Oppure accetto ma sul set target se non ho definition la eseguo
    throw new Error("DataProxy require a target on initialization.");
  else if (!this._target.__mutated)
    this._target.__mutated = {};

  this.data = null;
  this.formatter = formatter;
  this.values = {};

  Object.defineProperty(this, "target", {
    get() { return this._target; },
    set(value) {
      this._target = value;
      if (this._node)
        this._node.checkMutation(value);
      //Resetto values
      this.values = {};
      if (value) {
        for (const key in value) {
          if (Object.hasOwnProperty.call(value, key)) {
            //Inizializzo subito values => devo farlo anche quando cambio target
            this.values[key] = this.formatter ? this.formatter.convertFrom(value[key], key) : value[key];
          }
        }
      }
    }
  });

  this._node = null;

  Object.defineProperty(this, "node", {
    get() { return this._node; },
    set(value) {
      this._node = value;
      if (value)//this.data && this.data.count > 0)
        value.checkMutation(this._target);//node.addMutated(this.data);
    }
  })

  //this.target = target;
  this.node = node;
  this.values = {};

  //Potrei avere field presenti in mutation del target e non nel target object stesso => dovrei apllicare anche a quei field definizione?
  for (const key in target) {
    if (Object.hasOwnProperty.call(target, key)) {
      //Inizializzo subito values => devo farlo anche quando cambio target
      this.values[key] = this.formatter ? this.formatter.convertFrom(target[key], key) : target[key];

      Object.defineProperty(this, key, {
        get: function () {
          if (!this._target)
            return null;

          if (!this.values.hasOwnProperty(key) && this._target.__mutated.hasOwnProperty(key)) {
            if (this.formatter) {
              this.values[key] = this.formatter.convertFrom(this._target.__mutated[key], key);
            }
            else
              this.values[key] = this._target.__mutated[key];
          }

          return this.values[key];
        },
        set: function (value) {
          if (!this._target)
            return;

          let data;

          if (this._node)
            data = this._node.mutate(key, this.formatter ? this.formatter.convertTo(value, key) : value, this._target);
          else
            data = DataGraph.mutate(key, this.formatter ? this.formatter.convertTo(value, key) : value, this._target);

          if (data.mutated)
            this.values[key] = value;
          else if (data.removed && this.values.hasOwnProperty(key))
            delete this.values[key];
        }
      });
    }
  }

  this.compare = function (data) {
    if (!this.data)
      return;

    for (const key in data) {
      if (Object.hasOwnProperty.call(this.data.target, key)) {
        this[key] = data[key];
      }
    }
  }
}

export { DataGraph };

