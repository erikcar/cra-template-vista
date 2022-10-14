import { VistaApp } from "./Vista";

export function ApiService(defaultOption) {
    this.inject = true;
    this.api = null;
    this.defaultOption = defaultOption;

    this.ExecuteApi = (op, params, option) => {
        option = option || defaultOption || {};
        
        this.api.formatOption(option);

        return this.api.call(option.apiUrl + op, params, option).then((result) => {
          console.log("API SERVICE REQUEST RESULT" + result.data, result);
          return result.data;
        }, er => {console.log("ERROR API SERVICE", er); throw er;});
    };
}