import { Button, Modal } from "antd";
import { useModel } from "../hook/SystemHook";
import { DataGraph, VistaApp } from "@vista/core";
import { useGraph } from "../hook/DataHook";

export function openPopup(component, title, width,info, confirm, cancel){
    //const comp = (<div  style={{height: 'calc( (100vh - 300px) )', width: 'calc( (100vw - 100px) )'}}>{component}</div>);
    DataGraph.setSource("system.modal", {width: width, title: title || 'Popup', cancel: cancel || 'Annulla', confirm: confirm || 'OK', component: component, info: info}, VistaApp.context);
}

export function closePopUp(){
    const source = DataGraph.getSource("system.modal");
    //debugger;
    if(source?.info?.onclose) source.info.onclose();
    DataGraph.setSource("system.modal", null);
}

export function popUpModel(model){
    model.Subscribe("POPUP-CLOSE", () =>{
        DataGraph.setSource("system.modal", null);
    } );

    model.Subscribe("POPUP-CONFIRM", () =>{
        DataGraph.setSource("system.modal", null);
    } )
}

PopUp.model = popUpModel;
export function PopUp(){
    //Più corretto Messanger in ascolto su messagio e aggiorna stato
    //const [isModalVisible, setIsModalVisible] = useState(false);
    const {data} = useGraph("system.modal");
    const[model] = useModel(PopUp);
 
    console.log("POPUP", data);
    let isModalVisible = false;

    if(data) isModalVisible = true;

    const ClosePopUp = () => {
        //setIsModalVisible(false);
        if(data?.info?.onclose) data.info.onclose();
        model.Publish("POPUP-CLOSE", data);
    };

    const ConfirmPopUp = () => {
        //setIsModalVisible(false);
        if(data?.info?.onconfirm) data.info.onconfirm(data.info);
            model.Publish("POPUP-CONFIRM", data);
    };

    const footer = [];

    if(data){
        if(!data.info?.excludeCancel)
            footer.push(<Button key="back" onClick={ClosePopUp}>{data.cancel}</Button>);
        if(!data.info?.excludeOk)
            footer.push(<Button key="submit" type="primary" onClick={ConfirmPopUp}>{data.confirm}</Button>);
    }

    return (
        <Modal footer={footer} cancelText={data?.cancel} width={data?.width || 800} okText={data?.confirm} destroyOnClose={true} title={data?.title}  open={isModalVisible} onOk={ConfirmPopUp} onCancel={ClosePopUp}>
                {data?.component}
        </Modal>
    )
}