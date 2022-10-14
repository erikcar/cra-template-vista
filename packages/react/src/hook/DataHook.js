import { useState, useEffect, useRef } from 'react';
import { VistaApp, DataGraph } from '@vista/core';

export const useGraph = (model, path, initialData) => {

  const [source, setSource] = useState(
    () => {
      const ic = VistaApp.icontainer;
      const sourcePath = ic.ResolveClass(model).etype + "." + path;
      console.log("DATA-DEBUG useGraph SOURCE: ", sourcePath);
      let node;
      if (!initialData) {
        node = DataGraph.findOrCreateGraph(sourcePath);
      }
      if (!node) {
        node = DataGraph.setSource(sourcePath, initialData);
      }
      console.log("DATA-DEBUG useGraph SOURCE: ", sourcePath, node);
      
      return node.datasource;
    });

    const initialized = useRef(false)

    if(!initialized.current){
      source.node.observe(setSource);
      initialized.current = true;
    }
    
  //const { node, data } = source;
  useEffect(() => {
    console.log("TEST EFFECT MODEL IN useSource", source.node);
    //source.node.observe(setSource);
    return () => {
      console.log("UNOBSERVE", source.node);
      source.node.unobserve(setSource);
      if(!source.node.permanent){
        source.node.source = null;
        console.log("UNOBSERVE-FREESOURCE", source.node.etype, source.node.name);
      }
        
      //if(!permanent) node.setSource(null, null, false, true);
    } //TODO: model.strategy per ogni dataSource
  }, [source.node]);

  return source;
}