#!/usr/bin/env node

const { Command } = require("commander");
const Zip = require("adm-zip");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs-extra");
const { pipeline } = require("stream");
const { exec } = require("child_process");
const chalk = require("chalk");
const updateNotifier = require('update-notifier');
const pkg = require("./package.json");

const program = new Command();

var update = updateNotifier({pkg});
update.notify();

program
    .name(pkg.name)
    .version(pkg.version);

program
  .command("create [destination]")
  .description("Create a ChatSurf server")
  .action(async (destination) => {
    var root = path.resolve(destination || "chatsurf");
    
    var res = await fetch("https://github.com/chatsurfapp/chatsurf/zipball/main");
    
    fs.mkdirSync(root + "-tmp");
    
    pipeline(res.body, fs.createWriteStream(path.join(root + "-tmp", "chatsurf.zip")), (err) => {
      if (err) throw err;
      
      var zip = new Zip(path.join(root + "-tmp", "chatsurf.zip"));
      zip.extractAllTo(root + "-tmp");
      
      fs.move(path.join(root + "-tmp", zip.getEntries()[0].entryName), root, (err) => {
        if (err) throw err;
        
        fs.removeSync(root + "-tmp");
        
        exec("npm install", {
          cwd: root
        }).on("exit", (code) => {
          if (code > 0) throw new Error(`Command 'npm install' exited with code ${code}`);
          
          console.log(chalk.green(`Created ChatSurf server in: ${chalk.blue(root)}!`));
          console.log(chalk.green("\nNext Steps:\nStart your server:"));
          console.log(chalk.blue(` $ cd ${root}\n $ npm start`));
        });
      });
    });
  });

program
  .command("install <plugin>")
  .description("Install a plugin")
  .action(async (plugin) => {
    var root = path.resolve("plugins");
    fs.ensureDirSync(root);
  
    var res = await fetch(`https://chatsurf.c1200.cf/plugins/${plugin}.js`);
  
    if (res.ok) {
      pipeline(res.body, fs.createWriteStream(path.join(root, `${plugin}.js`)), (err) => {
        if (err) throw err;
        
        console.log(chalk.green(`Installed plugin: ${chalk.blue(plugin)}`));
      });
    } else {
      console.log(chalk.red(`ERROR: Server responded with status code ${res.status}`));
      if (res.status === 404)
        console.log(chalk.red("  This may be because the requested plugin doesn't exist"));
    }
  });

program.parse(process.argv);
