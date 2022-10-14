import { useState } from "react";
import { Button, Popover } from "antd";
import { useModel } from "../hook/SystemHook";


/**
 * 
 * @param {EntityModel} model 
 */
function PopOverButtonModel(model){
    model.Subscribe("SELECTION", () => model.state.setVisible(false), null, null);
}

export function PopOverButton(info) {
    const [model] = useModel();
    model.state = {};
    [model.state.visible, model.state.setVisible] = useState(false);

    const hide = () => {
        model.state.setVisible(false);
    };

    const handleVisibleChange = (newVisible) => {
        model.state.setVisible(newVisible);
    };

    return (
        <Popover
            content={info.content}
            title={info.title}
            trigger="click"
            visible={model.state.visible}
            onVisibleChange={handleVisibleChange}
        >
            <Button type="primary">{info.title}</Button>
        </Popover>
    )
}