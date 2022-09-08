import { Model } from "../core/Model";
import { DataGraph, DataSource } from "../data/DataGraph";

/**
 * 
 * @param {Model} model 
 * @param {string} key 
 */
export function attachNavigator(model, navigator, key) {
    model.Subscribe(key || "NAVIGATE", (url, state) => { navigator(url, state) }, null, null);
}

/**
 * @param {Model} model 
 */
export function attachDataGraph(model) {
    model.Subscribe("ADD-ITEM", (source, option) => {
        console.log("ADD ITEM", source, option);
        if(typeof source === 'string') source = new DataSource(option.data, null, source);
        console.log("ADD ITEM", source);
        DataGraph.addSource( source.enode, option.data || source.data || {}, model.context, option.parent, option.format);
    }
        , null, null);
    model.Subscribe("SELECT-ITEM", (path, { data, parent, format, notNotify }) => { DataGraph.setSource(path, data, parent, format, notNotify); }, null, null);
    model.Subscribe("SAVE-NODE", (source) => {
        if(typeof source === 'string') {
            DataGraph.findGraph(source).save();
        }
        else 
            source.node.save();
    }, null, null);
}

/*export function attachForm(model) {
    model.forms = new Set();

    model.registerForm = (form) => {
        console.log("REGISTER FORM", form, model.forms.size);
        if (!model.forms.has(form))
            model.forms.add(form);
    }

    model.unregisterForm = (form) => {
        if (model.forms.has(form))
            model.forms.delete(form);
        console.log("UNREGISTER FORM", form, model.forms.size);
    }
}*/