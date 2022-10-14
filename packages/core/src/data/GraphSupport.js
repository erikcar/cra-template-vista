import { isString } from "@webground/core";
import { DoubleLink, BottomLink, DataGraph, GraphNode, Link, TopLink, SourcePath } from "./DataGraph";

export function searchData(items, value, path, pdec, field, start) {
  if (!start) //typeof start !== 'undefined')
    start = 0;

  let p = path.split(',');

  if (pdec)
    p.splice(-1, pdec);

  field = field || "id";

  if (!Array.isArray(items))
    items = [items];

  return findData(items, p, value, field, start);
}

//const path = ["products","deposit"];
function findData(items, path, value, field, start) {
  let item, check, result;
  for (let z = 0; z < items.length; z++) {
    //console.log('Products: ', items[z].products);
    item = items[z];
    check = true;
    for (let k = start; k < path.length - 1; k++) {
      item = item[path[k]];
      if (item !== null) {
        if (Array.isArray(item)) {//is array?
          result = findData(item, path, value, field, ++k);
          check = false;
          break;
        }
      }
      else break;
    }

    if (check) {
      const parent = item;
      item = item[path[path.length - 1]];
      //console.log("FOUND", item);
      if (item !== null) {
        if (Array.isArray(item)) {
          for (let j = 0; j < item.length; j++) {
            if (item[j][field] === value)
              result = { parent: parent, item: item[j] };//console.log("FOUND DATA");
          }
        }
        else if (item[field] === value)
          result = { parent: parent, item: item };//console.log("FOUND DATA");
      }
    }
  }
  return result;
}

export function checkToken(condition, item) {
  this.c = condition;
  this.item = item;
  this.index = 0;
  this.pointer = null;
  this.break = false;
  this.logical = false;
  this.checker = null;

  this.next = function () {
    if (this.index < this.c.length) {
      this.pointer = this.c[this.index];
      if (typeof this.pointer === 'string') {
        if (this.pointer === "(")
          this.checker = checkGroup;
        else
          this.logical = true;

        this.index++;
        return this.pointer !== ")";
      }
      else {
        this.checker = this.pointer.checker;
        this.index++;
        return true;
      }
    }
    return false;
  }

  this.getLogical = function () {
    this.logical = false;
    if (this.pointer === "OR")
      return this.Or;
    else
      return this.And;
  }

  this.Or = function (value) {
    return value || this.checker(this.item);
  };

  this.End = function (value) {
    this.break = !(value && this.checker(this.item));
    return !this.break;
  };
}

export function checkGroup(token) {
  let result = false;
  let logical = token.Or;
  while (token.next()) {
    if (token.logical) {
      logical = token.getLogical();
    }
    else {
      result = logical(result)
      if (token.break) { token.break = false; return false; }
    }
  }
  return result;
}

function condition(field) {
  //this.fieldProcedure = null;

  //this.valueProcedure = "";
  //this.value = null;
  this.operator = null;

  if (field.indexOf('#') > -1) {
    [this.fieldProcedure, this.field] = field.split('#');
  }
  else
    this.field = field;

  Object.defineProperty(this, 'rawValue', {

    set: function (value) {
      if (value.indexOf('#') > -1) {
        [this.valueProcedure, this.value] = value.split('#');
      }
      this.value = value
    }
  });
}

/*Object.defineProperty(condition.prototype, 'rawValue', {
 
  set: function (value) {
    if (value.indexOf('#') > -1) {
      [this.valueProcedure, this.value] = value.split('#');
    }
    this.value = value
  }
});*/

function Equal(field) {
  condition.call(this, field);
  this.operator = "=";
  this.checker = function (item) { return item[this.field] === this.value; }
}

function MoreThen(field) {
  condition.call(this, field);
  this.operator = ">";
  this.checker = function (item) { return item[this.field] > this.value; }
}

function schemaParser(schema, isCollection, deep, condition) {
  if (isString(schema)) return schema;
  let s = schema.__name + ':' + (isCollection?'[' + schema.__etype + ']' : schema.__etype) + (condition? '(' + condition + ')':'') + '{';

  for (const key in schema) {
    if (Object.hasOwnProperty.call(schema, key)) {

      if (key.indexOf('__') > -1) //key === 'identity__' || key === 'pk__')
        continue;

      //s += key;

      const p = schema[key];

      if (isNaN(p)){
        if(deep){
          const path = new SourcePath(key + ':' + p);
          s += schemaParser(DataGraph.getSchema(path), path.isCollection, deep);
        }
      }
      else
        s += key;
      s += ',';
    }
  }
  return s + '}'; // necessario rimuovere ultimo ',' ???
  //debugger
}

function fragmentParser(query) {
  // Es #patient# |patient| $patient$
  // Possibilita quando creo query da Default schema di sostituire children con fragment ES passando un object optional 
  //Es per folder model.ExecuteQuery(null(query), null(parameter), {patient: '#patient_s#'}
  //Fragment possono anche essere asscoicati ad un context e quindi clear al dipose del ctx.
  //query.split('| oppure #') sostituisco tutte le voci dispari con corrispondente fragment che potrebbe essere ad esempio registarto in DataGraph.fragment
  return query;
}

export function GraphParser(graph) {

  if (!isString(graph.query))
    graph.query = schemaParser(graph.query, graph.isCollection, graph.deep, graph.condition);
  //graph.query = fragmentParser(graph);

  const info = { graph: graph };
  info.parts = graph.query.split('"');
  info.s = info.parts[0];
  info.index = 0;
  info.count = 0;
  info.uid = 0;
  info.len = info.parts.length;
  info.initialized = false;
  return nodeParse(info);
}

