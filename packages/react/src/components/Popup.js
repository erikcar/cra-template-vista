import { Modal } from "antd";
import { DataGraph } from "@vista/core";
import { useGraph, useModel } from "../hook/VistaHook";


export function openPopup(component, title, info, confirm, cancel){
    const comp = (<div  style={{height: 'calc( (100vh - 300px) )', width: 'calc( (100vw - 100px) )'}}>{component}</div>);
    DataGraph.setSource("system.modal", {title: title || 'Popup', cancel: cancel || 'Annulla', confirm: confirm || 'OK', component: comp, info: info});//, VistaApp.context);
}

export function popUpModel(model){
    model.Subscribe("POPUP-CLOSE", () =>{
        DataGraph.setSource("system.modal", null);
    } );

    model.Subscribe("POPUP-CONFIRM", () =>{
        DataGraph.setSource("system.modal", null);
    } )
}

export default function PopUp(){
    //Più corretto Messanger in ascolto su messagio e aggiorna stato
    //const [isModalVisible, setIsModalVisible] = useState(false);
    const[model]  = useModel(popUpModel);
    const {data} = useGraph("system.modal");
    
    console.log("POPUP", data);
    let isModalVisible = false;

    if(data) isModalVisible = true;

    /*const showModal = () => {
        setIsModalVisible(true);
    };*/

    const ClosePopUp = () => {
        //setIsModalVisible(false);
        model.Publish("POPUP-CLOSE", data);
    };

    const ConfirmPopUp = () => {
        //setIsModalVisible(false);
        model.Publish("POPUP-CONFIRM", data);
    };

    return (
        <Modal cancelText={data?.cancel} okText={data?.confirm} width="100%" destroyOnClose={true} title={data?.title} style={{ width: 'calc( (100vw - 100px) )'}} visible={isModalVisible} onOk={ConfirmPopUp} onCancel={ClosePopUp}>
            {data?.component}
        </Modal>
    )
}