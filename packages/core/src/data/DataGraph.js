import { Apix, axiosChannel, isString } from "@essenza/webground";
import { SqlGraph } from "./interpreters/ISql";
import { checkGroup, checkToken, GraphParser, searchData } from "./GraphSupport";
//import { openPopup } from "../components/Popup";


function EmptyData() {
}

function Entity(schema) {
  this.schema = schema; // key -> Link || defaultSchema
  this.relations = null;
  this.sources = new Set();
  this.etype = schema.etype;
  this.index = 0;

  this.getNode = function (name, context, any) {
    let ds = this.sources[context ? name + '@' + context : name];
    console.log("Entity GET NODE", this.etype, name, context, ds, any);
    if (!ds && any && context)
      ds = this.source[name];
    return ds;
  }

  this.shareNode = function (node) {
    console.log("ENTITY SHARE SOURCE", this.etype, node.name, node.source, node.sourceName());
    if (!this.sources.has(node))
      this.sources.add(node);
  }

  this.unshareNode = function (node) {
    console.log("ENTITY UNSHARE SOURCE", this.etype, node.name, node.source, node.sourceName());
    this.sources.delete(node);
  }

  /**
   * Questo deve farlo direttamente node
   * @param {GraphNode} node 
   */
  this.setSource = function (node, context) {
    console.log("SET SOURCE", this.etype, node.name, context, node.source, node.sourceName());
    let name = context ? node.name + '@' + context : node.name;//node.sourceName();
    this.sources[name] = node;
    /**
     * @type {GraphNode}
     */
    let ds = this.sources[name];

    console.log("SET SOURCE NAME", name, ds);

    if (ds && node.isRoot()) { //&& node.isRoot()
      node.observers = ds.observers;
      //this.sources[name] = node;
      //Devo fare clear di node mutation per il source? ovvero remove source e mutaion map
      //ds.setSource(node.source);
      console.log("SET SOURCE NOTIFY")
      node.notify();
    }

    this.sources[name] = node;
  }

  this.removeSource = (name) => {
    let sources = this.sources;
    let ds = sources[name];
    if (ds) {
      ds.traverse(function (node) {
        DataGraph.getEntity(node.etype).source[node.sourceName()] = null;
      }, true);

      if (ds.isRoot())
        DataGraph.unregisterGraph(ds.graph);

      this.sources[name] = null; //Delete property?
    }
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

  this.subscribe = function (name, observer) {
    console.log("ENTITY SUBSCRIBE ", name, this);
    this.getNode(name).observe(observer);
  }

  this.unscribe = function (name, observer, permanent) {
    let empty = this.getNode(name).unobserve(observer);
    console.log("UNSCRIBE ", name, permanent)
    if (empty && !permanent) {
      this.removeSource(name);
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

  this.createGraph = function (sourceName) {
    let graph = new Graph();
    let query = (sourceName || "") + ": " + this.etype + "{*";
    if (this.schema) {
      for (const key in this.schema) {
        if (key !== "primarykey") {
          query += ", " + key + ": " + this.schema[key].etype + "(*)";
        }
      }
    }
    query += "}";
    graph.query = query;
    return graph;
  };
}

export function Graph(query, params, permanent, context, deep) {
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
  this.permanent = permanent;
  this.uid = null;
  this.key = 0; //Deve essere string perchè non si può rischiare due risultati diversi
  this.keyp = 0;
  this.nonQuery = false;
  this.isCollection = false;
  this.deep = deep;
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
      this.root.observers = graph.root.observers;//this.root.observers.concat(...graph.root.observers);
      console.log("ABSORB", graph.root.observers, this.root.observers);
    }
  }

  this.GenerateSource = function (option) {
    this.parse();
    if (this.parameters) {
      //Calculate keyp
    }
    //return new dataRequest2(this, option).Execute().then(r => this.root.source = r);
    //return this.root.source;
  }
  /**
   * 
   * @param {*} etype 
   * @param {*} name 
   * @param {*} isCollection 
   * @param {*} condition 
   * @param {*} complete 
   * @param {*} schema 
   * @returns {Graph}
   */
  this.fromSchema = function (etype, name, isCollection, condition, complete, schema) {
    this.isCollection = isCollection;
    this.deep = complete;
    this.condition = condition;
    /*if(complete){
      this.query = DataGraph.getSchema(etype, schema);
    }
    else{
      const s = DataGraph.getSchema(etype, schema);
      console.log("FROM SCHEMA", s);
      this.query = name + ": " + (isCollection? '[' + etype + ']' : etype) + " " + (condition? "(" + condition + ")" : "") + "{";
      for (const key in s) {
        if (key.indexOf("__") === -1) {//Object.hasOwnProperty.call(s, key)
          if(isNaN(s[key])){
            if(complete) continue;
          }
          else
            this.query += key + ",";
        }
      }
  
      this.query = this.query.substring(0, this.query.length-1) + '}';
    }*/

    this.query = DataGraph.getSchema(new SourcePath(name + ":" + etype), schema);
    console.log("FROM SCHEMA", this.query);
    return this;
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
    if (ds && ds.Equal(root)) //Non rendirizzo di nuovo è la stesso source
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
      }, er => { console.log("ERROR Graph ExecuteQuery", er); throw er; });
    }
  };

  this.ExecuteApi = function (option) {
    if (!this.parse())
      return Promise.reject("Struttura Graph non impostata o formalmente errata.");

    const root = this.root;
    let table = DataGraph.getEntity(root.etype);
    option = DataGraph.formatOption(option, table);
    return Apix.call(option.apiUrl + (option.apiOp || root.name), this.params, option).then((result) => {
      console.log("DATA REQUEST" + root.etype + "." + root.name + " RESULT:", result);
      const source = result.data;
      root.source = source;
      root.notify();

      if (option.many && root.children) {
        let graph;
        let node;
        for (let k = 0; k < root.children.length; k++) {
          node = root.children[k];
          graph = new Graph();
          graph.root = node;
          DataGraph.registerGraph(graph);
          node.source = source[node.name];
          node.notify();
        }
      }
      /*root.traverse((node, source) => {
        if (node.isRoot())
          node.source = source;
        else if (source)
          node.source = source[node.name];

        console.log("EXECUTE API NODE", node, source);
        node.notify();
      }, true, result.data);*/
      //Creare DataSource da risultato e graph
      //Devo assicurarmi di rimuovere i dati quando vista viene smontata
      return result.data;
    }, er => { console.log("ERROR Graph ExecuteQuery", er); throw er; });
  };

  this.ShareSource = function (option) {
    let source = this.GenerateSource(option);
    if (this.root.name !== "") {
      let root = this.root;
      DataGraph.getEntity(root.etype).setSource(root.name, this.getKey(), root);
      root.traverse(function (node) {

      }, true);
    }
    return source;
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

  /*this.createParentOf = function (ancestor, root, node) {

    if (!ancestor || this.isParentOf(ancestor, node))
      return ancestor;

    const p = node.path.split('.');
    node = root || this.root;
    let parent, isCollection;
    for (let k = 0; k < p.length - 1; k++) {
      //node = node.getChild(p[k]);
      parent = ancestor[p[k]];
      if (parent) { //se non esiste nel path un object lo creo se schema lo permette altri break;
        if (Array.isArray(parent)) {
          node = node.getChild(p[k]);
          ancestor = node.newItem(ancestor); //Passo ancestor come parent e poi al return diventa il nuovo item creato
          parent.push(ancestor);
        }
        else
          ancestor = parent;
      }
      else {
        node = node.getChild(p[k]);
        if (node.isCollection) {
          parent = [];
          ancestor[p[k]] = parent;
          ancestor = node.newItem(ancestor); //Passo ancestor come parent e poi al return diventa il nuovo item creato
          parent.push(ancestor);
        }

        parent = node.newItem(ancestor);
        ancestor[p[k]] = parent;
        ancestor = parent;
      }
    }
  }*/
}