export function linkParser(node) {
  console.log("LINK PARSER", node);
  if (node.parent) {
    let link = DataGraph.getLink(node.parent.etype, node.name);
    if (!link) {
      const direction = node.link.direction;
      if (direction === Link.DOWN_WISE) {
        const schema = node.parent;
        //per ora non gestisco multi key
        link = new BottomLink(schema.primarykey, schema.primarykey + schema.etype, direction);
      }
      else if (direction === Link.UP_WISE) {
        //const schema = node.schema;
        //per ora non gestisco multi key
        link = new TopLink(node.primarykey, node.primarykey + node.etype, direction);
      }
      else if (direction === Link.BIDIRECTIONAL) {
        const pschema = node.parent;
        //const schema = node.schema;
        link = new DoubleLink(pschema.etype + pschema.primarykey, node.etype + node.primarykey, direction, pschema.etype + "_" + node.etype);
      }
    }
    node.link = link;
  }
}

function nodeParse(info) {
  let s = info.s;
  let index = info.index;
  //let count = info.count;

  let val = "";
  let field = "etype";
  let l, f;
  const node = new GraphNode(info.name, info.uid, info.node, info.graph);
  info.node = node;
  let add = "addField";
  const checkField = function () {
    if (field) {
      if (field === "etype") {
        node.setSchema(DataGraph.getESchema(val));
        linkParser(node);
      }
      else {
        node[field] = val;
      }
      val = "";
      field = null;
    }
  }
  let op;
  const rules = [{
    '[': function () {
      node.isCollection = true;
      index++;
    },
    ']': function () {
      checkField();
      index++;
    },
    '(': function () {
      checkField();
      node.addCondition('(');
      index++;
    },
    ')': function () {
      if (val !== "") {
        info.condition.rawValue = val;
        node.addCondition(info.condition);
        val = "";
      }
      node.addCondition(')');
      index++;
    },
    ':': function () {
      info.name = val;
      val = "";
      index++;
      if (info.initialized) { //Child Node
        info.index = index;
        info.uid++;
        node.push(nodeParse(info));
        info.node = node;
        index = info.index;
      }
      else { //prima volta (Root Node)
        node.name = info.name;
        info.initialized = true;
      }
      //checkField();
      //field = "etype";
      //index++;
    },
    '^': function () {
      node.name = val;
      val = "";
      index++;
    },
    '%': function () {
      node.name = val;
      val = "";
      index++;
    },
    '$': function () {
      node.name = val;
      val = "";
      index++;
    },
    '>': function () {
      //node.name = val;
      info.condition = new MoreThen(val);
      index++;
      if(s[index] === '-'){
        val="-";
        index++;
      }
      else
        val = "";
    },
    '<': function () {
      node.name = val;
      val = "";
      index++;
    },
    '=': function () {
      info.condition = new Equal(val);//{field: val, operator: '='};
      //node.addCondition({field: val, operator: '='})
      val = "";
      index++;
    },
    '&': function () {
      if (val !== "") {
        //node.condition[node.condition.length-1].value = val;
        info.condition.rawValue = val;
        node.addCondition(info.condition);
        val = "";
      }
      node.addCondition('AND')
      index += 2;
    },
    '|': function () {
      if (val !== "") {
        info.condition.rawValue = val;
        node.addCondition(info.condition);
        val = "";
      }
      node.addCondition('OR')
      index += 2;
    },
    ',': function () {
      if (val !== "") {
        node[add](val);
        val = "";
      }
      index++;
    },
    '.': function () {
      if (s[index + 1] === '.' && s[index + 2] === '.') {
        node[add](val);
        val = "";
      }
      else {
        val += '.';
        index++;
      }
    },
    '{': function () {
      checkField();
      index++;
    },
    '}': function () {
      if (val !== "") {
        node[add](val);
        val = "";
      }
      index++;
    },
    '§': function () {
      node.joined = true;
      index++;
    },
    '-': function () {
      if (val !== "") {
        node[add](val);
        val = "";
      }
      index++;
      if(s[index] === 'O') add = "orderBy";
      else if(s[index] === 'D') node.desc = true;
      else add = "groupBy";
      index += 2;
    },
    '/': function () {
      index++;
      node.link.direction = s[index];
      index++;
    }
  }];

  op = rules[0];

  const pattern = /[ \n\t]/;
  while (s[index] !== '}' && info.count < info.len) {
    if (index >= s.length) {
      info.count++;
      if (info.count < info.len) {
        if (info.count % 2 === 0) {
          info.s = info.parts[info.count];
        }
        else {
          //Asegnare value a condition
          //node.condition[node.condition.length-1].value = "'" + info.parts[info.count] + "'";
          info.condition.rawValue = "'" + info.parts[info.count] + "'";
          node.addCondition(info.condition);
          info.count++;
          info.s = info.parts[info.count];
        }
      }
      s = info.s;
      index = 0;
    }
    l = s[index];
    f = op[l];
    if (pattern.test(l)) {
      index++;
    }
    else if (f) {
      f();
    }
    else {
      val += l;
      index++;
    }
  }

  if (val !== "") {
    node[add](val);
    val = "";
  }

  index++;
  info.index = index;

  if (node.condition) info.graph.key += node.condition.value;
  return node;
}