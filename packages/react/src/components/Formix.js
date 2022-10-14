import { Button, Form, Input, Space } from "antd";
//import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import React, { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {Validator} from "./Validator";
import { VistaJS } from "./Vista";


export function Formix({ control, form, initialValues, observe, children, ...rest }) {
    //const [form] = Form.useForm();
    console.log("FORMIX DEBUG", control, form, rest);
    if (VistaJS.DEVELOPMENT) {
        if (!control || !form)
            throw new Error("Formix must have model and form instance.");
    }
    
    const ref = useRef();
    const valueChange = (errorInfo) => {
        console.log('FORMIX Value CHANGED:', errorInfo);
        control.publish("OBSERVABLE", "onchange", {value: '', });
    };

    const blur = (e) => {
        console.log("PASSA", e, e.target.id, e.target.parentNode.parentNode.parentNode.id, form.target.getFieldsValue(e.target.id), e.target);
        let field = e.target.id;
        if(!field)
            field = e.target.parentNode.parentNode.parentNode.id;
        if(form.valueChanged(field)){
            const values = form.target.getFieldsValue(true);
            control.publish("OBSERVABLE", "onblur", { field: e.target.id, value: values[e.target.id], values: values });
        }
    };

    const onselect = (e) => {
        console.log("PASSA SELECT", e.detail); //e.target.id, form.target.getFieldsValue(e.target.id), e.target);
        const values = form.target.getFieldsValue(true);
        //form.data[e.detail.field + '_label'] = e.detail.item.label;
        control.publish("OBSERVABLE", "onselect", { field: e.detail.field, value: values[e.detail.field], values: values, data: e.detail.item });
    };

    const onfocus = (e) =>{
        //console.log("FORMIX ON FOCUS", e);
        //return;
        if(!ref.current){
            ref.current = e.target.form;
            if (observe && observe.indexOf(',select,') > -1)
                ref.current.addEventListener('oselect', onselect);
        }
        //e.target.form.removeEventListener("focus", onfocus);

    }

    useEffect(()=>{
        console.log("FORMIX REF", ref.current);
        //if (observe && observe.indexOf(',select,') > -1)
            //ref.current.addEventListener('onselect', (e) => console.log(e.item));
        //return () => ref.current && ref.current.removeEventListener("onselect");
    },[])

    const props = { ...{ ...rest, form: form.target, initialValues: form.format(initialValues), onFocus: onfocus, onLoad: (e) => console.log("onselect", e) } };
    //,  initialValues: form.__source__
    props.onBlur = blur; //Per ora faccio sempre check

    if (observe) {
        observe = ',' + observe + ',';
        /*if (observe.indexOf(',blur,') > -1)
            props.onBlur = blur;*/

        if (observe.indexOf(',change,') > -1)
            props.onValuesChange = valueChange;

            //form.target.addEven
        //if (observe.indexOf(',select,') > -1)
            //ref.current.addEventListener('onselect', (e) => console.log(e.item));//props.onSelect = onselect;

    }
    console.log("VALIDATOR IS FORM schema", form.schema);
    const fc = React.createElement(Form, props, children); 
    let component;
    if (form.schema)
        component = <Validator schema={form.schema} >{fc}</Validator>;
    else
        component = fc;
    return component;
}

/*function ItemContainer({ children, last, remove, add, key }) {
    const [visible, setVisible] = useState(false);
    const minus = <CloseOutlined style={{ fontSize: '14px', color: '#aaa', visibility: visible ? 'visible' : 'hidden' }} onClick={() => remove()} />;
    const actions = last
        ? <>{minus}<PlusCircleOutlined onClick={() => add()} /></>
        : minus;
    return (<div key={key} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>{children} {actions}</div>)
}

export function ItemRenderer({ name, children, value }) {
    return <Form.List name={name || 'items'} initialValue={value}>
        {(fields, { add, remove }) => (
            <>
                {fields.map(({ key, name, ...restField }, index) => {
                    console.log("ItemRender", key, name, fields);

                    //

                    return (<ItemContainer last={key === fields.length - 1} add={add} remove={remove} key={index}>{children(name, restField)}</ItemContainer>)
                }
                )}
            </>
        )}
    </Form.List>
}

export function ItemRendererTest() {
    const data = useRef({ name: "Name", surname: "Surname", emails: [{ value: "a@a.it", label: "Personal" }, { value: "b@b.it", label: "Work" }], address: "placve" });
    return (
        <Form initialValues={data.current}>
            <Form.Item name="name">
                <Input />
            </Form.Item>
            <Form.Item name="surname">
                <Input />
            </Form.Item>
            <ItemRenderer name="emails" >
                {
                    (name, info) => (
                        <Space >
                            <Form.Item {...info} name={["0", 'value']}>
                                <Input />
                            </Form.Item>
                            <Form.Item {...info} name={[name, 'label']}>
                                <Input />
                            </Form.Item>
                        </Space>)
                }
            </ItemRenderer>
        </Form>);
}*/
