import { DataGraph, LinkDirection } from "../DataGraph";

export function SqlGraph(graph, int) {
  this.int = int || sqlINT;
  this.translate = function (graph) {
    return graphToSql(graph.root, this.int);
  }
}
//TODO: In futuro implementare logica per cui ogni node potrebbe avere un inteprete diverso.
function graphToSql(node, int, skipJSON) {
  int = int || sqlINT;
  let sql = "SELECT ";
  //const schema = node.schema;
  let columns = formatNames(node.fields, 'p', {}) + ", '" + node.etype + "' as etype ";

  let from = " FROM " + (formatName(node.etype)) + " AS p"; //dql.fromTable || 
  //Gestire Children
  if (node.children) {
    node.groupBy("p.id");
    let n, col, link;
    for (let k = 0; k < node.children.length; k++) {
      n = node.children[k];
      from += (n.joined ? " INNER JOIN (" : " LEFT JOIN (") + graphToSql(n, int, true) + ") AS t" + k + " ON ";

      //Gestione relazione
      link = n.link;
 
      if (link.direction === LinkDirection.DOWN_WISE) {
        from += "p." + link.pk + " = t" + k + "." + link.fk;
      }
      else if (link.direction === LinkDirection.UP_WISE) {
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
    for (let i = 1; i < len; i++) {
      c = node.condition.at(i);
      console.log("CONDTION IN PARSER: ", c);
      //sql += cparser(c, "p", int);
      if (typeof c === 'string')
        sql += (int[c] || c)
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
          if (DataGraph.isPrefixMode)
            g.typedef += c.field[0];

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
  }

  //GROUP BY
  sql += node.groupby ? (int["GROUPBY"] || " GROUP BY ") + formatNames(node.groupby) : "";
  sql += node.orderby ? (int["ORDERBY"] || " ORDER BY ") + formatNames(node.orderby, "p") : "";

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

const sqlINT = {

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
  prefix = prefix ? (prefix + ".") : "";
  let extra = "";
  let isValue;
  if (name[0] === '#') {
    isValue = true;
    name = name.substr(1);
  }

  if (name.toLowerCase().indexOf(" as ") > -1) {
    let index = name.toLowerCase().indexOf(" as ");
    extra = name.substr(index);
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

function formatNames(names, prefix, values) {
  //prefix = prefix? (prefix + '.') : "";
  const cols = names.split(',');
  let result = formatName(cols[0], prefix, values);
  for (let k = 1; k < cols.length; k++) {
    result += "," + formatName(cols[k], prefix, values);
  }
  return result;
}

