//import DataQL from "../DataQL";
import { DataGraph, GraphNode, Link } from "../DataGraph";

const sqlINT = {

}

export function SqlGraph(graph, int) {
  this.int = int || {};//sqlINT;
  this.translate = function (graph) {
    return graphToSql(graph.root, this.int);
  }
}

function joinToSql(n, int){
  console.log("JOIN_TO_SQL", n);
  let sql = " LEFT JOIN " + n.etype + " ON ";
  let len = n.condition.length();
  for (let k = 0; k < len; k++) {
   
    const c = n.condition.at(k);
    if (typeof c === 'string')
      sql += " " + (int[c] || c) + " ";
    else
      sql += formatName(c.field, n.etype) + c.operator + "p." + c.value; 
  }
  
  return sql;
}

function subqeryToSql(n, int){
  const fields = n.fields.split('#');
  let sql = " (SELECT " + fields[0] + " FROM " + n.etype + " WHERE ";
  let len = n.condition.length();
  for (let k = 0; k < len; k++) {
    
    const c = n.condition.at(k);
    if (typeof c === 'string')
      sql += " " + (int[c] || c) + " ";
    else
      sql += formatName(c.field, n.etype) + c.operator + "p." + c.value; 
  }
  sql += ") AS " + fields[1]; 
  
  console.log("JOIN_TO_SQL", n);
  return sql;
}


//TODO: In futuro implementare logica per cui ogni node potrebbe avere un inteprete diverso.
function graphToSql(node, int, skipJSON) {
  int = int || sqlINT;
  let sql = "SELECT ";
  //const schema = node.schema;
  let columns = formatNames(node.fields, 'p', {}) + ", '" + node.etype + "' as etype ";
  
  let from = " FROM " + (DataGraph.config.prefix? DataGraph.config.prefix + '.' : '' ) + (formatName(node.etype)) + " AS p"; //dql.fromTable || 
  //Gestire Children
  if (node.children) {
    let gby = 0;
    let n, col, link; let gbfields='';
    for (let k = 0; k < node.children.length; k++) {
      n = node.children[k];

      if(n.link.direction === Link.BIDIRECTIONAL){
        //t' +  k + '
        columns += "," + '(SELECT json_agg(row_to_json(t.*)) FROM (SELECT s.* FROM(SELECT jsonb_array_elements::integer as sid FROM jsonb_array_elements(p.j' + n.name + ')) as u LEFT JOIN ' + n.etype + ' as s ON u.sid=s.id)t) as ' + n.name;
        continue;
      }

      if(n.name === '#sub')
      {
        columns += "," + subqeryToSql(n,int);
        //formatNames(n.fields, n.etype, {});
        //from += joinToSql(n, int);
        continue;
      }

      if(n.name === '#join')
      {
        columns += "," + formatNames(n.fields, n.etype, {});
        from += joinToSql(n, int);
        gbfields += n.etype + '.' + n.fields;
        continue;
      }

      gby++;
      from += (n.joined ? " INNER JOIN (" : " LEFT JOIN (") + graphToSql(n, int, true) + ") AS t" + k + " ON ";

      //Gestione relazione
      link = n.link;
 
      if (link.direction === Link.DOWN_WISE) {
        from += "p." + link.pk + " = t" + k + "." + link.fk;
      }
      else if (link.direction === Link.UP_WISE) {
        from += "p." + link.fk + " = t" + k + "." + link.pk;
      }
      else{

      }

      col = "row_to_json(t" + k + ".*)";
      //col = n.isCollection ? ", json_agg(" + col + ")" : ", " + col;
      if (n.isCollection)
        col = ", json_agg(" + col + ")";
      else {
        node.groupBy("t" + k + ".*");
        col = ", " + col;
      }

      columns += col + " AS " + n.name;
    }

    if(gby>0){
      node.groupBy("p.id");
      if(gbfields)node.groupBy(gbfields);
    } 
      
  }

  sql += columns;
  sql += from;

  let len = node.condition.length();
  console.log("CONDITION LEN: ", node.condition.length, len);
  if (len > 0) {
    sql += int["WHERE"] || " WHERE ";
    let c;
    len--;
    let g = node.graph;
    g.typedef = "";
    g.parameters = [];
    g.iparameters = [];
    const itype = DataGraph.getSchema(node.etype);
    for (let i = 1; i < len; i++) {
      c = node.condition.at(i);
      console.log("CONDTION IN PARSER: ", c);
      //sql += cparser(c, "p", int);
      if (typeof c === 'string')
        sql += ' ' + (int[c] || c) + ' ';
      else {
        sql += c.not ? " NOT " : " ";
        if (c.fieldProcedure)
          sql += (int[c.fieldProcedure] || c.fieldProcedure) + "(" + formatName(c.field, "p") + ")";
        else
          sql += formatName(c.field, "p");

        sql += " " + (int[c.operator] || c.operator) + " ";

        if (c.valueProcedure)
          sql += (int[c.fieldProcedure] || c.fieldProcedure) + "(";

        if (c.value[0] === '@') {
          //if (DataGraph.isPrefixMode)
            g.typedef += c.field[0];
          //else
            g.iparameters.push(itype[c.field]);

          sql += "$" + g.typedef.length;
          g.parameters.push(formatParameter(g.params[c.value.substr(1)]));//formatValue(g.params[c.value.substr(1)]));
          console.log("PARAMETERS IN PARSER: ", g.params, g.parameters);
          //Devo distinguere in base modalità schema se con prefix o no.
        }
        else
          sql += c.value;

        if (c.valueProcedure)
          sql += ")";
      }
    }

    if(g.parameters.length === 0){
      g.parameters = null;
      g.iparameters = null;
    }
  }

  //GROUP BY
  sql += node.groupby ? (int["GROUPBY"] || " GROUP BY ") + formatNames(node.groupby) : "";
  sql += node.orderby ? (int["ORDERBY"] || " ORDER BY ") + formatNames(node.orderby, "p", null, '#') + (node.desc? ' desc ' : '') : "" ;

  if (!skipJSON) {
    sql = node.isCollection ? "SELECT json_agg(row_to_json(t.*)) AS items FROM(" + sql + ") as t" : "SELECT row_to_json(t.*) AS item FROM(" + sql + ") as t";
  }

  return sql;
}

