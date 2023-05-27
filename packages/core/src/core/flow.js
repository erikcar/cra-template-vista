
function breakFlow() { }
function Nothing() { };

export const BreakFlow = new breakFlow();

function ioTask(input, output) {
  this.input = input || Nothing;
  this.output = output || Nothing;
}

//TODO: Da implementare Breaker(block and flow) e gestione result (su value);
function Block(intent, context, emitter, control) {
  this.pipeLine = null; //se ha più action/trasform/filter => diventa un Array
  this.priority = 0;
  this.context = context;
  this.emitter = emitter;
  this._intent = intent ? new ioTask(intent) : null;
  this.token = context;
  this.control = control;

  //Da implementare metodi fluent per pipe
  this.intent = function (task) {
    this._intent = task instanceof ioTask ? task : new ioTask(task);
    return this;
  }

  this.pipe = function (task) {
    if (this.pipeLine === null) this.pipeLine = [];
    this.pipeLine.push(task instanceof ioTask ? task : new ioTask(task));
  }

  this.pipeBack = function (task) {
    this.pipe(new ioTask(null, task));
  }

  this.pipeIO = function (itask, otask) {
    this.pipe(new ioTask(itask, otask));
  }

  this.execute = function (info) { //???
    if(this.control){
      info.vmodel = info.model.ancestor(this.control.skin);
      info.vstate = info.vmodel?.state;
    }
    
    const flow = info.flow;
    flow.break = false;
    flow.current = this;

    if (this.pipeLine) {
      for (let k = 0; k < this.pipeLine.length; k++) {
        this.run(this.pipeLine[k].input, info);
        if (flow.break) return;
      }
    }

    if (this._intent) {
      this.run(this._intent.input, info);
      if (flow.break) return;
    }

    if (this.pipeLine) {
      for (let k = this.pipeLine.length - 1; k > -1; k--) {
        this.run(this.pipeLine[k].output, info);
        if (flow.break) return;
      }
    }
  }

  this.run = async function (task, info) {
    if (task) {
      const result = task(info);
      if (result instanceof Promise) {
        await result;
      }
    }
  }
}

//TODO: Support for token (Actually token === context)
export function Observer(flow, context, emitter, control) {

  this.flow = flow;
  this.context = context;
  this.emitter = emitter;
  this.control = control;

  this.input = function (task) {
    return this.flow.Prepend(this.CreateBlock(task));
  }

  this.output = function (task) {
    return this.flow.Append(this.CreateBlock(task));
  }

  this.override = function (task) {
    return this.flow.Enqueue(this.CreateBlock(task));
  }

  this.Intent = function (task) {
    return this.flow.intent = task instanceof Block ? task : this.CreateBlock(task);
  }

  this.Append = function (block, notDecorate) {
    if (!notDecorate && block.decorator !== this) this.decorate(block);
    this.flow.Append(block);
  }

  this.Prepend = function (block, notDecorate) {
    if (!notDecorate) this.decorate(block);
    this.flow.Prepend(block);
  }

  this.decorate = function (block) {
    block.context = this.context;
    block.emitter = this.emitter;
    block.control = this.control;
    block.decorator = this;
  }

  this.CreateBlock = function (task) {
    return new Block(task, this.context, this.emitter, this.control);
  }
}

function FlowState(value) {
  this.value = value;
  this.rawValue = value;
  this.broken = false;
  this.reason = null;
  this.break = false;

  this.setError = function (error) {
    this.broken = true;
    this.break = true;
    this.reason = error;
  }

  this.BreakFlow = function () {
    this.broken = true;
    this.break = true;
    this.reason = BreakFlow;
  }

  this.BreakBlock = function () {
    this.break = true;
  }
}

export function Flow() {
  this.inputs = [];
  this.outputs = [];
  this.queue = [];
  this.intent = null;

  console.log("SYS-FLOW-INIT");

  this.Prepend = function (block) {
    this.inputs.unshift(block);
    console.log("SYS-FLOW-PREPEND", block, this.inputs);
    return block;
  };

  this.Enqueue = function (block) {
    this.queue.unshift(block);
    return block;
  }

  this.Append = function (block) {
    this.outputs.push(block);
    console.log("SYS-FLOW-APPEND", block, this.outputs);
    return block;
  };

  this.remove = function (token, emitter) {
    this.inputs = this.inputs.filter((block) => { return (token === null || block.token !== token) && (emitter === undefined || block.emitter !== emitter) }) || [];
    this.queue = this.queue.filter((block) => { return (token === null || block.token !== token) && (emitter === undefined || block.emitter !== emitter) }) || [];
    this.outputs = this.outputs.filter((block) => { return (token === null || block.token !== token) && (emitter === undefined || block.emitter !== emitter) }) || [];
    return this.outputs.length === 0 && this.input.length === 0 && this.queue.length === 0;
  }

  this.run = async function (task, value, info, context, emitter, resolve, reject) {
    const flow = new FlowState(value);
    info = info || {};
    info.app = info.control.app;
    info.flow = flow;

    let block;
    let running = [];

    for (let j = 0; j < this.inputs.length; j++) {
      block = this.inputs[j];
      if ((!block.context || block.context === context) && (!block.emitter || block.emitter === emitter) && (!block.condition || block.condition())) {
        running.push(block);
      }
    }

    for (let i = 0; i < this.queue.length; i++) {
      running.push(this.queue[i]);
    }

    task = task || this.intent;
    if (task) {
      running.push(task instanceof Block ? task : new Block(task, context, emitter));
    }

    for (let z = 0; z < this.outputs.length; z++) {
      block = this.outputs[z];
      if ((!block.context || block.context === context) && (!block.emitter || block.emitter === emitter) && (!block.condition || block.condition())) {
        running.push(block);
      }
    }

    console.log("SYS-FLOW-RUNNING", running);

    if (running.length === 0)
      return resolve(info);

    for (let k = 0; k < running.length; k++) {

      info.value = flow.value;
      running[k].execute(info);

      if (flow.broken) {
        reject(flow); // OR info???
        break;
      }
    }

    resolve(info);
  }

  if (arguments && arguments.length > 0) {
    for (let j = 0; j < arguments.length; j++) {
      this.Append(arguments[j]);
    }
  }
}