import Search from "antd/lib/input/Search";
import { Flow } from "../core/Model";
import { DataGraph, ExecuteQuery } from "../data/DataGraph";

let paused = false;
var v;
export function attachSearch(model, key){
    const filter = (info, value) =>{
        const list = DataGraph.getSource(info.path);
        if(Array.isArray(list)){
            DataGraph.setSource(info.path, list.filter(function(item) {
                return item[info.field].toLowerCase().indexOf(value.toLowerCase()) !== -1;
            }));
        }
    }

    model.intents[key || "ON-SEARCH"] = new Flow((value, info) => {
        if(!value) return;
        if(!info) info = {};

        if(paused){
            v = value;
            return;
        }

        let minlen = info.min || 0;
        if(info.remote){
            if(value.length === minlen){
                paused = true;
                ExecuteQuery("", {value: value}).then(()=> {paused = false; filter(info, v); });
            }  
        }
        else
            minlen--;
        
        if(info.field && value.length > minlen){
            filter(info, value);
        }
    });
}

export function SearchFilter({model, info}) {
    return (
        <Search onSearch={(v) => model.Intent("ON-SEARCH", v, info)} placeholder="Ricerca Paziente" enterButton />
    )
}