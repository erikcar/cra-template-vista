# npm install react-router-dom@6
# npm install antd
# npm install sass --save-dev
# npm install axios


**Assicurarsi che sia compatibile con la versione di create react app**
# npm i @craco/craco 

# Sostituire in package.json
`"start": "craco start",`
`"build": "craco build",`
`"test": "craco test",`

# npm i -S craco-less

# craco.config.js
```
const CracoLessPlugin = require('craco-less');

module.exports = {

  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { '@primary-color': '#1DA57A' },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};

```