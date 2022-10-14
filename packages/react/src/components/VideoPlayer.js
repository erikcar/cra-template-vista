import { useEffect, useRef } from "react";
import { useControl } from "../hook/SystemHook";
import { VideotrackModel } from "../models/videotrack";

const control = {

}

function VideoTracker (intervall, ontrack, state, data, offset){
    this.vid = null;
    this.timer = null;
    this.offset = offset || 10;
    this.tracking = intervall;
    this.ontrack = ontrack;
    //this.oncomplete = oncomplete;
    this.state = state || 'S';
    this.data = data || {};

    this.init = function(vid){
        //if(this.state === 'C') return;
        //debugger;
        this.vid = vid;
        const instance = this;
        vid.onplay = () =>{ //Track Start First Time //Start track 
            instance.startTracking();
        }

        vid.onpause = () => { //Stop Track
            instance.stopTracking();
        }

        vid.onended = () =>{
            instance.state = 'C';
            instance.ontrack(this.getTrack());
        }

        vid.onloadedmetadata = () =>{
            this.offset = Math.min(this.offset, vid.duration/10);
            //vid.style.maxWidth  = vid.videoWidth + 'px';
        }

        if(this.data?.position)
            vid.currentTime = this.data.position/1000;
    }

    this.refresh = function(state, data){
        this.data = data;
        this.state = state || 'S';
        this.vid.load();
        if(data.position !== null)
            this.vid.currentTime = data.position/1000;
    }

    this.startTracking = function(){
        if(this.state === 'C') return;

        const instance = this;
        this.timer = setInterval( ()=>{
            instance.ontrack(instance.getTrack());
        }, this.tracking);
    }

    this.stopTracking = function(){
        clearInterval(this.timer);
    }

    this.getTrack = function(complete){
        const track = this.data;
        const vid = this.vid;
        
        if(this.state === 'C' || ((vid.duration-vid.currentTime) < this.offset)){
            track.position = 0;
            track.progress = 100;
            track.state = 'C';
            this.stopTracking();
        }
        else{
            track.position = (vid.currentTime * 1000).toFixed();
            track.progress = ((vid.currentTime/vid.duration)*100).toFixed();
            track.state = this.state;
            this.state = 'P';
        }

        return track;
    }
}

function VideoplayerController(c){
    c.skin = ECVideoPlayer;
    c.command = {
        TRACK: (info, {model}) => {
            model.read(VideotrackModel, (m)=>m.track(info));
        }, 
    }
}

export function ECVideoPlayer({state, info, children, ...rest}){
    console.log("ECVideoPlayer", info);
    const [control] = useControl(VideoplayerController);
    const ref = useRef(null);
    const tracker = useRef(new VideoTracker(5000, (data)=>control.execute("TRACK", data), state, info));

    useEffect(()=>{
        console.log("PALYER REF", ref, ref.current, tracker.current);
        tracker.current.init(ref.current);
        return ()=> {console.log("DISPOSE ECVideoPlayer")};
    }, []);

    useEffect(()=>{
        console.log("PALYER REF", ref.current, tracker.current);
        if(info.id)
            tracker.current.refresh(state, info);
    }, [info.id]);

    return <video {...rest}  ref={ref}>
        {children}
    </video>
}

/*const setRef = (c) => {
        console.log("PALYER REF", c);
        if(c !== ref.current){
            ref.current = c;
        }
    }*/