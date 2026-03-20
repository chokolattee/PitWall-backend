const fs = require('fs');
const folders = ['controllers', 'models', 'routes'];

folders.forEach(folder => {
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder);
    console.log(`${folder} folder created`);
  } else {
    console.log(`${folder} folder already exists`);
  }
});