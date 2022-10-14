import { Form } from "antd";
import { useEffect, useRef } from "react";
import { DataSource, Observable } from "@vista/core";

const mutation = function (mutated, state, model) {
  const node = state.node;
  const data = state.source;
  for (const key in mutated) {
    node.mutate(key, mutated[key], data);
  }
}

/**
 * 
 * @param {*} name 
 * @param {*} source 
 * @param {*} model 
 * @param {*} formatter 
 * @returns 
 */
export const useForm = (name, source, control, formatter, schema) => {
  source = source || new DataSource({});
  const [target] = Form.useForm();
  const ref = useRef(new ObservableForm(target, source?.data, schema, formatter));
  const form = ref.current;

  form.name = name;
  form.target = target;
  form.control = control;
  form.source = source;

  //Conviene registrare tutto in context di app?
  control.context.registerElement(name, form); //Controllare se ne esiste uno già registrato => worning or error

  useEffect(() => {
    const form = ref.current;
    console.log("DEBUG USE FORM RESET", source, form.__source__);
    if (!source || !source.data || (form.source?.data && form.source.data.id !== source.data.id))
      form.target.resetFields();
    form.source = source;
  }, [source]);

  useEffect(() => {
    const form = ref.current;
    control.Subscribe("OBSERVABLE", form.observable.onPublish.bind(form.observable));
  }, [control]);

  return form;
}

export function ObservableForm(form, data, schema, formatter) {
  this.target = form;
  this.observable = new Observable(form, data, null, schema);
  this.source = null;
  this.checked = false;
  this.schema = schema;
  this.formatter = formatter;

  Object.defineProperty(this, "data", {
    get() { return this.source ? this.source.data : undefined; },
  });
  this.observe = function (fields, emitters) {
    return this.observable.observe(fields, emitters);
  }

  this.validate = async function (name) {
    const form = this.target;//context.getForm(name);
    if (!form) return { isValid: false, form: null };
    //let source = form.__source__;
    return await form.validateFields()
      .then(values => {
        console.log("DEBUG FORM VALIDATOR OK", name);
        this.mutateValues();
        this.checked = true;
        form.resetFields();
        return { isValid: true, data: this.source.data, node: this.source.node, form: form, values: form.getFieldsValue(true)};
      })
      .catch(errorInfo => {
        console.log("DEBUG VALIDATOR ERROR", errorInfo); //Si può fare publish di error che da app viene ascoltatato e riportato a user in modo cetntralizzato
        return { isValid: false, data: this.source.data, node: this.source.node, form: form, error: errorInfo };
      });
  };

  this.setValue = function(field, value){
    console.log("SET VALUE", this.target);
    const obj = {};
    obj[field] = value;
    this.target.setFieldsValue(obj);
    
    this.valueChanged(field, value);
  }

  this.valueChanged = function (field, value) {
    if (this.data) {
      if (!this.changedValues) {
        this.changedValues = {};
      }

      value = value || this.target.getFieldValue(field);
      console.log("IS VALUE CHANGED?", field, value, this.data, this);
      if (value && value.hasOwnProperty('label')) {
        this.data[field + "_label"] = value.label;
        value = value.value;
        console.log("LABEL CHANGED", this.data[field + "_label"]);
      }

      if (this.data[field] !== value) {
        this.changedValues[field] = value;
        console.log("VALUE CHANGED", field, value);
        return true;
      }
    }
    return false;
  }
  /*
  try {
    await form.validateFields();

    // Validation is successful
  } catch (errors) {
    // Errors in the fields
  }
  */

  this.submitForm = async function (name) {
    const [isValid, source] = await this.validate(name);
    if (isValid) {
      source.node.save();
    }
  }

  this.resetForm = function (name) {
    const form = this.target;//this.context.getForm(name);
    if (form) form.resetFields();
  }

  /**
   * 
   * @param {DataSource} source 
   * @param {*} values 
   */
  this.mutateValues = function () {
    const values = this.changedValues;
    if (!values)
      return;

    const { data, node } = this.source;
    //debugger;
    console.log("DEBUG FORM USE FORM MUTATE", values, node, this.contextid);
    for (const key in values) {
      if (Object.hasOwnProperty.call(values, key)) {
        node.mutate(key, values[key], data);
      }
    }
  }

  this.format = function (value) {
    value = value || this.source?.data;
    if (this.formatter && value) {
      value = { ...value };
      for (const key in this.formatter) {
        if (Object.hasOwnProperty.call(value, key)) {
          value[key] = this.formatter[key](value[key], value);
        }
      }
    }
    return value;
  }

  this.parse = function (value) {

  }

  this.getValue = function (field) {

  }

  this.getValues = function () {

  }
}



/*export const useForm = (name, source, model) =>{
  const [form] = Form.useForm();
  
  form.__name__ = name;
  //model.form[name] = form;
  model.context.registerForm(name, form); //Controllare se ne esiste uno già registrato => worning or error
  useEffect(()=>{
      console.log("DEBUG USE FORM RESET", source, form.__source__);
      if(!source || !source.data || (form.__source__?.data && form.__source__.data.id !== source.data.id))
        form.resetFields();
      form.__source__ = source;
      //form.resetFields();
      return () => { console.log("USE FORM RESET UNMONT", form.isFieldsTouched());}
  },
  [source, form]);

  return form;
}*/