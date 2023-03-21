export function sleep(timeout) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
//Object.prototype.toString.call(variable) === '[object String]'
export function isString(val) {
    return typeof val === 'string' || val instanceof String;
}

export function isEmpty(obj){
    return obj // 👈 null and undefined check
    && Object.keys(obj).length === 0
    && Object.getPrototypeOf(obj) === Object.prototype
}
/**
 * 
 * @param {Array} ar 
 * @param {*} item 
 */
export function ArrayRemove(ar, item) {
    const index = ar.findIndex((el) => el === item);
    if (index > -1) ar.splice(index, 1);
}

export function DateDiffDays(date1, date2) {
    if (!(date1 instanceof Date))
        date1 = new Date();
    if (!(date2 instanceof Date))
        date2 = new Date();

    var Difference_In_Time = Math.abs(date2.getTime() - date1.getTime());
    return Math.trunc(Difference_In_Time / (1000 * 3600 * 24));
}

export function printImage(imagePath) {
    var width = window.innerWidth * 0.9;
    var height = window.innerHeight * 0.9;
    var content = '<!DOCTYPE html>' +
        '<html>' +
        '<head><title></title></head>' +
        '<body onload="window.focus(); window.print(); window.close();">' +
        '<img src="' + imagePath + '" style="width: 100%;" />' +
        '</body>' +
        '</html>';
    var options = "toolbar=no,location=no,directories=no,menubar=no,scrollbars=yes,width=" + width + ",height=" + height;
    var printWindow = window.open('', 'print', options);
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
}

export function NextAtSecond(second) {
    const s = new Date().getSeconds();
    if (s < second)
        return (second - s) * 1000;
    else
        return ((60 - s) + second) * 1000;
}

export function Polling(callback) {
    this.callback = callback;
    this.time = null;
    this.second = null;
    this.break = false;
    this.timeout = null;

    this.atSecond = function (second) {
        this.second = second;
        return this;
    }

    this.every = function (millisecond) {
        this.time = millisecond;
        return this;
    }

    this.intervall = function () {
        this.callback();
        this.timeout = setTimeout(this.intervall.bind(this), NextAtSecond(this.second));
    }

    this.start = function () {
        if (!this.callback) return;

        if (this.time)
            this.timeout = setInterval(this.callback, this.time);
        else
            this.intervall();
    }

    this.stop = function () {
        clearTimeout(this.timeout);
    }
}

export function BigData(offset, width) {
    this.offset = offset || 15;
    this.width = width || 25;
    this.liteMode = false;
    this.inside = false;
    this.data = null;
    this.liteData = null;

    this.setSource = function (data) {
        if (!data || !Array.isArray(data)) return data;
        this.data = data;
        this.liteMode = data.length > 10000;
        this.inside = false;
        this.liteData = null;
        if (this.liteMode) {
            this.liteData = data.filter((value, index) => index % this.offset === 0);
            return this.liteData;
        }
        else
            return data;
    }

    this.getSource = function () {
        if (!this.liteMode || this.inside) return this.data;
        return this.liteData;
    }

    this.isChanged = function (zoom) {
        if (!this.liteMode) return false;
        const inside = (zoom.end - zoom.start) < this.width;
        if (inside !== this.inside) {
            this.inside = inside;
            return true;
        }
        else
            return false;
    }
}

export function RealTimeData(chart, data, request) {
    if (!data?.source) return;
    this.store = data.source;
    this.ds = (new Date().getTime()) - 70000;
    this.dt = new Date(this.ds);;
    this.span = Math.round(data.source[0].length * 0.6);
    this.xms = this.span;
    this.start = 0;
    this.step = Math.round(1000 / data.rate);
    this.name = data.name;
    this.trace = data.trace;
    this.time = data.time;
    this.time.ms = 30000;
    this.lms = new Date().getTime();
    this.now = 0;
    this.discard = false;
    this.interval = null;

    this.init = function () {
        const instance = this;
        let series = [];
        const y = [];
        const x = [];
        const grid = [];
        let top;
        const len = this.trace.length;
        const h = (100 / len) - 10 + '%';
        for (let k = 0; k < len; k++) {
            top = (k * 100) / len + 5 + '%';
            series.push({
                name: 'value', type: 'line', showSymbol: false, smooth: true, data: data.source[k].slice(this.start, this.start + this.span), xAxisIndex: k,
                yAxisIndex: k
            });
            y.push({ name: data.trace[k], type: 'value', gridIndex: k, scale: true, nameLocation: 'end', nameTextStyle: { align: 'left', fontWeight: 'bold', padding: [0, 0, -12, 20] } });
            x.push({
                type: 'category', gridIndex: k, axisLabel: {
                    show: true, formatter: function (value, index) {
                        return new Date(instance.dt.getTime() + (60000 * (value / instance.xms))).toTimeString().substring(0, 8);
                    }
                }
            });
            grid.push({ top: top, height: h });
        }

        chart.setOption({
            xAxis: x,
            yAxis: y,
            series: series,
            grid: grid,
        });

        const f = this.updateData.bind(this);
        this.interval = setInterval(f, this.step);
    };

    this.updateData = function () {
        const instance = this;
        this.now = new Date().getTime();
        this.start += Math.round((this.now - this.lms) / this.step);
        this.lms = this.now;
        this.dt = new Date(this.ds + (this.start * this.step));

        if (!this.discard && ((this.now - this.time.dtms) - this.time.offset) > 29900) {
            this.discard = true;
            const i = this.time.next();
            request(this.name, i).then(result => {
                for (let k = 0; k < instance.trace.length; k++) {
                    this.store[k].splice(0, instance.start);
                    Array.prototype.push.apply(instance.store[k], result[instance.trace[k]][0].data);
                }
                instance.ds += instance.start * instance.step;
                instance.start = 0;
                instance.discard = false;
            }, (e) => { instance.time.restore(); instance.discard = false; });
        }
        const series = [];
        for (let k = 0; k < this.trace.length; k++) {
            series.push({ name: 'value', type: 'line', showSymbol: false, smooth: true, data: this.store[k].slice(this.start, this.span + this.start) })
        }
        chart.setOption({
            series: series
        });
    }

    this.starter = function () {
        const f = this.updateData.bind(this);
        this.interval = setInterval(f, this.step);
    }

    this.stop = function () { clearInterval(this.interval); debugger; };
}