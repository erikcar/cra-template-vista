import { Form } from "antd";
import React from "react";
import Validator from "./Validator";
import { VistaJS } from "./Vista";

export default function Formix({ model, form, children, ...rest }) {
    //const [form] = Form.useForm();
    if(VistaJS.DEVELOPMENT){
        if(!model || !form)
            throw new Error("Formix must have model and form instance.");
    }

    console.log("FORMIX DEBUG", rest);

    /*useEffect(()=>{
        console.log("USE FORM", form.__info__);
        return () => {
            const info = form.__info__;
            if(!form.__checked__ && (!info || !info.notNotify)){
                //Controllo se almeni un valore è cambiato
                let isChanged = false;
                const source = form.__source__;
                const values = form.getFieldsValue(true);
                console.log("USE FORMIX UNMONT", info, values); //model.submitForm(form, info); 
                for (const key in values) {
                    if (Object.hasOwnProperty.call(values, key)) {
                        if(source[key] !== values[key]){
                            isChanged = true;
                        }
                    }
                }
                if(isChanged){
                    //Notifico che sto usceno dal form senza aver salvato. e se utente conferma submit form
                    //console.log("USE FORM UNMONT", form.__info__, form.getFieldsValue(true)); model.submitForm(form); 
                }
                
            } 
        } 
    },
    [model, form]);*/
    
    const onValueChange= (errorInfo) => {
        console.log('FORMIX Value CHANGED:', errorInfo);
    };

    const fc = React.createElement(Form, {...{...rest, form: form, onValuesChange: onValueChange}}, children); //,  initialValues: form.__source__
    let component;
    if(model && model.schema)
        component = <Validator schema={model.schema} >{fc}</Validator>;
    else
        component = fc;
    return component;
}