export function ExecuteQuery(query, params, relations) {
  return new Graph(query, params, relations).ExecuteQuery();
}

export function ExecuteApi(query, params, many, permanent) {
  /*return nonQuery
    ? Apix.call(query, params)
    : new Graph(query, params).ExecuteApi();*/
  return new Graph(query, params, permanent).ExecuteApi({ many: many });
}

export const GraphSchema = {
  Create: function (query, schema) {
    let path = new SourcePath(query); // gestire anche condition con path?
    const graph = new Graph(DataGraph.getSchema(path, schema))
    graph.isCollection = path.isCollection;
    graph.deep = true;
    return graph;
  },

  CreateSource: function (etype, item) {
    const graph = new Graph().fromSchema(etype, "root", Array.isArray(item), null, true);
    graph.parse();
    const node = graph.root;
    node.addData(item, null, true);
    return new DataSource(item, node);
  }
}

export const Link = { DOWN_WISE: 'd', UP_WISE: 'u', BIDIRECTIONAL: 'b' };

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
    if (child.id < 1) {
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

DataSource.From = function (etype, item) {
  const graph = new Graph().fromSchema(etype, "root", Array.isArray(item), null, true);
  graph.parse();
  const node = graph.root;
  node.addData(item, null, true);
  return new DataSource(item, node);
}

DataSource.FromNode = function (data, node) {
  node.formatData(data);
  return new DataSource(data, node);
}

export function DataSource(source, node, parent) {
  this.data = source;
  /**
   * @type {GraphNode}
   */
  this.node = node || new GraphNode("temp");

  this.parent = parent;

  this.get = function (name, predicate) {
    if (!name) {
      return this.clone();
    }

    let data = this.data ? this.data[name] : null;

    if(predicate)
      data = this._filter(predicate, data);

    return new DataSource(data, this.node?.getChild(name), this.data);
  }

  this._filter = function (predicate, data) {
    if (!data) return data;
    if (!Array.isArray(data))
      data = [data];

    return data.filter(predicate);
  }

  this.filter = function (predicate) {
    return new DataSource(this._filter(predicate, this.data), this.node, this.parent);
  }

  this.getAt = function (index) {
    if (this.data && Array.isArray(this.data) && this.data.length > index) {
      return new DataSource(this.data[index], this.node, this.parent);
    }
    return this.clone();
  }

  this.map = function (callback) {
    let ar;
    if (this.data) {
      let data = this.data;
      if (!Array.isArray(data)) {
        data = [this.data];
      }
      ar = [];
      for (let k = 0; k < data.length; k++) {
        ar.push(callback(new DataSource(data[k], this.node, this.parent), k));
      }
    }
    return ar;
  }

  this.clone = () => new DataSource(this.data, this.node, this.parent);

  this.empty = function(){
    if(Array.isArray(this.data)) return this.data.length === 0;
    else return !this.data;
  }

  this.getLast = function (name) {
    const ds = this.get(name);
    if (Array.isArray(ds.data) && ds.data.length > 0) {
      ds.data = ds.data[ds.data.length - 1];
    }
    return ds;
  }

  this.getData = function (path, mustarray) {
    let d = null;
    if (this.data) {
      d = path ? this.data[path] : this.data;
      if (Array.isArray(d)) {
        d = [...d];
        if (!d[0])
          d = [];
      }
      else d = { ...d };
    }

    console.log("DS GET DATA", d);

    if (mustarray && !Array.isArray(d)) {
      d = d ? [d] : [];
      if (path) this.data[path] = []; else this.data = [];
    }

    return d;
  }

  this.getCollection = function (path) {
    return this.getData(path, true);
    /*let d = null;
    if (this.data) {
      d = path ? this.data[path] : this.data;
      if (Array.isArray(d)) {
        d = [...d];
        if (!d[0])
          d = [];
      }
      else {
        d = [];
        if (path) this.data[path] = []; else this.data = [];
      }
    }
    else {
      d = [];
      if (path) this.data[path] = []; else this.data = [];
    }

    return d;*/
  }

  this.discendant = function (path) {
    return this.node ? this.node.discendant(path) : null; //?.datasource 
  }

  this.CloneWith = function (data, path) {
    const n = path ? this.node.discendant(path) : this.node;
    n.formatData(data);
    return new DataSource(data, n);
  }

  this.clear = function () {
    if (this.node && this.data) {
      //debugger;
      this.node.traverse((node, data) => {
        if (data) {
          if (!Array.isArray(data))
            data = [data];
          for (let k = 0; k < data.length; k++) {
            node.Mutation.delete(data[k].id);
          }
        }
      }, true, this.data)
    }
  }

  /*this.set = function (path, item, parent) {
    parent = parent || this.data;
    const n = this.node?.discendant(path);
    if (n && parent) {
      n.addItem(item, parent);
    }
  }*/
  this.set = function (item, path) {
    this.node.formatAndSetData(item, this.parent, path);
    if (!this.data) this.data = this.parent ? this.parent[this.node.name] : this.node.source;
  }
  this.add = function (item, path) {
    this.node.formatAndAddData(item, this.parent, path);
    if (!this.data) this.data = this.parent ? this.parent[this.node.name] : this.node.source;
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

export function GraphNode(name, uid, parent, graph, etype) {
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
  this.returning = null;
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

  this.etype = etype;
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

  Object.defineProperty(this, "permanent", {
    get() {
      return this.graph?.permanent; //Remote lib check for null???
    }
  });

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
 * @param {any} source
 * @param {object} ancestor
 */

  /**
   * 
   * @param {traverseCallback} callback 
   * @param {boolean} deep  
   * @param {boolean} deep 
   * @returns void
   */
  this.traverse = function (callback, deep, source, ancestor, generate) {
    const stop = callback(this, source, ancestor);
    if (!this.children || stop) return;
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

  this.store = function (context) {
    this.traverse((node) => {
      DataGraph.getEntity(node.etype).setSource(node, context);
    }, true);
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

  /**
   * 
   * @param {*} data 
   * @param {*} parent 
   * @returns 
   */
  this.formatData = function (data, parent) {
    console.log("DEBUG-NODE", data);
    if (!data) return;

    if (!Array.isArray(data))
      data = [data];

    //const nolink = data.hasOwnProperty("__nolink__");
    let tolink;

    for (let k = 0; k < data.length; k++) {
      const source = data[k];
      let mutated = source.hasOwnProperty("__mutation");

      tolink = source.hasOwnProperty("__tolink__");

      if (!source.hasOwnProperty("id") && Object.isExtensible(source)) {

        tolink = true;

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

      if (parent && tolink) { //è possibile capire se ha già link impostato? es quando aggiungo da un node o query dove data è già formattata
        this.link.apply(parent, source, this); //Dovrei fare un reset delle rule già impostate se esitono

        if (source.hasOwnProperty("__tolink__"))
          delete source.__tolink__;
      }

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

  this.addSource = function (data) {
    DataGraph.setItem(data, this);
  }

  this._setData = function (value, parent, format, override, notNotify) {
    if (!this.isRoot() && !parent)
      throw new Error("SET/ADD Data for Discendant Node must have PARENT reference.");

    if (parent)
      this.bind(value);

    if (override)
      this.clearMutation();

    if (format) {
      this.traverse((node, data, parent) => {
        node.formatData(data, parent);
      }, true, value, parent);
    }
    else
      this.formatData(value, parent);

    DataGraph.setItem(value, this, parent, override);

    if (!notNotify) this.notify();
  }

  this.formatAndSetData = function (value, parent, path, notNotify) {
    if (path) {
      return this.discendant(path).formatAndSetData(value, parent, null, notNotify);
    }

    this._setData(value, parent, true, true, notNotify);

    return this;
  }

  this.setData = function (value, parent, path, notNotify) {
    if (path) {
      return this.discendant(path).setData(value, parent, null, notNotify);
    }

    this._setData(value, parent, false, true, notNotify);

    return this;
  }

  this.addData = function (value, parent, path, notNotify) {
    if (path) {
      return this.discendant(path).setData(value, parent, null, notNotify);
    }

    this._setData(value, parent, false, false, notNotify);

    return this;
  }

  this.formatAndAddData = function (value, parent, path, notNotify) {
    if (path) {
      return this.discendant(path).formatAndSetData(value, parent, null, notNotify);
    }

    this._setData(value, parent, true, false, notNotify);

    return this;
  }

  /*this.setDataAt = function (path, value, parent, format, notNotify) {
    const n = this.discendant(path);
    if (n) n.setData(value, parent, format, notNotify);
    return this;
  }

  this.addDataAt = function (path, value, parent, format, notNotify) {
    const n = this.discendant(path);
    if (n) n.addData(value, parent, format, notNotify);
    return this;
  }

  this.addData = function (item, ancestor, format, notnotify) { //Root o direttamente parent?? supportare entrambi??
    if (!this.isRoot() && !parent)
      throw new Error("SET/ADD Data for Discendant Node must have PARENT reference.");

    if (!this.isCollection)
      this.clearMutation();

    this.traverse((node, data, parent) => {
      const formatted = format || Array.isArray(data) ? data[0].hasOwnProperty("id") : data.hasOwnProperty("id");
      node.formatData(data, parent);
      return formatted;
    }, true, item, parent);

    DataGraph.setItem(item, this, ancestor);

    if (!notnotify)
      this.notify(); //Optional??? Come cambia source nel caso collection affichè ci sia update in useState...

    console.log("DEBUG-NODE ADD SOURCE", item);

    return this;
  }*/


  this.addItem = function (item, ancestor, format, notnotify) { //Root o direttamente parent?? supportare entrambi??

    if (!this.isCollection)
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

  this.clearMutation = function () {
    this.traverse((node) => {
      node.Mutation.clear();
    }, true);
  }

  this.forceMutation = function () {

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
  this.save = function (option, parameters) {
    option = DataGraph.formatOption(option, this.etype);
    let data = {};/*JSON.stringify(this, (name, val) => {
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
      source.etype = (DataGraph.config.prefix ? DataGraph.config.prefix + '.' : '') + node.etype;
      source.identity = node.identity;
      source.isCollection = node.isCollection;
      source.primarykey = node.primarykey;
      source.path = node.path;
      source.link = node.link;

      if (node.returning)
        source.returning = node.returning;

      const s = DataGraph.getSchema(node);
      //Se voglio usare uno schema diverso??? complicato passare ad ogni node! 
      //potrei fare una cosa generica che sovrascrive temporaneamente DEFAULT Schema

      if (!isString(s)) { // Else usa nomlecatura first caracter per gestire type
        source.TypeSchema = {};
        for (const key in s) {
          const v = s[key];
          if (!isNaN(v)) {
            source.TypeSchema[key] = v;
          }
        }
      }

      if (node.Mutation.size > 0) {
        source.Mutation = [];

        let mutated;
        let data;
        node.Mutation.forEach(function (value, key) {
          data = { id: value.id, tempkey: value.__tempkey, linked: value.__linked };
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

    console.log("SAVE Node JSON: ", data);
    option.excludeParams = true;

    if (parameters) {
      data = { Root: data, Value: parameters }
    }

    return Apix.call(option.queryOp, data, option).then((result) => {
      console.log("Node Save RESULT:", result);
      this.traverse((node) => {
        node.Mutation.forEach(function (value, key) {
          delete value.__mutation;
        });
        node.Mutation.clear();
      }, true);
      this.refresh();
      return result;
    }, er => {
      console.log("ERROR GraphNode Save", er);
      throw er;
      /*this.traverse((node) => {
        node.Mutation.clear();
      }, true);*/
      //openPopup(<div >Si è verificato un errore si prega di riprovare.</div>, "Errore", "OK");
    });
  }

  this.delete = function (items) {
    if (items) {
      if (!Array.isArray(items))
        items = [items];

      const node = { etype: (DataGraph.config.prefix ? DataGraph.config.prefix + '.' : '') + this.etype, Mutation: [] };
      let item;
      for (let k = 0; k < items.length; k++) {
        item = items[k];
        node.Mutation.push(typeof item === "string" || item instanceof String || typeof item === 'number'
          ? { id: item }
          : { id: item.id });
      }
      return Apix.call("api/jdelete", node, { excludeParams: true }).then(() => {
        this.remove(items[0]);
        /*const source = this.isRoot()?this.source : searchData(this.graph.root.source, items[0], this.path)?.parent[this.name];
        if(Array.isArray(source)){
          for( var i = 0; i < source.length; i++){ 
            if ( source[i].id === items[0]) { 
                source.splice(i, 1);
                break;
            }
          }
        }
        this.refresh();*/
      }).catch((er) => {
        console.log(er);
        //openPopup(<div>Si è verificato un errore si prega di riprovare.</div>, "Errore", "OK");
      }

      );
    }
  }

  this.remove = function (index) {
    if (isNaN(index))
      index = index.id;

    const source = this.isRoot() ? this.source : searchData(this.graph.root.source, index, this.path)?.parent[this.name];
    if (Array.isArray(source)) {
      for (var i = 0; i < source.length; i++) {
        if (source[i].id === index) {
          source.splice(i, 1);
          break;
        }
      }
    }
    this.refresh();
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
      console.log("NOTIFY ROOT", this.datasource, this.observers);
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
        console.log("UNOBSERVE OK");
        this.observers.slice(i, 1);
        break;
      }
    }

    return this.observers.length === 0;
  }

  this.sync = function (item) {
    //debugger;
    if (!this.source) return;
    if (this.isRoot()) {
      const d = this.source;
      if (Array.isArray(d)) {
        for (let k = 0; k < d.length; k++) {
          if (d[k].id === item.id) {
            this.source[k] = { ...item };
            this.notify();
            break;
          }
        }
      }
      else if (d.id === item.id) {
        this.source = { ...item };
        this.notify();
      }
    }
  }

  this.refresh = function () {
    if (this.isRoot()) {
      const temp = this.source;
      this.source = null;
      this.notify();
      this.source = temp;
      this.notify();
    }
    else {
      this.graph.root.refresh();
    }
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
    console.log("REGISTER GRAPH", key, graph, g);
    if (g) {
      g.unshare();
      graph.absorb(g)
    }
    this.graphs[key] = graph;
    graph.share();
  }

  this.unregisterGraph = function (key) {
    console.log("UNREGISTER-GRAPH");
    // Non devo fare unshare?
    /*const g = this.graphs[key];
    g.unshare();*/
    delete this.graphs[key];
  }

  this.getGraph = function (key) { return this.graphs[key]; }
}

const DataGraph = {
  isPrefixMode: false,

  config: {},

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

  getSchema: function (path, name) { //per schema default come collection
    name = name || 'DEFAULT';
    let etype = path.etype || path; //Caso passo solo etype
    const s = this.schema[name];

    console.log("DG SCHEMA", path, etype, name, this.schema, s);
    //debugger;
    if (s && s.hasOwnProperty(etype))
      return { ...s[etype], __name: path.name };
    else {
      for (const key in this.schema) {
        if (Object.hasOwnProperty.call(this.schema[key], etype)) {
          return { ...this.schema[key][etype], __name: path.name }; //Il primo che trova se non specifico name of schema
        }
      }
    }

    if (path.isCollection)
      etype = '[' + etype + ']';

    return path.name + ': ' + etype + ' {*}';
  },

  setSchema: function (schema, name) {
    this.schema[name || 'DEFAULT'] = schema;
    if (typeof schema !== 'string') {
      for (const key in schema) {
        const p = schema[key];
        if (typeof p !== 'string' && !p.hasOwnProperty('__etype')) {
          p.__etype = key;
        }
      }
    }
    console.log("SET-GET-SCHEMA", schema, name, this.schema);
  },

  getLink: function (etype, name) {
    const links = this.getEntity(etype).relations;
    return links ? links[name] : null;
  },

  link: function (data) {
    if (data) data.__tolink__ = true;
    return data;
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

  registerGlobalState: function (key, data, setter, context) {
    console.log("REG D-GLOBAL", key, data, setter);
    this.state.set(key, { value: data, setter: setter, context: context });
  },

  unregisterGlobalState: function (key) {
    console.log("UNREG D-GLOBAL", key);
    this.state.delete(key);
  },

  setGlobalState: function (key, data, context) {
    const state = this.state.get(key);
    console.log("SET D-GLOBAL", key, data, state);
    if (state) {
      state.value = data;
      if (state.setter)
        state.setter(data);
    } else {
      this.state.set(key, { value: data, context: context });
    }
  },

  getGlobalState: function (key) {
    console.log("GET D-GLOBAL", key, this.state);
    return this.state.get(key)?.value;
  },

  clearGlobalState: function (context) {
    console.log("CLEAR D-GLOBAL");
    this.state.forEach((v, k) => { if (v && v.context === context) this.state.delete(k); })
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
   * @param {string | SourcePath} path 
   * @param {DataContext=} context
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
        root = new Graph(path.schema, null, true, context, true).root;
      else
        root = new Graph(this.getSchema(path), null, true, context, true).root;
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
   * @param {boolean} format
   * @param {boolean} notify     
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

  /**
   * Deve supportare anche path annidati, nel caso source non esiste si salta set o si crea graph?
   * @param {GraphNode | String} path 
   * @param {*} data 
   * @param {* | number} parent 
   * @returns {GraphNode}
   */
  newSource: function (path, data, parent) {
    console.log("DataGraph NEW SOURCE:", path, data);
    let node = this.findOrCreateGraph(path, data);
    if (node) {
      node.newItem(data, parent);
      //node.notify();
    }
    return node;
  },

  /**
   * 
   * @param {*} path 
   * @param {*} data 
   * @param {*} format 
   * @param {*} add 
   * @param {*} override 
   * @returns 
   */
  setSubtree: function (path, data, format, add, override) {
    console.log("DataGraph SET SOURCE:", path, data);
    /**
     * @type {GraphNode}
     */
    let root;

    if (path instanceof GraphNode)
      root = path;
    else if (path.indexof(':') > -1)
      root = new Graph(path).root;
    else
      root = this.getSource(path);

    if (root) {
      const setSource = this.setSource;
      root.traverse((node, source) => {
        if (node.isRoot())
          node.source = source;
        else if (source)
          node.source = source[node.name];

        console.log("SET  NODE", node, source);
        setSource(node, data, format, override);
      }, true, data);
    }
    //this.addSource(node);
    return root;
  },

  addSubtree: function (path, data) {
    this.setSubtree(path, data, true, true);
  },

  subscribe: function (path, observer) {
    let p = new SourcePath(path);
    console.log("SUBSCRIBE SOURCE ", p.etype, p.name);
    this.getEntity(p.etype).subscribe(p.name, observer);
  },

  unscribe: function (path, observer, permanent) {
    let p = new SourcePath(path);
    console.log("UNSCRIBE SOURCE ", p.etype, p.name);
    this.getEntity(p.etype).unscribe(p.name, observer, permanent);
  },

  save: function (node) {
    if (!node)
      return;
    //Apix e Channel...
    //se children hanno un channel diverso???
  },

  setItem: function (item, node, parent, override) {
    let name;
    const isCollection = node.isCollection;
    if (parent) {
      name = node.name;
      node = node.parent;
    }
    else {
      parent = node;
      name = "source";
    }

    if (isCollection && !override) {//in teoria non dovrebbe esistere questa ipotesi
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

  getMutation: el => {
    if (el.hasOwnProperty("__mutation")) {
      const mutated = el.__mutation.mutated;
      const data = { id: el.id };
      for (const key in mutated) {
        if (Object.hasOwnProperty.call(mutated, key)) {
          data[key] = el[key];
        }
      }
      return data;
    }
    else
      return null;
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
export function SourcePathOld(path) {
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

// path = "etype.name.name.name"
export function SourcePath(path) {
  if (path instanceof SourcePath)
    return path;
  console.log("PATH", path);
  this.etype = '';
  //this.schema = 'DEFAULT'; //?
  this.isSchema = path.indexOf(':') > -1;
  let delim = '.';
  let k = 1;
  if (this.isSchema) {
    this.schema = path;
    delim = ':';
    k = 0;
  }

  path = path.split(delim);
  this.name = path[0 ^ k].trim();
  path = path[1 ^ k].trim();

  this.isCollection = path.charAt(0) === '[';
  let i = 0;
  delim = ' ';

  if (this.isCollection) {
    i++;
    delim = ']';
  }


  while (path.charAt(i) !== delim && i < path.length) {
    this.etype += path.charAt(i)
    i++;
  }
  console.log("PATH", this.etype + '.' + this.name);
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

export function EntityProxy(etype, target, node) {
  this._etype = etype;
  this.target = target || {}; //Traget deve essere settato o nel costruttore oppure tramite setData, no direttamente
  this.node = node;

  Object.defineProperty(this, "etype", {
    get() { return this._etype; },
    set(value) {
      if (this._etype) {
        const schema = DataGraph.getSchema(this._etype);
        for (const key in schema) {
          delete this[key]; //ok anche se sono proprietà getter e setter???
        }
      }
      this._etype = value;
      this.wrap();
    }
  });

  this.absorb = function (obj) {
    for (const key in obj) {
      this[key] = obj[key];
    }
  }

  this.toNode = function (name) {
    if (this.node)
      return this.node;

    const path = this._etype + "." + (name || "item");
    this.node = DataGraph.findOrCreateGraph(path);
    //new GraphNode("proxy", 0, null, null, etype);
    this.node.setSource(this.target, null, true);
    return this.node;
  }

  this.procedure = function (field, script) {
    if (this.node)
      node.mutate('$' + field, script, this.target);
    else
      DataGraph.mutate('$' + field, script, this.target);
  }

  this.wrap = function () {
    if (!this._etype)
      return;

    const schema = DataGraph.getSchema(this._etype);

    for (const key in schema) {
      Object.defineProperty(this, key, {
        get: function () {
          if (this.target)
            return this.target[key];
          else
            return undefined;
        },
        set: function (value) {
          if (this.node)
            node.mutate(key, value, this.target);
          else
            DataGraph.mutate(key, value, this.target);
        }
      });
    }
  }

  this.setData = function (data) {
    this.target = data || {};
    if (this.onTargetChanged)
      this.onTargetChanged(this.target);
  }

  this.wrap();
}

export { DataGraph };