function QueryName() {

}

function cparser(c, prefix, int) {
  int = int || sqlINT;
  return typeof c === 'string' ? (int[c] || c) : (c.not ? " NOT " : " ") + formatName(c.field, prefix) + " " + (int[c.operator] || c.operator) + " " + c.value;//formatValue(c.value);
}



//FOR JSON AUTO; SQL Server to json restituisce sempre array => da gestire
const sqlParse = {
  Equal: function (c, prefix) {
    return (
      " " +
      c.operator +
      " " +
      formatName(c.field, prefix) +
      (c.not ? "<>" : "=") +
      formatValue(c.value)
    );
  },
  IsNull: function (c, prefix) {
    return (" " + c.operator + " " + formatName(c.field, prefix) + (c.not
      ? " IS NOT NULL"
      : " IS NULL"));
  },
  LessThen: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + formatValue(c.value);
  },
  LessEqual: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + formatValue(c.value);
  },
  GreaterThen: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + formatValue(c.value);
  },
  GreaterEqual: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + formatValue(c.value);
  },

  StartWidth: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + "'%" + c.value + "'";
  },
  Contains: function (c, prefix) {
    return (
      " " +
      c.operator +
      " " +
      (c.not ? " NOT " : "") +
      formatName(c.field, prefix) +
      " " +
      c.type +
      " '%" +
      c.value +
      "%'"
    );
  },

  Inset: function (c, prefix) {
    return " " + c.operator + " " + c.not
      ? " NOT "
      : "" + formatName(c.field, prefix) + c.type + "(" + formatValue(c.value) + ")";
  },

  Expression: function (c) {
    return " " + c.value;
  },
};

export function formatParameter(val) {
  if (typeof val === "string" || val instanceof String) {
    return val;
  } else if (val instanceof Date) {
    return val.dateTime
      ? val.toISOString().substr(0, 23).replace("T", " ")
      : val.toISOString().substr(0, 10);
  } else {
    return val;
  }
}

export function formatValue(val) {
  if (typeof val === "string" || val instanceof String) {
    return "'" + val + "'";
  } else if (val instanceof Date) {
    return val.dateTime
      ? "'" + val.toISOString().substr(0, 23).replace("T", " ") + "'"
      : "'" + val.toISOString().substr(0, 10) + "'";
  } else {
    return val;
  }
}

function formatField(name, int) {
  if (name.indexOf('#') > -1) {
    var [f, field] = name.split('#');
    return int[f] | f + '(' + field + ')';
  }
  return name;
}

function formatName(name, prefix, values) {
  console.log("NAMES", name);
  prefix = prefix ? (prefix + ".") : "";
  let extra = "";
  let isValue;
  if (name[0] === '#') {
    isValue = true;
    name = name.substr(1);
  }

  if (name.toLowerCase().indexOf("#") > -1) {
    let index = name.toLowerCase().indexOf("#");
    extra = " AS " + name.substr(index+1);
    name = name.substr(0, index);
  }

  if (name !== name.toLowerCase()) {
    name = '"' + name.trim() + '"';
  }

  if (isValue) {
    if (values)
      values[extra.substr(4).trim()] = name;
    return name + extra;
  }
  else
    return prefix + name + extra;
}

function formatNameOrValue(name, prefix, values) {
  if (values[name])
    return values[name];
  else
    return formatName(name, prefix);
}

function formatNames(names, prefix, values, splitter) {
  splitter = splitter || ',';
  //prefix = prefix? (prefix + '.') : "";
  const cols = names.split(splitter);
  console.log("NAMES", cols);
  let result = formatName(cols[0], prefix, values);
  for (let k = 1; k < cols.length; k++) {
    result += "," + formatName(cols[k], prefix, values);
  }
  return result;
}

