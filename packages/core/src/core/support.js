export const syncle = {
    pollers: [],
    listeners: [],
    timer: null,
    time: null,
    result: null,

    poll: function (callback) {
        const p = new poller(callback);
        this.pollers.push(p);
        return p;
    },

    unpoll: function (callback) {
        const i = this.pollers.find((p) => p.callback === callback);
        this.pollers.splice(i, 1);
    },

    subscribe: function (listener) {
        this.listeners.push(listener);
    },

    unscribe: function (listener) {
        const i = this.listeners.find((l) => l === listener);
        this.listeners.splice(i, 1);
    },

    update: function (data) {
        this.listeners.forEach(setter => {
            setter(data);
        });
    },

    start: function (time, callback, interval) {
        this.time = time;
        const instance = this;
        this.timer = setInterval(() => {
            instance.result = callback(instance.time.toISOString())
            instance.update(instance.result);
            instance.time = new Date();
        }, interval || 120000);
    },

    startAsync: async function (time, callback, interval) {
        this.time = time;
        const instance = this;

        callback(instance.time.toISOString()).then((r)=> {
            instance.result = r;
            instance.update(r)
        });

        this.timer = setInterval(() => {
            callback(instance.time.toISOString()).then((r)=> {
                instance.result = r;
                instance.update(r)
            });

            for (let k = 0; k < instance.pollers.length; k++) {
                instance.pollers[k].execute(this.time.toISOString());
            }

            instance.time = new Date();

        }, interval || 120000);
    },

    stop: function () {
        if (this.timer) clearInterval(this.timer);
    }
}

function poller(callback) {

    this.callback = callback;
    this.enabled = false;

    this.start = function (runnow) {
        this.enabled = true;
        if(runnow)
            this.callback();
    };

    this.stop = function () {
        this.enabled = false;
    };

    this.execute = function (time) {
        if(this.enabled){
            this.callback(time)
        }
    };
}