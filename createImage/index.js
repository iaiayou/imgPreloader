const fs = require('fs');
const path = require('path');
const ora = require('ora');
const shell = require('shelljs');
const chalk = require('chalk');
const resolve = path.join;
const { filename, output, entry, judge } = require('./config');
const fileName = filename || 'imglist.js';
const fileDir = output || '../src/config/';
const imagesPath = entry || '../src/assets/images';
let img = {};
// 遍历图片文件夹
const mapDir = (baseDir, judge = '', level = 0) => {
  let files;
  try {
    files = fs.readdirSync(resolve(__dirname, baseDir));
  } catch (e) {
    throw new Error(
      '\x1b[40m \x1b[31m 配置的地址找不到图片，请核对正确后再重试 \x1b[0m'
    );
  }
  files.forEach(file => {
    let pathname = resolve(__dirname, baseDir, file);
    if (fs.statSync(pathname).isDirectory()) {
      if (level == 0) {
        img[file] = {};
      }
      mapDir(resolve(baseDir, file), level == 0 ? file : judge, level + 1);
    } else {
      let regExp = /\\\w+?\.(png|jpg|jpeg)$/;
      if (judge != '') {
        img[judge][
          resolve(baseDir, file)
            .replace(regExp, '')
            .replace(/\\/g, '/')
        ] = img[judge][
          resolve(baseDir, file)
            .replace(regExp, '')
            .replace(/\\/g, '/')
        ]
          ? img[judge][
              resolve(baseDir, file)
                .replace(regExp, '')
                .replace(/\\/g, '/')
            ].concat(
              `require('${path
                .relative(resolve(__dirname, fileDir), pathname)
                .replace(/\\/g, '/')}')`
            )
          : [].concat(
              `require('${path
                .relative(resolve(__dirname, fileDir), pathname)
                .replace(/\\/g, '/')}')`
            );
      } else {
        img['common'] = img['common']
          ? img['common'].concat(
              `require('${path
                .relative(resolve(__dirname, fileDir), pathname)
                .replace(/\\/g, '/')}')`
            )
          : [].concat(
              `require('${path
                .relative(resolve(__dirname, fileDir), pathname)
                .replace(/\\/g, '/')}')`
            );
      }
    }
  });
};
// 判断是否为数组
const isArray = arr => {
  return toString.call(arr) === '[object Array]';
};
const spinner = ora('create the imageList...');
const makeJs = baseDir => {
  spinner.start();
  // 先删除文件
  if (fs.existsSync(resolve(__dirname, fileDir, fileName))) {
    console.log(chalk.green('\n查找到已生成的数组文件，进行删除操作'));
    shell.rm('-r', resolve(__dirname, fileDir, fileName));
  } else {
    console.log(chalk.green('\n查找不到已生成的数组文件，跳过删除操作'));
  }
  //   如果文件夹不存在，那么先新增
  if (!fs.existsSync(resolve(__dirname, fileDir))) {
    try {
      fs.mkdirSync(resolve(__dirname, fileDir));
    } catch (err) {
      console.error(err);
    }
  }
  fs.appendFileSync(
    resolve(__dirname, fileDir, fileName),
    `let imgsList=[];\n`
  );
  mapDir(baseDir);
  Object.entries(img).forEach(item => {
    if (item[0] == 'common') {
      item[1].forEach(i => {
        fs.appendFileSync(
          resolve(__dirname, fileDir, fileName),
          `//公共图片\n`
        );
        fs.appendFileSync(
          resolve(__dirname, fileDir, fileName),
          `imgsList.push(${i});\n`
        );
      });
    } else {
      if (judge) {
        fs.appendFileSync(
          resolve(__dirname, fileDir, fileName),
          `if(${
            isArray(judge[item[0]]) ? judge[item[0]][0] : judge[item[0]]
          }){\n`
        );
        Object.entries(item[1]).forEach(i => {
          if (
            !isArray(judge[item[0]]) ||
            !judge[item[0]][1] ||
            !judge[item[0]][1].exclude ||
            judge[item[0]][1].exclude.find(a => a != i[0])
          ) {
            fs.appendFileSync(
              resolve(__dirname, fileDir, fileName),
              `//${i[0]}\n`
            );
            fs.appendFileSync(
              resolve(__dirname, fileDir, fileName),
              `imgsList.push(${i[1]});\n`
            );
          }
        });
        fs.appendFileSync(resolve(__dirname, fileDir, fileName), `}\n`);
      } else {
        Object.entries(item[1]).forEach(i => {
          fs.appendFileSync(
            resolve(__dirname, fileDir, fileName),
            `//${i[0]}\n`
          );
          fs.appendFileSync(
            resolve(__dirname, fileDir, fileName),
            `imgsList.push(${i[1]});\n`
          );
        });
      }
    }
  });
  fs.appendFileSync(
    resolve(__dirname, fileDir, fileName),
    `export default imgsList;`
  );
  // 格式校验一下生成的图片数组文件
  shell.exec(`npm run lint --fix ${resolve(__dirname, fileDir, fileName)}`);
  spinner.stop();
  console.log(chalk.green('已格式校验数组文件'));
  console.log(
    chalk.green(`已在${resolve(fileDir, fileName)}生成预加载图片数组文件`)
  );
};

makeJs(imagesPath);

// export default makeJs;
