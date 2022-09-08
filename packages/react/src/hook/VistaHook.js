import { VistaContext } from "../components/Vista";
import { Form } from "antd";
import { useState, useEffect, useContext } from 'react';

/**
 * @param {string} key 
 * @param {*} state 
 * @returns {[Model, DataSource, *]}
 */
 export function useModel(key, state, enode, ctx) {
    let source;
    /**
     * @type {Context}
     */
    const context = useContext(VistaContext) || ctx || VistaApp.context;

    if (state) {
      if (state.vid)
        key = state.vid
      if (state.source instanceof DataSource || state.source instanceof DataSourceGroup)
        source = state.source //Creare DataSource
      else
        source = new DataSource(state.source || {});
    }
    else
      source = new DataSource({});
  
    source.enode = enode;
    const m = context.getModel(key);
    m.source = source;
    //TODO: add gestione valori init di state (info)
    return [m, source, state];
  }

  export const useGraph = (sourcePath, initialData, permanent) => {
    /**
     * @type {Context}
     */
    const context = useContext(VistaContext) || VistaApp.context;
    const [source, setSource] = useState(
      () => {
        let node;
        if (!initialData) {
          node = DataGraph.findOrCreateGraph(sourcePath, context);
        }
        if (!node) {
          node = DataGraph.setSource(sourcePath, initialData, context);
        }
        return node.datasource;
      });
  
    console.log("DATA-DEBUG useGraph SOURCE: ", sourcePath, source, context);
    //const { node, data } = source;
    useEffect(() => {
      console.log("TEST EFFECT MODEL IN useSource", source.node);
      source.node.observe(setSource);
      return () => {
        source.node.unobserve(setSource);
        //if(!permanent) node.setSource(null, null, false, true);
      } //TODO: model.strategy per ogni dataSource
    }, [source.node]);
  
    return source;
  }

  export const useForm = (name, source, model) =>{
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
  }

