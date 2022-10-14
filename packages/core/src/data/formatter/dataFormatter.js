import dayjs from "dayjs";
import moment from 'moment';

const eFormat = { TO: 2, FROM: 1, TO_AND_FROM: 3 }

export const Format = {
  currencyFormat:function (value, info) {
    console.log("CURRENCY FORMAT", value, info);
    const v = `€ ${value}`.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const l = v.indexOf(',');
    if(l===-1) return v;
    else if(v.length-l > 2)return v.substring(0, v.length - (v.length-l -3));
    else if(v.length-l === 2 && !info.userTyping)return v + '0';
    return v;//`€ ${value}`.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');//`€ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); //, currency: 'EUR' }
  },

  currencyParse: function (value) {
    console.log("CURRENCY PARSE");
    return value.replace(/\€\s?|(\.*)/g, '').replace(',','.');//value.replace(/\€\s?|(,*)/g, '');//Number(value.replace(/[^0-9\,-]+/g,"").replace(',','.'));
  },

  moment: function(v, f){
    f = f || 'DD-MM-YYYY';
    if(v instanceof moment) return v.format(f);
    return moment(v).format(f);
  }

}

export function currencyFormatter(format) {
  this.format = format || "it-IT";
  this.direction = eFormat.FROM;

  this.parse = function (value) {
    console.log("CURRENCY TO", new Intl.NumberFormat(this.format, { style: 'currency', currency: 'EUR' }).format(value));
    return new Intl.NumberFormat(this.format, { style: 'currency', currency: 'EUR' }).format(value); //, currency: 'EUR' }
  };

  this.format = function (value) {
    console.log("CURRENCY FROM", value.replace(/[^0-9\,-]+/g, "").replace(',', '.'));
    return value.replace(/[^0-9\.\,-]+/g, "");//Number(value.replace(/[^0-9\,-]+/g,"").replace(',','.'));
  }
}

export function stringJoin() {
  this.direction = eFormat.TO_AND_FROM;

  this.parse = function (value) {
    return value?.join(',');
  };

  this.format = function (value) {
    return value?.toString().split(',');
  }
}

export function dayjsFormatter(format){
  this.format = format || 'YYYY-MM-DD';
  this.parse = function (value) {
    if(!value)
      return value;
    else if(typeof this.format === 'string')
      return value.format(this.format);
    else if(this.format)
      return value.format();//Iso
    else
      return value?.toDate();
  };

  this.format = function (value) {
    return dayjs(value);
  }
}

export function DataFormatter() {
  this.formatters = {};
  this.add = function (fields, formatter, direction) {
    if (direction) {
      formatter.direction = direction;
    }
    let v = fields.split(',');
    for (let i = 0; i < v.length; i++) {
      this.formatters[v[i]] = formatter;
    }
  };

  this.parse = function(value, field){
    if(this.formatters.hasOwnProperty(field)){
      return this.formatters[field].parse(value);
    }
    return value;
  };

  this.format = function(value, field){
    if(this.formatters.hasOwnProperty(field)){
      return this.formatters[field].format(value);
    }
    return value;
  };
}

export function xFormatter() {
  this.formatters = {};
  this.add = function (fields, formatter, direction) {
    if (direction) {
      formatter.direction = direction;
    }
    let v = fields.split(',');
    for (let i = 0; i < v.length; i++) {
      this.formatters[v[i]] = formatter;
    }
  }

  this.parse = function (data) {
    //Clono data e restituisco clone???
    const f = this.formatters;

    for (const key in f) {
      console.log("CONVERT FROM PRE", key, f);
      if (f[key].direction & eFormat.FROM && data.hasOwnProperty(key)) {
        console.log("CONVERT FROM ", key, f[key], data[key])
        data[key] = f[key].parse(data[key]);
      }
    }
  }

  this.format = function (data) {
    const f = this.formatters;
    for (const key in f) {
      if (f[key].direction & eFormat.TO && data.hasOwnProperty(key)) {
        data[key] = f[key].format(data[key]);
      }
    }
  }
} 