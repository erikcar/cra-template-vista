import { VistaApp } from "./Vista";

export function ApiService(defaultOption) {
  this.inject = true;
  this.api = null;
  this.defaultOption = defaultOption;

  this.CallApi = (op, params, option) => {
    option = option || defaultOption || {};

    this.api.formatOption(option);

    const url = op.startsWith('http')? op : option.apiUrl + op;

    return this.api.call(url, params, option).then((result) => {
      console.log("API SERVICE REQUEST RESULT" + result.data, result);
      return result.data;
    }, er => { console.log("ERROR API SERVICE", er); throw er; });
  };
}


export function FileService() {
  this.inject = true;
  this.api = null;
  this.types = "";
  this.url = "api/upload";
  this.onUpload = null;

  this.UploadRequest = function (option) {
    if (this.onUpload) {
      option.upload = this.Upload;
      this.onUpload(option);
    }
    else
      this.Upload(option);
  }

  this.BeforeUpload = function (file) {
    //TODO:
  }

  this.Upload = function (options) {
    const { onSuccess, onError, file, onProgress, data, setProgress } = options;
    console.log("START UPLOAD", options);
    console.log("START UPLOAD 2", data);


    const option = data.option || {};
    const formData = new FormData();
    /*files.forEach((file) => {
      formData.append("files[]", file);
    });*/
    formData.append(option.name || "formFile", file);
    for (const key in data) {
      if (key !== 'option' && Object.hasOwnProperty.call(data, key)) {
        console.log("UPLOAD DATA", key, data[key]);
        formData.append(key, data[key]);
      }
    }

    const config = {
      headers: { "content-type": "multipart/form-data" },
      excludeParams: true,
    };

    if (setProgress) {
      config.onUploadProgress = (event) => {
        const percent = Math.floor((event.loaded / event.total) * 100);
        setProgress(percent);
        if (percent === 100) {
          setTimeout(() => setProgress(0), 1000);
        }
        onProgress({ percent: (event.loaded / event.total) * 100 });
      };
    }
    console.log("UPLOAD URL", options.data.url || this.url);
    this.api.call(options.data.url || this.url, formData, config).then((result) => {
      console.log("UPLOAD SUCCESS", result, onSuccess);
      if(option.onSuccess)option.onSuccess(result, file);
      onSuccess();
    }, onError);
  }
}



