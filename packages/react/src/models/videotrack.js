import {DataModel} from '@vista/react';

export function VideotrackModel() {
    DataModel.call(this, "videotrack");
    this.track = (data) => {
        this.ExecuteApi("track: videotrack {*}", data);
    }
}